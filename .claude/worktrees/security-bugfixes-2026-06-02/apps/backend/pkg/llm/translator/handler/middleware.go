package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Translator defines the translation operations that can be wrapped by middleware.
type Translator interface {
	TranslateRequest(req *llm.ChatRequest, fromProvider, toProvider string) (map[string]interface{}, error)
	TranslateResponse(body []byte, fromProvider, toProvider, model, provider string) (*llm.ChatResponse, error)
	TranslateStreamChunk(data []byte, fromProvider, toProvider, model, provider string) (*llm.StreamChunk, error)
}

// Ensure *Handler implements Translator.
var _ Translator = (*Handler)(nil)

// TranslationPipeline implements llm.Pipeline for translation-aware request/response processing.
type TranslationPipeline struct {
	handler      *Handler
	fromProvider string
	toProvider   string
}

// NewTranslationPipeline creates a new pipeline that validates translations.
func NewTranslationPipeline(handler *Handler, fromProvider, toProvider string) *TranslationPipeline {
	return &TranslationPipeline{
		handler:      handler,
		fromProvider: fromProvider,
		toProvider:   toProvider,
	}
}

// RunBefore validates that the request can be translated before processing.
func (p *TranslationPipeline) RunBefore(ctx context.Context, req *llm.ChatRequest) error {
	_, err := p.handler.TranslateRequest(req, p.fromProvider, p.toProvider)
	return err
}

// RunAfter is a no-op that satisfies the llm.Pipeline interface.
func (p *TranslationPipeline) RunAfter(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// LoggerFunc is the signature for logging functions used by LoggingMiddleware.
type LoggerFunc func(format string, args ...interface{})

// LoggingMiddleware logs all translation operations.
type LoggingMiddleware struct {
	log LoggerFunc
}

// NewLoggingMiddleware creates a new logging middleware.
func NewLoggingMiddleware(log LoggerFunc) *LoggingMiddleware {
	return &LoggingMiddleware{log: log}
}

// ErrCacheMiss is returned when a cache entry is not found.
var ErrCacheMiss = errors.New("cache miss")

// Cache is the interface for translation result caching.
type Cache interface {
	Get(ctx context.Context, key string) (map[string]interface{}, error)
	Set(ctx context.Context, key string, value map[string]interface{}) error
	Delete(ctx context.Context, key string) error
	Clear(ctx context.Context) error
}

// MemoryCache is an in-memory implementation of Cache.
type MemoryCache struct {
	mu     sync.RWMutex
	data   map[string]cacheEntry
	maxAge time.Duration
}

type cacheEntry struct {
	value     map[string]interface{}
	createdAt time.Time
}

// NewMemoryCache creates a new in-memory cache with a default TTL of 5 minutes.
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		data:   make(map[string]cacheEntry),
		maxAge: 5 * time.Minute,
	}
}

// Get retrieves a cached translation result.
func (c *MemoryCache) Get(ctx context.Context, key string) (map[string]interface{}, error) {
	c.mu.RLock()
	entry, ok := c.data[key]
	c.mu.RUnlock()

	if !ok {
		return nil, ErrCacheMiss
	}

	if time.Since(entry.createdAt) > c.maxAge {
		c.mu.Lock()
		delete(c.data, key)
		c.mu.Unlock()
		return nil, ErrCacheMiss
	}

	return entry.value, nil
}

// Set stores a translation result in the cache.
func (c *MemoryCache) Set(ctx context.Context, key string, value map[string]interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = cacheEntry{value: cloneMap(value), createdAt: time.Now()}
	return nil
}

// cloneMap creates a shallow copy of a map to prevent external mutation of cached values.
func cloneMap(m map[string]interface{}) map[string]interface{} {
	cpy := make(map[string]interface{}, len(m))
	for k, v := range m {
		cpy[k] = v
	}
	return cpy
}

// Delete removes a cache entry.
func (c *MemoryCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.data, key)
	return nil
}

// Clear removes all cache entries.
func (c *MemoryCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = make(map[string]cacheEntry)
	return nil
}

// CacheMiddleware caches translation results to avoid redundant work.
type CacheMiddleware struct {
	cache Cache
}

// NewCacheMiddleware creates a new cache middleware.
func NewCacheMiddleware(cache Cache) *CacheMiddleware {
	return &CacheMiddleware{cache: cache}
}

// Metrics holds translation operation statistics.
type Metrics struct {
	Requests int64
	Errors   int64
}

// MetricsMiddleware tracks translation operation metrics.
type MetricsMiddleware struct {
	mu    sync.RWMutex
	stats Metrics
}

// NewMetricsMiddleware creates a new metrics middleware.
func NewMetricsMiddleware() *MetricsMiddleware {
	return &MetricsMiddleware{}
}

// Stats returns a snapshot of current metrics.
func (m *MetricsMiddleware) Stats() Metrics {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.stats
}

// Middleware is the interface for handler middleware.
type Middleware interface {
	Wrap(h Translator) Translator
}

// MiddlewareFunc adapts a function to the Middleware interface.
type MiddlewareFunc func(h Translator) Translator

// Wrap implements Middleware.
func (f MiddlewareFunc) Wrap(h Translator) Translator {
	return f(h)
}

// ComposeMiddleware chains multiple middleware into one.
func ComposeMiddleware(mw ...Middleware) Middleware {
	return MiddlewareFunc(func(h Translator) Translator {
		for i := len(mw) - 1; i >= 0; i-- {
			h = mw[i].Wrap(h)
		}
		return h
	})
}

