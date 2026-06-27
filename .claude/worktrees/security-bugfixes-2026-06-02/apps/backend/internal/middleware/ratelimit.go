package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
)

type RateLimiter struct {
	mu      sync.RWMutex
	store   map[string]*rateEntry
	window  time.Duration
	max     int
	stopCh  chan struct{}
}

type rateEntry struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter(window time.Duration, maxReq int) *RateLimiter {
	rl := &RateLimiter{
		store:  make(map[string]*rateEntry),
		window: window,
		max:    maxReq,
		stopCh: make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

// Stop terminates the background cleanup goroutine.
func (rl *RateLimiter) Stop() {
	close(rl.stopCh)
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	e, ok := rl.store[key]
	if !ok || e.resetAt.Before(now) {
		rl.store[key] = &rateEntry{count: 1, resetAt: now.Add(rl.window)}
		return true
	}
	if e.count >= rl.max {
		return false
	}
	e.count++
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.store {
				if v.resetAt.Before(now) {
					delete(rl.store, k)
				}
			}
			rl.mu.Unlock()
		case <-rl.stopCh:
			return
		}
	}
}

// clientIP extracts the real client IP from X-Forwarded-For header,
// falling back to RemoteAddr when not present.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.SplitN(xff, ",", 2)[0])
	}
	return r.RemoteAddr
}

func RateLimit(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := clientIP(r)
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
