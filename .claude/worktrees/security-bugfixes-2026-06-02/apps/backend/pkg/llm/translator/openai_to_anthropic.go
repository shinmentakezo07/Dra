package translator

import (
	"encoding/json"
	"fmt"
	"time"

	"dra-platform/backend/pkg/llm"
)

// OpenAIToAnthropicTranslator translates OpenAI requests to Anthropic-compatible format.
type OpenAIToAnthropicTranslator struct {
	BaseTranslator
}

// NewOpenAIToAnthropic creates a new OpenAI to Anthropic translator.
func NewOpenAIToAnthropic() *OpenAIToAnthropicTranslator {
	return &OpenAIToAnthropicTranslator{}
}

// Direction returns the translation direction.
func (t *OpenAIToAnthropicTranslator) Direction() Direction {
	return OpenAIToAnthropic
}

// TranslateRequest converts an OpenAI-style request to Anthropic format.
func (t *OpenAIToAnthropicTranslator)TranslateRequest(req *llm.ChatRequest) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"model":  req.Model,
		"messages": t.BuildAnthropicMessages(req.Messages),
		"stream": req.Stream,
	}

	// Anthropic requires max_tokens
	maxTokens := 4096
	if req.MaxTokens != nil {
		maxTokens = *req.MaxTokens
	}
	body["max_tokens"] = maxTokens

	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if req.TopP != nil {
		body["top_p"] = *req.TopP
	}
	if req.TopK != nil {
		body["top_k"] = *req.TopK
	}
	if len(req.StopSequences) > 0 {
		body["stop_sequences"] = req.StopSequences
	}

	// Handle system prompt - Anthropic uses top-level "system"
	if req.System != "" {
		body["system"] = req.System
	}

	// Handle thinking config
	if req.Thinking != nil && req.Thinking.Enabled {
		body["thinking"] = map[string]interface{}{
			"type":         "enabled",
			"budget_tokens": req.Thinking.BudgetTokens,
		}
		if req.Thinking.BudgetTokens == 0 {
			body["thinking"].(map[string]interface{})["budget_tokens"] = 4096
		}
	}

	// Handle tools
	if len(req.Tools) > 0 {
		tools := make([]map[string]interface{}, len(req.Tools))
		for i, tool := range req.Tools {
			tools[i] = map[string]interface{}{
				"name":        tool.Function.Name,
				"description": tool.Function.Description,
				"input_schema": rawMessageToInterface(tool.Function.Parameters),
			}
		}
		body["tools"] = tools
		if req.ToolChoice != "" {
			if req.ToolChoice == "auto" || req.ToolChoice == "any" {
				body["tool_choice"] = map[string]interface{}{
					"type": req.ToolChoice,
				}
			} else {
				// Named tool
				body["tool_choice"] = map[string]interface{}{
					"type": "tool",
					"name": req.ToolChoice,
				}
			}
		}
	}

	return body, nil
}

