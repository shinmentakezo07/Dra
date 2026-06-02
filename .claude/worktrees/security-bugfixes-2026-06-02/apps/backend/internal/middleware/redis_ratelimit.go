package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
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
func (rl *RedisRateLimiter) Allow(ctx context.Context, key string) bool {
	if rl.client == nil {
		return true
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	now := time.Now().UnixMilli()
	windowStart := now - rl.window.Milliseconds()
	redisKey := rl.prefix + key

	pipe := rl.client.Pipeline()
	pipe.ZRemRangeByScore(timeoutCtx, redisKey, "0", fmt.Sprintf("%d", windowStart))
	pipe.ZAdd(timeoutCtx, redisKey, redis.Z{Score: float64(now), Member: now})
	pipe.ZCard(timeoutCtx, redisKey)
	pipe.Expire(timeoutCtx, redisKey, rl.window+time.Second)

	results, err := pipe.Exec(timeoutCtx)
	if err != nil {
		logger.Error("redis_rate_limit_pipeline_failed", "error", err.Error(), "key", key)
		return false // fail-closed: deny requests when Redis is unavailable
	}

	// results[2] is ZCard result
	countCmd, ok := results[2].(*redis.IntCmd)
	if !ok {
		logger.Error("redis_rate_limit_unexpected_result", "key", key)
		return false // fail-closed on unexpected result
	}

	count := int(countCmd.Val())
	return count <= rl.max
}

// RedisRateLimit returns middleware that uses the Redis rate limiter.
func RedisRateLimit(rl *RedisRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				if idx := strings.Index(xff, ","); idx > 0 {
					key = strings.TrimSpace(xff[:idx])
				} else {
					key = strings.TrimSpace(xff)
				}
			}
			if u := GetUser(r); u != nil {
				key = u.ID
			}
			if !rl.Allow(r.Context(), key) {
				logger.Warn("rate_limit_exceeded", "key", key, "path", r.URL.Path)
				response.Error(w, 429, "Rate limit exceeded. Please slow down.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
