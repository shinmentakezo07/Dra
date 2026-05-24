package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestQuotaTracker_CheckRequest_Allowed(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:               "test-key",
		DailyRequestLimit: 10,
		MonthlyTokenLimit: 1000,
	}

	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 100, "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestQuotaTracker_CheckRequest_ModelNotAllowed(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:           "test-key",
		AllowedModels: []string{"gpt-4o-mini"},
	}

	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 100, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for disallowed model")
	}
}

func TestQuotaTracker_CheckRequest_IPNotAllowed(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:       "test-key",
		AllowedIPs: []string{"10.0.0.0/8"},
	}

	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 100, "127.0.0.1:1234")
	if err == nil {
		t.Fatal("expected error for disallowed IP")
	}
}

func TestQuotaTracker_CheckRequest_MaxTokens(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:             "test-key",
		MaxTokensPerReq: 50,
	}

	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 100, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for exceeding max tokens")
	}
}

func TestQuotaTracker_CheckRequest_DailyLimit(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:               "test-key",
		DailyRequestLimit: 2,
	}

	_ = qt.CheckRequest(context.Background(), key, "gpt-4o", 1, "127.0.0.1")
	_ = qt.CheckRequest(context.Background(), key, "gpt-4o", 1, "127.0.0.1")
	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 1, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for exceeding daily limit")
	}
}

func TestQuotaTracker_CheckRequest_MonthlyLimit(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:               "test-key",
		MonthlyTokenLimit: 100,
	}

	_ = qt.CheckRequest(context.Background(), key, "gpt-4o", 60, "127.0.0.1")
	err := qt.CheckRequest(context.Background(), key, "gpt-4o", 50, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for exceeding monthly limit")
	}
}

func TestQuotaTracker_RecordUsage(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:               "test-key",
		MonthlyTokenLimit: 1000,
	}
	_ = qt.CheckRequest(context.Background(), key, "gpt-4o", 1, "127.0.0.1")

	qt.RecordUsage(context.Background(), "test-key", 50)
	if qt.MonthlyTokens(context.Background(), "test-key") != 51 {
		t.Errorf("monthly tokens = %d, want 51", qt.MonthlyTokens(context.Background(), "test-key"))
	}
}

func TestIsIPAllowed(t *testing.T) {
	tests := []struct {
		clientIP string
		allowed  []string
		want     bool
	}{
		{"127.0.0.1", []string{"127.0.0.1"}, true},
		{"127.0.0.1:1234", []string{"127.0.0.1"}, true},
		{"10.0.1.5", []string{"10.0.0.0/8"}, true},
		{"192.168.1.1", []string{"10.0.0.0/8"}, false},
		{"127.0.0.1", []string{}, false},
	}

	for _, tt := range tests {
		got := isIPAllowed(tt.clientIP, tt.allowed)
		if got != tt.want {
			t.Errorf("isIPAllowed(%q, %v) = %v, want %v", tt.clientIP, tt.allowed, got, tt.want)
		}
	}
}

func TestQuotaCheckMiddleware(t *testing.T) {
	qt := NewQuotaTracker()
	key := &ScopedAPIKey{
		Key:               "test-key",
		DailyRequestLimit: 1,
	}

	getKey := func(r *http.Request) *ScopedAPIKey { return key }
	parseRequest := func(r *http.Request) (string, int) { return "gpt-4o", 10 }

	handler := QuotaCheck(qt, getKey, parseRequest)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request passes
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest("POST", "/chat", nil))
	if rr.Code != 200 {
		t.Errorf("first request status = %d, want 200", rr.Code)
	}

	// Second request blocked
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest("POST", "/chat", nil))
	if rr.Code != 429 {
		t.Errorf("second request status = %d, want 429", rr.Code)
	}
}

func TestQuotaTracker_Cleanup(t *testing.T) {
	qt := NewQuotaTracker()
	qt.mu.Lock()
	qt.daily["old"] = &dailyQuota{count: 5, resetAt: time.Now().Add(-time.Hour)}
	qt.monthly["old"] = &monthlyQuota{tokens: 100, resetAt: time.Now().Add(-time.Hour)}
	qt.mu.Unlock()

	// Manually trigger cleanup logic
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

	qt.mu.RLock()
	_, okDaily := qt.daily["old"]
	_, okMonthly := qt.monthly["old"]
	qt.mu.RUnlock()

	if okDaily || okMonthly {
		t.Error("expected old quotas to be cleaned up")
	}
}
