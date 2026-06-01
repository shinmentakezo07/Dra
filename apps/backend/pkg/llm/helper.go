package llm

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
	"unicode/utf8"
)

// CacheKey generates a deterministic cache key for a request.
func CacheKey(req *ChatRequest) string {
	// Create a stable representation for caching
	h := sha256.New()

	// Tenant identity MUST be hashed first. Without it, identical prompts
	// across users would share a cache entry (cross-tenant poisoning) and
	// the wrong user would receive the wrong response, while the wrong
	// user's quota would not be decremented.
	h.Write([]byte("tenant|"))
	if req.Metadata != nil {
		if uid, ok := req.Metadata["user_id"]; ok {
			h.Write([]byte(uid))
		}
		h.Write([]byte("|"))
		if vk, ok := req.Metadata["virtual_key_id"]; ok {
			h.Write([]byte(vk))
		}
		h.Write([]byte("|"))
		if tid, ok := req.Metadata["tenant_id"]; ok {
			h.Write([]byte(tid))
		}
	}

	// Hash model
	h.Write([]byte("|model|"))
	h.Write([]byte(req.Model))

	// Hash system prompt
	h.Write([]byte("|system|"))
	h.Write([]byte(req.System))

	// Hash messages in order
	h.Write([]byte("|messages|"))
	for _, m := range req.Messages {
		h.Write([]byte(m.Role))
		h.Write([]byte(m.Content))
		if m.ToolCallID != "" {
			h.Write([]byte(m.ToolCallID))
		}
	}

	// Hash tools if present
	if len(req.Tools) > 0 {
		toolJSON, _ := json.Marshal(req.Tools)
		h.Write([]byte("|tools|"))
		h.Write(toolJSON)
	}

	// Hash temperature if set
	if req.Temperature != nil {
		h.Write([]byte(fmt.Sprintf("|temp=%.4f", *req.Temperature)))
	}

	// Hash max_tokens if set
	if req.MaxTokens != nil {
		h.Write([]byte(fmt.Sprintf("|maxtok=%d", *req.MaxTokens)))
	}

	// Hash thinking config if present
	if req.Thinking != nil {
		thinkJSON, _ := json.Marshal(req.Thinking)
		h.Write([]byte("|thinking|"))
		h.Write(thinkJSON)
	}

	return hex.EncodeToString(h.Sum(nil))
}

// EstimateTokens estimates token count using a simple heuristic.
// For production, use tiktoken or a proper tokenizer.
func EstimateTokens(text string) int {
	if text == "" {
		return 0
	}

	// Approach 1: Character-based heuristic (4 chars ≈ 1 token for English)
	charEstimate := utf8.RuneCountInString(text) / 4

	// Approach 2: Word-based heuristic (0.75 words ≈ 1 token)
	words := strings.Fields(text)
	wordEstimate := int(float64(len(words)) * 1.33)

	// Approach 3: Count code blocks differently
	codeBlocks := countCodeBlocks(text)
	if codeBlocks > 0 {
		// Code tends to have higher token density
		wordEstimate = int(float64(wordEstimate) * 1.2)
	}

	// Take average of estimates
	avg := (charEstimate + wordEstimate) / 2

	// Minimum of 1 token per message
	if avg < 1 {
		avg = 1
	}

	return avg
}

// EstimateMessageTokens estimates tokens for a slice of messages.
func EstimateMessageTokens(messages []Message) int {
	total := 0
	for _, m := range messages {
		total += EstimateTokens(m.Content)
		// Add overhead per message (role, formatting)
		total += 4
	}
	// Add conversation overhead
	if len(messages) > 0 {
		total += 2
	}
	return total
}

// EstimateRequestTokens estimates total tokens for a request.
func EstimateRequestTokens(req *ChatRequest) int {
	total := EstimateMessageTokens(req.Messages)
	if req.System != "" {
		total += EstimateTokens(req.System) + 4
	}
	return total
}

// IsWithinContextWindow checks if a request fits within the model's context window.
func IsWithinContextWindow(req *ChatRequest, contextWindow int) bool {
	estimated := EstimateRequestTokens(req)
	maxTokens := 0
	if req.MaxTokens != nil {
		maxTokens = *req.MaxTokens
	}
	// Default max_tokens if not specified
	if maxTokens == 0 {
		maxTokens = 4096
	}
	return estimated+maxTokens <= contextWindow
}

// ClampTemperature clamps temperature to valid range [0, 2].
func ClampTemperature(t float64) float64 {
	if t < 0 {
		return 0
	}
	if t > 2 {
		return 2
	}
	return t
}

