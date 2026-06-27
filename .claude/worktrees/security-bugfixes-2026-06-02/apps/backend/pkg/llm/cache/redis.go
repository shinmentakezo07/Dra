package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"dra-platform/backend/pkg/llm"
)

// RedisClient is the minimal interface required from a Redis client.
// Compatible with go-redis/v9 and similar libraries.
type RedisClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Del(ctx context.Context, keys ...string) error
	Keys(ctx context.Context, pattern string) ([]string, error)
	Ping(ctx context.Context) error
}

// RedisCache implements Cache backed by Redis.
type RedisCache struct {
	client     RedisClient
	keyPrefix  string
	defaultTTL time.Duration
}

// RedisOption configures a RedisCache.
type RedisOption func(*RedisCache)

// WithKeyPrefix sets a prefix for all cache keys.
func WithKeyPrefix(prefix string) RedisOption {
	return func(r *RedisCache) {
		r.keyPrefix = prefix
	}
}

// WithRedisTTL sets the default TTL for Redis cache.
func WithRedisTTL(ttl time.Duration) RedisOption {
	return func(r *RedisCache) {
		r.defaultTTL = ttl
	}
}

// NewRedisCache creates a new Redis-backed cache.
func NewRedisCache(client RedisClient, opts ...RedisOption) *RedisCache {
	r := &RedisCache{
		client:     client,
		keyPrefix:  "llm:cache:",
		defaultTTL: 5 * time.Minute,
	}
	for _, opt := range opts {
		opt(r)
	}
	return r
}

// Get retrieves a cached response.
func (r *RedisCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	data, err := r.client.Get(ctx, r.prefixedKey(key))
	if err != nil {
		// Distinguish between "key not found" and infrastructure errors.
		// Redis GET returns a nil error with empty string for missing keys in most clients,
		// but some return a specific "redis: nil" error. Treat empty data as cache miss;
		// propagate all other errors so callers can distinguish infra failures.
		if data == "" {
			return nil, ErrCacheMiss
		}
		return nil, fmt.Errorf("redis cache: get: %w", err)
	}

	var resp llm.ChatResponse
	if err := json.Unmarshal([]byte(data), &resp); err != nil {
		return nil, fmt.Errorf("redis cache: unmarshal: %w", err)
	}
	return &resp, nil
}

// Set stores a response in the cache.
func (r *RedisCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	if ttl <= 0 {
		ttl = r.defaultTTL
	}
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("redis cache: marshal: %w", err)
	}
	return r.client.Set(ctx, r.prefixedKey(key), string(data), ttl)
}

// Delete removes a response from the cache.
func (r *RedisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, r.prefixedKey(key))
}

// Clear clears only LLM cache keys (prefixed), not the entire database.
func (r *RedisCache) Clear(ctx context.Context) error {
	keys, err := r.client.Keys(ctx, r.keyPrefix+"*")
	if err != nil {
		return fmt.Errorf("redis cache: keys scan: %w", err)
	}
	if len(keys) > 0 {
		return r.client.Del(ctx, keys...)
	}
	return nil
}

// Health checks if Redis is reachable.
func (r *RedisCache) Health(ctx context.Context) error {
	return r.client.Ping(ctx)
}

// Stats returns cache statistics (best effort for Redis).
func (r *RedisCache) Stats(ctx context.Context) (Stats, error) {
	return Stats{
		Hits:         0,
		Misses:       0,
		Size:         0,
		TotalEntries: 0,
	}, nil
}

func (r *RedisCache) prefixedKey(key string) string {
	return r.keyPrefix + key
}
