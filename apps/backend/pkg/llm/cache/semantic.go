package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// SemanticCache caches responses based on semantic similarity of prompts.
type SemanticCache struct {
	mu       sync.RWMutex
	entries  []semanticEntry
	maxSize  int
	similarityThreshold float64
}

type semanticEntry struct {
	Embedding  []float64
	Response   *llm.ChatResponse
	Model      string
	CreatedAt  time.Time
	TTL        time.Duration
}

// NewSemanticCache creates a new semantic cache.
func NewSemanticCache(maxSize int, similarityThreshold float64) *SemanticCache {
	if maxSize <= 0 {
		maxSize = 1000
	}
	if similarityThreshold <= 0 || similarityThreshold > 1 {
		similarityThreshold = 0.92
	}
	return &SemanticCache{
		maxSize:             maxSize,
		similarityThreshold: similarityThreshold,
	}
}

// Get retrieves a semantically similar cached response.
func (c *SemanticCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	// For semantic cache, the key is a JSON-encoded embedding vector
	queryEmbedding, err := decodeEmbedding(key)
	if err != nil {
		return nil, ErrCacheMiss
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	var bestEntry *semanticEntry
	bestScore := -1.0

	now := time.Now()
	for i := range c.entries {
		if now.After(c.entries[i].CreatedAt.Add(c.entries[i].TTL)) {
			continue
		}
		score := cosineSimilarity(queryEmbedding, c.entries[i].Embedding)
		if score > bestScore {
			bestScore = score
			bestEntry = &c.entries[i]
		}
	}

	if bestEntry != nil && bestScore >= c.similarityThreshold {
		return deepCopyResponse(bestEntry.Response), nil
	}

	return nil, ErrCacheMiss
}

// Set stores a response with its semantic embedding.
func (c *SemanticCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	embedding, err := decodeEmbedding(key)
	if err != nil {
		return fmt.Errorf("semantic cache: decode embedding: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= c.maxSize {
		c.evictOldest()
	}

	c.entries = append(c.entries, semanticEntry{
		Embedding: embedding,
		Response:  deepCopyResponse(value),
		Model:     value.Model,
		CreatedAt: time.Now(),
		TTL:       ttl,
	})
	return nil
}

// Delete is a no-op for semantic cache (no exact key matching).
func (c *SemanticCache) Delete(ctx context.Context, key string) error {
	return nil
}

// Clear removes all entries.
func (c *SemanticCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = nil
	return nil
}

// Stats returns cache statistics.
func (c *SemanticCache) Stats(ctx context.Context) (Stats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return Stats{
		Size:         c.maxSize,
		TotalEntries: len(c.entries),
	}, nil
}

func (c *SemanticCache) evictOldest() {
	if len(c.entries) == 0 {
		return
	}
	oldest := 0
	for i := 1; i < len(c.entries); i++ {
		if c.entries[i].CreatedAt.Before(c.entries[oldest].CreatedAt) {
			oldest = i
		}
	}
	c.entries = append(c.entries[:oldest], c.entries[oldest+1:]...)
}

// BuildSemanticKey builds a cache key from a request embedding.
// For a real implementation, this would call an embedding model.
// Here we use a simple bag-of-words hash as a pseudo-embedding.
func BuildSemanticKey(req *llm.ChatRequest) string {
	var text string
	for _, m := range req.Messages {
		text += m.Content + " "
	}
	text = strings.ToLower(text)
	words := strings.Fields(text)

	// Simple frequency vector (pseudo-embedding)
	freq := make(map[string]int)
	for _, w := range words {
		freq[w]++
	}

	sortedWords := make([]string, 0, len(freq))
	for w := range freq {
		sortedWords = append(sortedWords, w)
	}
	sort.Strings(sortedWords)

	embedding := make([]float64, 0, len(freq)*2)
	for _, w := range sortedWords {
		h := hashStringInt(w)
		embedding = append(embedding, float64(h%1000)/1000.0)
		embedding = append(embedding, float64(freq[w]))
	}

	data, _ := json.Marshal(embedding)
	return string(data)
}

func decodeEmbedding(key string) ([]float64, error) {
	var embedding []float64
	if err := json.Unmarshal([]byte(key), &embedding); err != nil {
		return nil, err
	}
	if len(embedding) == 0 {
		return nil, fmt.Errorf("empty embedding")
	}
	return embedding, nil
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}

	minLen := len(a)
	if len(b) < minLen {
		minLen = len(b)
	}

	var dot, normA, normB float64
	for i := 0; i < minLen; i++ {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

func hashStringInt(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	if h < 0 {
		h = -h
	}
	return h
}
