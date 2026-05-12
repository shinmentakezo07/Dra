package translator

import (
	"encoding/json"
	"fmt"

	"dra-platform/backend/pkg/llm"
)

// AnthropicToOpenAITranslator translates Anthropic requests to OpenAI-compatible format.
type AnthropicToOpenAITranslator struct {
	BaseTranslator
}

// NewAnthropicToOpenAI creates a new Anthropic to OpenAI translator.
func NewAnthropicToOpenAI() *AnthropicToOpenAITranslator {
	return &AnthropicToOpenAITranslator{}
}

// Direction returns the translation direction.
func (t *AnthropicToOpenAITranslator) Direction() Direction {
	return AnthropicToOpenAI
}

// TranslateRequest converts an Anthropic-style request to OpenAI format.
func (t *AnthropicToOpenAITranslator)TranslateRequest(req *llm.ChatRequest) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"model":    req.Model,
		"messages": t.BuildOpenAIMessages(req.Messages, req.System),
		"stream":   req.Stream,
	}

	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		body["max_tokens"] = *req.MaxTokens
	}
	if req.TopP != nil {
		body["top_p"] = *req.TopP
	}
	if len(req.StopSequences) > 0 {
		body["stop"] = req.StopSequences
	}

	// Handle tools
	if len(req.Tools) > 0 {
		tools := make([]map[string]interface{}, len(req.Tools))
		for i, tool := range req.Tools {
			tools[i] = map[string]interface{}{
				"type": "function",
				"function": map[string]interface{}{
					"name":        tool.Function.Name,
					"description": tool.Function.Description,
					"parameters":  json.RawMessage(tool.Function.Parameters),
				},
			}
		}
		body["tools"] = tools
		if req.ToolChoice != "" {
			body["tool_choice"] = req.ToolChoice
		}
	}

	// Handle thinking config by converting to reasoning_effort for o1/o3 models
	if req.Thinking != nil && req.Thinking.Enabled {
		if llm.IsThinkingModel(req.Model) {
			// For OpenAI reasoning models, map thinking budget to reasoning_effort
			effort := "medium"
			switch {
			case req.Thinking.BudgetTokens > 16000:
				effort = "high"
			case req.Thinking.BudgetTokens < 4000:
				effort = "low"
			}
			body["reasoning_effort"] = effort
		}
	}

	// Handle response format
	if req.ResponseFormat != nil {
		body["response_format"] = map[string]interface{}{
			"type": req.ResponseFormat.Type,
		}
		if req.ResponseFormat.JSONSchema != nil {
			body["response_format"].(map[string]interface{})["json_schema"] = req.ResponseFormat.JSONSchema
		}
	}

	return body, nil
}

