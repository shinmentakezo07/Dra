package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Entry represents a cached response with metadata.
type Entry struct {
	Response   *llm.ChatResponse `json:"response"`
	CreatedAt  time.Time         `json:"created_at"`
	ExpiresAt  time.Time         `json:"expires_at"`
	AccessCount int              `json:"access_count"`
	Model      string            `json:"model"`
	Hash       string            `json:"hash"`
}

// IsExpired returns true if the cache entry has expired.
func (e *Entry) IsExpired() bool {
	return time.Now().After(e.ExpiresAt)
}

// ErrCacheMiss is returned when a cache entry is not found.
var ErrCacheMiss = fmt.Errorf("cache miss")

// Cache is the interface for LLM response caching.
type Cache interface {
	Get(ctx context.Context, key string) (*llm.ChatResponse, error)
	Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Clear(ctx context.Context) error
	Stats(ctx context.Context) (Stats, error)
}

// Stats represents cache statistics.
type Stats struct {
	Hits       int64 `json:"hits"`
	Misses     int64 `json:"misses"`
	Size       int   `json:"size"`
	TotalEntries int `json:"total_entries"`
}

// MemoryCache is an in-memory cache implementation.
type MemoryCache struct {
	mu       sync.RWMutex
	entries  map[string]*Entry
	hits     int64
	misses   int64
	maxSize  int
	defaultTTL time.Duration
}

// Option configures a MemoryCache.
type Option func(*MemoryCache)

// WithMaxSize sets the maximum number of entries.
func WithMaxSize(size int) Option {
	return func(c *MemoryCache) {
		c.maxSize = size
	}
}

// WithDefaultTTL sets the default TTL for entries.
func WithDefaultTTL(ttl time.Duration) Option {
	return func(c *MemoryCache) {
		c.defaultTTL = ttl
	}
}

// NewMemoryCache creates a new in-memory cache.
func NewMemoryCache(opts ...Option) *MemoryCache {
	c := &MemoryCache{
		entries:    make(map[string]*Entry),
		maxSize:    10000,
		defaultTTL: 5 * time.Minute,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Get retrieves a cached response.
func (c *MemoryCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	c.mu.RLock()
	entry, exists := c.entries[key]
	c.mu.RUnlock()

	if !exists {
		c.mu.Lock()
		c.misses++
		c.mu.Unlock()
		return nil, ErrCacheMiss
	}

	if entry.IsExpired() {
		c.mu.Lock()
		delete(c.entries, key)
		c.misses++
		c.mu.Unlock()
		return nil, ErrCacheMiss
	}

	c.mu.Lock()
	entry.AccessCount++
	c.hits++
	c.mu.Unlock()

	// Return deep copy to prevent mutation
	return deepCopyResponse(entry.Response), nil
}

// Set stores a response in the cache.
func (c *MemoryCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	if value == nil {
		return nil
	}

	if ttl <= 0 {
		ttl = c.defaultTTL
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// Evict oldest entries if at capacity
	if len(c.entries) >= c.maxSize {
		c.evictOldest(1)
	}

	c.entries[key] = &Entry{
		Response:    deepCopyResponse(value),
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(ttl),
		AccessCount: 0,
		Model:       value.Model,
		Hash:        key,
	}

	return nil
}

// Delete removes a specific entry.
func (c *MemoryCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
	return nil
}

// Clear removes all entries.
func (c *MemoryCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]*Entry)
	c.hits = 0
	c.misses = 0
	return nil
}

// Stats returns cache statistics.
func (c *MemoryCache) Stats(ctx context.Context) (Stats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return Stats{
		Hits:         c.hits,
		Misses:       c.misses,
		Size:         c.maxSize,
		TotalEntries: len(c.entries),
	}, nil
}

// evictOldest removes the oldest entries.
func (c *MemoryCache) evictOldest(n int) {
	type kv struct {
		key   string
		entry *Entry
	}
	var items []kv
	for k, v := range c.entries {
		items = append(items, kv{key: k, entry: v})
	}
	// Sort by access count (LFU) then created time
	for i := 0; i < len(items)-1; i++ {
		for j := i + 1; j < len(items); j++ {
			if items[i].entry.AccessCount > items[j].entry.AccessCount {
				items[i], items[j] = items[j], items[i]
			} else if items[i].entry.AccessCount == items[j].entry.AccessCount {
				if items[i].entry.CreatedAt.After(items[j].entry.CreatedAt) {
					items[i], items[j] = items[j], items[i]
				}
			}
		}
	}
	for i := 0; i < n && i < len(items); i++ {
		delete(c.entries, items[i].key)
	}
}

// StartCleanup starts a background goroutine to clean expired entries.
func (c *MemoryCache) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			c.cleanup()
		}
	}()
}

func (c *MemoryCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for k, v := range c.entries {
		if now.After(v.ExpiresAt) {
			delete(c.entries, k)
		}
	}
}

// KeyBuilder builds cache keys with various strategies.
type KeyBuilder struct {
	prefix    string
	separator string
}

// NewKeyBuilder creates a new key builder.
func NewKeyBuilder(prefix string) *KeyBuilder {
	return &KeyBuilder{
		prefix:    prefix,
		separator: ":",
	}
}

// Build creates a cache key from request components.
func (kb *KeyBuilder) Build(req *llm.ChatRequest) string {
	parts := []string{kb.prefix, req.Model}

	// Hash messages
	if len(req.Messages) > 0 {
		msgHash := hashMessages(req.Messages)
		parts = append(parts, msgHash)
	}

	// Hash system prompt
	if req.System != "" {
		parts = append(parts, hashString(req.System)[:16])
	}

	// Hash tools
	if len(req.Tools) > 0 {
		toolHash := hashTools(req.Tools)
		parts = append(parts, toolHash)
	}

	// Include parameters that affect output
	if req.Temperature != nil {
		parts = append(parts, fmt.Sprintf("t%g", *req.Temperature))
	}
	if req.MaxTokens != nil {
		parts = append(parts, fmt.Sprintf("m%d", *req.MaxTokens))
	}
	if req.TopP != nil {
		parts = append(parts, fmt.Sprintf("p%g", *req.TopP))
	}

	return strings.Join(parts, kb.separator)
}

// BuildWithThinking creates a key including thinking config.
func (kb *KeyBuilder) BuildWithThinking(req *llm.ChatRequest) string {
	key := kb.Build(req)
	if req.Thinking != nil && req.Thinking.Enabled {
		key += fmt.Sprintf(":think%d", req.Thinking.BudgetTokens)
	}
	return key
}

func hashMessages(messages []llm.Message) string {
	h := sha256.New()
	for _, m := range messages {
		h.Write([]byte(m.Role))
		h.Write([]byte(m.Content))
		if m.ToolCallID != "" {
			h.Write([]byte(m.ToolCallID))
		}
	}
	return hex.EncodeToString(h.Sum(nil))[:16]
}

func hashTools(tools []llm.ToolDefinition) string {
	data, _ := json.Marshal(tools)
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])[:16]
}

func hashString(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func deepCopyResponse(resp *llm.ChatResponse) *llm.ChatResponse {
	if resp == nil {
		return nil
	}
	cpy := *resp
	cpy.Choices = make([]llm.Choice, len(resp.Choices))
	copy(cpy.Choices, resp.Choices)
	return &cpy
}