// ClampTopP clamps top_p to valid range [0, 1].
func ClampTopP(t float64) float64 {
	if t < 0 {
		return 0
	}
	if t > 1 {
		return 1
	}
	return t
}

// DefaultMaxTokens returns a default max_tokens value based on model.
func DefaultMaxTokens(model string) int {
	lower := strings.ToLower(model)
	switch {
	case strings.Contains(lower, "opus"):
		return 8192
	case strings.Contains(lower, "sonnet"):
		return 8192
	case strings.Contains(lower, "haiku"):
		return 4096
	case strings.Contains(lower, "o1") || strings.Contains(lower, "o3"):
		return 32768
	case strings.Contains(lower, "gpt-4"):
		return 8192
	case strings.Contains(lower, "gpt-3.5"):
		return 4096
	default:
		return 4096
	}
}

// ParseModelID splits "provider/model-id" into provider and model.
func ParseModelID(id string) (provider, model string) {
	parts := strings.SplitN(id, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", id
}

// NormalizeModelName normalizes a model name for comparison.
func NormalizeModelName(name string) string {
	lower := strings.ToLower(name)
	// Remove common prefixes for comparison
	lower = strings.TrimPrefix(lower, "anthropic/")
	lower = strings.TrimPrefix(lower, "openai/")
	return lower
}

// IsStreamingModel checks if a model supports streaming.
func IsStreamingModel(model string) bool {
	// Most modern models support streaming
	return true
}

// IsVisionModel checks if a model supports vision.
func IsVisionModel(model string) bool {
	lower := strings.ToLower(model)
	visionModels := []string{"gpt-4o", "claude-3", "claude-sonnet", "claude-opus", "gemini", "llava"}
	for _, vm := range visionModels {
		if strings.Contains(lower, vm) {
			return true
		}
	}
	return false
}

// IsThinkingModel checks if a model supports thinking/reasoning.
func IsThinkingModel(model string) bool {
	lower := strings.ToLower(model)
	thinkingModels := []string{"o1", "o3", "opus", "deepseek-r1", "kimi-k2", "claude-sonnet-4"}
	for _, tm := range thinkingModels {
		if strings.Contains(lower, tm) {
			return true
		}
	}
	return false
}

// IsToolModel checks if a model supports tool calling.
func IsToolModel(model string) bool {
	lower := strings.ToLower(model)
	// Most modern models support tools
	nonToolModels := []string{"gpt-3.5-turbo-instruct", "text-"}
	for _, ntm := range nonToolModels {
		if strings.Contains(lower, ntm) {
			return false
		}
	}
	return true
}

// FormatMessagesForLog formats messages for logging.
func FormatMessagesForLog(messages []Message) string {
	var parts []string
	for _, m := range messages {
		content := m.Content
		if len(content) > 100 {
			content = content[:100] + "..."
		}
		parts = append(parts, fmt.Sprintf("[%s]: %s", m.Role, content))
	}
	return strings.Join(parts, " | ")
}

// TruncateMessages truncates messages to fit within token budget.
func TruncateMessages(messages []Message, maxTokens int) []Message {
	estimated := EstimateMessageTokens(messages)
	if estimated <= maxTokens {
		return messages
	}

	// Strategy: keep system message, then most recent messages
	var result []Message
	var systemMsg *Message
	for i := range messages {
		if messages[i].Role == RoleSystem {
			msg := messages[i]
			systemMsg = &msg
			break
		}
	}

	if systemMsg != nil {
		result = append(result, *systemMsg)
		maxTokens -= EstimateTokens(systemMsg.Content) + 4
	}

	// Work backwards from most recent
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == RoleSystem {
			continue
		}
		msgTokens := EstimateTokens(messages[i].Content) + 4
		if msgTokens <= maxTokens {
			result = append([]Message{messages[i]}, result...)
			maxTokens -= msgTokens
		} else {
			break
		}
	}

	return result
}

// MergeContentBlocks merges content blocks into a single content string.
func MergeContentBlocks(blocks []ContentBlock) string {
	var parts []string
	for _, b := range blocks {
		switch b.Type {
		case ContentTypeText:
			parts = append(parts, b.Text)
		case ContentTypeThinking:
			parts = append(parts, b.Thinking)
		}
	}
	return strings.Join(parts, "")
}

// ExtractThinking extracts thinking content from content blocks.
func ExtractThinking(blocks []ContentBlock) string {
	var parts []string
	for _, b := range blocks {
		if b.Type == ContentTypeThinking {
			parts = append(parts, b.Thinking)
		}
	}
	return strings.Join(parts, "")
}

