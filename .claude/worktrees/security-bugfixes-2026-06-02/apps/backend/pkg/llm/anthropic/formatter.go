package anthropic

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"dra-platform/backend/pkg/llm"
)

// ToInternalRequest converts an Anthropic MessageRequest to the unified llm.ChatRequest.
// Returns a zero-valued request on nil input to prevent panics.
func ToInternalRequest(req *MessageRequest) *llm.ChatRequest {
	if req == nil {
		return &llm.ChatRequest{}
	}
	internal := &llm.ChatRequest{
		Model:       req.Model,
		Stream:      req.Stream,
		System:      req.System,
		Temperature: req.Temperature,
		TopP:        req.TopP,
		TopK:        req.TopK,
	}
	if req.MaxTokens > 0 {
		internal.MaxTokens = &req.MaxTokens
	}
	if len(req.StopSequences) > 0 {
		internal.StopSequences = req.StopSequences
	}
	if len(req.Messages) > 0 {
		internal.Messages = make([]llm.Message, len(req.Messages))
		for i, m := range req.Messages {
			internal.Messages[i] = toInternalMessage(m)
		}
	}
	if len(req.Tools) > 0 {
		internal.Tools = make([]llm.ToolDefinition, len(req.Tools))
		for i, t := range req.Tools {
			internal.Tools[i] = llm.ToolDefinition{
				Type: "function",
				Function: llm.ToolFunction{
					Name:        t.Name,
					Description: t.Description,
					Parameters:  t.InputSchema,
				},
			}
		}
	}
	if req.ToolChoice != nil {
		var tc struct {
			Type string `json:"type"`
			Name string `json:"name,omitempty"`
		}
		if err := json.Unmarshal(req.ToolChoice, &tc); err == nil {
			switch tc.Type {
			case "any", "auto":
				internal.ToolChoice = tc.Type
			case "tool":
				internal.ToolChoice = tc.Name
			}
		}
	}
	if req.Thinking != nil && req.Thinking.Type == "enabled" {
		internal.Thinking = &llm.ThinkingConfig{
			Enabled:      true,
			BudgetTokens: req.Thinking.BudgetTokens,
		}
	}
	return internal
}

func toInternalMessage(m Message) llm.Message {
	msg := llm.Message{
		Role: llm.Role(m.Role),
		Name: m.Name,
	}
	if m.Content == nil {
		return msg
	}
	var raw interface{}
	if err := json.Unmarshal(m.Content, &raw); err != nil {
		msg.Content = string(m.Content)
		return msg
	}
	switch v := raw.(type) {
	case string:
		msg.Content = v
	case []interface{}:
		blocks := make([]llm.ContentBlock, 0, len(v))
		for _, item := range v {
			if b, ok := item.(map[string]interface{}); ok {
				cb := contentBlockFromMap(b)
				blocks = append(blocks, cb)
				if cb.Type == llm.ContentTypeText && cb.Text != "" {
					msg.Content += cb.Text
				}
				if cb.Type == llm.ContentTypeToolResult && cb.ToolResult != nil {
					msg.ToolCallID = cb.ToolResult.ToolUseID
					msg.Content = cb.ToolResult.Content
				}
			}
		}
		msg.ContentBlocks = blocks
	}
	return msg
}

func contentBlockFromMap(b map[string]interface{}) llm.ContentBlock {
	cb := llm.ContentBlock{}
	if t, ok := b["type"].(string); ok {
		cb.Type = llm.ContentType(t)
	}
	switch cb.Type {
	case llm.ContentTypeText:
		cb.Text, _ = b["text"].(string)
	case llm.ContentTypeImage:
		if img, ok := b["source"].(map[string]interface{}); ok {
			cb.ImageURL = &llm.ImageURL{}
			if data, ok := img["data"].(string); ok {
				mediaType, _ := img["media_type"].(string)
				cb.ImageURL.URL = fmt.Sprintf("data:%s;base64,%s", mediaType, data)
			}
		}
	case "tool_use":
		cb.Type = llm.ContentTypeToolUse
		cb.ToolUse = &llm.ToolUse{}
		cb.ToolUse.ID, _ = b["id"].(string)
		cb.ToolUse.Name, _ = b["name"].(string)
		if input, ok := b["input"]; ok {
			raw, _ := json.Marshal(input)
			cb.ToolUse.Input = raw
		}
	case "tool_result":
		cb.Type = llm.ContentTypeToolResult
		cb.ToolResult = &llm.ToolResult{}
		cb.ToolResult.ToolUseID, _ = b["tool_use_id"].(string)
		if c, ok := b["content"].(string); ok {
			cb.ToolResult.Content = c
		} else if cArr, ok := b["content"].([]interface{}); ok {
			var parts []string
			for _, part := range cArr {
				if p, ok := part.(map[string]interface{}); ok {
					if t, ok := p["text"].(string); ok {
						parts = append(parts, t)
					}
				}
			}
			cb.ToolResult.Content = strings.Join(parts, "")
		}
		if err, ok := b["is_error"].(bool); ok {
			cb.ToolResult.IsError = err
		}
	}
	return cb
}

