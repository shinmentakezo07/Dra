package circuitbreaker

import (
	"context"
	"fmt"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// State represents the circuit breaker state.
type State int

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// Config configures a circuit breaker.
type Config struct {
	FailureThreshold int
	SuccessThreshold int
	Timeout          time.Duration
	HalfOpenMaxCalls int
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		Timeout:          30 * time.Second,
		HalfOpenMaxCalls: 3,
	}
}

// CircuitBreaker wraps a provider with circuit breaker logic.
type CircuitBreaker struct {
	provider llm.Provider
	config   Config

	mu                sync.RWMutex
	state             State
	failures          int
	successes         int
	lastFailureTime   time.Time
	halfOpenCalls     int
}

// New creates a circuit breaker around a provider.
func New(provider llm.Provider, cfg Config) *CircuitBreaker {
	return &CircuitBreaker{
		provider: provider,
		config:   cfg,
		state:    StateClosed,
	}
}

// Name returns the provider name.
func (cb *CircuitBreaker) Name() string {
	return cb.provider.Name()
}

// SupportsThinking returns whether the provider supports thinking.
func (cb *CircuitBreaker) SupportsThinking() bool {
	return cb.provider.SupportsThinking()
}

// State returns the current circuit breaker state.
func (cb *CircuitBreaker) State() State {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}

// Chat sends a chat request with circuit breaker protection.
func (cb *CircuitBreaker) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if err := cb.beforeCall(); err != nil {
		return nil, err
	}

	resp, err := cb.provider.Chat(ctx, req)
	cb.recordResult(err)
	return resp, err
}

// ChatStream sends a streaming chat request with circuit breaker protection.
func (cb *CircuitBreaker) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	if err := cb.beforeCall(); err != nil {
		return nil, err
	}

	ch, err := cb.provider.ChatStream(ctx, req)
	if err != nil {
		cb.recordResult(err)
		return nil, err
	}

	// Wrap the stream to observe success/failure
	return cb.wrapStream(ch), nil
}

// ListModels returns available models.
func (cb *CircuitBreaker) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return cb.provider.ListModels(ctx)
}

func (cb *CircuitBreaker) beforeCall() error {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateOpen:
		if time.Since(cb.lastFailureTime) > cb.config.Timeout {
			cb.state = StateHalfOpen
			cb.halfOpenCalls = 0
			return nil
		}
		return fmt.Errorf("circuit breaker open for %s", cb.provider.Name())

	case StateHalfOpen:
		if cb.halfOpenCalls >= cb.config.HalfOpenMaxCalls {
			return fmt.Errorf("circuit breaker half-open limit reached for %s", cb.provider.Name())
		}
		cb.halfOpenCalls++
		return nil

	default: // StateClosed
		return nil
	}
}

func (cb *CircuitBreaker) recordResult(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.failures++
		cb.lastFailureTime = time.Now()

		switch cb.state {
		case StateHalfOpen:
			cb.state = StateOpen
			cb.halfOpenCalls = 0
		case StateClosed:
			if cb.failures >= cb.config.FailureThreshold {
				cb.state = StateOpen
			}
		}
	} else {
		cb.successes++

		switch cb.state {
		case StateHalfOpen:
			if cb.successes >= cb.config.SuccessThreshold {
				cb.state = StateClosed
				cb.failures = 0
				cb.successes = 0
				cb.halfOpenCalls = 0
			}
		case StateClosed:
			if cb.successes >= cb.config.SuccessThreshold {
				cb.failures = 0
			}
		}
	}
}

func (cb *CircuitBreaker) wrapStream(ch <-chan llm.StreamChunk) <-chan llm.StreamChunk {
	out := make(chan llm.StreamChunk, 64)
	go func() {
		defer close(out)
		success := false
		// Bug #41: 5s timeout killed streams from reasoning models (o1, deepseek-r1, etc.)
		// that can pause 10-30s between chunks during thinking. 120s is safe for all models.
		timer := time.NewTimer(120 * time.Second)
		defer timer.Stop()
		for chunk := range ch {
			timer.Reset(120 * time.Second)
			select {
			case out <- chunk:
			case <-timer.C:
				cb.recordResult(fmt.Errorf("stream timeout after 120s"))
				return
			}
			if chunk.FinishReason != nil {
				reason := *chunk.FinishReason
				if reason == llm.FinishReasonStop || reason == llm.FinishReasonToolCalls {
					success = true
				}
			}
		}
		if success {
			cb.recordResult(nil)
		} else {
			cb.recordResult(fmt.Errorf("stream ended without success"))
		}
	}()
	return out
}
