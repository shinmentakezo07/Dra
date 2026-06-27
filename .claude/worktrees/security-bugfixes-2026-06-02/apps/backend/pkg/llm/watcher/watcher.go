package watcher

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// ErrorCategory classifies errors for handling strategies.
type ErrorCategory string

const (
	CategoryNetwork       ErrorCategory = "network"
	CategoryRateLimit     ErrorCategory = "rate_limit"
	CategoryAuth          ErrorCategory = "auth"
	CategoryValidation    ErrorCategory = "validation"
	CategoryProvider      ErrorCategory = "provider"
	CategoryContextLength ErrorCategory = "context_length"
	CategoryTimeout       ErrorCategory = "timeout"
	CategoryUnknown       ErrorCategory = "unknown"
)

// ErrorRecord represents a single error occurrence.
type ErrorRecord struct {
	ID        string        `json:"id"`
	Timestamp time.Time     `json:"timestamp"`
	Category  ErrorCategory `json:"category"`
	Message   string        `json:"message"`
	Provider  string        `json:"provider,omitempty"`
	Model     string        `json:"model,omitempty"`
	RequestID string        `json:"request_id,omitempty"`
	Retryable bool          `json:"retryable"`
	Count     int           `json:"count"`
}

// Handler is a function that handles errors.
type Handler func(ctx context.Context, record ErrorRecord) error

// Watcher monitors errors and applies handling strategies.
type Watcher struct {
	mu         sync.RWMutex
	handlers   map[ErrorCategory][]Handler
	allHandlers []Handler
	history    []ErrorRecord
	maxHistory int
	circuitBreakers map[string]*CircuitBreaker
}

// New creates a new Watcher.
func New() *Watcher {
	return &Watcher{
		handlers:        make(map[ErrorCategory][]Handler),
		maxHistory:      1000,
		history:         make([]ErrorRecord, 0, 1000),
		circuitBreakers: make(map[string]*CircuitBreaker),
	}
}

// Register registers a handler for a specific category.
func (w *Watcher) Register(category ErrorCategory, handler Handler) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.handlers[category] = append(w.handlers[category], handler)
}

// RegisterAll registers a handler for all categories.
func (w *Watcher) RegisterAll(handler Handler) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.allHandlers = append(w.allHandlers, handler)
}

// Watch processes an error and invokes appropriate handlers.
func (w *Watcher) Watch(ctx context.Context, err error, provider, model, requestID string) error {
	record := w.classify(err, provider, model, requestID)

	w.mu.Lock()
	w.history = append(w.history, record)
	if len(w.history) > w.maxHistory {
		w.history = w.history[len(w.history)-w.maxHistory:]
	}
	w.mu.Unlock()

	w.mu.RLock()
	handlers := w.handlers[record.Category]
	allHandlers := w.allHandlers
	w.mu.RUnlock()

	var handlerErrors []error
	for _, h := range handlers {
		if handleErr := h(ctx, record); handleErr != nil {
			slog.Warn("handler error", "category", record.Category, "error", handleErr.Error())
			handlerErrors = append(handlerErrors, handleErr)
		}
	}

	for _, h := range allHandlers {
		if handleErr := h(ctx, record); handleErr != nil {
			slog.Warn("global handler error", "error", handleErr.Error())
			handlerErrors = append(handlerErrors, handleErr)
		}
	}

	if len(handlerErrors) > 0 {
		return fmt.Errorf("watcher: %d handler(s) failed: %w", len(handlerErrors), handlerErrors[0])
	}
	return nil
}

// HandleError implements the llm.Watcher interface.
func (w *Watcher) HandleError(ctx context.Context, err error) {
	if watchErr := w.Watch(ctx, err, "", "", ""); watchErr != nil {
		slog.Error("watcher handler failed", "error", watchErr.Error())
	}
}

// EmitEvent implements the llm.Watcher interface.
func (w *Watcher) EmitEvent(ctx context.Context, event string, data map[string]interface{}) {
	slog.Info("watcher event", "event", event, "data", data)
}

// History returns recent error records.
func (w *Watcher) History(limit int) []ErrorRecord {
	w.mu.RLock()
	defer w.mu.RUnlock()
	if limit <= 0 || limit > len(w.history) {
		limit = len(w.history)
	}
	start := len(w.history) - limit
	result := make([]ErrorRecord, limit)
	copy(result, w.history[start:])
	return result
}

// Stats returns error statistics by category.
func (w *Watcher) Stats() map[ErrorCategory]int {
	w.mu.RLock()
	defer w.mu.RUnlock()
	stats := make(map[ErrorCategory]int)
	for _, r := range w.history {
		stats[r.Category]++
	}
	return stats
}

