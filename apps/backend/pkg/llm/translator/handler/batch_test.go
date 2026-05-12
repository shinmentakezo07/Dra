package handler

import (
	"testing"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
)

func TestBatchTranslator_TranslateRequests(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	batch := NewBatchTranslator(h)

	reqs := []*llm.ChatRequest{
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}}},
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "World"}}},
	}

	results := batch.TranslateRequests(reqs, "openai", "anthropic")
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}
	if results[0].Error != nil {
		t.Errorf("first request failed: %v", results[0].Error)
	}
	if results[1].Error != nil {
		t.Errorf("second request failed: %v", results[1].Error)
	}
	if results[0].Body == nil {
		t.Error("expected non-nil body for first result")
	}
}

func TestBatchTranslator_TranslateRequests_Empty(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	batch := NewBatchTranslator(h)

	results := batch.TranslateRequests(nil, "openai", "anthropic")
	if len(results) != 0 {
		t.Errorf("got %d results, want 0", len(results))
	}
}

func TestBatchTranslator_TranslateResponses(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	batch := NewBatchTranslator(h)

	responses := []ResponseItem{
		{Body: []byte(`{"id":"msg_1","type":"message","role":"assistant","content":[{"type":"text","text":"Hi"}],"usage":{"input_tokens":5,"output_tokens":2},"stop_reason":"end_turn"}`)},
	}

	results := batch.TranslateResponses(responses, "openai", "anthropic", "claude-sonnet-4", "anthropic")
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Error != nil {
		t.Errorf("first response failed: %v", results[0].Error)
	}
	if results[0].Response == nil {
		t.Error("expected non-nil response")
	}
}

func TestBatchTranslator_TranslateResponses_Empty(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	batch := NewBatchTranslator(h)

	results := batch.TranslateResponses(nil, "openai", "anthropic", "model", "provider")
	if len(results) != 0 {
		t.Errorf("got %d results, want 0", len(results))
	}
}

func TestBatchTranslator_TranslateRequests_PartialFailure(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	batch := NewBatchTranslator(h)

	reqs := []*llm.ChatRequest{
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}}},
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "World"}}},
	}

	results := batch.TranslateRequests(reqs, "openai", "unknown")
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}
	if results[0].Error == nil {
		t.Error("expected first request to fail with unknown provider")
	}
	if results[1].Error == nil {
		t.Error("expected second request to fail with unknown provider")
	}
}
