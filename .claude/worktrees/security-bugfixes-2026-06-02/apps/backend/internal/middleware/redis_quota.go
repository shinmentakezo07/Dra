package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"dra-platform/backend/internal/pkg/logger"

	"github.com/redis/go-redis/v9"
)

// RedisQuotaTracker implements distributed quota tracking using Redis.
type RedisQuotaTracker struct {
	client redis.Cmdable
	prefix string
}

// NewRedisQuotaTracker creates a new Redis-backed quota tracker.
func NewRedisQuotaTracker(client redis.Cmdable) *RedisQuotaTracker {
	return &RedisQuotaTracker{
		client: client,
		prefix: "quota:",
	}
}

// CheckRequest checks quota and scoping rules, recording usage in Redis.
func (qt *RedisQuotaTracker) CheckRequest(ctx context.Context, key *ScopedAPIKey, model string, estimatedTokens int, clientIP string) error {
	if key == nil {
		return nil
	}
	if qt.client == nil {
		return nil
	}

	// IP allowlist check
	if len(key.AllowedIPs) > 0 {
		if !isIPAllowed(clientIP, key.AllowedIPs) {
			return fmt.Errorf("IP %s not allowed", clientIP)
		}
	}

	// Model allowlist check
	if len(key.AllowedModels) > 0 {
		allowed := false
		for _, m := range key.AllowedModels {
			if strings.EqualFold(m, model) || strings.HasPrefix(strings.ToLower(model), strings.ToLower(m)) {
				allowed = true
				break
			}
		}
		if !allowed {
			return fmt.Errorf("model %s not allowed for this key", model)
		}
	}

	// Max tokens per request
	if key.MaxTokensPerReq > 0 && estimatedTokens > key.MaxTokensPerReq {
		return fmt.Errorf("estimated tokens %d exceeds max %d", estimatedTokens, key.MaxTokensPerReq)
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	now := time.Now()

	// Daily request limit using Redis INCR with expiry
	if key.DailyRequestLimit > 0 {
		dailyKey := fmt.Sprintf("%s%s:daily:%s", qt.prefix, key.Key, now.Format("2006-01-02"))
		pipe := qt.client.Pipeline()
		pipe.Incr(timeoutCtx, dailyKey)
		pipe.Expire(timeoutCtx, dailyKey, 48*time.Hour)
		results, err := pipe.Exec(timeoutCtx)
		if err != nil {
			logger.Error("redis_quota_daily_failed", "error", err.Error(), "key", key.Key)
			// Fail open
		} else if len(results) > 0 {
			if countCmd, ok := results[0].(*redis.IntCmd); ok {
				count := int(countCmd.Val())
				if count > key.DailyRequestLimit {
					return fmt.Errorf("daily request limit %d exceeded", key.DailyRequestLimit)
				}
			}
		}
	}

	// Monthly token limit using Lua script for atomic check-then-increment
	if key.MonthlyTokenLimit > 0 {
		monthlyKey := fmt.Sprintf("%s%s:monthly:%s", qt.prefix, key.Key, now.Format("2006-01"))
		script := redis.NewScript(`
			local current = tonumber(redis.call('GET', KEYS[1]) or '0')
			if current + tonumber(ARGV[1]) > tonumber(ARGV[2]) then
				return -1
			end
			redis.call('INCRBY', KEYS[1], ARGV[1])
			redis.call('EXPIRE', KEYS[1], ARGV[3])
			return current + tonumber(ARGV[1])
		`)
		result, err := script.Run(timeoutCtx, qt.client, []string{monthlyKey}, estimatedTokens, key.MonthlyTokenLimit, 40*24*3600).Int()
		if err != nil {
			logger.Error("redis_quota_monthly_failed", "error", err.Error(), "key", key.Key)
			// Fail open
		} else if result == -1 {
			return fmt.Errorf("monthly token limit %d exceeded", key.MonthlyTokenLimit)
		}
	}

	return nil
}

// RecordUsage records actual token usage against monthly quota.
func (qt *RedisQuotaTracker) RecordUsage(ctx context.Context, key string, tokens int) {
	if key == "" || tokens <= 0 || qt.client == nil {
		return
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	monthlyKey := fmt.Sprintf("%s%s:monthly:%s", qt.prefix, key, time.Now().Format("2006-01"))
	qt.client.IncrBy(timeoutCtx, monthlyKey, int64(tokens))
}

// DailyCount returns the current daily request count.
func (qt *RedisQuotaTracker) DailyCount(ctx context.Context, key string) int {
	if key == "" || qt.client == nil {
		return 0
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	dailyKey := fmt.Sprintf("%s%s:daily:%s", qt.prefix, key, time.Now().Format("2006-01-02"))
	val, err := qt.client.Get(timeoutCtx, dailyKey).Int()
	if err != nil {
		return 0
	}
	return val
}

// MonthlyTokens returns the current monthly token count.
func (qt *RedisQuotaTracker) MonthlyTokens(ctx context.Context, key string) int {
	if key == "" || qt.client == nil {
		return 0
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	monthlyKey := fmt.Sprintf("%s%s:monthly:%s", qt.prefix, key, time.Now().Format("2006-01"))
	val, err := qt.client.Get(timeoutCtx, monthlyKey).Int()
	if err != nil {
		return 0
	}
	return val
}