// classify categorizes an error.
func (w *Watcher) classify(err error, provider, model, requestID string) ErrorRecord {
	msg := err.Error()
	record := ErrorRecord{
		ID:        fmt.Sprintf("err_%d", time.Now().UnixNano()),
		Timestamp: time.Now(),
		Message:   msg,
		Provider:  provider,
		Model:     model,
		RequestID: requestID,
		Retryable: true,
	}

	switch {
	case containsAny(msg, []string{"rate limit", "ratelimit", "429", "too many requests"}):
		record.Category = CategoryRateLimit
		record.Retryable = true
	case containsAny(msg, []string{"unauthorized", "auth", "api key", "401", "403"}):
		record.Category = CategoryAuth
		record.Retryable = false
	case containsAny(msg, []string{"timeout", "deadline exceeded", "context deadline"}):
		record.Category = CategoryTimeout
		record.Retryable = true
	case containsAny(msg, []string{"context length", "too long", "maximum context", "token"}) && containsAny(msg, []string{"exceed", "limit", "too many"}):
		record.Category = CategoryContextLength
		record.Retryable = false
	case containsAny(msg, []string{"network", "connection", "dial", "dns", "no such host"}):
		record.Category = CategoryNetwork
		record.Retryable = true
	case containsAny(msg, []string{"invalid", "bad request", "validation", "400", "schema"}):
		record.Category = CategoryValidation
		record.Retryable = false
	case containsAny(msg, []string{"provider", "unavailable", "service", "500", "502", "503", "504"}):
		record.Category = CategoryProvider
		record.Retryable = true
	default:
		record.Category = CategoryUnknown
		record.Retryable = true
	}

	return record
}

func containsAny(s string, substrs []string) bool {
	for _, sub := range substrs {
		if containsCaseInsensitive(s, sub) {
			return true
		}
	}
	return false
}

func containsCaseInsensitive(s, substr string) bool {
	return len(s) >= len(substr) && containsSub(s, substr)
}

func containsSub(s, substr string) bool {
	// Simple case-insensitive contains
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if toLower(s[i+j]) != toLower(substr[j]) {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func toLower(b byte) byte {
	if b >= 'A' && b <= 'Z' {
		return b + ('a' - 'A')
	}
	return b
}

// CircuitBreaker implements the circuit breaker pattern.
type CircuitBreaker struct {
	mu                sync.RWMutex
	failureThreshold  int
	recoveryTimeout   time.Duration
	failureCount      int
	lastFailureTime   time.Time
	state             State
	halfOpenMaxCalls  int
	halfOpenCalls     int
}

// State represents the circuit breaker state.
type State int

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

// NewCircuitBreaker creates a new circuit breaker.
func NewCircuitBreaker(failureThreshold int, recoveryTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		failureThreshold: failureThreshold,
		recoveryTimeout:  recoveryTimeout,
		state:            StateClosed,
		halfOpenMaxCalls: 3,
	}
}

// Allow checks if a request should be allowed through.
func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		return true
	case StateOpen:
		if time.Since(cb.lastFailureTime) > cb.recoveryTimeout {
			cb.state = StateHalfOpen
			cb.halfOpenCalls = 0
			return true
		}
		return false
	case StateHalfOpen:
		if cb.halfOpenCalls < cb.halfOpenMaxCalls {
			cb.halfOpenCalls++
			return true
		}
		return false
	}
	return false
}

// RecordSuccess records a successful call.
func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failureCount = 0
	if cb.state == StateHalfOpen {
		cb.state = StateClosed
		cb.halfOpenCalls = 0
	}
}

// RecordFailure records a failed call.
func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failureCount++
	cb.lastFailureTime = time.Now()
	if cb.state == StateHalfOpen {
		cb.state = StateOpen
		return
	}
	if cb.failureCount >= cb.failureThreshold {
		cb.state = StateOpen
	}
}

// State returns the current state.
func (cb *CircuitBreaker) State() State {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}

// GetOrCreateCircuitBreaker gets or creates a circuit breaker for a key.
func (w *Watcher) GetOrCreateCircuitBreaker(key string, failureThreshold int, recoveryTimeout time.Duration) *CircuitBreaker {
	w.mu.Lock()
	defer w.mu.Unlock()
	if cb, exists := w.circuitBreakers[key]; exists {
		return cb
	}
	cb := NewCircuitBreaker(failureThreshold, recoveryTimeout)
	w.circuitBreakers[key] = cb
	return cb
}

// RetryConfig configures retry behavior.
type RetryConfig struct {
	MaxRetries  int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
	Multiplier  float64
	RetryableCategories []ErrorCategory
}

// DefaultRetryConfig returns a default retry configuration.
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:  3,
		BaseDelay:   500 * time.Millisecond,
		MaxDelay:    30 * time.Second,
		Multiplier:  2.0,
		RetryableCategories: []ErrorCategory{
			CategoryNetwork,
			CategoryRateLimit,
			CategoryProvider,
			CategoryTimeout,
		},
	}
}

// ShouldRetry checks if an error category should be retried.
func (rc *RetryConfig) ShouldRetry(category ErrorCategory) bool {
	for _, c := range rc.RetryableCategories {
		if c == category {
			return true
		}
	}
	return false
}

// CalculateDelay calculates the delay for a retry attempt.
func (rc *RetryConfig) CalculateDelay(attempt int) time.Duration {
	delay := float64(rc.BaseDelay) * pow(rc.Multiplier, float64(attempt))
	if delay > float64(rc.MaxDelay) {
		delay = float64(rc.MaxDelay)
	}
	// Add jitter (±20%)
	jitter := delay * 0.2 * (float64(time.Now().UnixNano()%100) / 100.0 - 0.5)
	return time.Duration(delay + jitter)
}

func pow(base, exp float64) float64 {
	result := 1.0
	for i := 0; i < int(exp); i++ {
		result *= base
	}
	return result
}
