// Package loadbalancer provides load balancing strategies for routing requests
// across multiple provider endpoints. Supports round-robin, least-busy, latency-based,
// cost-optimized, and weighted routing.
package loadbalancer

import (
	"math/rand"
	"sync"
	"sync/atomic"
	"time"
)

// Strategy represents a load balancing strategy.
type Strategy string

const (
	StrategyRoundRobin  Strategy = "round-robin"
	StrategyLeastBusy   Strategy = "least-busy"
	StrategyLatencyBased Strategy = "latency-based"
	StrategyCostBased   Strategy = "cost"
	StrategyWeighted    Strategy = "weighted"
	StrategyRandom      Strategy = "random"
)

// Endpoint represents a provider endpoint.
type Endpoint struct {
	ID            string
	Provider      string
	Model         string
	BaseURL       string
	Weight        int     // For weighted routing
	Priority      int     // Higher = preferred
	CostPerToken  float64 // For cost-based routing
	IsActive      bool
	IsHealthy     bool
}

// EndpointStats tracks runtime statistics for an endpoint.
type EndpointStats struct {
	ActiveRequests  atomic.Int64
	TotalRequests   atomic.Int64
	TotalErrors     atomic.Int64
	TotalLatencyMs  atomic.Int64
	AvgLatencyMs    float64
	LastUsedAt      time.Time
	LastErrorAt     time.Time
	SuccessRate     float64
}

// Balancer routes requests across endpoints using configurable strategies.
type Balancer struct {
	mu        sync.RWMutex
	endpoints map[string]*endpointState
	strategy  Strategy
	counter   atomic.Uint64
}

type endpointState struct {
	endpoint *Endpoint
	stats    *EndpointStats
}

// New creates a new load balancer with the given strategy.
func New(strategy Strategy) *Balancer {
	return &Balancer{
		endpoints: make(map[string]*endpointState),
		strategy:  strategy,
	}
}

// AddEndpoint adds an endpoint to the balancer.
func (b *Balancer) AddEndpoint(e *Endpoint) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.endpoints[e.ID] = &endpointState{
		endpoint: e,
		stats:    &EndpointStats{},
	}
}

// RemoveEndpoint removes an endpoint.
func (b *Balancer) RemoveEndpoint(id string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.endpoints, id)
}

// SelectEndpoint selects the best endpoint based on the configured strategy.
// Returns nil if no healthy endpoints are available.
func (b *Balancer) SelectEndpoint(model string) *Endpoint {
	b.mu.RLock()
	defer b.mu.RUnlock()

	// Filter by model and health
	var candidates []*endpointState
	for _, es := range b.endpoints {
		if !es.endpoint.IsActive || !es.endpoint.IsHealthy {
			continue
		}
		if model != "" && es.endpoint.Model != model && es.endpoint.Model != "*" {
			continue
		}
		candidates = append(candidates, es)
	}

	if len(candidates) == 0 {
		return nil
	}

	switch b.strategy {
	case StrategyRoundRobin:
		return b.selectRoundRobin(candidates)
	case StrategyLeastBusy:
		return b.selectLeastBusy(candidates)
	case StrategyLatencyBased:
		return b.selectLatencyBased(candidates)
	case StrategyCostBased:
		return b.selectCostBased(candidates)
	case StrategyWeighted:
		return b.selectWeighted(candidates)
	case StrategyRandom:
		return b.selectRandom(candidates)
	default:
		return b.selectRoundRobin(candidates)
	}
}

// RecordSuccess records a successful request to an endpoint.
func (b *Balancer) RecordSuccess(endpointID string, latencyMs int64) {
	b.mu.RLock()
	es, ok := b.endpoints[endpointID]
	b.mu.RUnlock()
	if !ok {
		return
	}

	es.stats.ActiveRequests.Add(-1)
	es.stats.TotalRequests.Add(1)
	es.stats.TotalLatencyMs.Add(latencyMs)

	total := es.stats.TotalRequests.Load()
	if total > 0 {
		es.stats.AvgLatencyMs = float64(es.stats.TotalLatencyMs.Load()) / float64(total)
		errors := es.stats.TotalErrors.Load()
		es.stats.SuccessRate = float64(total-errors) / float64(total)
	}
	es.stats.LastUsedAt = time.Now()
}

