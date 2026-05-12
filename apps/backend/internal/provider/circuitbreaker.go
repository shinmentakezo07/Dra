package provider

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// CBState represents the circuit breaker state.
type CBState int

const (
	CBStateClosed CBState = iota
	CBStateOpen
	CBStateHalfOpen
)

// CBConfig configures a circuit breaker.
type CBConfig struct {
	FailureThreshold int
	SuccessThreshold int
	Timeout          time.Duration
	HalfOpenMaxCalls int
}

// DefaultCBConfig returns sensible defaults.
func DefaultCBConfig() CBConfig {
	return CBConfig{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		Timeout:          30 * time.Second,
		HalfOpenMaxCalls: 3,
	}
}

// CircuitBreakerProvider wraps a Provider with circuit breaker logic.
type CircuitBreakerProvider struct {
	provider Provider
	config   CBConfig

	mu              sync.RWMutex
	state           CBState
	failures        int
	successes       int
	lastFailureTime time.Time
	halfOpenCalls   int
}

// NewCircuitBreakerProvider creates a circuit breaker around a provider.
func NewCircuitBreakerProvider(p Provider, cfg CBConfig) *CircuitBreakerProvider {
	return &CircuitBreakerProvider{
		provider: p,
		config:   cfg,
		state:    CBStateClosed,
	}
}

// Name returns the provider name.
func (cb *CircuitBreakerProvider) Name() string {
	return cb.provider.Name()
}

// Chat sends a chat request with circuit breaker protection.
func (cb *CircuitBreakerProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if err := cb.beforeCall(); err != nil {
		return nil, err
	}
	resp, err := cb.provider.Chat(ctx, req)
	cb.recordResult(err)
	return resp, err
}

// ChatStream sends a streaming chat request with circuit breaker protection.
func (cb *CircuitBreakerProvider) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	if err := cb.beforeCall(); err != nil {
		return nil, err
	}
	ch, err := cb.provider.ChatStream(ctx, req)
	if err != nil {
		cb.recordResult(err)
		return nil, err
	}
	return cb.wrapStream(ch), nil
}

// ListModels returns available models.
func (cb *CircuitBreakerProvider) ListModels(ctx context.Context) ([]ModelInfo, error) {
	return cb.provider.ListModels(ctx)
}

func (cb *CircuitBreakerProvider) beforeCall() error {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case CBStateOpen:
		if time.Since(cb.lastFailureTime) > cb.config.Timeout {
			cb.state = CBStateHalfOpen
			cb.halfOpenCalls = 0
			return nil
		}
		return &ErrProviderUnavailable{Provider: cb.provider.Name(), Cause: fmt.Errorf("circuit breaker open")}
	case CBStateHalfOpen:
		if cb.halfOpenCalls >= cb.config.HalfOpenMaxCalls {
			return &ErrProviderUnavailable{Provider: cb.provider.Name(), Cause: fmt.Errorf("circuit breaker half-open limit reached")}
		}
		cb.halfOpenCalls++
		return nil
	default: // CBStateClosed
		return nil
	}
}

func (cb *CircuitBreakerProvider) recordResult(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.failures++
		cb.lastFailureTime = time.Now()

		switch cb.state {
		case CBStateHalfOpen:
			cb.state = CBStateOpen
			cb.halfOpenCalls = 0
		case CBStateClosed:
			if cb.failures >= cb.config.FailureThreshold {
				cb.state = CBStateOpen
			}
		}
	} else {
		cb.successes++

		switch cb.state {
		case CBStateHalfOpen:
			if cb.successes >= cb.config.SuccessThreshold {
				cb.state = CBStateClosed
				cb.failures = 0
				cb.successes = 0
				cb.halfOpenCalls = 0
			}
		case CBStateClosed:
			if cb.successes >= cb.config.FailureThreshold {
				cb.failures = 0
			}
		}
	}
}

func (cb *CircuitBreakerProvider) wrapStream(ch <-chan StreamChunk) <-chan StreamChunk {
	out := make(chan StreamChunk, 64)
	go func() {
		defer close(out)
		for chunk := range ch {
			select {
			case out <- chunk:
			case <-time.After(5 * time.Second):
				cb.recordResult(fmt.Errorf("stream timeout"))
				return
			}
		}
		cb.recordResult(nil)
	}()
	return out
}
