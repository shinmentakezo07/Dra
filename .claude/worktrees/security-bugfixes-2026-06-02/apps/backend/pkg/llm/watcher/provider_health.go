package watcher

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// ProviderStatus represents a provider's health status.
type ProviderStatus string

const (
	StatusHealthy   ProviderStatus = "healthy"
	StatusDegraded  ProviderStatus = "degraded"
	StatusUnhealthy ProviderStatus = "unhealthy"
	StatusUnknown   ProviderStatus = "unknown"
)

// ProviderHealth tracks the health status of an LLM provider.
type ProviderHealth struct {
	Name         string         `json:"name"`
	Status       ProviderStatus `json:"status"`
	LastCheck    time.Time      `json:"last_check"`
	LastSuccess  time.Time      `json:"last_success"`
	LastFailure  time.Time      `json:"last_failure"`
	FailCount    int            `json:"fail_count"`
	SuccessCount int64          `json:"success_count"`
	AvgLatency   time.Duration  `json:"avg_latency"`
}

// HealthCheckFunc performs a health check for a provider.
type HealthCheckFunc func(ctx context.Context, provider string) error

// ProviderHealthWatcher monitors provider health with periodic checks.
type ProviderHealthWatcher struct {
	mu             sync.RWMutex
	providers      map[string]*ProviderHealth
	checkFunc      HealthCheckFunc
	checkInterval  time.Duration
	unhealthyAfter int // failures before marking unhealthy
	stopped        chan struct{}
}

// ProviderHealthOption configures a ProviderHealthWatcher.
type ProviderHealthOption func(*ProviderHealthWatcher)

// WithHealthCheckInterval sets the health check interval.
func WithHealthCheckInterval(d time.Duration) ProviderHealthOption {
	return func(w *ProviderHealthWatcher) {
		w.checkInterval = d
	}
}

// WithUnhealthyThreshold sets the failure count before marking unhealthy.
func WithUnhealthyThreshold(n int) ProviderHealthOption {
	return func(w *ProviderHealthWatcher) {
		w.unhealthyAfter = n
	}
}

// NewProviderHealthWatcher creates a new provider health watcher.
func NewProviderHealthWatcher(checkFunc HealthCheckFunc, opts ...ProviderHealthOption) *ProviderHealthWatcher {
	w := &ProviderHealthWatcher{
		providers:      make(map[string]*ProviderHealth),
		checkFunc:      checkFunc,
		checkInterval:  30 * time.Second,
		unhealthyAfter: 3,
		stopped:        make(chan struct{}),
	}
	for _, opt := range opts {
		opt(w)
	}
	return w
}

// RegisterProvider registers a provider for health monitoring.
func (w *ProviderHealthWatcher) RegisterProvider(name string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, exists := w.providers[name]; !exists {
		w.providers[name] = &ProviderHealth{
			Name:   name,
			Status: StatusUnknown,
		}
	}
}

// RecordSuccess records a successful request for a provider.
func (w *ProviderHealthWatcher) RecordSuccess(provider string, latency time.Duration) {
	w.mu.Lock()
	defer w.mu.Unlock()

	h, ok := w.providers[provider]
	if !ok {
		h = &ProviderHealth{Name: provider}
		w.providers[provider] = h
	}

	h.LastSuccess = time.Now()
	h.SuccessCount++
	h.FailCount = 0
	h.Status = StatusHealthy

	// Update rolling average latency
	if h.AvgLatency == 0 {
		h.AvgLatency = latency
	} else {
		h.AvgLatency = (h.AvgLatency + latency) / 2
	}
}

// RecordFailure records a failed request for a provider.
func (w *ProviderHealthWatcher) RecordFailure(provider string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	h, ok := w.providers[provider]
	if !ok {
		h = &ProviderHealth{Name: provider}
		w.providers[provider] = h
	}

	h.LastFailure = time.Now()
	h.FailCount++

	if h.FailCount >= w.unhealthyAfter {
		h.Status = StatusUnhealthy
		slog.Warn("provider_health: provider marked unhealthy",
			"provider", provider, "fail_count", h.FailCount)
	} else if h.FailCount > 0 {
		h.Status = StatusDegraded
	}
}

// GetStatus returns the health status of a provider.
func (w *ProviderHealthWatcher) GetStatus(provider string) ProviderHealth {
	w.mu.RLock()
	defer w.mu.RUnlock()

	if h, ok := w.providers[provider]; ok {
		return *h
	}
	return ProviderHealth{Name: provider, Status: StatusUnknown}
}

// GetAllStatuses returns health status for all registered providers.
func (w *ProviderHealthWatcher) GetAllStatuses() []ProviderHealth {
	w.mu.RLock()
	defer w.mu.RUnlock()

	statuses := make([]ProviderHealth, 0, len(w.providers))
	for _, h := range w.providers {
		statuses = append(statuses, *h)
	}
	return statuses
}

// IsHealthy returns true if a provider is healthy or degraded (not unhealthy).
func (w *ProviderHealthWatcher) IsHealthy(provider string) bool {
	status := w.GetStatus(provider)
	return status.Status != StatusUnhealthy
}

// Start begins periodic health checks. Blocks until ctx is cancelled.
func (w *ProviderHealthWatcher) Start(ctx context.Context) {
	if w.checkFunc == nil {
		return
	}

	ticker := time.NewTicker(w.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopped:
			return
		case <-ticker.C:
			w.checkAll(ctx)
		}
	}
}

// Stop stops the health watcher.
func (w *ProviderHealthWatcher) Stop() {
	close(w.stopped)
}

// checkAll performs health checks on all registered providers.
func (w *ProviderHealthWatcher) checkAll(ctx context.Context) {
	w.mu.RLock()
	providers := make([]string, 0, len(w.providers))
	for name := range w.providers {
		providers = append(providers, name)
	}
	w.mu.RUnlock()

	for _, name := range providers {
		checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := w.checkFunc(checkCtx, name)
		cancel()

		w.mu.Lock()
		h := w.providers[name]
		h.LastCheck = time.Now()
		if err != nil {
			h.FailCount++
			h.LastFailure = time.Now()
			if h.FailCount >= w.unhealthyAfter {
				h.Status = StatusUnhealthy
			} else {
				h.Status = StatusDegraded
			}
			slog.Debug("provider_health: check failed", "provider", name, "error", err)
		} else {
			h.FailCount = 0
			h.Status = StatusHealthy
			h.LastSuccess = time.Now()
		}
		w.mu.Unlock()
	}
}
