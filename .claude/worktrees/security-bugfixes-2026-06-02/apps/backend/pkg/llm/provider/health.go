package provider

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// HealthStatus represents the health of a provider.
type HealthStatus int

const (
	HealthUnknown HealthStatus = iota
	HealthHealthy
	HealthDegraded
	HealthUnhealthy
)

func (s HealthStatus) String() string {
	switch s {
	case HealthHealthy:
		return "healthy"
	case HealthDegraded:
		return "degraded"
	case HealthUnhealthy:
		return "unhealthy"
	default:
		return "unknown"
	}
}

// ProviderHealth holds health information for a single provider.
type ProviderHealth struct {
	Provider    string
	Status      HealthStatus
	LastChecked time.Time
	LastError   error
	Latency     time.Duration
}

// HealthChecker periodically checks provider health.
type HealthChecker struct {
	mu        sync.RWMutex
	statuses  map[string]*ProviderHealth
	checkers  map[string]HealthCheckFunc
	interval  time.Duration
	timeout   time.Duration
	ctx       context.Context
	stopCh    chan struct{}
	wg        sync.WaitGroup
}

// HealthCheckFunc checks if a provider is healthy.
type HealthCheckFunc func(ctx context.Context) (HealthStatus, error)

// NewHealthChecker creates a new health checker. The ctx is used as the parent for health check timeouts.
func NewHealthChecker(ctx context.Context, interval, timeout time.Duration) *HealthChecker {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return &HealthChecker{
		ctx:      ctx,
		statuses: make(map[string]*ProviderHealth),
		checkers: make(map[string]HealthCheckFunc),
		interval: interval,
		timeout:  timeout,
		stopCh:   make(chan struct{}),
	}
}

// Register adds a provider to health checking.
func (h *HealthChecker) Register(name string, fn HealthCheckFunc) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.checkers[name] = fn
	h.statuses[name] = &ProviderHealth{
		Provider: name,
		Status:   HealthUnknown,
	}
}

// Unregister removes a provider from health checking.
func (h *HealthChecker) Unregister(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.checkers, name)
	delete(h.statuses, name)
}

// Status returns the current health status of a provider.
func (h *HealthChecker) Status(name string) (ProviderHealth, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	s, ok := h.statuses[name]
	if !ok {
		return ProviderHealth{}, false
	}
	return *s, true
}

// AllStatuses returns all provider health statuses.
func (h *HealthChecker) AllStatuses() []ProviderHealth {
	h.mu.RLock()
	defer h.mu.RUnlock()
	result := make([]ProviderHealth, 0, len(h.statuses))
	for _, s := range h.statuses {
		result = append(result, *s)
	}
	return result
}

// IsHealthy returns true if the provider is healthy.
func (h *HealthChecker) IsHealthy(name string) bool {
	s, ok := h.Status(name)
	return ok && s.Status == HealthHealthy
}

// Start begins periodic health checks.
func (h *HealthChecker) Start() {
	h.wg.Add(1)
	go h.loop()
}

// Stop halts health checking.
func (h *HealthChecker) Stop() {
	close(h.stopCh)
	h.wg.Wait()
}

func (h *HealthChecker) loop() {
	defer h.wg.Done()

	// Run initial check immediately
	h.runChecks()

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.runChecks()
		case <-h.stopCh:
			return
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *HealthChecker) runChecks() {
	h.mu.RLock()
	checkers := make(map[string]HealthCheckFunc, len(h.checkers))
	for k, v := range h.checkers {
		checkers[k] = v
	}
	h.mu.RUnlock()

	var wg sync.WaitGroup
	for name, fn := range checkers {
		wg.Add(1)
		go func(n string, f HealthCheckFunc) {
			defer wg.Done()
			h.checkProvider(n, f)
		}(name, fn)
	}
	wg.Wait()
}

func (h *HealthChecker) checkProvider(name string, fn HealthCheckFunc) {
	ctx, cancel := context.WithTimeout(h.ctx, h.timeout)
	defer cancel()

	start := time.Now()
	status, err := fn(ctx)
	latency := time.Since(start)

	h.mu.Lock()
	defer h.mu.Unlock()

	if s, ok := h.statuses[name]; ok {
		s.Status = status
		s.LastChecked = time.Now()
		s.LastError = err
		s.Latency = latency
	}
}

// HTTPHealthCheck creates a health check that pings an HTTP endpoint.
func HTTPHealthCheck(client *http.Client, url string) HealthCheckFunc {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return func(ctx context.Context) (HealthStatus, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return HealthUnhealthy, err
		}
		resp, err := client.Do(req)
		if err != nil {
			return HealthUnhealthy, err
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return HealthHealthy, nil
		}
		if resp.StatusCode >= 500 {
			return HealthUnhealthy, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return HealthDegraded, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
}