// FromInternalResponse converts an internal llm.ChatResponse to an Anthropic MessageResponse.
// Returns nil on nil input to prevent panics.
func FromInternalResponse(resp *llm.ChatResponse) *MessageResponse {
	if resp == nil {
		return &MessageResponse{
			ID:   GenerateID(),
			Type: "message",
			Role: "assistant",
			Content: []ResponseBlock{{Type: "text", Text: ""}},
		}
	}

	blocks := make([]ResponseBlock, 0)

	for _, c := range resp.Choices {
		if len(c.Message.ContentBlocks) > 0 {
			for _, cb := range c.Message.ContentBlocks {
				switch cb.Type {
				case llm.ContentTypeText:
					blocks = append(blocks, ResponseBlock{
						Type: "text",
						Text: cb.Text,
					})
				case llm.ContentTypeThinking:
					blocks = append(blocks, ResponseBlock{
						Type:     "thinking",
						Thinking: cb.Thinking,
					})
				case llm.ContentTypeToolUse:
					blocks = append(blocks, ResponseBlock{
						Type:  "tool_use",
						ID:    cb.ToolUse.ID,
						Name:  cb.ToolUse.Name,
						Input: cb.ToolUse.Input,
					})
				}
			}
		} else {
			if c.Message.Content != "" {
				blocks = append(blocks, ResponseBlock{
					Type: "text",
					Text: c.Message.Content,
				})
			}
			if len(c.Message.ToolCalls) > 0 {
				for _, tc := range c.Message.ToolCalls {
					blocks = append(blocks, ResponseBlock{
						Type:  "tool_use",
						ID:    tc.ID,
						Name:  tc.Function.Name,
						Input: tc.Function.Arguments,
					})
				}
			}
		}
		if resp.Thinking != "" {
			alreadyHasThinking := false
			for _, b := range blocks {
				if b.Type == "thinking" {
					alreadyHasThinking = true
					break
				}
			}
			if !alreadyHasThinking {
				blocks = append(blocks, ResponseBlock{
					Type:     "thinking",
					Thinking: resp.Thinking,
				})
			}
		}
	}

	if len(blocks) == 0 {
		blocks = []ResponseBlock{{Type: "text", Text: ""}}
	}

	return &MessageResponse{
		ID:         resp.ID,
		Type:       "message",
		Role:       "assistant",
		Content:    blocks,
		Model:      resp.Model,
		StopReason: anthropicStopReason(resp.FinishReason),
		Usage: Usage{
			InputTokens:    resp.Usage.PromptTokens,
			OutputTokens:   resp.Usage.CompletionTokens,
			ThinkingTokens: resp.Usage.ThinkingTokens,
		},
	}
}

func anthropicStopReason(fr llm.FinishReason) string {
	switch fr {
	case llm.FinishReasonStop:
		return "end_turn"
	case llm.FinishReasonLength:
		return "max_tokens"
	case llm.FinishReasonToolCalls:
		return "tool_use"
	case llm.FinishReasonContentFilter:
		return "content_filter"
	case llm.FinishReasonEndTurn:
		return "end_turn"
	default:
		return string(fr)
	}
}

// StreamingState tracks the last emitted content block type for proper event sequencing.
type StreamingState struct {
	HasTextBlock     bool
	HasThinkingBlock bool
}

// FromInternalStreamChunk converts a unified stream chunk to Anthropic SSE events.
// A single internal chunk may produce multiple Anthropic events (text + thinking + finish).
// The state parameter tracks which content blocks have been started to correctly emit
// content_block_start / content_block_stop boundaries.
// Returns empty slice on nil chunk to prevent panics.
func FromInternalStreamChunk(chunk *llm.StreamChunk, state *StreamingState) []StreamEvent {
	if chunk == nil {
		return nil
	}
	if state == nil {
		state = &StreamingState{}
	}
	var events []StreamEvent

	// content_block_start for text if not started yet and we have content
	if chunk.Delta.Content != "" && !state.HasTextBlock {
		events = append(events, StreamEvent{
			Type:  "content_block_start",
			Index: chunk.Index,
			ContentBlock: &ResponseBlock{
				Type: "text",
				Text: "",
			},
		})
		state.HasTextBlock = true
	}

	if chunk.Delta.Content != "" {
		events = append(events, StreamEvent{
			Type:  "content_block_delta",
			Index: chunk.Index,
			Delta: &StreamDelta{
				Type: "text_delta",
				Text: chunk.Delta.Content,
			},
		})
	}

	// content_block_start for thinking if not started yet
	if chunk.Thinking != "" && !state.HasThinkingBlock {
		events = append(events, StreamEvent{
			Type:  "content_block_start",
			Index: chunk.Index,
			ContentBlock: &ResponseBlock{
				Type:     "thinking",
				Thinking: "",
			},
		})
		state.HasThinkingBlock = true
	}

	if chunk.Thinking != "" {
		events = append(events, StreamEvent{
			Type:  "content_block_delta",
			Index: chunk.Index,
			Delta: &StreamDelta{
				Type:     "thinking_delta",
				Thinking: chunk.Thinking,
			},
		})
	}

	if chunk.FinishReason != nil {
		// Stop any open content blocks before message_delta
		if state.HasTextBlock {
			events = append(events, StreamEvent{
				Type:  "content_block_stop",
				Index: chunk.Index,
			})
		}
		if state.HasThinkingBlock {
			events = append(events, StreamEvent{
				Type:  "content_block_stop",
				Index: chunk.Index,
			})
		}
		events = append(events, StreamEvent{
			Type: "message_delta",
			Delta: &StreamDelta{
				Type:       "message_delta",
				StopReason: anthropicStopReason(*chunk.FinishReason),
			},
			Usage: anthropicUsage(chunk.Usage),
		})
	}

	return events
}

func anthropicUsage(u *llm.Usage) *Usage {
	if u == nil {
		return nil
	}
	return &Usage{
		InputTokens:    u.PromptTokens,
		OutputTokens:   u.CompletionTokens,
		ThinkingTokens: u.ThinkingTokens,
	}
}

// GenerateID creates a unique message ID in Anthropic format.
func GenerateID() string {
	return fmt.Sprintf("msg_%d", time.Now().UnixNano())
}
