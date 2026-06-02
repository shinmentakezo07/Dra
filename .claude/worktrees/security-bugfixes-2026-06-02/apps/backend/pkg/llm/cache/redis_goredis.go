package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"dra-platform/backend/pkg/llm"

	"github.com/redis/go-redis/v9"
)

// GoRedisCache implements Cache backed by go-redis/v9.
type GoRedisCache struct {
	client     redis.Cmdable
	keyPrefix  string
	defaultTTL time.Duration
}

// GoRedisOption configures a GoRedisCache.
type GoRedisOption func(*GoRedisCache)

// WithGoRedisKeyPrefix sets a prefix for all cache keys.
func WithGoRedisKeyPrefix(prefix string) GoRedisOption {
	return func(r *GoRedisCache) {
		r.keyPrefix = prefix
	}
}

// WithGoRedisTTL sets the default TTL.
func WithGoRedisTTL(ttl time.Duration) GoRedisOption {
	return func(r *GoRedisCache) {
		r.defaultTTL = ttl
	}
}

// NewGoRedisCache creates a new go-redis backed cache.
func NewGoRedisCache(client redis.Cmdable, opts ...GoRedisOption) *GoRedisCache {
	r := &GoRedisCache{
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
func (r *GoRedisCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	data, err := r.client.Get(ctx, r.prefixedKey(key)).Result()
	if err == redis.Nil {
		return nil, ErrCacheMiss
	}
	if err != nil {
		return nil, fmt.Errorf("redis cache get: %w", err)
	}

	var resp llm.ChatResponse
	if err := json.Unmarshal([]byte(data), &resp); err != nil {
		return nil, fmt.Errorf("redis cache unmarshal: %w", err)
	}
	return &resp, nil
}

// Set stores a response in the cache.
func (r *GoRedisCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	if ttl <= 0 {
		ttl = r.defaultTTL
	}
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("redis cache marshal: %w", err)
	}
	return r.client.Set(ctx, r.prefixedKey(key), string(data), ttl).Err()
}

// Delete removes a response from the cache.
func (r *GoRedisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, r.prefixedKey(key)).Err()
}

// Clear clears the cache (uses SCAN + DEL for production safety).
func (r *GoRedisCache) Clear(ctx context.Context) error {
	var cursor uint64
	for {
		keys, nextCursor, err := r.client.Scan(ctx, cursor, r.keyPrefix+"*", 100).Result()
		if err != nil {
			return fmt.Errorf("redis cache scan: %w", err)
		}
		if len(keys) > 0 {
			if err := r.client.Del(ctx, keys...).Err(); err != nil {
				return fmt.Errorf("redis cache del: %w", err)
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return nil
}

// Stats returns cache statistics (best effort for Redis).
func (r *GoRedisCache) Stats(ctx context.Context) (Stats, error) {
	// Redis INFO can be expensive; return empty stats for now
	return Stats{}, nil
}

func (r *GoRedisCache) prefixedKey(key string) string {
	return r.keyPrefix + key
}
