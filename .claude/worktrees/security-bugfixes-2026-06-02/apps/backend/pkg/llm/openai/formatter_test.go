package openai

import (
	"encoding/json"
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestToInternalRequest_NilInput(t *testing.T) {
	req := ToInternalRequest(nil)
	if req == nil {
		t.Fatal("expected non-nil")
	}
	if req.Model != "" {
		t.Error("expected empty model")
	}
}

func TestToInternalRequest_Basic(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hello"},
			{Role: "assistant", Content: "Hi!"},
		},
		Temperature: float64Ptr(0.5),
		MaxTokens:   intPtr(100),
	})
	if req.Model != "gpt-4o" {
		t.Errorf("model = %q", req.Model)
	}
	if req.Temperature == nil || *req.Temperature != 0.5 {
		t.Error("temperature")
	}
	if req.MaxTokens == nil || *req.MaxTokens != 100 {
		t.Error("max_tokens")
	}
	if len(req.Messages) != 2 {
		t.Fatalf("messages = %d", len(req.Messages))
	}
	if req.Messages[0].Content != "Hello" || req.Messages[1].Content != "Hi!" {
		t.Error("message content")
	}
}

func TestToInternalRequest_StopString(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hi"},
		},
		Stop: "END",
	})
	if len(req.StopSequences) != 1 || req.StopSequences[0] != "END" {
		t.Error("stop sequence")
	}
}

func TestToInternalRequest_StopSlice(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hi"},
		},
		Stop: []string{"END", "STOP"},
	})
	if len(req.StopSequences) != 2 {
		t.Error("stop sequences")
	}
}

func TestToInternalRequest_Tools(t *testing.T) {
	params := json.RawMessage(`{"type": "object"}`)
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hi"},
		},
		Tools: []llm.ToolDefinition{
			{Type: "function", Function: llm.ToolFunction{Name: "get_weather", Parameters: params}},
		},
	})
	if len(req.Tools) != 1 {
		t.Fatal("tools not set")
	}
	if req.Tools[0].Function.Name != "get_weather" {
		t.Error("tool name")
	}
}

func TestToInternalRequest_ResponseFormat(t *testing.T) {
	schema := json.RawMessage(`{"type": "object"}`)
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{Role: "user", Content: "Hi"},
		},
		ResponseFormat: &llm.ResponseFormat{Type: "json_schema", JSONSchema: schema},
	})
	if req.ResponseFormat == nil || req.ResponseFormat.Type != "json_schema" {
		t.Error("response_format")
	}
}

func TestToInternalRequest_MultipartContent(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{
				Role: "user",
				Content: []interface{}{
					map[string]interface{}{"type": "text", "text": "desc"},
					map[string]interface{}{"type": "image_url", "image_url": map[string]interface{}{"url": "https://example.com/img.jpg"}},
				},
			},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
	m := req.Messages[0]
	if len(m.ContentBlocks) != 2 {
		t.Fatalf("content blocks = %d", len(m.ContentBlocks))
	}
	if m.ContentBlocks[0].Type != llm.ContentTypeText || m.ContentBlocks[0].Text != "desc" {
		t.Error("first block not text")
	}
	if m.ContentBlocks[1].ImageURL == nil || m.ContentBlocks[1].ImageURL.URL != "https://example.com/img.jpg" {
		t.Error("second block not image")
	}
}

func TestToInternalRequest_ToolCalls(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{
				Role:    "assistant",
				Content: "call:",
				ToolCalls: []ToolCall{
					{ID: "call1", Type: "function", Function: ToolCallFunction{Name: "search", Arguments: `{"q":"test"}`}},
				},
			},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
	m := req.Messages[0]
	if len(m.ToolCalls) != 1 {
		t.Fatalf("tool calls = %d", len(m.ToolCalls))
	}
	if m.ToolCalls[0].Function.Name != "search" {
		t.Error("tool call name")
	}
}

func TestToInternalRequest_EmptyMessages(t *testing.T) {
	req := ToInternalRequest(&ChatCompletionRequest{
		Model:    "gpt-4o",
		Messages: []ChatMessage{},
	})
	if len(req.Messages) != 0 {
		t.Error("expected empty messages")
	}
}

func TestFromInternalResponse_NilInput(t *testing.T) {
	resp := FromInternalResponse(nil)
	if resp == nil {
		t.Fatal("expected non-nil")
	}
	if resp.Object != "chat.completion" {
		t.Error("expected chat.completion object")
	}
	if len(resp.Choices) != 1 || resp.Choices[0].Message.Role != "assistant" {
		t.Error("expected fallback assistant message")
	}
}

func TestFromInternalResponse_Basic(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:      "chatcmpl-123",
		Object:  "chat.completion",
		Created: 1000,
		Model:   "gpt-4o",
		Choices: []llm.Choice{
			{
				Index: 0,
				Message: llm.Message{
					Role:    llm.RoleAssistant,
					Content: "Hello!",
				},
				FinishReason: llm.FinishReasonStop,
			},
		},
		Usage: llm.Usage{PromptTokens: 10, CompletionTokens: 20, TotalTokens: 30},
	})
	if resp.ID != "chatcmpl-123" {
		t.Errorf("id = %q", resp.ID)
	}
	if resp.Model != "gpt-4o" {
		t.Errorf("model = %q", resp.Model)
	}
	if resp.Usage.PromptTokens != 10 || resp.Usage.TotalTokens != 30 {
		t.Error("usage")
	}
	if resp.Choices[0].Message.Content != "Hello!" {
		t.Error("content")
	}
}

