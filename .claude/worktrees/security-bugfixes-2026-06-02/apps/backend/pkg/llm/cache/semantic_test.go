package cache

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

func TestNewSemanticCache_Defaults(t *testing.T) {
	c := NewSemanticCache(0, 0)
	if c.maxSize != 1000 {
		t.Errorf("maxSize = %d, want 1000", c.maxSize)
	}
	if c.similarityThreshold != 0.92 {
		t.Errorf("threshold = %f, want 0.92", c.similarityThreshold)
	}
}

func TestNewSemanticCache_Custom(t *testing.T) {
	c := NewSemanticCache(500, 0.85)
	if c.maxSize != 500 {
		t.Errorf("maxSize = %d, want 500", c.maxSize)
	}
	if c.similarityThreshold != 0.85 {
		t.Errorf("threshold = %f, want 0.85", c.similarityThreshold)
	}
}

func TestSemanticCache_SetGet(t *testing.T) {
	c := NewSemanticCache(100, 0.9)
	ctx := context.Background()

	embedding := []float64{0.1, 0.2, 0.3}
	key, _ := json.Marshal(embedding)

	resp := &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{{Message: llm.Message{Role: "assistant", Content: "cached"}}}}
	if err := c.Set(ctx, string(key), resp, time.Minute); err != nil {
		t.Fatalf("Set error: %v", err)
	}

	got, err := c.Get(ctx, string(key))
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if got.Choices[0].Message.Content != "cached" {
		t.Errorf("got content %q, want cached", got.Choices[0].Message.Content)
	}
}

func TestSemanticCache_Miss(t *testing.T) {
	c := NewSemanticCache(100, 0.99)
	ctx := context.Background()

	embedding := []float64{0.1, 0.2, 0.3}
	key, _ := json.Marshal(embedding)

	resp := &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}
	c.Set(ctx, string(key), resp, time.Minute)

	otherEmbedding := []float64{0.9, 0.8, 0.7}
	otherKey, _ := json.Marshal(otherEmbedding)

	_, err := c.Get(ctx, string(otherKey))
	if err != ErrCacheMiss {
		t.Errorf("expected cache miss, got err=%v", err)
	}
}

func TestSemanticCache_InvalidKey(t *testing.T) {
	c := NewSemanticCache(100, 0.9)
	ctx := context.Background()

	_, err := c.Get(ctx, "not-json")
	if err != ErrCacheMiss {
		t.Errorf("expected cache miss for invalid key, got err=%v", err)
	}
}

func TestSemanticCache_Clear(t *testing.T) {
	c := NewSemanticCache(100, 0.9)
	ctx := context.Background()

	embedding := []float64{0.5, 0.5}
	key, _ := json.Marshal(embedding)
	c.Set(ctx, string(key), &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)

	if err := c.Clear(ctx); err != nil {
		t.Fatalf("Clear error: %v", err)
	}

	stats, _ := c.Stats(ctx)
	if stats.TotalEntries != 0 {
		t.Errorf("TotalEntries = %d, want 0 after clear", stats.TotalEntries)
	}
}

func TestSemanticCache_Eviction(t *testing.T) {
	c := NewSemanticCache(2, 0.9)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		emb := []float64{float64(i), float64(i + 1)}
		key, _ := json.Marshal(emb)
		c.Set(ctx, string(key), &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, time.Minute)
	}

	stats, _ := c.Stats(ctx)
	if stats.TotalEntries > 2 {
		t.Errorf("expected <= 2 entries after eviction, got %d", stats.TotalEntries)
	}
}

func TestSemanticCache_ExpiredEntry(t *testing.T) {
	c := NewSemanticCache(100, 0.5)
	ctx := context.Background()

	embedding := []float64{1.0, 0.0}
	key, _ := json.Marshal(embedding)
	c.Set(ctx, string(key), &llm.ChatResponse{Model: "gpt-4", Choices: []llm.Choice{}}, 1*time.Millisecond)

	time.Sleep(10 * time.Millisecond)
	_, err := c.Get(ctx, string(key))
	if err != ErrCacheMiss {
		t.Errorf("expected cache miss for expired entry, got err=%v", err)
	}
}

func TestCosineSimilarity_Identical(t *testing.T) {
	a := []float64{1.0, 0.0, 0.0}
	score := cosineSimilarity(a, a)
	if score < 0.99 {
		t.Errorf("identical vectors: score = %f, want ~1.0", score)
	}
}

func TestCosineSimilarity_Orthogonal(t *testing.T) {
	a := []float64{1.0, 0.0}
	b := []float64{0.0, 1.0}
	score := cosineSimilarity(a, b)
	if score > 0.01 {
		t.Errorf("orthogonal vectors: score = %f, want ~0.0", score)
	}
}

func TestCosineSimilarity_Opposite(t *testing.T) {
	a := []float64{1.0, 0.0}
	b := []float64{-1.0, 0.0}
	score := cosineSimilarity(a, b)
	if score > -0.99 {
		t.Errorf("opposite vectors: score = %f, want ~-1.0", score)
	}
}

func TestCosineSimilarity_Empty(t *testing.T) {
	score := cosineSimilarity(nil, []float64{1.0})
	if score != 0 {
		t.Errorf("empty vector: score = %f, want 0", score)
	}
}

func TestDecodeEmbedding_Valid(t *testing.T) {
	data, _ := json.Marshal([]float64{0.1, 0.2})
	emb, err := decodeEmbedding(string(data))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(emb) != 2 {
		t.Errorf("len = %d, want 2", len(emb))
	}
}

func TestDecodeEmbedding_Invalid(t *testing.T) {
	_, err := decodeEmbedding("not-json")
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestDecodeEmbedding_Empty(t *testing.T) {
	data, _ := json.Marshal([]float64{})
	_, err := decodeEmbedding(string(data))
	if err == nil {
		t.Error("expected error for empty embedding")
	}
}

func TestBuildSemanticKey(t *testing.T) {
	req := &llm.ChatRequest{
		Model:    "gpt-4",
		Messages: []llm.Message{{Role: "user", Content: "hello world"}},
	}
	key := BuildSemanticKey(req)

	var emb []float64
	if err := json.Unmarshal([]byte(key), &emb); err != nil {
		t.Fatalf("key is not valid JSON array: %v", err)
	}
	if len(emb) == 0 {
		t.Error("embedding is empty")
	}
}

func TestBuildSemanticKey_SameInput(t *testing.T) {
	req1 := &llm.ChatRequest{Model: "gpt-4", Messages: []llm.Message{{Role: "user", Content: "test"}}}
	req2 := &llm.ChatRequest{Model: "gpt-4", Messages: []llm.Message{{Role: "user", Content: "test"}}}

	if BuildSemanticKey(req1) != BuildSemanticKey(req2) {
		t.Error("same input should produce same key")
	}
}