// TranslateResponse converts an OpenAI response to unified format.
func (t *AnthropicToOpenAITranslator)TranslateResponse(body []byte, model, provider string) (*llm.ChatResponse, error) {
	_, usage, finishReason, err := t.ExtractOpenAIContent(body, model)
	if err != nil {
		return nil, err
	}

	var openaiResp struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		Choices []struct {
			Message struct {
				Role      string `json:"role"`
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens            int `json:"prompt_tokens"`
			CompletionTokens        int `json:"completion_tokens"`
			TotalTokens             int `json:"total_tokens"`
			CompletionTokensDetails struct {
				ReasoningTokens int `json:"reasoning_tokens,omitempty"`
			} `json:"completion_tokens_details,omitempty"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(body, &openaiResp); err != nil {
		return nil, fmt.Errorf("unmarshal openai response: %w", err)
	}

	thinking := ""
	if openaiResp.Usage.CompletionTokensDetails.ReasoningTokens > 0 {
		thinking = fmt.Sprintf("[Reasoning used %d tokens]", openaiResp.Usage.CompletionTokensDetails.ReasoningTokens)
	}

	choices := make([]llm.Choice, len(openaiResp.Choices))
	for i, c := range openaiResp.Choices {
		msg := llm.Message{
			Role:    llm.Role(c.Message.Role),
			Content: c.Message.Content,
		}

		// Convert tool calls
		if len(c.Message.ToolCalls) > 0 {
			msg.ToolCalls = make([]llm.ToolCall, len(c.Message.ToolCalls))
			for j, tc := range c.Message.ToolCalls {
				msg.ToolCalls[j] = llm.ToolCall{
					ID:   tc.ID,
					Type: tc.Type,
					Function: llm.ToolCallFunction{
						Name:      tc.Function.Name,
						Arguments: json.RawMessage(tc.Function.Arguments),
					},
				}
			}
		}

		choices[i] = llm.Choice{
			Index:        i,
			Message:      msg,
			FinishReason: llm.FinishReason(c.FinishReason),
		}
	}

	return &llm.ChatResponse{
		ID:           openaiResp.ID,
		Object:       openaiResp.Object,
		Created:      openaiResp.Created,
		Model:        model,
		Provider:     provider,
		Choices:      choices,
		Usage:        usage,
		Thinking:     thinking,
		FinishReason: finishReason,
	}, nil
}

// TranslateStreamChunk converts an OpenAI stream chunk to unified format.
func (t *AnthropicToOpenAITranslator)TranslateStreamChunk(data []byte, model, provider string) (*llm.StreamChunk, error) {
	var chunk struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		Model   string `json:"model"`
		Choices []struct {
			Index        int `json:"index"`
			Delta        struct {
				Role       string `json:"role"`
				Content    string `json:"content"`
				ToolCalls  []struct {
					Index    int    `json:"index"`
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"delta"`
			FinishReason *string `json:"finish_reason"`
		} `json:"choices"`
		Usage *struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage,omitempty"`
	}
	if err := json.Unmarshal(data, &chunk); err != nil {
		return nil, fmt.Errorf("unmarshal stream chunk: %w", err)
	}

	if len(chunk.Choices) == 0 {
		// Could be a usage-only chunk
		if chunk.Usage != nil {
			return &llm.StreamChunk{
				ID:       chunk.ID,
				Object:   chunk.Object,
				Created:  chunk.Created,
				Model:    model,
				Provider: provider,
				Usage: &llm.Usage{
					PromptTokens:     chunk.Usage.PromptTokens,
					CompletionTokens: chunk.Usage.CompletionTokens,
					TotalTokens:      chunk.Usage.TotalTokens,
				},
			}, nil
		}
		return nil, nil
	}

	choice := chunk.Choices[0]

	delta := llm.Message{
		Role:    llm.Role(choice.Delta.Role),
		Content: choice.Delta.Content,
	}

	// Handle streaming tool calls
	if len(choice.Delta.ToolCalls) > 0 {
		delta.ToolCalls = make([]llm.ToolCall, len(choice.Delta.ToolCalls))
		for i, tc := range choice.Delta.ToolCalls {
			delta.ToolCalls[i] = llm.ToolCall{
				ID:   tc.ID,
				Type: tc.Type,
				Function: llm.ToolCallFunction{
					Name:      tc.Function.Name,
					Arguments: json.RawMessage(tc.Function.Arguments),
				},
			}
		}
	}

	var usage *llm.Usage
	if chunk.Usage != nil {
		usage = &llm.Usage{
			PromptTokens:     chunk.Usage.PromptTokens,
			CompletionTokens: chunk.Usage.CompletionTokens,
			TotalTokens:      chunk.Usage.TotalTokens,
		}
	}

	var finishReason *llm.FinishReason
	if choice.FinishReason != nil {
		fr := llm.FinishReason(*choice.FinishReason)
		finishReason = &fr
	}

	return &llm.StreamChunk{
		ID:           chunk.ID,
		Object:       chunk.Object,
		Created:      chunk.Created,
		Model:        model,
		Provider:     provider,
		Index:        choice.Index,
		Delta:        delta,
		FinishReason: finishReason,
		Usage:        usage,
	}, nil
}

// ExtractOpenAIContent extracts content from an OpenAI-style response with model info.
func (t *AnthropicToOpenAITranslator)ExtractOpenAIContent(body []byte, model string) (string, llm.Usage, llm.FinishReason, error) {
	return t.BaseTranslator.ExtractOpenAIContent(body)
}
