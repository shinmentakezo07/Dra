package handler

import (
	"encoding/json"
	"testing"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
)

func TestNewHandler(t *testing.T) {
	h := NewHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil handler")
	}
	if h.registry == nil {
		t.Error("expected non-nil registry")
	}
}

func TestHandler_TranslateRequest(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}},
		System:   "You are helpful",
	}

	body, err := h.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if body == nil {
		t.Fatal("expected non-nil body")
	}
	if body["model"] != "claude-sonnet-4" {
		t.Errorf("got model %v, want claude-sonnet-4", body["model"])
	}
	if body["system"] != "You are helpful" {
		t.Errorf("got system %v, want 'You are helpful'", body["system"])
	}
}

func TestHandler_TranslateRequest_SameProvider(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	req := &llm.ChatRequest{Model: "gpt-4o"}

	_, err := h.TranslateRequest(req, "openai", "openai")
	if err == nil {
		t.Error("expected error for same provider")
	}
}

func TestHandler_TranslateResponse(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	anthropicResp := []byte(`{
		"id": "msg_123",
		"type": "message",
		"role": "assistant",
		"content": [{"type": "text", "text": "Hello!"}],
		"usage": {"input_tokens": 10, "output_tokens": 5},
		"stop_reason": "end_turn"
	}`)

	resp, err := h.TranslateResponse(anthropicResp, "openai", "anthropic", "claude-sonnet-4", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	if len(resp.Choices) == 0 {
		t.Fatal("expected at least one choice")
	}
	if resp.Choices[0].Message.Content != "Hello!" {
		t.Errorf("got content %q, want Hello!", resp.Choices[0].Message.Content)
	}
}

func TestHandler_TranslateResponse_InvalidDirection(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	_, err := h.TranslateResponse([]byte(`{}`), "unknown", "provider", "model", "provider")
	if err == nil {
		t.Error("expected error for unknown direction")
	}
}

func TestHandler_TranslateStreamChunk(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	chunk := []byte(`{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}`)

	result, err := h.TranslateStreamChunk(chunk, "openai", "anthropic", "claude-sonnet-4", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
}

func TestHandler_WithRegistry(t *testing.T) {
	reg := translator.NewRegistry()
	reg.Register(translator.NewOpenAIToAnthropic())

	h := NewHandler(reg)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hi"}},
	}

	body, err := h.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if body == nil {
		t.Fatal("expected non-nil body")
	}
}

func TestHandler_TranslateRequest_WithTools(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	req := &llm.ChatRequest{
		Model: "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Calculate"}},
		Tools: []llm.ToolDefinition{
			{
				Type: "function",
				Function: llm.ToolFunction{
					Name:        "calculator",
					Description: "Calculate expressions",
					Parameters:  json.RawMessage(`{"type":"object"}`),
				},
			},
		},
	}

	body, err := h.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if body == nil {
		t.Fatal("expected non-nil body")
	}
}
