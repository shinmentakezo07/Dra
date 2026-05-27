package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
	llmprovider "dra-platform/backend/pkg/llm/provider"
)

type RouterRule struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Priority    int               `json:"priority"`
	Conditions  map[string]string `json:"conditions"`
	TargetModel string            `json:"target_model"`
	Enabled     bool              `json:"enabled"`
}

type ModelRouter struct {
	mu        sync.RWMutex
	registry  *llmprovider.Registry
	rules     []RouterRule
	strategy  RouterStrategy
	latencies map[string]*latencyTracker
	errors    map[string]*errorTracker
}

type RouterStrategy int

const (
	RouterStrategyCost RouterStrategy = iota
	RouterStrategyLatency
	RouterStrategyReliability
	RouterStrategyCapability
	RouterStrategyRandom
)

func (s RouterStrategy) String() string {
	switch s {
	case RouterStrategyCost:
		return "cost"
	case RouterStrategyLatency:
		return "latency"
	case RouterStrategyReliability:
		return "reliability"
	case RouterStrategyCapability:
		return "capability"
	case RouterStrategyRandom:
		return "random"
	default:
		return "unknown"
	}
}

type latencyTracker struct {
	mu         sync.RWMutex
	samples    []time.Duration
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

func NewModelRouter(registry *llmprovider.Registry, strategy RouterStrategy) *ModelRouter {
	return &ModelRouter{
		registry:  registry,
		strategy:  strategy,
		rules:     make([]RouterRule, 0),
		latencies: make(map[string]*latencyTracker),
		errors:    make(map[string]*errorTracker),
	}
}

func (mr *ModelRouter) AddRule(rule RouterRule) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	mr.rules = append(mr.rules, rule)
}

func (mr *ModelRouter) RemoveRule(id string) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	filtered := make([]RouterRule, 0, len(mr.rules))
	for _, r := range mr.rules {
		if r.ID != id {
			filtered = append(filtered, r)
		}
	}
	mr.rules = filtered
}

func (mr *ModelRouter) SetStrategy(s RouterStrategy) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	mr.strategy = s
}

func (mr *ModelRouter) Route(ctx context.Context, req *llm.ChatRequest) (llm.Provider, error) {
	mr.mu.RLock()
	rules := make([]RouterRule, len(mr.rules))
	copy(rules, mr.rules)
	strategy := mr.strategy
	mr.mu.RUnlock()

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}
		if mr.matchesRule(rule, req) {
			if p, ok := mr.registry.Get(rule.TargetModel); ok {
				return p, nil
			}
			provName, _ := parseModelID(rule.TargetModel)
			if p, ok := mr.registry.Get(provName); ok {
				return p, nil
			}
		}
	}

	providers := mr.registry.Providers()
	if len(providers) == 0 {
		return nil, fmt.Errorf("no providers registered")
	}

	var candidates []llm.Provider
	for _, name := range providers {
		if p, ok := mr.registry.Get(name); ok {
			candidates = append(candidates, p)
		}
	}

	candidates = mr.filterByCapability(candidates, req)
	if len(candidates) == 0 {
		candidates = mr.allProviders()
	}

	switch strategy {
	case RouterStrategyCost:
		return mr.routeByCost(ctx, candidates, req)
	case RouterStrategyLatency:
		return mr.routeByLatency(candidates)
	case RouterStrategyReliability:
		return mr.routeByReliability(candidates)
	case RouterStrategyCapability:
		return mr.routeByCapability(candidates, req)
	case RouterStrategyRandom:
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(candidates))))
		if err != nil {
			return candidates[0], nil
		}
		return candidates[n.Int64()], nil
	default:
		return candidates[0], nil
	}
}

func (mr *ModelRouter) matchesRule(rule RouterRule, req *llm.ChatRequest) bool {
	for key, value := range rule.Conditions {
		switch key {
		case "model":
			if !strings.Contains(req.Model, value) {
				return false
			}
		case "has_tools":
			if value == "true" && len(req.Tools) == 0 {
				return false
			}
		case "has_vision":
			if value == "true" && !mr.hasVisionContent(req) {
				return false
			}
		default:
			if req.Metadata != nil && req.Metadata[key] != value {
				return false
			}
		}
	}
	return true
}

