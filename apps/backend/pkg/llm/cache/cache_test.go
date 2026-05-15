package cache

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

func TestMemoryCache_SetGet(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	resp := &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{{Message: llm.Message{Role: "assistant", Content: "hello"}}}}
	if err := c.Set(ctx, "key1", resp, time.Minute); err != nil {
		t.Fatalf("Set error: %v", err)
	}

	got, err := c.Get(ctx, "key1")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if got.Model != "gpt-4" || got.Choices[0].Message.Content != "hello" {
		t.Errorf("got %+v, want gpt-4/hello", got)
	}
}

func TestMemoryCache_Miss(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	_, err := c.Get(ctx, "nonexistent")
	if err == nil {
		t.Fatal("expected error on missing key")
	}
}

func TestMemoryCache_Expire(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	resp := &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{{Message: llm.Message{Role: "assistant", Content: "ok"}}}}
	if err := c.Set(ctx, "exp", resp, 1*time.Millisecond); err != nil {
		t.Fatalf("Set error: %v", err)
	}

	time.Sleep(10 * time.Millisecond)
	_, err := c.Get(ctx, "exp")
	if err == nil {
		t.Fatal("expected error on expired key")
	}
}

func TestMemoryCache_Delete(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	if err := c.Set(ctx, "del", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute); err != nil {
		t.Fatalf("Set error: %v", err)
	}
	if err := c.Delete(ctx, "del"); err != nil {
		t.Fatalf("Delete error: %v", err)
	}
	_, err := c.Get(ctx, "del")
	if err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestMemoryCache_Clear(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	c.Set(ctx, "a", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)
	c.Set(ctx, "b", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)

	if err := c.Clear(ctx); err != nil {
		t.Fatalf("Clear error: %v", err)
	}

	stats, _ := c.Stats(ctx)
	if stats.TotalEntries != 0 {
		t.Errorf("TotalEntries = %d, want 0", stats.TotalEntries)
	}
	if stats.Hits != 0 || stats.Misses != 0 {
		t.Errorf("stats not reset: hits=%d misses=%d", stats.Hits, stats.Misses)
	}
}

func TestMemoryCache_Stats(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	c.Set(ctx, "k", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)
	c.Get(ctx, "k")
	c.Get(ctx, "k")
	c.Get(ctx, "miss")

	stats, err := c.Stats(ctx)
	if err != nil {
		t.Fatalf("Stats error: %v", err)
	}
	if stats.Hits != 2 {
		t.Errorf("Hits = %d, want 2", stats.Hits)
	}
	if stats.Misses != 1 {
		t.Errorf("Misses = %d, want 1", stats.Misses)
	}
	if stats.TotalEntries != 1 {
		t.Errorf("TotalEntries = %d, want 1", stats.TotalEntries)
	}
}

func TestMemoryCache_SetNil(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	if err := c.Set(ctx, "nil", nil, time.Minute); err != nil {
		t.Fatalf("Set nil error: %v", err)
	}
}

func TestMemoryCache_DefaultTTL(t *testing.T) {
	c := NewMemoryCache(WithDefaultTTL(10 * time.Millisecond))
	ctx := context.Background()

	if err := c.Set(ctx, "ttl", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, 0); err != nil {
		t.Fatalf("Set error: %v", err)
	}

	time.Sleep(20 * time.Millisecond)
	_, err := c.Get(ctx, "ttl")
	if err == nil {
		t.Fatal("expected error after default TTL expiry")
	}
}

func TestMemoryCache_MaxSizeEviction(t *testing.T) {
	c := NewMemoryCache(WithMaxSize(2))
	ctx := context.Background()

	c.Set(ctx, "a", &llm.ChatResponse{Model: "a", Choices: []llm.Choice{}}, time.Minute)
	c.Set(ctx, "b", &llm.ChatResponse{Model: "b", Choices: []llm.Choice{}}, time.Minute)
	c.Set(ctx, "c", &llm.ChatResponse{Model: "c", Choices: []llm.Choice{}}, time.Minute)

	stats, _ := c.Stats(ctx)
	if stats.TotalEntries > 2 {
		t.Errorf("expected <= 2 entries, got %d", stats.TotalEntries)
	}
}

func TestMemoryCache_Cleanup(t *testing.T) {
	c := NewMemoryCache()
	ctx := context.Background()

	c.Set(ctx, "old", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, 1*time.Millisecond)
	c.Set(ctx, "new", &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)

	time.Sleep(10 * time.Millisecond)
	c.cleanup()

	stats, _ := c.Stats(ctx)
	if stats.TotalEntries != 1 {
		t.Errorf("TotalEntries = %d, want 1", stats.TotalEntries)
	}
	_ = ctx
}

func TestEntry_IsExpired(t *testing.T) {
	e := &Entry{ExpiresAt: time.Now().Add(-time.Second)}
	if !e.IsExpired() {
		t.Error("expected expired")
	}

	e = &Entry{ExpiresAt: time.Now().Add(time.Minute)}
	if e.IsExpired() {
		t.Error("expected not expired")
	}
}

func TestKeyBuilder_Build(t *testing.T) {
	kb := NewKeyBuilder("test")
	temp := 0.7
	maxTokens := 100
	topP := 0.9

	req := &llm.ChatRequest{
		Model:       "gpt-4",
		Messages:    []llm.Message{{Role: "user", Content: "hello"}},
		System:      "be helpful",
		Temperature: &temp,
		MaxTokens:   &maxTokens,
		TopP:        &topP,
	}

	key := kb.Build(req)
	if key == "" {
		t.Fatal("empty key")
	}
	// Should contain prefix, model, temperature, maxTokens, topP
	for _, part := range []string{"test", "gpt-4", "t0.7", "m100", "p0.9"} {
		if !contains(key, part) {
			t.Errorf("key %q missing %q", key, part)
		}
	}
}

func TestKeyBuilder_BuildMinimal(t *testing.T) {
	kb := NewKeyBuilder("x")
	req := &llm.ChatRequest{Model: "gpt-4", Messages: []llm.Message{{Role: "user", Content: "hi"}}}

	key := kb.Build(req)
	if !contains(key, "x") || !contains(key, "gpt-4") {
		t.Errorf("unexpected key: %s", key)
	}
}

func TestKeyBuilder_BuildWithThinking(t *testing.T) {
	kb := NewKeyBuilder("x")
	req := &llm.ChatRequest{
		Model:    "claude",
		Messages: []llm.Message{{Role: "user", Content: "hi"}},
		Thinking: &llm.ThinkingConfig{Enabled: true, BudgetTokens: 4000},
	}

	key := kb.BuildWithThinking(req)
	if !contains(key, "think4000") {
		t.Errorf("key %q missing thinking config", key)
	}

	// Without thinking
	req2 := &llm.ChatRequest{
		Model:    "claude",
		Messages: []llm.Message{{Role: "user", Content: "hi"}},
	}
	key2 := kb.BuildWithThinking(req2)
	if contains(key2, "think") {
		t.Errorf("key %q should not contain thinking", key2)
	}
}

func TestKeyBuilder_WithTools(t *testing.T) {
	kb := NewKeyBuilder("x")
	req := &llm.ChatRequest{
		Model:    "gpt-4",
		Messages: []llm.Message{{Role: "user", Content: "hi"}},
		Tools:     []llm.ToolDefinition{{Type: "function", Function: llm.ToolFunction{Name: "search", Description: "search the web"}}},
	}

	key := kb.Build(req)
	if key == "" {
		t.Fatal("empty key")
	}
}

func TestHashMessages(t *testing.T) {
	h1 := hashMessages([]llm.Message{{Role: "user", Content: "hello"}})
	h2 := hashMessages([]llm.Message{{Role: "user", Content: "hello"}})
	if h1 != h2 {
		t.Error("same messages should produce same hash")
	}

	h3 := hashMessages([]llm.Message{{Role: "user", Content: "world"}})
	if h1 == h3 {
		t.Error("different messages should produce different hash")
	}
}

func TestHashString(t *testing.T) {
	h := hashString("test")
	if len(h) != 64 {
		t.Errorf("hash length = %d, want 64", len(h))
	}
}

func TestDeepCopyResponse_Nil(t *testing.T) {
	if deepCopyResponse(nil) != nil {
		t.Error("nil should return nil")
	}
}

func TestDeepCopyResponse_Independent(t *testing.T) {
	orig := &llm.ChatResponse{
		Model:   "gpt-4",
		Choices: []llm.Choice{{Index: 0, Message: llm.Message{Role: "assistant", Content: "hi"}}},
	}

	cpy := deepCopyResponse(orig)
	cpy.Choices[0].Message.Content = "changed"

	if orig.Choices[0].Message.Content != "hi" {
		t.Error("original was mutated by copy modification")
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsAt(s, sub))
}

func containsAt(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
