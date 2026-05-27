package middleware

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
)

// ScopedAPIKey extends API key with scoping and quota limits.
type ScopedAPIKey struct {
	Key                string
	UserID             string
	AllowedModels      []string
	AllowedIPs         []string
	MaxTokensPerReq    int
	DailyRequestLimit  int
	MonthlyTokenLimit  int
}

// QuotaTrackerInterface allows swapping in-memory and Redis implementations.
type QuotaTrackerInterface interface {
	CheckRequest(ctx context.Context, key *ScopedAPIKey, model string, estimatedTokens int, clientIP string) error
	RecordUsage(ctx context.Context, key string, tokens int)
	DailyCount(ctx context.Context, key string) int
	MonthlyTokens(ctx context.Context, key string) int
}

// QuotaTracker tracks usage per API key.
type QuotaTracker struct {
	mu       sync.RWMutex
	daily    map[string]*dailyQuota
	monthly  map[string]*monthlyQuota
	stopCh   chan struct{}
}

type dailyQuota struct {
	count   int
	resetAt time.Time
}

type monthlyQuota struct {
	tokens  int
	resetAt time.Time
}

// NewQuotaTracker creates a new quota tracker.
func NewQuotaTracker() *QuotaTracker {
	qt := &QuotaTracker{
		daily:   make(map[string]*dailyQuota),
		monthly: make(map[string]*monthlyQuota),
		stopCh:  make(chan struct{}),
	}
	go qt.cleanup()
	return qt
}

// Stop terminates the background cleanup goroutine.
func (qt *QuotaTracker) Stop() {
	close(qt.stopCh)
}

// CheckRequest checks if a request is within quota and scoping rules.
func (qt *QuotaTracker) CheckRequest(_ context.Context, key *ScopedAPIKey, model string, estimatedTokens int, clientIP string) error {
	if key == nil {
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

	// Daily request limit
	if key.DailyRequestLimit > 0 {
		qt.mu.Lock()
		dq, ok := qt.daily[key.Key]
		now := time.Now()
		if !ok || dq.resetAt.Before(now) {
			dq = &dailyQuota{count: 0, resetAt: now.Add(24 * time.Hour).Truncate(24 * time.Hour)}
			qt.daily[key.Key] = dq
		}
		if dq.count >= key.DailyRequestLimit {
			qt.mu.Unlock()
			return fmt.Errorf("daily request limit %d exceeded", key.DailyRequestLimit)
		}
		dq.count++
		qt.mu.Unlock()
	}

	// Monthly token limit
	if key.MonthlyTokenLimit > 0 {
		qt.mu.Lock()
		mq, ok := qt.monthly[key.Key]
		now := time.Now()
		if !ok || mq.resetAt.Before(now) {
			mq = &monthlyQuota{tokens: 0, resetAt: time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())}
			qt.monthly[key.Key] = mq
		}
		if mq.tokens+estimatedTokens > key.MonthlyTokenLimit {
			qt.mu.Unlock()
			return fmt.Errorf("monthly token limit %d exceeded", key.MonthlyTokenLimit)
		}
		qt.mu.Unlock()
	}

	return nil
}

// RecordUsage records actual token usage after a request completes.
func (qt *QuotaTracker) RecordUsage(_ context.Context, key string, tokens int) {
	if key == "" || tokens == 0 {
		return
	}
	qt.mu.Lock()
	defer qt.mu.Unlock()
	if mq, ok := qt.monthly[key]; ok {
		mq.tokens += tokens
		if mq.tokens < 0 {
			mq.tokens = 0
		}
	}
}

// DailyCount returns the current daily request count for a key.
func (qt *QuotaTracker) DailyCount(_ context.Context, key string) int {
	qt.mu.RLock()
	defer qt.mu.RUnlock()
	if dq, ok := qt.daily[key]; ok {
		return dq.count
	}
	return 0
}

// MonthlyTokens returns the current monthly token count for a key.
func (qt *QuotaTracker) MonthlyTokens(_ context.Context, key string) int {
	qt.mu.RLock()
	defer qt.mu.RUnlock()
	if mq, ok := qt.monthly[key]; ok {
		return mq.tokens
	}
	return 0
}

func (qt *QuotaTracker) cleanup() {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			qt.mu.Lock()
			now := time.Now()
			for k, v := range qt.daily {
				if v.resetAt.Before(now) {
					delete(qt.daily, k)
				}
			}
			for k, v := range qt.monthly {
				if v.resetAt.Before(now) {
					delete(qt.monthly, k)
				}
			}
			qt.mu.Unlock()
		case <-qt.stopCh:
			return
		}
	}
}

func isIPAllowed(clientIP string, allowed []string) bool {
	host, _, err := net.SplitHostPort(clientIP)
	if err != nil {
		host = clientIP
	}
	for _, allowedIP := range allowed {
		if allowedIP == host {
			return true
		}
		if strings.Contains(allowedIP, "/") {
			_, cidr, err := net.ParseCIDR(allowedIP)
			if err == nil {
				ip := net.ParseIP(host)
				if ip != nil && cidr.Contains(ip) {
					return true
				}
			}
		}
	}
	return false
}

// ToScoped converts a domain APIKey to a ScopedAPIKey for quota checks.
func ToScoped(k *domain.APIKey) *ScopedAPIKey {
	if k == nil {
		return nil
	}
	return &ScopedAPIKey{
		Key:               k.Key,
		UserID:            k.UserID,
		AllowedModels:     k.AllowedModels,
		AllowedIPs:        k.AllowedIPs,
		MaxTokensPerReq:   k.MaxTokensPerRequest,
		DailyRequestLimit: k.DailyRequestLimit,
		MonthlyTokenLimit: k.MonthlyTokenLimit,
	}
}

// QuotaCheck is middleware that enforces quotas and API key scoping.
func QuotaCheck(tracker QuotaTrackerInterface, getKey func(r *http.Request) *ScopedAPIKey, parseRequest func(r *http.Request) (model string, tokens int)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := getKey(r)

			var model string
			var tokens int
			if parseRequest != nil {
				body, readErr := io.ReadAll(r.Body)
				if readErr == nil {
					r.Body.Close()
					r.Body = io.NopCloser(bytes.NewReader(body))
					model, tokens = parseRequest(r)
					r.Body = io.NopCloser(bytes.NewReader(body))
				}
			}

			clientIP := r.RemoteAddr
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				if idx := strings.Index(xff, ","); idx > 0 {
					clientIP = strings.TrimSpace(xff[:idx])
				} else {
					clientIP = strings.TrimSpace(xff)
				}
			}

			if err := tracker.CheckRequest(r.Context(), key, model, tokens, clientIP); err != nil {
				keyPrefix := key.Key
				if len(keyPrefix) > 8 {
					keyPrefix = keyPrefix[:8] + "..."
				}
				logger.Warn("quota_check_failed", "error", err.Error(), "key_prefix", keyPrefix)
				response.Error(w, 429, err.Error())
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