func (mr *ModelRouter) hasVisionContent(req *llm.ChatRequest) bool {
	for _, m := range req.Messages {
		for _, cb := range m.ContentBlocks {
			if cb.Type == llm.ContentTypeImage {
				return true
			}
		}
	}
	return false
}

func (mr *ModelRouter) filterByCapability(providers []llm.Provider, req *llm.ChatRequest) []llm.Provider {
	if len(req.Tools) > 0 {
		var filtered []llm.Provider
		for _, p := range providers {
			if p.SupportsThinking() || strings.Contains(p.Name(), "openai") || strings.Contains(p.Name(), "anthropic") {
				filtered = append(filtered, p)
			}
		}
		return filtered
	}
	return providers
}

func (mr *ModelRouter) allProviders() []llm.Provider {
	var result []llm.Provider
	for _, name := range mr.registry.Providers() {
		if p, ok := mr.registry.Get(name); ok {
			result = append(result, p)
		}
	}
	return result
}

func (mr *ModelRouter) routeByCost(ctx context.Context, providers []llm.Provider, req *llm.ChatRequest) (llm.Provider, error) {
	var best llm.Provider
	bestCost := math.MaxFloat64

	for _, p := range providers {
		models, err := p.ListModels(ctx)
		if err != nil {
			continue
		}
		for _, m := range models {
			if matchesModel(m.ID, req.Model) {
				cost := m.InputPricePer1k + m.OutputPricePer1k
				if cost < bestCost {
					bestCost = cost
					best = p
				}
			}
		}
	}

	if best == nil {
		return providers[0], nil
	}
	return best, nil
}

func (mr *ModelRouter) routeByLatency(providers []llm.Provider) (llm.Provider, error) {
	var best llm.Provider
	bestLatency := time.Duration(math.MaxInt64)

	for _, p := range providers {
		mr.mu.RLock()
		lt, ok := mr.latencies[p.Name()]
		mr.mu.RUnlock()
		if ok {
			avg := lt.avg()
			if avg > 0 && avg < bestLatency {
				bestLatency = avg
				best = p
			}
		}
	}

	if best == nil {
		return providers[0], nil
	}
	return best, nil
}

func (mr *ModelRouter) routeByReliability(providers []llm.Provider) (llm.Provider, error) {
	var best llm.Provider
	bestRate := 1.0

	for _, p := range providers {
		mr.mu.RLock()
		et, ok := mr.errors[p.Name()]
		mr.mu.RUnlock()
		if ok {
			rate := et.errorRate()
			if rate < bestRate {
				bestRate = rate
				best = p
			}
		}
	}

	if best == nil {
		return providers[0], nil
	}
	return best, nil
}

func (mr *ModelRouter) routeByCapability(providers []llm.Provider, req *llm.ChatRequest) (llm.Provider, error) {
	for _, p := range providers {
		if p.SupportsThinking() && req.Thinking != nil && req.Thinking.Enabled {
			return p, nil
		}
	}
	return providers[0], nil
}

func (mr *ModelRouter) RecordLatency(provider string, d time.Duration) {
	mr.mu.RLock()
	lt, ok := mr.latencies[provider]
	mr.mu.RUnlock()
	if ok {
		lt.add(d)
	}
}

func (mr *ModelRouter) RecordResult(provider string, success bool) {
	mr.mu.RLock()
	et, ok := mr.errors[provider]
	mr.mu.RUnlock()
	if ok {
		et.record(success)
	}
}

func (mr *ModelRouter) RegisterProvider(p llm.Provider) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	mr.latencies[p.Name()] = newLatencyTracker()
	mr.errors[p.Name()] = &errorTracker{}
}

func matchesModel(modelID, pattern string) bool {
	if modelID == pattern {
		return true
	}
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(modelID, prefix)
	}
	return strings.Contains(modelID, pattern)
}

func parseModelID(id string) (provider, model string) {
	parts := strings.SplitN(id, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", id
}