// SanitizeContent removes potentially harmful content patterns.
func SanitizeContent(content string) string {
	// Remove null bytes
	content = strings.ReplaceAll(content, "\x00", "")
	// Remove control characters except newlines and tabs
	content = regexp.MustCompile(`[\x00-\x08\x0B-\x0C\x0E-\x1F]`).ReplaceAllString(content, "")
	return content
}

// ValidateRequest validates a chat request without mutating it.
func ValidateRequest(req *ChatRequest) error {
	if req.Model == "" {
		return fmt.Errorf("model is required")
	}
	if len(req.Messages) == 0 {
		return fmt.Errorf("at least one message is required")
	}
	for i, m := range req.Messages {
		if m.Role == "" {
			return fmt.Errorf("message %d: role is required", i)
		}
		if m.Content == "" && len(m.ContentBlocks) == 0 && len(m.ToolCalls) == 0 {
			return fmt.Errorf("message %d: content or tool_calls is required", i)
		}
	}
	if req.Temperature != nil {
		if *req.Temperature < 0 || *req.Temperature > 2 {
			return fmt.Errorf("temperature must be between 0 and 2")
		}
	}
	if req.TopP != nil {
		if *req.TopP < 0 || *req.TopP > 1 {
			return fmt.Errorf("top_p must be between 0 and 1")
		}
	}
	return nil
}

// Cost calculates the cost in USD for a request.
func Cost(inputTokens, outputTokens int, inputPricePer1k, outputPricePer1k float64) float64 {
	inputCost := float64(inputTokens) * inputPricePer1k / 1000
	outputCost := float64(outputTokens) * outputPricePer1k / 1000
	return math.Round((inputCost+outputCost)*1e6) / 1e6
}

// BuildSystemMessage creates a system message from string.
func BuildSystemMessage(content string) Message {
	return Message{Role: RoleSystem, Content: content}
}

// BuildUserMessage creates a user message from string.
func BuildUserMessage(content string) Message {
	return Message{Role: RoleUser, Content: content}
}

// BuildAssistantMessage creates an assistant message from string.
func BuildAssistantMessage(content string) Message {
	return Message{Role: RoleAssistant, Content: content}
}

// BuildToolResultMessage creates a tool result message.
func BuildToolResultMessage(toolCallID, content string, isError bool) Message {
	msg := Message{
		Role:       RoleTool,
		Content:    content,
		ToolCallID: toolCallID,
	}
	if isError {
		msg.Metadata = map[string]any{"is_error": true}
	}
	return msg
}

// DeepCopyRequest creates a deep copy of a ChatRequest.
// Bug #58: deep-copies ContentBlocks and Metadata in messages to prevent mutation.
func DeepCopyRequest(req *ChatRequest) *ChatRequest {
	if req == nil {
		return nil
	}
	cpy := *req
	cpy.Messages = make([]Message, len(req.Messages))
	for i, m := range req.Messages {
		cpy.Messages[i] = m
		cpy.Messages[i].Content = strings.Clone(m.Content)
		// Deep copy ContentBlocks
		if len(m.ContentBlocks) > 0 {
			blocks := make([]ContentBlock, len(m.ContentBlocks))
			copy(blocks, m.ContentBlocks)
			cpy.Messages[i].ContentBlocks = blocks
		}
		// Deep copy Metadata map
		if m.Metadata != nil {
			meta := make(map[string]any, len(m.Metadata))
			for k, v := range m.Metadata {
				meta[k] = v
			}
			cpy.Messages[i].Metadata = meta
		}
	}
	cpy.Tools = make([]ToolDefinition, len(req.Tools))
	copy(cpy.Tools, req.Tools)
	cpy.StopSequences = make([]string, len(req.StopSequences))
	copy(cpy.StopSequences, req.StopSequences)
	if req.Temperature != nil {
		t := *req.Temperature
		cpy.Temperature = &t
	}
	if req.MaxTokens != nil {
		m := *req.MaxTokens
		cpy.MaxTokens = &m
	}
	if req.TopP != nil {
		t := *req.TopP
		cpy.TopP = &t
	}
	if req.TopK != nil {
		k := *req.TopK
		cpy.TopK = &k
	}
	if req.Thinking != nil {
		t := *req.Thinking
		cpy.Thinking = &t
	}
	if req.ResponseFormat != nil {
		rf := *req.ResponseFormat
		cpy.ResponseFormat = &rf
	}
	return &cpy
}

func countCodeBlocks(text string) int {
	return strings.Count(text, "```")
}
