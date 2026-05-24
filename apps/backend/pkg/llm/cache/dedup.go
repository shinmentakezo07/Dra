package cache

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"dra-platform/backend/pkg/llm"
	"golang.org/x/sync/singleflight"
)

// DedupCache wraps a Cache with request deduplication using singleflight.
// Concurrent identical requests are collapsed into a single upstream call.
type DedupCache struct {
	cache   Cache
	group   singleflight.Group
}

// NewDedupCache wraps an existing cache with deduplication.
func NewDedupCache(cache Cache) *DedupCache {
	return &DedupCache{cache: cache}
}

// Get retrieves a cached response, deduplicating concurrent requests.
func (d *DedupCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	// First try cache directly without deduplication
	if d.cache != nil {
		resp, err := d.cache.Get(ctx, key)
		if err == nil && resp != nil {
			return resp, nil
		}
	}
	return nil, ErrCacheMiss
}

// Do executes the given function, deduplicating concurrent calls with the same key.
// If the result is cached, it is returned directly. Otherwise, fn is called exactly
// once for all concurrent callers with the same key, and the result is cached.
func (d *DedupCache) Do(ctx context.Context, key string, ttl time.Duration, fn func() (*llm.ChatResponse, error)) (*llm.ChatResponse, error) {
	// Fast path: check cache
	if d.cache != nil {
		resp, err := d.cache.Get(ctx, key)
		if err == nil && resp != nil {
			return resp, nil
		}
	}

	// Slow path: deduplicated execution
	v, err, _ := d.group.Do(key, func() (interface{}, error) {
		// Double-check cache after winning the race
		if d.cache != nil {
			resp, err := d.cache.Get(ctx, key)
			if err == nil && resp != nil {
				return resp, nil
			}
		}

		resp, err := fn()
		if err != nil {
			return nil, err
		}

		// Cache the result
		if d.cache != nil && resp != nil {
			if err := d.cache.Set(ctx, key, resp, ttl); err != nil {
				slog.Warn("dedup_cache_write_failed", "key", key, "error", err.Error())
			}
		}
		return resp, nil
	})

	if err != nil {
		return nil, err
	}
	resp, ok := v.(*llm.ChatResponse)
	if !ok {
		return nil, fmt.Errorf("dedup: unexpected type %T", v)
	}
	return resp, nil
}

// Set stores a response in the cache.
func (d *DedupCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	if d.cache != nil {
		return d.cache.Set(ctx, key, value, ttl)
	}
	return nil
}

// Delete removes a response from the cache.
func (d *DedupCache) Delete(ctx context.Context, key string) error {
	if d.cache != nil {
		return d.cache.Delete(ctx, key)
	}
	return nil
}

// Clear clears the cache.
func (d *DedupCache) Clear(ctx context.Context) error {
	if d.cache != nil {
		return d.cache.Clear(ctx)
	}
	return nil
}
