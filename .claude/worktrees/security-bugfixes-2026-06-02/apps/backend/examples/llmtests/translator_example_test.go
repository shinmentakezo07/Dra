package llmtests

import (
	"testing"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
	"dra-platform/backend/pkg/llm/translator/handler"
)

// RunTranslatorHandlerExample demonstrates basic request/response translation.
func RunTranslatorHandlerExample(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := handler.NewHandler(reg)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}},
		System:   "You are helpful",
	}

	body, err := h.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("translation failed: %v", err)
	}
	if body == nil {
		t.Fatal("expected non-nil body")
	}
	if body["model"] != "claude-sonnet-4" {
		t.Errorf("got model %v, want claude-sonnet-4", body["model"])
	}
}

// RunBatchTranslatorExample demonstrates concurrent batch translation.
func RunBatchTranslatorExample(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := handler.NewHandler(reg)
	batch := handler.NewBatchTranslator(h)

	reqs := []*llm.ChatRequest{
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}}},
		{Model: "claude-sonnet-4", Messages: []llm.Message{{Role: llm.RoleUser, Content: "World"}}},
	}

	results := batch.TranslateRequests(reqs, "openai", "anthropic")
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	for i, r := range results {
		if r.Error != nil {
			t.Errorf("result %d failed: %v", i, r.Error)
		}
		if r.Body == nil {
			t.Errorf("result %d body is nil", i)
		}
	}
}

// RunMiddlewareExample demonstrates logging, caching, and metrics middleware.
func RunMiddlewareExample(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := handler.NewHandler(reg)

	var logged bool
	lm := handler.NewLoggingMiddleware(func(format string, args ...interface{}) {
		logged = true
	})

	cache := handler.NewMemoryCache()
	cm := handler.NewCacheMiddleware(cache)

	mm := handler.NewMetricsMiddleware()

	composed := handler.ComposeMiddleware(lm, cm, mm).Wrap(h)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Middleware test"}},
	}

	_, err := composed.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("translation failed: %v", err)
	}

	if !logged {
		t.Error("expected logging middleware to log")
	}

	stats := mm.Stats()
	if stats.Requests != 1 {
		t.Errorf("expected 1 request in metrics, got %d", stats.Requests)
	}

	// Second call should hit cache
	_, err = composed.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("cached translation failed: %v", err)
	}
}

// RunTranslationPipelineExample demonstrates pipeline integration with the client.
func RunTranslationPipelineExample(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := handler.NewHandler(reg)
	pipeline := handler.NewTranslationPipeline(h, "openai", "anthropic")

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Pipeline test"}},
	}

	// RunBefore validates the request can be translated
	err := pipeline.RunBefore(nil, req)
	if err != nil {
		t.Fatalf("pipeline validation failed: %v", err)
	}

	// RunAfter is a no-op but satisfies the interface
	resp := &llm.ChatResponse{Model: "claude-sonnet-4"}
	err = pipeline.RunAfter(nil, req, resp)
	if err != nil {
		t.Fatalf("pipeline RunAfter failed: %v", err)
	}
}

// TestTranslatorExamples runs all translator example functions.
func TestTranslatorExamples(t *testing.T) {
	t.Run("Handler", RunTranslatorHandlerExample)
	t.Run("Batch", RunBatchTranslatorExample)
	t.Run("Middleware", RunMiddlewareExample)
	t.Run("Pipeline", RunTranslationPipelineExample)
}
