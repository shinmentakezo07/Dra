package provider

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"

	"dra-platform/backend/pkg/llm"
)

// WeightedProvider wraps a provider with a weight for load balancing.
type WeightedProvider struct {
	Provider llm.Provider
	Weight   int
}

// LoadBalancer distributes requests across multiple provider instances.
type LoadBalancer interface {
	Next() llm.Provider
	All() []llm.Provider
}

// RoundRobinBalancer implements round-robin load balancing.
type RoundRobinBalancer struct {
	providers []llm.Provider
	counter   uint64
}

// NewRoundRobinBalancer creates a round-robin balancer.
func NewRoundRobinBalancer(providers ...llm.Provider) *RoundRobinBalancer {
	pps := make([]llm.Provider, len(providers))
	copy(pps, providers)
	return &RoundRobinBalancer{providers: pps}
}

// Next returns the next provider in round-robin order.
func (r *RoundRobinBalancer) Next() llm.Provider {
	if len(r.providers) == 0 {
		return nil
	}
	idx := atomic.AddUint64(&r.counter, 1) - 1
	return r.providers[idx%uint64(len(r.providers))]
}

// All returns all providers.
func (r *RoundRobinBalancer) All() []llm.Provider {
	result := make([]llm.Provider, len(r.providers))
	copy(result, r.providers)
	return result
}

// WeightedRoundRobinBalancer implements weighted round-robin.
type WeightedRoundRobinBalancer struct {
	providers []WeightedProvider
	weights   []int
	total     int
	counter   uint64
}

// NewWeightedRoundRobinBalancer creates a weighted round-robin balancer.
func NewWeightedRoundRobinBalancer(providers ...WeightedProvider) *WeightedRoundRobinBalancer {
	var total int
	weights := make([]int, len(providers))
	for i, wp := range providers {
		w := wp.Weight
		if w <= 0 {
			w = 1
		}
		weights[i] = w
		total += w
	}
	return &WeightedRoundRobinBalancer{
		providers: providers,
		weights:   weights,
		total:     total,
	}
}

// Next returns the next provider using weighted round-robin.
func (w *WeightedRoundRobinBalancer) Next() llm.Provider {
	if len(w.providers) == 0 {
		return nil
	}
	idx := atomic.AddUint64(&w.counter, 1) - 1
	pos := int(idx % uint64(w.total))
	for i, weight := range w.weights {
		pos -= weight
		if pos < 0 {
			return w.providers[i].Provider
		}
	}
	return w.providers[0].Provider
}

// All returns all underlying providers.
func (w *WeightedRoundRobinBalancer) All() []llm.Provider {
	result := make([]llm.Provider, len(w.providers))
	for i, wp := range w.providers {
		result[i] = wp.Provider
	}
	return result
}

// BalancedProvider wraps a LoadBalancer to satisfy llm.Provider.
type BalancedProvider struct {
	name     string
	balancer LoadBalancer
	health   *HealthChecker
	mu       sync.RWMutex
}

// NewBalancedProvider creates a provider that load-balances across instances.
func NewBalancedProvider(name string, balancer LoadBalancer) *BalancedProvider {
	return &BalancedProvider{
		name:     name,
		balancer: balancer,
	}
}

// WithHealthChecker attaches a health checker to skip unhealthy instances.
func (b *BalancedProvider) WithHealthChecker(hc *HealthChecker) *BalancedProvider {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.health = hc
	return b
}

// Name returns the provider name.
func (b *BalancedProvider) Name() string {
	return b.name
}

// SupportsThinking returns true if any instance supports thinking.
func (b *BalancedProvider) SupportsThinking() bool {
	for _, p := range b.balancer.All() {
		if p.SupportsThinking() {
			return true
		}
	}
	return false
}

// Chat sends a request to the next available provider.
func (b *BalancedProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	p := b.nextHealthy()
	if p == nil {
		return nil, fmt.Errorf("balanced %s: no healthy providers", b.name)
	}
	resp, err := p.Chat(ctx, req)
	if err != nil {
		return nil, err
	}
	resp.Provider = b.name
	return resp, nil
}

// ChatStream sends a streaming request to the next available provider.
func (b *BalancedProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	p := b.nextHealthy()
	if p == nil {
		return nil, fmt.Errorf("balanced %s: no healthy providers", b.name)
	}
	return p.ChatStream(ctx, req)
}

// ListModels returns models from all instances, deduplicated.
func (b *BalancedProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	seen := make(map[string]struct{})
	var all []llm.ModelInfo
	for _, p := range b.balancer.All() {
		models, err := p.ListModels(ctx)
		if err != nil {
			continue
		}
		for _, m := range models {
			if _, ok := seen[m.ID]; !ok {
				seen[m.ID] = struct{}{}
				all = append(all, m)
			}
		}
	}
	return all, nil
}

func (b *BalancedProvider) nextHealthy() llm.Provider {
	b.mu.RLock()
	health := b.health
	b.mu.RUnlock()

	if health == nil {
		return b.balancer.Next()
	}

	// Try up to N times to find a healthy provider
	all := b.balancer.All()
	for i := 0; i < len(all); i++ {
		p := b.balancer.Next()
		if p == nil {
			return nil
		}
		if health.IsHealthy(p.Name()) {
			return p
		}
	}

	// Fallback: return next even if unhealthy
	return b.balancer.Next()
}
