package router

import (
	"context"
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Strategy determines how to route requests.
type Strategy int

const (
	StrategyCost Strategy = iota
	StrategyLatency
	StrategyReliability
	StrategyCapability
	StrategyRandom
)

func (s Strategy) String() string {
	switch s {
	case StrategyCost:
		return "cost"
	case StrategyLatency:
		return "latency"
	case StrategyReliability:
		return "reliability"
	case StrategyCapability:
		return "capability"
	case StrategyRandom:
		return "random"
	default:
		return "unknown"
	}
}

// modelCacheEntry caches ListModels results per provider (Bug #57).
type modelCacheEntry struct {
	models    []llm.ModelInfo
	fetchedAt time.Time
}

// Router intelligently routes requests to providers based on strategy.
type Router struct {
	mu         sync.RWMutex
	providers  []llm.Provider
	models     []llm.ModelInfo
	strategy   Strategy
	latencies  map[string]*latencyTracker
	errors     map[string]*errorTracker
	modelCache map[string]*modelCacheEntry // Bug #57: cache ListModels per provider
	modelTTL   time.Duration
}

type latencyTracker struct {
	mu       sync.RWMutex
	samples  []time.Duration
	maxSamples int
}

func newLatencyTracker() *latencyTracker {
	return &latencyTracker{maxSamples: 100}
}

func (lt *latencyTracker) add(d time.Duration) {
	lt.mu.Lock()
	defer lt.mu.Unlock()
	lt.samples = append(lt.samples, d)
	if len(lt.samples) > lt.maxSamples {
		lt.samples = lt.samples[1:]
	}
}

func (lt *latencyTracker) avg() time.Duration {
	lt.mu.RLock()
	defer lt.mu.RUnlock()
	if len(lt.samples) == 0 {
		return 0
	}
	var sum time.Duration
	for _, s := range lt.samples {
		sum += s
	}
	return sum / time.Duration(len(lt.samples))
}

type errorTracker struct {
	mu       sync.RWMutex
	failures int64
	total    int64
}

func (et *errorTracker) record(success bool) {
	et.mu.Lock()
	defer et.mu.Unlock()
	et.total++
	if !success {
		et.failures++
	}
}

func (et *errorTracker) errorRate() float64 {
	et.mu.RLock()
	defer et.mu.RUnlock()
	if et.total == 0 {
		return 0
	}
	return float64(et.failures) / float64(et.total)
}

// New creates a new router with the given strategy.
func New(strategy Strategy) *Router {
	return &Router{
		strategy:   strategy,
		latencies:  make(map[string]*latencyTracker),
		errors:      make(map[string]*errorTracker),
		modelCache:  make(map[string]*modelCacheEntry),
		modelTTL:    5 * time.Minute,
	}
}

// Register adds a provider to the router.
func (r *Router) Register(p llm.Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers = append(r.providers, p)
	r.latencies[p.Name()] = newLatencyTracker()
	r.errors[p.Name()] = &errorTracker{}
}

// SetStrategy changes the routing strategy.
func (r *Router) SetStrategy(s Strategy) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.strategy = s
}

// Route selects the best provider for a request.
func (r *Router) Route(ctx context.Context, req *llm.ChatRequest) (llm.Provider, error) {
	r.mu.RLock()
	providers := make([]llm.Provider, len(r.providers))
	copy(providers, r.providers)
	strategy := r.strategy
	r.mu.RUnlock()

	if len(providers) == 0 {
		return nil, fmt.Errorf("no providers registered")
	}

	// Filter by capability if needed
	candidates := r.filterByCapability(providers, req)
	if len(candidates) == 0 {
		candidates = providers
	}

	switch strategy {
	case StrategyCost:
		return r.routeByCost(ctx, candidates, req)
	case StrategyLatency:
		return r.routeByLatency(candidates)
	case StrategyReliability:
		return r.routeByReliability(candidates)
	case StrategyCapability:
		return r.routeByCapability(candidates, req)
	case StrategyRandom:
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(candidates))))
		if err != nil {
			return candidates[0], nil
		}
		return candidates[n.Int64()], nil
	default:
		return candidates[0], nil
	}
}

// RecordLatency records a latency observation for a provider.
func (r *Router) RecordLatency(provider string, d time.Duration) {
	r.mu.RLock()
	lt, ok := r.latencies[provider]
	r.mu.RUnlock()
	if ok {
		lt.add(d)
	}
}

// RecordResult records success/failure for a provider.
func (r *Router) RecordResult(provider string, success bool) {
	r.mu.RLock()
	et, ok := r.errors[provider]
	r.mu.RUnlock()
	if ok {
		et.record(success)
	}
}

func (r *Router) filterByCapability(providers []llm.Provider, req *llm.ChatRequest) []llm.Provider {
	if len(req.Tools) > 0 {
		var filtered []llm.Provider
		for _, p := range providers {
			if supportsTools(p) {
				filtered = append(filtered, p)
			}
		}
		return filtered
	}
	return providers
}

var toolCapableProviders = map[string]bool{
	"openai":    true,
	"anthropic": true,
	"groq":      true,
	"nvidia":    true,
}

func supportsTools(p llm.Provider) bool {
	name := strings.ToLower(p.Name())
	for prefix := range toolCapableProviders {
		if strings.Contains(name, prefix) {
			return true
		}
	}
	return false
}

