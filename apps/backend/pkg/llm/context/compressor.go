package context

import (
	"fmt"
	"strings"

	"dra-platform/backend/pkg/llm"
)

type Compressor struct {
	threshold       float64
	summaryRatio    float64
	tokenEstimator  func(string) int
}

func NewCompressor() *Compressor {
	return &Compressor{
		threshold:    0.8,
		summaryRatio: 0.5,
		tokenEstimator: defaultTokenEstimator,
	}
}

func NewCompressorWithEstimator(estimator func(string) int) *Compressor {
	return &Compressor{
		threshold:      0.8,
		summaryRatio:   0.5,
		tokenEstimator: estimator,
	}
}

func (c *Compressor) SetThreshold(threshold float64) {
	c.threshold = threshold
}

func (c *Compressor) SetSummaryRatio(ratio float64) {
	c.summaryRatio = ratio
}

func (c *Compressor) Compress(req *llm.ChatRequest, modelContextWindow int) (*llm.ChatRequest, error) {
	if modelContextWindow <= 0 {
		modelContextWindow = 128000
	}

	totalTokens := c.estimateRequestTokens(req)
	thresholdTokens := int(float64(modelContextWindow) * c.threshold)

	if totalTokens <= thresholdTokens {
		return req, nil
	}

	compressed := *req
	compressed.Messages = make([]llm.Message, len(req.Messages))
	copy(compressed.Messages, req.Messages)

	summaryIndex := c.findSummaryIndex(compressed.Messages)
	if summaryIndex <= 0 {
		return req, nil
	}

	summary := c.summarizeMessages(compressed.Messages[:summaryIndex])
	remaining := make([]llm.Message, 0, len(compressed.Messages)-summaryIndex+1)

	if summary != "" {
		remaining = append(remaining, llm.Message{
			Role:    llm.RoleSystem,
			Content: fmt.Sprintf("Previous conversation summary: %s", summary),
		})
	}

	remaining = append(remaining, compressed.Messages[summaryIndex:]...)
	compressed.Messages = remaining

	return &compressed, nil
}

func (c *Compressor) estimateRequestTokens(req *llm.ChatRequest) int {
	total := 0
	for _, m := range req.Messages {
		total += c.tokenEstimator(m.Content)
		for _, cb := range m.ContentBlocks {
			total += c.tokenEstimator(cb.Text)
		}
	}
	return total
}

func (c *Compressor) findSummaryIndex(messages []llm.Message) int {
	if len(messages) <= 2 {
		return 0
	}
	index := int(float64(len(messages)) * c.summaryRatio)
	if index < 1 {
		index = 1
	}
	return index
}

func (c *Compressor) summarizeMessages(messages []llm.Message) string {
	if len(messages) == 0 {
		return ""
	}

	var parts []string
	for _, m := range messages {
		content := strings.TrimSpace(m.Content)
		if content == "" {
			continue
		}
		switch m.Role {
		case llm.RoleUser:
			parts = append(parts, fmt.Sprintf("User asked: %s", c.truncate(content, 200)))
		case llm.RoleAssistant:
			parts = append(parts, fmt.Sprintf("Assistant responded: %s", c.truncate(content, 200)))
		case llm.RoleSystem:
			parts = append(parts, fmt.Sprintf("System instruction: %s", c.truncate(content, 100)))
		}
	}

	if len(parts) == 0 {
		return ""
	}

	return strings.Join(parts, "; ")
}

func (c *Compressor) truncate(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

func defaultTokenEstimator(text string) int {
	if text == "" {
		return 0
	}
	return len(text) / 4
}