func TestFromInternalResponse_ToolCalls(t *testing.T) {
	args := json.RawMessage(`{"x":1}`)
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:    "chatcmpl-1",
		Model: "gpt-4o",
		Choices: []llm.Choice{
			{
				Message: llm.Message{
					Role:    llm.RoleAssistant,
					Content: "call:",
					ToolCalls: []llm.ToolCall{
						{ID: "c1", Type: "function", Function: llm.ToolCallFunction{Name: "search", Arguments: args}},
					},
				},
				FinishReason: llm.FinishReasonToolCalls,
			},
		},
	})
	if len(resp.Choices) != 1 {
		t.Fatal("expected 1 choice")
	}
	m := resp.Choices[0].Message
	if len(m.ToolCalls) != 1 {
		t.Fatalf("tool calls = %d", len(m.ToolCalls))
	}
	if m.ToolCalls[0].Function.Name != "search" {
		t.Error("tool call name")
	}
}

func TestFromInternalResponse_ContentBlocks(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:    "chatcmpl-1",
		Model: "gpt-4o",
		Choices: []llm.Choice{
			{
				Message: llm.Message{
					Role: llm.RoleAssistant,
					ContentBlocks: []llm.ContentBlock{
						{Type: llm.ContentTypeText, Text: "a"},
						{Type: llm.ContentTypeImage, ImageURL: &llm.ImageURL{URL: "https://img.com"}},
					},
				},
				FinishReason: llm.FinishReasonStop,
			},
		},
	})
	if len(resp.Choices) != 1 {
		t.Fatal("expected 1 choice")
	}
	content := resp.Choices[0].Message.Content
	parts, ok := content.([]ContentPart)
	if !ok {
		t.Fatalf("content is %T, want []ContentPart", content)
	}
	if len(parts) != 2 {
		t.Fatalf("parts = %d", len(parts))
	}
	if parts[0].Type != "text" || parts[0].Text != "a" {
		t.Error("first part not text")
	}
	if parts[1].ImageURL == nil || parts[1].ImageURL.URL != "https://img.com" {
		t.Error("second part not image")
	}
}

func TestFromInternalStreamChunk_NilInput(t *testing.T) {
	chunk := FromInternalStreamChunk(nil)
	if chunk != nil {
		t.Error("expected nil for nil input")
	}
}

func TestFromInternalStreamChunk_Basic(t *testing.T) {
	chunk := FromInternalStreamChunk(&llm.StreamChunk{
		ID:      "chunk1",
		Object:  "chat.completion.chunk",
		Created: 1000,
		Model:   "gpt-4o",
		Index:   0,
		Delta:   llm.Message{Content: "Hello", Role: llm.RoleAssistant},
	})
	if chunk == nil {
		t.Fatal("expected chunk")
	}
	if chunk.ID != "chunk1" {
		t.Errorf("id = %q", chunk.ID)
	}
	if len(chunk.Choices) != 1 {
		t.Fatalf("choices = %d", len(chunk.Choices))
	}
	if chunk.Choices[0].Delta.Content != "Hello" {
		t.Error("delta content")
	}
	if chunk.Choices[0].Delta.Role != "assistant" {
		t.Error("delta role")
	}
}

func TestFromInternalStreamChunk_WithFinishReason(t *testing.T) {
	stop := llm.FinishReasonStop
	chunk := FromInternalStreamChunk(&llm.StreamChunk{
		ID:    "chunk1",
		Model: "gpt-4o",
		Index: 0,
		Delta: llm.Message{Content: "done"},
		FinishReason: &stop,
	})
	if chunk == nil {
		t.Fatal("expected chunk")
	}
	if chunk.Choices[0].FinishReason == nil || *chunk.Choices[0].FinishReason != "stop" {
		t.Error("finish_reason")
	}
}

func TestFromInternalStreamChunk_WithUsage(t *testing.T) {
	chunk := FromInternalStreamChunk(&llm.StreamChunk{
		ID:    "chunk1",
		Model: "gpt-4o",
		Usage: &llm.Usage{PromptTokens: 10, CompletionTokens: 20, TotalTokens: 30},
	})
	if chunk == nil {
		t.Fatal("expected chunk")
	}
	if chunk.Usage == nil || chunk.Usage.TotalTokens != 30 {
		t.Error("usage")
	}
}

func TestFromInternalModels(t *testing.T) {
	models := FromInternalModels([]llm.ModelInfo{
		{ID: "gpt-4o", Provider: "openai"},
		{ID: "claude-opus-4", Provider: "anthropic"},
	})
	if models == nil {
		t.Fatal("expected response")
	}
	if len(models.Data) != 2 {
		t.Fatalf("models = %d", len(models.Data))
	}
	if models.Data[0].ID != "gpt-4o" || models.Data[0].OwnedBy != "openai" {
		t.Error("first model")
	}
	if models.Data[1].ID != "claude-opus-4" {
		t.Error("second model")
	}
}

func TestFromInternalModels_Empty(t *testing.T) {
	models := FromInternalModels([]llm.ModelInfo{})
	if len(models.Data) != 0 {
		t.Error("expected empty")
	}
}

func TestToInternalMessage_MultipartContentUnsafeType(t *testing.T) {
	// Test that missing "type" key doesn't panic
	req := ToInternalRequest(&ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []ChatMessage{
			{
				Role: "user",
				Content: []interface{}{
					map[string]interface{}{"text": "no type key"},
				},
			},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
}

func TestFromInternalStreamChunk_EmptyChoicesSlice(t *testing.T) {
	chunk := FromInternalStreamChunk(&llm.StreamChunk{
		ID:    "chunk1",
		Model: "gpt-4o",
		Index: 0,
	})
	if chunk == nil {
		t.Fatal("expected chunk")
	}
	if len(chunk.Choices) != 1 {
		t.Errorf("choices = %d", len(chunk.Choices))
	}
}

func float64Ptr(f float64) *float64 { return &f }
func intPtr(i int) *int             { return &i }