// RecordFailure records a failed request to an endpoint.
func (b *Balancer) RecordFailure(endpointID string) {
	b.mu.RLock()
	es, ok := b.endpoints[endpointID]
	b.mu.RUnlock()
	if !ok {
		return
	}

	es.stats.ActiveRequests.Add(-1)
	es.stats.TotalRequests.Add(1)
	es.stats.TotalErrors.Add(1)
	es.stats.LastErrorAt = time.Now()

	total := es.stats.TotalRequests.Load()
	if total > 0 {
		errors := es.stats.TotalErrors.Load()
		es.stats.SuccessRate = float64(total-errors) / float64(total)
	}
}

// BeginRequest increments the active request counter.
func (b *Balancer) BeginRequest(endpointID string) {
	b.mu.RLock()
	es, ok := b.endpoints[endpointID]
	b.mu.RUnlock()
	if ok {
		es.stats.ActiveRequests.Add(1)
	}
}

// SetHealthy sets the health status of an endpoint.
func (b *Balancer) SetHealthy(endpointID string, healthy bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if es, ok := b.endpoints[endpointID]; ok {
		es.endpoint.IsHealthy = healthy
	}
}

// SetActive sets the active status of an endpoint.
func (b *Balancer) SetActive(endpointID string, active bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if es, ok := b.endpoints[endpointID]; ok {
		es.endpoint.IsActive = active
	}
}

// Stats returns stats for all endpoints.
func (b *Balancer) Stats() map[string]*EndpointStats {
	b.mu.RLock()
	defer b.mu.RUnlock()
	result := make(map[string]*EndpointStats)
	for id, es := range b.endpoints {
		result[id] = es.stats
	}
	return result
}

// Endpoints returns all endpoints.
func (b *Balancer) Endpoints() []*Endpoint {
	b.mu.RLock()
	defer b.mu.RUnlock()
	var result []*Endpoint
	for _, es := range b.endpoints {
		result = append(result, es.endpoint)
	}
	return result
}

func (b *Balancer) selectRoundRobin(candidates []*endpointState) *Endpoint {
	idx := b.counter.Add(1)
	return candidates[idx%uint64(len(candidates))].endpoint
}

func (b *Balancer) selectLeastBusy(candidates []*endpointState) *Endpoint {
	var best *endpointState
	var minActive int64 = 1<<63 - 1
	for _, es := range candidates {
		active := es.stats.ActiveRequests.Load()
		if active < minActive {
			minActive = active
			best = es
		}
	}
	if best == nil {
		return candidates[0].endpoint
	}
	return best.endpoint
}

func (b *Balancer) selectLatencyBased(candidates []*endpointState) *Endpoint {
	var best *endpointState
	var minLatency float64 = 1e18
	for _, es := range candidates {
		latency := es.stats.AvgLatencyMs
		if latency == 0 {
			latency = 100 // default estimate
		}
		if latency < minLatency {
			minLatency = latency
			best = es
		}
	}
	if best == nil {
		return candidates[0].endpoint
	}
	return best.endpoint
}

func (b *Balancer) selectCostBased(candidates []*endpointState) *Endpoint {
	var best *endpointState
	var minCost float64 = 1e18
	for _, es := range candidates {
		cost := es.endpoint.CostPerToken
		if cost == 0 {
			cost = 0.001 // default
		}
		if cost < minCost {
			minCost = cost
			best = es
		}
	}
	if best == nil {
		return candidates[0].endpoint
	}
	return best.endpoint
}

func (b *Balancer) selectWeighted(candidates []*endpointState) *Endpoint {
	totalWeight := 0
	for _, es := range candidates {
		w := es.endpoint.Weight
		if w <= 0 {
			w = 1
		}
		totalWeight += w
	}

	if totalWeight == 0 {
		return candidates[0].endpoint
	}

	r := rand.Intn(totalWeight)
	cumulative := 0
	for _, es := range candidates {
		w := es.endpoint.Weight
		if w <= 0 {
			w = 1
		}
		cumulative += w
		if r < cumulative {
			return es.endpoint
		}
	}
	return candidates[0].endpoint
}

func (b *Balancer) selectRandom(candidates []*endpointState) *Endpoint {
	return candidates[rand.Intn(len(candidates))].endpoint
}

// StrategyFromString parses a strategy string.
func StrategyFromString(s string) Strategy {
	switch s {
	case "round-robin":
		return StrategyRoundRobin
	case "least-busy":
		return StrategyLeastBusy
	case "latency-based", "latency":
		return StrategyLatencyBased
	case "cost":
		return StrategyCostBased
	case "weighted":
		return StrategyWeighted
	case "random":
		return StrategyRandom
	default:
		return StrategyRoundRobin
	}
}