// TranslateResponse converts an Anthropic response to unified format.
func (t *OpenAIToAnthropicTranslator)TranslateResponse(body []byte, model, provider string) (*llm.ChatResponse, error) {
	content, thinking, usage, finishReason, err := t.ExtractAnthropicContent(body)
	if err != nil {
		return nil, err
	}

	var anthropicResp struct {
		ID      string `json:"id"`
		Type    string `json:"type"`
		Role    string `json:"role"`
		Content []struct {
			Type     string          `json:"type"`
			Text     string          `json:"text"`
			Thinking string          `json:"thinking"`
			Id       string          `json:"id"`
			Name     string          `json:"name"`
			Input    json.RawMessage `json:"input"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
			ThinkingTokens int `json:"thinking_tokens,omitempty"`
		} `json:"usage"`
		StopReason string `json:"stop_reason"`
	}
	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		return nil, fmt.Errorf("unmarshal anthropic response: %w", err)
	}

	// Extract tool calls from content blocks
	var toolCalls []llm.ToolCall
	var contentBlocks []llm.ContentBlock
	for _, c := range anthropicResp.Content {
		switch c.Type {
		case "tool_use":
			toolCalls = append(toolCalls, llm.ToolCall{
				ID:   c.Id,
				Type: "function",
				Function: llm.ToolCallFunction{
					Name:      c.Name,
					Arguments: c.Input,
				},
			})
		case "text":
			contentBlocks = append(contentBlocks, llm.ContentBlock{
				Type: llm.ContentTypeText,
				Text: c.Text,
			})
		case "thinking":
			contentBlocks = append(contentBlocks, llm.ContentBlock{
				Type:     llm.ContentTypeThinking,
				Thinking: c.Thinking,
			})
		}
	}

	msg := llm.Message{
		Role:          llm.RoleAssistant,
		Content:       content,
		ContentBlocks: contentBlocks,
	}
	if len(toolCalls) > 0 {
		msg.ToolCalls = toolCalls
	}

	return &llm.ChatResponse{
		ID:           anthropicResp.ID,
		Object:       "chat.completion",
		Created:      time.Now().Unix(),
		Model:        model,
		Provider:     provider,
		Choices:      []llm.Choice{{Index: 0, Message: msg, FinishReason: finishReason}},
		Usage:        usage,
		Thinking:     thinking,
		FinishReason: finishReason,
	}, nil
}

// TranslateStreamChunk converts an Anthropic stream chunk to unified format.
func (t *OpenAIToAnthropicTranslator)TranslateStreamChunk(data []byte, model, provider string) (*llm.StreamChunk, error) {
	var chunk struct {
		Type    string `json:"type"`
		Index   int    `json:"index"`
		Delta   struct {
			Type           string `json:"type"`
			Text           string `json:"text"`
			Thinking       string `json:"thinking"`
			PartialThinking string `json:"partial_thinking"`
			StopReason     string `json:"stop_reason"`
		} `json:"delta"`
		ContentBlock struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content_block"`
		Message struct {
			Usage struct {
				InputTokens  int `json:"input_tokens"`
				OutputTokens int `json:"output_tokens"`
				ThinkingTokens int `json:"thinking_tokens,omitempty"`
			} `json:"usage"`
		} `json:"message"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
			ThinkingTokens int `json:"thinking_tokens,omitempty"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(data, &chunk); err != nil {
		return nil, fmt.Errorf("unmarshal anthropic stream chunk: %w", err)
	}

	// Handle different event types
	switch chunk.Type {
	case "message_start":
		return &llm.StreamChunk{
			Object:   "chat.completion.chunk",
			Created:  time.Now().Unix(),
			Model:    model,
			Provider: provider,
		}, nil
	case "content_block_start":
		content := ""
		if chunk.ContentBlock.Type == "text" {
			content = chunk.ContentBlock.Text
		}
		return &llm.StreamChunk{
			Object:   "chat.completion.chunk",
			Created:  time.Now().Unix(),
			Model:    model,
			Provider: provider,
			Delta: llm.Message{
				Role:    llm.RoleAssistant,
				Content: content,
			},
		}, nil
	case "content_block_delta":
		content := ""
		thinking := ""
		if chunk.Delta.Type == "text_delta" || chunk.Delta.Type == "" {
			content = chunk.Delta.Text
		}
		if chunk.Delta.Type == "thinking_delta" {
			thinking = chunk.Delta.Thinking
		}
		if chunk.Delta.Type == "partial_thinking_delta" {
			thinking = chunk.Delta.PartialThinking
		}
		return &llm.StreamChunk{
			Object:   "chat.completion.chunk",
			Created:  time.Now().Unix(),
			Model:    model,
			Provider: provider,
			Delta: llm.Message{
				Role:    llm.RoleAssistant,
				Content: content,
			},
			Thinking: thinking,
		}, nil
	case "content_block_stop":
		return nil, nil
	case "message_delta":
		var finishReason *llm.FinishReason
		if chunk.Delta.StopReason != "" {
			fr := llm.FinishReason(chunk.Delta.StopReason)
			finishReason = &fr
		}
		return &llm.StreamChunk{
			Object:       "chat.completion.chunk",
			Created:      time.Now().Unix(),
			Model:        model,
			Provider:     provider,
			FinishReason: finishReason,
		}, nil
	case "message_stop":
		return &llm.StreamChunk{
			Object:   "chat.completion.chunk",
			Created:  time.Now().Unix(),
			Model:    model,
			Provider: provider,
		}, nil
	default:
		return nil, nil
	}
}

// ExtractAnthropicContent extracts content from an Anthropic-style response.
func (t *OpenAIToAnthropicTranslator)ExtractAnthropicContent(body []byte) (string, string, llm.Usage, llm.FinishReason, error) {
	return t.BaseTranslator.ExtractAnthropicContent(body)
}
