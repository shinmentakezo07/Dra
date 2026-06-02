package watcher

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	w := New()
	if w == nil {
		t.Fatal("New() returned nil")
	}
	if w.maxHistory != 1000 {
		t.Errorf("maxHistory = %d, want 1000", w.maxHistory)
	}
}

func TestClassify_RateLimit(t *testing.T) {
	w := New()
	err := errors.New("rate limit exceeded: 429 too many requests")
	record := w.classify(err, "openai", "gpt-4o", "req-1")
	if record.Category != CategoryRateLimit {
		t.Errorf("Category = %v, want %v", record.Category, CategoryRateLimit)
	}
	if !record.Retryable {
		t.Error("Retryable = false, want true for rate limit")
	}
}

func TestClassify_Auth(t *testing.T) {
	w := New()
	err := errors.New("unauthorized: invalid api key")
	record := w.classify(err, "openai", "gpt-4o", "req-1")
	if record.Category != CategoryAuth {
		t.Errorf("Category = %v, want %v", record.Category, CategoryAuth)
	}
	if record.Retryable {
		t.Error("Retryable = true, want false for auth")
	}
}

func TestClassify_Timeout(t *testing.T) {
	w := New()
	err := errors.New("context deadline exceeded")
	record := w.classify(err, "anthropic", "claude-sonnet-4", "req-2")
	if record.Category != CategoryTimeout {
		t.Errorf("Category = %v, want %v", record.Category, CategoryTimeout)
	}
	if !record.Retryable {
		t.Error("Retryable = false, want true for timeout")
	}
}

func TestClassify_Network(t *testing.T) {
	w := New()
	err := errors.New("dial tcp: no such host")
	record := w.classify(err, "openai", "gpt-4o", "req-3")
	if record.Category != CategoryNetwork {
		t.Errorf("Category = %v, want %v", record.Category, CategoryNetwork)
	}
	if !record.Retryable {
		t.Error("Retryable = false, want true for network")
	}
}

func TestClassify_Validation(t *testing.T) {
	w := New()
	err := errors.New("bad request: validation failed on schema")
	record := w.classify(err, "openai", "gpt-4o", "req-4")
	if record.Category != CategoryValidation {
		t.Errorf("Category = %v, want %v", record.Category, CategoryValidation)
	}
	if record.Retryable {
		t.Error("Retryable = true, want false for validation")
	}
}

func TestClassify_ContextLength(t *testing.T) {
	w := New()
	err := errors.New("context length exceed maximum token limit")
	record := w.classify(err, "anthropic", "claude-opus-4", "req-5")
	if record.Category != CategoryContextLength {
		t.Errorf("Category = %v, want %v", record.Category, CategoryContextLength)
	}
	if record.Retryable {
		t.Error("Retryable = true, want false for context length")
	}
}

func TestClassify_Provider(t *testing.T) {
	w := New()
	err := errors.New("provider unavailable: 503 service error")
	record := w.classify(err, "openai", "gpt-4o", "req-6")
	if record.Category != CategoryProvider {
		t.Errorf("Category = %v, want %v", record.Category, CategoryProvider)
	}
	if !record.Retryable {
		t.Error("Retryable = false, want true for provider")
	}
}

func TestClassify_Unknown(t *testing.T) {
	w := New()
	err := errors.New("something weird happened")
	record := w.classify(err, "", "", "")
	if record.Category != CategoryUnknown {
		t.Errorf("Category = %v, want %v", record.Category, CategoryUnknown)
	}
	if !record.Retryable {
		t.Error("Retryable = false, want true for unknown")
	}
}

func TestWatch_RecordsHistory(t *testing.T) {
	w := New()
	err := errors.New("test error")
	_ = w.Watch(context.Background(), err, "test-provider", "test-model", "req-1")

	history := w.History(10)
	if len(history) != 1 {
		t.Fatalf("History length = %d, want 1", len(history))
	}
	if history[0].Provider != "test-provider" {
		t.Errorf("Provider = %q, want %q", history[0].Provider, "test-provider")
	}
	if history[0].Model != "test-model" {
		t.Errorf("Model = %q, want %q", history[0].Model, "test-model")
	}
}

func TestWatch_InvokesHandlers(t *testing.T) {
	w := New()
	var categoryHandled bool
	var allHandled bool

	w.Register(CategoryNetwork, func(ctx context.Context, record ErrorRecord) error {
		categoryHandled = true
		return nil
	})
	w.RegisterAll(func(ctx context.Context, record ErrorRecord) error {
		allHandled = true
		return nil
	})

	err := errors.New("connection refused: dial error")
	_ = w.Watch(context.Background(), err, "test", "model", "req-1")

	if !categoryHandled {
		t.Error("category handler was not invoked")
	}
	if !allHandled {
		t.Error("all handler was not invoked")
	}
}

func TestHistory_Limit(t *testing.T) {
	w := New()
	for i := 0; i < 5; i++ {
		_ = w.Watch(context.Background(), fmt.Errorf("error %d", i), "p", "m", "r")
	}

	if got := len(w.History(3)); got != 3 {
		t.Errorf("History(3) length = %d, want 3", got)
	}
	if got := len(w.History(0)); got != 5 {
		t.Errorf("History(0) length = %d, want 5", got)
	}
	if got := len(w.History(100)); got != 5 {
		t.Errorf("History(100) length = %d, want 5", got)
	}
}

