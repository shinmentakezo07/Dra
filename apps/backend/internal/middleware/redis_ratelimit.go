package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"

	"github.com/redis/go-redis/v9"
)

// RedisRateLimiter implements a distributed sliding-window rate limiter using Redis.
type RedisRateLimiter struct {
	client redis.Cmdable
	window time.Duration
	max    int
	prefix string
}

// NewRedisRateLimiter creates a new Redis-backed rate limiter.
// client can be *redis.Client or *redis.ClusterClient.
func NewRedisRateLimiter(client redis.Cmdable, window time.Duration, maxReq int) *RedisRateLimiter {
	return &RedisRateLimiter{
		client: client,
		window: window,
		max:    maxReq,
		prefix: "ratelimit:",
	}
}

// Allow checks if the key is within rate limit using a Redis sorted-set sliding window.
func (rl *RedisRateLimiter) Allow(key string) bool {
	if rl.client == nil {
		return true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	now := time.Now().UnixMilli()
	windowStart := now - rl.window.Milliseconds()
	redisKey := rl.prefix + key

	pipe := rl.client.Pipeline()
	pipe.ZRemRangeByScore(ctx, redisKey, "0", fmt.Sprintf("%d", windowStart))
	pipe.ZAdd(ctx, redisKey, redis.Z{Score: float64(now), Member: now})
	pipe.ZCard(ctx, redisKey)
	pipe.Expire(ctx, redisKey, rl.window+time.Second)

	results, err := pipe.Exec(ctx)
	if err != nil {
		logger.Error("redis_rate_limit_pipeline_failed", "error", err.Error(), "key", key)
		return false
	}

	// results[2] is ZCard result
	countCmd, ok := results[2].(*redis.IntCmd)
	if !ok {
		logger.Error("redis_rate_limit_unexpected_result", "key", key)
		return false
	}

	count := int(countCmd.Val())
	return count <= rl.max
}

// RedisRateLimit returns middleware that uses the Redis rate limiter.
func RedisRateLimit(rl *RedisRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if u := GetUser(r); u != nil {
				key = u.ID
			}
			if !rl.Allow(key) {
				logger.Warn("rate_limit_exceeded", "key", key, "path", r.URL.Path)
				response.Error(w, 429, "Rate limit exceeded. Please slow down.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
