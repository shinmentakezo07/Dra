package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// RepoCache is a generic cache interface for repository layer caching.
type RepoCache interface {
	Get(ctx context.Context, key string, dest any) bool
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) error
}

// RedisRepoCache implements RepoCache using Redis.
type RedisRepoCache struct {
	client redis.Cmdable
	prefix string
}

func NewRedisRepoCache(client redis.Cmdable, prefix string) *RedisRepoCache {
	return &RedisRepoCache{client: client, prefix: prefix}
}

func (c *RedisRepoCache) key(k string) string {
	return c.prefix + k
}

func (c *RedisRepoCache) Get(ctx context.Context, key string, dest any) bool {
	if c.client == nil {
		return false
	}
	data, err := c.client.Get(ctx, c.key(key)).Bytes()
	if err != nil {
		return false
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return false
	}
	return true
}

func (c *RedisRepoCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	if c.client == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value: %w", err)
	}
	return c.client.Set(ctx, c.key(key), data, ttl).Err()
}

func (c *RedisRepoCache) Delete(ctx context.Context, key string) error {
	if c.client == nil {
		return nil
	}
	return c.client.Del(ctx, c.key(key)).Err()
}

func (c *RedisRepoCache) DeletePrefix(ctx context.Context, prefix string) error {
	if c.client == nil {
		return nil
	}
	iter := c.client.Scan(ctx, 0, c.key(prefix+"*"), 100).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}
	return iter.Err()
}

// MemoryRepoCache implements RepoCache using an in-memory map.
type MemoryRepoCache struct {
	mu    sync.RWMutex
	data  map[string]memoryCacheEntry
	limit int
}

type memoryCacheEntry struct {
	value      []byte
	expiresAt  time.Time
	lastAccess time.Time // Bug #51: track access time for proper eviction
}

func NewMemoryRepoCache(limit int) *MemoryRepoCache {
	return &MemoryRepoCache{
		data:  make(map[string]memoryCacheEntry),
		limit: limit,
	}
}

func (c *MemoryRepoCache) Get(ctx context.Context, key string, dest any) bool {
	c.mu.RLock()
	entry, ok := c.data[key]
	c.mu.RUnlock()
	if !ok {
		return false
	}
	if time.Now().After(entry.expiresAt) {
		// Bug #52: release read lock before acquiring write lock to prevent deadlock
		c.mu.Lock()
		delete(c.data, key)
		c.mu.Unlock()
		return false
	}
	if err := json.Unmarshal(entry.value, dest); err != nil {
		return false
	}
	// Bug #51: update lastAccess time on successful read
	c.mu.Lock()
	if e, exists := c.data[key]; exists {
		e.lastAccess = time.Now()
		c.data[key] = e
	}
	c.mu.Unlock()
	return true
}

func (c *MemoryRepoCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value: %w", err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.data) >= c.limit {
		// Bug #51: evict by least recently accessed (LRU), not by soonest expiry
		var lruKey string
		var lruTime time.Time
		for k, v := range c.data {
			if lruTime.IsZero() || v.lastAccess.Before(lruTime) {
				lruTime = v.lastAccess
				lruKey = k
			}
		}
		if lruKey != "" {
			delete(c.data, lruKey)
		}
	}
	c.data[key] = memoryCacheEntry{value: data, expiresAt: time.Now().Add(ttl), lastAccess: time.Now()}
	return nil
}

func (c *MemoryRepoCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.data, key)
	return nil
}

func (c *MemoryRepoCache) DeletePrefix(ctx context.Context, prefix string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.data {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.data, k)
		}
	}
	return nil
}

// cacheKey helpers
func userCacheKey(id string) string    { return "user:id:" + id }
func userEmailCacheKey(email string) string { return "user:email:" + email }
func apiKeyCacheKey(key string) string  { return "apikey:" + key }
func settingCacheKey(key string) string { return "setting:" + key }
func providerCacheKey(id string) string { return "provider:id:" + id }
func providerListCacheKey() string     { return "provider:list" }
func modelCacheKey(id string) string   { return "model:id:" + id }
func modelListCacheKey() string        { return "model:list" }
func creditsCacheKey(userID string) string { return "credits:" + userID }
