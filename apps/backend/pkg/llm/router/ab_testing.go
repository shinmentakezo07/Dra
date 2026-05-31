package router

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// ABTestConfig configures an A/B test between two models.
type ABTestConfig struct {
	ID              string
	Name            string
	Description     string
	ModelA          string
	ModelB          string
	ProviderA       string
	ProviderB       string
	TrafficPercentA float64 // 0-100, default 50
	IsActive        bool
	StartAt         time.Time
	EndAt           *time.Time
}

// ABTestRouter routes traffic between A and B variants.
type ABTestRouter struct {
	mu      sync.RWMutex
	tests   map[string]*ABTestConfig
	counts  map[string]*ABTestCounts
}

// ABTestCounts tracks traffic distribution.
type ABTestCounts struct {
	CountA  int64
	CountB  int64
	TotalMs int64
}

// NewABTestRouter creates a new A/B test router.
func NewABTestRouter() *ABTestRouter {
	return &ABTestRouter{
		tests:  make(map[string]*ABTestConfig),
		counts: make(map[string]*ABTestCounts),
	}
}

// AddTest adds an A/B test configuration.
func (r *ABTestRouter) AddTest(config *ABTestConfig) {
	if config.TrafficPercentA <= 0 {
		config.TrafficPercentA = 50
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tests[config.ID] = config
	r.counts[config.ID] = &ABTestCounts{}
}

// RemoveTest removes an A/B test.
func (r *ABTestRouter) RemoveTest(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tests, id)
	delete(r.counts, id)
}

// Route decides which model to use for a request based on A/B test configuration.
func (r *ABTestRouter) Route(testID string) (model, provider string, variant string, err error) {
	r.mu.RLock()
	config, ok := r.tests[testID]
	r.mu.RUnlock()

	if !ok {
		return "", "", "", fmt.Errorf("A/B test not found: %s", testID)
	}

	if !config.IsActive {
		return config.ModelA, config.ProviderA, "A", nil
	}

	// Check if test has ended
	if config.EndAt != nil && time.Now().After(*config.EndAt) {
		return config.ModelA, config.ProviderA, "A", nil
	}

	// Check if test has started
	if time.Now().Before(config.StartAt) {
		return config.ModelA, config.ProviderA, "A", nil
	}

	// Route based on traffic percentage
	randVal := rand.Float64() * 100
	if randVal < config.TrafficPercentA {
		r.mu.Lock()
		r.counts[testID].CountA++
		r.mu.Unlock()
		return config.ModelA, config.ProviderA, "A", nil
	}

	r.mu.Lock()
	r.counts[testID].CountB++
	r.mu.Unlock()
	return config.ModelB, config.ProviderB, "B", nil
}

// GetCounts returns traffic distribution for a test.
func (r *ABTestRouter) GetCounts(testID string) (countA, countB int64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if c, ok := r.counts[testID]; ok {
		return c.CountA, c.CountB
	}
	return 0, 0
}

// ListTests returns all A/B test configurations.
func (r *ABTestRouter) ListTests() []*ABTestConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*ABTestConfig
	for _, config := range r.tests {
		result = append(result, config)
	}
	return result
}

// CanaryConfig configures a canary deployment.
type CanaryConfig struct {
	ID              string
	Name            string
	StableModel     string
	StableProvider  string
	CanaryModel     string
	CanaryProvider  string
	CanaryPercent   float64 // 0-100
	IsActive        bool
	MaxCanaryErrors int     // Disable canary after this many errors
}

// CanaryRouter routes traffic for canary deployments.
type CanaryRouter struct {
	mu           sync.RWMutex
	canaries     map[string]*CanaryConfig
	canaryErrors map[string]int
}

// NewCanaryRouter creates a new canary router.
func NewCanaryRouter() *CanaryRouter {
	return &CanaryRouter{
		canaries:     make(map[string]*CanaryConfig),
		canaryErrors: make(map[string]int),
	}
}

// AddCanary adds a canary deployment configuration.
func (r *CanaryRouter) AddCanary(config *CanaryConfig) {
	if config.MaxCanaryErrors == 0 {
		config.MaxCanaryErrors = 10
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.canaries[config.ID] = config
	r.canaryErrors[config.ID] = 0
}

// RemoveCanary removes a canary deployment.
func (r *CanaryRouter) RemoveCanary(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.canaries, id)
	delete(r.canaryErrors, id)
}

// Route decides whether to use stable or canary model.
func (r *CanaryRouter) Route(canaryID string) (model, provider string, isCanary bool, err error) {
	r.mu.RLock()
	config, ok := r.canaries[canaryID]
	errors := r.canaryErrors[canaryID]
	r.mu.RUnlock()

	if !ok {
		return "", "", false, fmt.Errorf("canary not found: %s", canaryID)
	}

	if !config.IsActive || errors >= config.MaxCanaryErrors {
		return config.StableModel, config.StableProvider, false, nil
	}

	if rand.Float64()*100 < config.CanaryPercent {
		return config.CanaryModel, config.CanaryProvider, true, nil
	}

	return config.StableModel, config.StableProvider, false, nil
}

// RecordCanaryError records an error from the canary variant.
func (r *CanaryRouter) RecordCanaryError(canaryID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.canaryErrors[canaryID]++
}

// RecordCanarySuccess records a success from the canary variant.
func (r *CanaryRouter) RecordCanarySuccess(canaryID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.canaryErrors[canaryID] > 0 {
		r.canaryErrors[canaryID]--
	}
}

// GetCanaryStatus returns the status of a canary deployment.
func (r *CanaryRouter) GetCanaryStatus(canaryID string) (active bool, errors int, err error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	config, ok := r.canaries[canaryID]
	if !ok {
		return false, 0, fmt.Errorf("canary not found: %s", canaryID)
	}
	return config.IsActive, r.canaryErrors[canaryID], nil
}
