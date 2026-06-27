package handler

import (
	"context"
	"errors"
	"testing"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
)

func TestTranslationPipeline_RunBefore(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	p := NewTranslationPipeline(h, "openai", "anthropic")

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}},
	}

	err := p.RunBefore(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTranslationPipeline_RunBefore_Invalid(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	p := NewTranslationPipeline(h, "openai", "unknown")

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}},
	}

	err := p.RunBefore(context.Background(), req)
	if err == nil {
		t.Error("expected error for unsupported direction")
	}
}

func TestTranslationPipeline_RunAfter(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	p := NewTranslationPipeline(h, "openai", "anthropic")

	req := &llm.ChatRequest{Model: "claude-sonnet-4"}
	resp := &llm.ChatResponse{Model: "claude-sonnet-4"}

	err := p.RunAfter(context.Background(), req, resp)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestLoggingMiddleware(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	var logged bool
	lm := NewLoggingMiddleware(func(string, ...interface{}) {
		logged = true
	})

	wrapped := lm.Wrap(h)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hi"}},
	}

	_, err := wrapped.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !logged {
		t.Error("expected logging middleware to log")
	}
}

func TestLoggingMiddleware_Error(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)

	var logCount int
	lm := NewLoggingMiddleware(func(string, ...interface{}) {
		logCount++
	})

	wrapped := lm.Wrap(h)

	req := &llm.ChatRequest{Model: "claude-sonnet-4"}
	_, err := wrapped.TranslateRequest(req, "openai", "unknown")
	if err == nil {
		t.Fatal("expected error")
	}

	if logCount < 1 {
		t.Error("expected logging middleware to log error")
	}
}

func TestCacheMiddleware_CacheHit(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	cache := NewMemoryCache()
	cm := NewCacheMiddleware(cache)

	wrapped := cm.Wrap(h)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Cache me"}},
	}

	// First call populates cache
	result1, err := wrapped.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("first call failed: %v", err)
	}

	// Second call should hit cache
	result2, err := wrapped.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("second call failed: %v", err)
	}

	if len(result1) != len(result2) {
		t.Error("expected cached result to match original")
	}
}

func TestCacheMiddleware_CacheMiss_DifferentRequest(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	cache := NewMemoryCache()
	cm := NewCacheMiddleware(cache)

	wrapped := cm.Wrap(h)

	req1 := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "First"}},
	}
	req2 := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Second"}},
	}

	_, err := wrapped.TranslateRequest(req1, "openai", "anthropic")
	if err != nil {
		t.Fatalf("first call failed: %v", err)
	}

	_, err = wrapped.TranslateRequest(req2, "openai", "anthropic")
	if err != nil {
		t.Fatalf("second call failed: %v", err)
	}
}

func TestCacheMiddleware_ErrorNotCached(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	cache := NewMemoryCache()
	cm := NewCacheMiddleware(cache)

	wrapped := cm.Wrap(h)

	req := &llm.ChatRequest{Model: "claude-sonnet-4"}

	_, err := wrapped.TranslateRequest(req, "openai", "unknown")
	if err == nil {
		t.Fatal("expected error")
	}

	// Subsequent call should also error (not cached)
	_, err = wrapped.TranslateRequest(req, "openai", "unknown")
	if err == nil {
		t.Fatal("expected error on second call")
	}
}

func TestMetricsMiddleware(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	mm := NewMetricsMiddleware()

	wrapped := mm.Wrap(h)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hello"}},
	}

	_, err := wrapped.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	stats := mm.Stats()
	if stats.Requests != 1 {
		t.Errorf("got %d requests, want 1", stats.Requests)
	}
	if stats.Errors != 0 {
		t.Errorf("got %d errors, want 0", stats.Errors)
	}
}

func TestMetricsMiddleware_CountsErrors(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	mm := NewMetricsMiddleware()

	wrapped := mm.Wrap(h)

	req := &llm.ChatRequest{Model: "claude-sonnet-4"}

	_, _ = wrapped.TranslateRequest(req, "openai", "unknown")

	stats := mm.Stats()
	if stats.Requests != 1 {
		t.Errorf("got %d requests, want 1", stats.Requests)
	}
	if stats.Errors != 1 {
		t.Errorf("got %d errors, want 1", stats.Errors)
	}
}

func TestComposeMiddleware(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	mm := NewMetricsMiddleware()
	cache := NewMemoryCache()
	cm := NewCacheMiddleware(cache)

	composed := ComposeMiddleware(cm, mm).Wrap(h)

	req := &llm.ChatRequest{
		Model:    "claude-sonnet-4",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Compose"}},
	}

	_, err := composed.TranslateRequest(req, "openai", "anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	stats := mm.Stats()
	if stats.Requests != 1 {
		t.Errorf("got %d requests, want 1", stats.Requests)
	}
}

func TestTranslationPipeline_IntegrationWithClient(t *testing.T) {
	reg := translator.DefaultRegistry()
	h := NewHandler(reg)
	p := NewTranslationPipeline(h, "openai", "anthropic")

	// Verify it implements llm.Pipeline
	var _ llm.Pipeline = p
}

func TestMemoryCache_SetGet(t *testing.T) {
	cache := NewMemoryCache()
	key := "test-key"
	value := map[string]interface{}{"model": "gpt-4"}

	// Cache miss
	_, err := cache.Get(context.Background(), key)
	if !errors.Is(err, ErrCacheMiss) {
		t.Fatalf("expected cache miss, got: %v", err)
	}

	// Set
	err = cache.Set(context.Background(), key, value)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Cache hit
	got, err := cache.Get(context.Background(), key)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["model"] != "gpt-4" {
		t.Errorf("got model %v, want gpt-4", got["model"])
	}
}

func TestMemoryCache_Delete(t *testing.T) {
	cache := NewMemoryCache()
	key := "test-key"
	value := map[string]interface{}{"model": "gpt-4"}

	_ = cache.Set(context.Background(), key, value)
	_ = cache.Delete(context.Background(), key)

	_, err := cache.Get(context.Background(), key)
	if !errors.Is(err, ErrCacheMiss) {
		t.Fatalf("expected cache miss after delete, got: %v", err)
	}
}

func TestMemoryCache_Clear(t *testing.T) {
	cache := NewMemoryCache()
	_ = cache.Set(context.Background(), "k1", map[string]interface{}{})
	_ = cache.Set(context.Background(), "k2", map[string]interface{}{})

	_ = cache.Clear(context.Background())

	_, err := cache.Get(context.Background(), "k1")
	if !errors.Is(err, ErrCacheMiss) {
		t.Fatalf("expected cache miss after clear, got: %v", err)
	}
}
