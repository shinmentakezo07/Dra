package openai

import (
	"encoding/json"
	"fmt"
	"time"

	"dra-platform/backend/pkg/llm"
)

func ToInternalRequest(req *ChatCompletionRequest) *llm.ChatRequest {
	if req == nil {
		return &llm.ChatRequest{}
	}
	internal := &llm.ChatRequest{
		Model:           req.Model,
		Stream:          req.Stream,
		Tools:           req.Tools,
		Temperature:     req.Temperature,
		MaxTokens:       req.MaxTokens,
		TopP:            req.TopP,
		ResponseFormat:  req.ResponseFormat,
	}

	if req.Stop != nil {
		switch v := req.Stop.(type) {
		case string:
			internal.StopSequences = []string{v}
		case []string:
			internal.StopSequences = v
		}
	}

	internal.Messages = make([]llm.Message, len(req.Messages))
	for i, m := range req.Messages {
		internal.Messages[i] = toInternalMessage(m)
	}

	return internal
}

func toInternalMessage(m ChatMessage) llm.Message {
	msg := llm.Message{
		Role:       llm.Role(m.Role),
		ToolCallID: m.ToolCallID,
		Name:       m.Name,
	}

	if m.Content != nil {
		switch v := m.Content.(type) {
		case string:
			msg.Content = v
		case []interface{}:
			for _, part := range v {
				if p, ok := part.(map[string]interface{}); ok {
					cb := llm.ContentBlock{}
					if typeStr, ok := p["type"].(string); ok {
						cb.Type = llm.ContentType(typeStr)
					}
					if txt, ok := p["text"].(string); ok {
						cb.Text = txt
					}
					if img, ok := p["image_url"].(map[string]interface{}); ok {
						cb.ImageURL = &llm.ImageURL{
							URL:    fmt.Sprint(img["url"]),
							Detail: fmt.Sprint(img["detail"]),
						}
					}
					msg.ContentBlocks = append(msg.ContentBlocks, cb)
				}
			}
		}
	}

	if len(m.ToolCalls) > 0 {
		msg.ToolCalls = make([]llm.ToolCall, len(m.ToolCalls))
		for i, tc := range m.ToolCalls {
			msg.ToolCalls[i] = llm.ToolCall{
				ID:   tc.ID,
				Type: tc.Type,
				Function: llm.ToolCallFunction{
					Name:      tc.Function.Name,
					Arguments: json.RawMessage(tc.Function.Arguments),
				},
			}
		}
	}

	return msg
}

func FromInternalResponse(resp *llm.ChatResponse) *ChatCompletionResponse {
	if resp == nil {
		return &ChatCompletionResponse{
			ID:     generateID(),
			Object: "chat.completion",
			Choices: []Choice{{
				Index: 0,
				Message: ChatMessage{
					Role:    "assistant",
					Content: "",
				},
			}},
		}
	}
	choices := make([]Choice, len(resp.Choices))
	for i, c := range resp.Choices {
		choices[i] = Choice{
			Index:        c.Index,
			Message:      fromInternalMessage(c.Message),
			FinishReason: string(c.FinishReason),
		}
	}

	return &ChatCompletionResponse{
		ID:      resp.ID,
		Object:  "chat.completion",
		Created: resp.Created,
		Model:   resp.Model,
		Choices: choices,
		Usage: Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}
}

func fromInternalMessage(m llm.Message) ChatMessage {
	msg := ChatMessage{
		Role:       string(m.Role),
		ToolCallID: m.ToolCallID,
		Name:       m.Name,
	}

	if len(m.ContentBlocks) > 0 {
		parts := make([]ContentPart, len(m.ContentBlocks))
		for i, cb := range m.ContentBlocks {
			parts[i] = ContentPart{
				Type: string(cb.Type),
				Text: cb.Text,
			}
			if cb.ImageURL != nil {
				parts[i].ImageURL = &ImageURL{
					URL:    cb.ImageURL.URL,
					Detail: cb.ImageURL.Detail,
				}
			}
		}
		msg.Content = parts
	} else {
		msg.Content = m.Content
	}

	if len(m.ToolCalls) > 0 {
		msg.ToolCalls = make([]ToolCall, len(m.ToolCalls))
		for i, tc := range m.ToolCalls {
			msg.ToolCalls[i] = ToolCall{
				ID:   tc.ID,
				Type: tc.Type,
				Function: ToolCallFunction{
					Name:      tc.Function.Name,
					Arguments: string(tc.Function.Arguments),
				},
			}
		}
	}

	return msg
}

func FromInternalStreamChunk(chunk *llm.StreamChunk) *ChatCompletionChunk {
	if chunk == nil {
		return nil
	}
	finishReason := ""
	if chunk.FinishReason != nil {
		finishReason = string(*chunk.FinishReason)
	}

	var usage *Usage
	if chunk.Usage != nil {
		usage = &Usage{
			PromptTokens:     chunk.Usage.PromptTokens,
			CompletionTokens: chunk.Usage.CompletionTokens,
			TotalTokens:      chunk.Usage.TotalTokens,
		}
	}

	return &ChatCompletionChunk{
		ID:      chunk.ID,
		Object:  "chat.completion.chunk",
		Created: chunk.Created,
		Model:   chunk.Model,
		Choices: []ChunkChoice{{
			Index: chunk.Index,
			Delta: ChatMessage{
				Role:    string(chunk.Delta.Role),
				Content: chunk.Delta.Content,
			},
			FinishReason: &finishReason,
		}},
		Usage: usage,
	}
}

func FromInternalModels(models []llm.ModelInfo) *ModelListResponse {
	data := make([]ModelInfo, len(models))
	now := time.Now().Unix()
	for i, m := range models {
		data[i] = ModelInfo{
			ID:      m.ID,
			Object:  "model",
			Created: now,
			OwnedBy: m.Provider,
		}
	}
	return &ModelListResponse{Object: "list", Data: data}
}

func generateID() string {
	return fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
}