// cacheKey generates a deterministic cache key for a request.
func cacheKey(req *llm.ChatRequest, fromProvider, toProvider string) string {
	h := sha256.New()
	_, _ = h.Write([]byte(fromProvider))
	_, _ = h.Write([]byte(toProvider))
	_, _ = h.Write([]byte(req.Model))
	for _, m := range req.Messages {
		_, _ = h.Write([]byte(m.Role))
		_, _ = h.Write([]byte(m.Content))
	}
	if len(req.Tools) > 0 {
		toolJSON, err := json.Marshal(req.Tools)
		if err == nil {
			_, _ = h.Write(toolJSON)
		}
	}
	if req.System != "" {
		_, _ = h.Write([]byte(req.System))
	}
	return hex.EncodeToString(h.Sum(nil))
}

// cachedHandler wraps a Handler with cache support.
type cachedHandler struct {
	inner Translator
	cache Cache
}

// Ensure cachedHandler implements Translator.
var _ Translator = (*cachedHandler)(nil)

// TranslateRequest translates a request with caching.
func (ch *cachedHandler) TranslateRequest(req *llm.ChatRequest, fromProvider, toProvider string) (map[string]interface{}, error) {
	key := cacheKey(req, fromProvider, toProvider)

	if cached, err := ch.cache.Get(context.Background(), key); err == nil {
		return cached, nil
	}

	result, err := ch.inner.TranslateRequest(req, fromProvider, toProvider)
	if err != nil {
		return nil, err
	}

	if err := ch.cache.Set(context.Background(), key, result); err != nil {
		slog.Warn("translator_cache_write_failed", "key", key, "error", err.Error())
	}
	return result, nil
}

// TranslateResponse delegates to the inner translator.
func (ch *cachedHandler) TranslateResponse(body []byte, fromProvider, toProvider, model, provider string) (*llm.ChatResponse, error) {
	return ch.inner.TranslateResponse(body, fromProvider, toProvider, model, provider)
}

// TranslateStreamChunk delegates to the inner translator.
func (ch *cachedHandler) TranslateStreamChunk(data []byte, fromProvider, toProvider, model, provider string) (*llm.StreamChunk, error) {
	return ch.inner.TranslateStreamChunk(data, fromProvider, toProvider, model, provider)
}

// loggingHandler wraps a Handler with logging support.
type loggingHandler struct {
	inner Translator
	log   LoggerFunc
}

// Ensure loggingHandler implements Translator.
var _ Translator = (*loggingHandler)(nil)

// TranslateRequest translates a request with logging.
func (lh *loggingHandler) TranslateRequest(req *llm.ChatRequest, fromProvider, toProvider string) (map[string]interface{}, error) {
	lh.log("translating request: %s -> %s, model: %s", fromProvider, toProvider, req.Model)
	result, err := lh.inner.TranslateRequest(req, fromProvider, toProvider)
	if err != nil {
		lh.log("translation failed: %s -> %s: %v", fromProvider, toProvider, err)
		return nil, err
	}
	lh.log("translation succeeded: %s -> %s", fromProvider, toProvider)
	return result, nil
}

// TranslateResponse delegates to the inner translator.
func (lh *loggingHandler) TranslateResponse(body []byte, fromProvider, toProvider, model, provider string) (*llm.ChatResponse, error) {
	return lh.inner.TranslateResponse(body, fromProvider, toProvider, model, provider)
}

// TranslateStreamChunk delegates to the inner translator.
func (lh *loggingHandler) TranslateStreamChunk(data []byte, fromProvider, toProvider, model, provider string) (*llm.StreamChunk, error) {
	return lh.inner.TranslateStreamChunk(data, fromProvider, toProvider, model, provider)
}

// metricsHandler wraps a Handler with metrics support.
type metricsHandler struct {
	inner Translator
	mw    *MetricsMiddleware
}

// Ensure metricsHandler implements Translator.
var _ Translator = (*metricsHandler)(nil)

// TranslateRequest translates a request with metrics tracking.
func (mh *metricsHandler) TranslateRequest(req *llm.ChatRequest, fromProvider, toProvider string) (map[string]interface{}, error) {
	mh.mw.mu.Lock()
	mh.mw.stats.Requests++
	mh.mw.mu.Unlock()

	result, err := mh.inner.TranslateRequest(req, fromProvider, toProvider)
	if err != nil {
		mh.mw.mu.Lock()
		mh.mw.stats.Errors++
		mh.mw.mu.Unlock()
		return nil, err
	}
	return result, nil
}

// TranslateResponse delegates to the inner translator.
func (mh *metricsHandler) TranslateResponse(body []byte, fromProvider, toProvider, model, provider string) (*llm.ChatResponse, error) {
	return mh.inner.TranslateResponse(body, fromProvider, toProvider, model, provider)
}

// TranslateStreamChunk delegates to the inner translator.
func (mh *metricsHandler) TranslateStreamChunk(data []byte, fromProvider, toProvider, model, provider string) (*llm.StreamChunk, error) {
	return mh.inner.TranslateStreamChunk(data, fromProvider, toProvider, model, provider)
}

// Wrap returns a Translator with logging applied.
func (m *LoggingMiddleware) Wrap(h Translator) Translator {
	return &loggingHandler{inner: h, log: m.log}
}

// Wrap returns a Translator with caching applied.
func (m *CacheMiddleware) Wrap(h Translator) Translator {
	return &cachedHandler{inner: h, cache: m.cache}
}

// Wrap returns a Translator with metrics tracking applied.
func (m *MetricsMiddleware) Wrap(h Translator) Translator {
	return &metricsHandler{inner: h, mw: m}
}

// Ensure middleware types implement Middleware interface.
var (
	_ Middleware = (*LoggingMiddleware)(nil)
	_ Middleware = (*CacheMiddleware)(nil)
	_ Middleware = (*MetricsMiddleware)(nil)
)