func (r *Router) routeByCost(ctx context.Context, providers []llm.Provider, req *llm.ChatRequest) (llm.Provider, error) {
	// Bug #57: cache ListModels results per provider to avoid N API calls per request
	var best llm.Provider
	bestCost := math.MaxFloat64

	for _, p := range providers {
		models := r.getCachedModels(ctx, p)
		for _, m := range models {
			if matchesModel(m.ID, req.Model) {
				cost := m.InputPricePer1k + m.OutputPricePer1k
				if cost < bestCost {
					bestCost = cost
					best = p
				}
				break
			}
		}
	}

	if best != nil {
		return best, nil
	}
	return providers[0], nil
}

// getCachedModels returns cached models for a provider, fetching if expired.
func (r *Router) getCachedModels(ctx context.Context, p llm.Provider) []llm.ModelInfo {
	name := p.Name()

	r.mu.RLock()
	if entry, ok := r.modelCache[name]; ok && time.Since(entry.fetchedAt) < r.modelTTL {
		models := entry.models
		r.mu.RUnlock()
		return models
	}
	r.mu.RUnlock()

	models, err := p.ListModels(ctx)
	if err != nil {
		return nil
	}

	r.mu.Lock()
	r.modelCache[name] = &modelCacheEntry{models: models, fetchedAt: time.Now()}
	r.mu.Unlock()

	return models
}

func (r *Router) routeByLatency(providers []llm.Provider) (llm.Provider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var best llm.Provider
	bestLatency := time.Duration(math.MaxInt64)

	for _, p := range providers {
		lt, ok := r.latencies[p.Name()]
		if !ok {
			continue
		}
		avg := lt.avg()
		if avg == 0 {
			// No data yet; treat as average
			avg = 500 * time.Millisecond
		}
		if avg < bestLatency {
			bestLatency = avg
			best = p
		}
	}

	if best != nil {
		return best, nil
	}
	return providers[0], nil
}

func (r *Router) routeByReliability(providers []llm.Provider) (llm.Provider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var best llm.Provider
	bestRate := math.MaxFloat64

	for _, p := range providers {
		et, ok := r.errors[p.Name()]
		if !ok {
			continue
		}
		rate := et.errorRate()
		if rate < bestRate {
			bestRate = rate
			best = p
		}
	}

	if best != nil {
		return best, nil
	}
	return providers[0], nil
}

func (r *Router) routeByCapability(providers []llm.Provider, req *llm.ChatRequest) (llm.Provider, error) {
	// Prefer providers that support the requested features
	if len(req.Tools) > 0 {
		for _, p := range providers {
			if supportsTools(p) {
				return p, nil
			}
		}
	}
	if req.Thinking != nil && req.Thinking.Enabled {
		for _, p := range providers {
			if p.SupportsThinking() {
				return p, nil
			}
		}
	}
	return providers[0], nil
}

func matchesModel(modelID, pattern string) bool {
	if modelID == pattern {
		return true
	}
	parts := strings.Split(modelID, "/")
	if len(parts) == 2 && parts[1] == pattern {
		return true
	}
	return strings.Contains(strings.ToLower(modelID), strings.ToLower(pattern))
}

// ABRouter routes traffic between variants for A/B testing.
type ABRouter struct {
	mu       sync.RWMutex
	variants map[string]*Variant
}

// Variant represents an A/B test variant.
type Variant struct {
	Name       string
	Provider   llm.Provider
	TrafficPct float64 // 0.0 - 1.0
	counter    uint64
}

// NewABRouter creates a new A/B test router.
func NewABRouter() *ABRouter {
	return &ABRouter{variants: make(map[string]*Variant)}
}

// RegisterVariant adds a variant.
func (ab *ABRouter) RegisterVariant(v *Variant) {
	ab.mu.Lock()
	defer ab.mu.Unlock()
	ab.variants[v.Name] = v
}

// Route selects a variant based on traffic percentage.
func (ab *ABRouter) Route(ctx context.Context) (llm.Provider, string, error) {
	ab.mu.RLock()
	defer ab.mu.RUnlock()

	if len(ab.variants) == 0 {
		return nil, "", fmt.Errorf("no variants registered")
	}

	// Simple weighted random selection
	n, _ := rand.Int(rand.Reader, big.NewInt(1<<53))
	r := float64(n.Int64()) / float64(1<<53)
	cumulative := 0.0
	keys := make([]string, 0, len(ab.variants))
	for k := range ab.variants {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		v := ab.variants[k]
		cumulative += v.TrafficPct
		if r <= cumulative {
			atomic.AddUint64(&v.counter, 1)
			return v.Provider, v.Name, nil
		}
	}

	// Fallback to last variant
	last := ab.variants[keys[len(keys)-1]]
	atomic.AddUint64(&last.counter, 1)
	return last.Provider, last.Name, nil
}

// Stats returns A/B test statistics.
func (ab *ABRouter) Stats() map[string]uint64 {
	ab.mu.RLock()
	defer ab.mu.RUnlock()

	stats := make(map[string]uint64)
	for name, v := range ab.variants {
		stats[name] = atomic.LoadUint64(&v.counter)
	}
	return stats
}