func TestStats(t *testing.T) {
	w := New()
	_ = w.Watch(context.Background(), errors.New("rate limit 429"), "p", "m", "r")
	_ = w.Watch(context.Background(), errors.New("rate limit 429"), "p", "m", "r")
	_ = w.Watch(context.Background(), errors.New("unauthorized"), "p", "m", "r")

	stats := w.Stats()
	if stats[CategoryRateLimit] != 2 {
		t.Errorf("Stats[RateLimit] = %d, want 2", stats[CategoryRateLimit])
	}
	if stats[CategoryAuth] != 1 {
		t.Errorf("Stats[Auth] = %d, want 1", stats[CategoryAuth])
	}
}

func TestHandleError(t *testing.T) {
	w := New()
	w.HandleError(context.Background(), errors.New("test"))
	if len(w.History(10)) != 1 {
		t.Error("HandleError did not record error")
	}
}

func TestCircuitBreaker_Allow(t *testing.T) {
	cb := NewCircuitBreaker(3, 100*time.Millisecond)

	for i := 0; i < 3; i++ {
		if !cb.Allow() {
			t.Fatalf("Allow() = false on closed circuit, iteration %d", i)
		}
		cb.RecordFailure()
	}

	if cb.State() != StateOpen {
		t.Fatalf("state = %v, want %v", cb.State(), StateOpen)
	}

	if cb.Allow() {
		t.Error("Allow() = true on open circuit, want false")
	}
}

func TestCircuitBreaker_Recovery(t *testing.T) {
	cb := NewCircuitBreaker(2, 50*time.Millisecond)

	cb.RecordFailure()
	cb.RecordFailure()

	if cb.State() != StateOpen {
		t.Fatalf("state = %v, want %v", cb.State(), StateOpen)
	}

	time.Sleep(60 * time.Millisecond)

	if !cb.Allow() {
		t.Fatal("Allow() = false after timeout, want true (half-open)")
	}

	cb.RecordSuccess()
	if cb.State() != StateClosed {
		t.Errorf("state after success = %v, want %v", cb.State(), StateClosed)
	}
}

func TestCircuitBreaker_HalfOpenFailure(t *testing.T) {
	cb := NewCircuitBreaker(2, 30*time.Millisecond)

	cb.RecordFailure()
	cb.RecordFailure()

	time.Sleep(40 * time.Millisecond)
	cb.Allow()
	cb.RecordFailure()

	if cb.State() != StateOpen {
		t.Errorf("state after half-open failure = %v, want %v", cb.State(), StateOpen)
	}
}

func TestRetryConfig_ShouldRetry(t *testing.T) {
	rc := DefaultRetryConfig()

	if !rc.ShouldRetry(CategoryNetwork) {
		t.Error("ShouldRetry(Network) = false, want true")
	}
	if !rc.ShouldRetry(CategoryRateLimit) {
		t.Error("ShouldRetry(RateLimit) = false, want true")
	}
	if rc.ShouldRetry(CategoryAuth) {
		t.Error("ShouldRetry(Auth) = true, want false")
	}
	if rc.ShouldRetry(CategoryValidation) {
		t.Error("ShouldRetry(Validation) = true, want false")
	}
}

func TestRetryConfig_CalculateDelay(t *testing.T) {
	rc := DefaultRetryConfig()

	delay0 := rc.CalculateDelay(0)
	delay1 := rc.CalculateDelay(1)
	delay2 := rc.CalculateDelay(2)

	if delay0 <= 0 {
		t.Errorf("CalculateDelay(0) = %v, want > 0", delay0)
	}
	if delay1 <= delay0 {
		t.Errorf("CalculateDelay(1) = %v, want > %v", delay1, delay0)
	}
	if delay2 <= delay1 {
		t.Errorf("CalculateDelay(2) = %v, want > %v", delay2, delay1)
	}

	delay10 := rc.CalculateDelay(10)
	if delay10 > rc.MaxDelay+10*time.Second {
		t.Errorf("CalculateDelay(10) = %v, want ~<= %v (max delay with jitter tolerance)", delay10, rc.MaxDelay+10*time.Second)
	}
}

func TestWatcher_GetOrCreateCircuitBreaker(t *testing.T) {
	w := New()

	cb1 := w.GetOrCreateCircuitBreaker("openai", 5, 30*time.Second)
	cb2 := w.GetOrCreateCircuitBreaker("openai", 5, 30*time.Second)

	if cb1 != cb2 {
		t.Error("GetOrCreateCircuitBreaker returned different instances for same key")
	}

	cb3 := w.GetOrCreateCircuitBreaker("anthropic", 5, 30*time.Second)
	if cb1 == cb3 {
		t.Error("GetOrCreateCircuitBreaker returned same instance for different key")
	}
}

func TestErrorCategory_Strings(t *testing.T) {
	categories := []ErrorCategory{
		CategoryNetwork, CategoryRateLimit, CategoryAuth,
		CategoryValidation, CategoryProvider, CategoryContextLength,
		CategoryTimeout, CategoryUnknown,
	}
	for _, c := range categories {
		if c == "" {
			t.Errorf("ErrorCategory %v has empty string value", c)
		}
	}
}
