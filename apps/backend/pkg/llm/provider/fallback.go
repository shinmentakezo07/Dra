package provider

import (
	"context"
	"fmt"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// FallbackProvider tries a chain of providers until one succeeds.
type FallbackProvider struct {
	name      string
	providers []llm.Provider
	health    *HealthChecker
	mu        sync.RWMutex
}

// NewFallbackProvider creates a fallback provider chain.
// The first provider is the primary; subsequent providers are fallbacks.
func NewFallbackProvider(name string, providers ...llm.Provider) *FallbackProvider {
	return &FallbackProvider{
		name:      name,
		providers: providers,
	}
}

// WithHealthChecker attaches a health checker to skip unhealthy providers.
func (f *FallbackProvider) WithHealthChecker(hc *HealthChecker) *FallbackProvider {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.health = hc
	return f
}

// Name returns the provider name.
func (f *FallbackProvider) Name() string {
	return f.name
}

// SupportsThinking returns true if any provider supports thinking.
func (f *FallbackProvider) SupportsThinking() bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	for _, p := range f.providers {
		if p.SupportsThinking() {
			return true
		}
	}
	return false
}

// Chat sends a request, trying each provider in order.
func (f *FallbackProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	providers := f.availableProviders()
	if len(providers) == 0 {
		return nil, fmt.Errorf("fallback %s: no providers available", f.name)
	}

	var lastErr error
	for _, p := range providers {
		resp, err := p.Chat(ctx, req)
		if err == nil {
			resp.Provider = f.name
			return resp, nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("fallback %s: all providers failed, last error: %w", f.name, lastErr)
}

// ChatStream sends a streaming request, trying each provider in order.
func (f *FallbackProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	providers := f.availableProviders()
	if len(providers) == 0 {
		return nil, fmt.Errorf("fallback %s: no providers available", f.name)
	}

	var lastErr error
	for _, p := range providers {
		ch, err := p.ChatStream(ctx, req)
		if err == nil {
			return f.tagStreamChunks(ch, f.name), nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("fallback %s: all providers failed, last error: %w", f.name, lastErr)
}

// ListModels returns models from all providers, deduplicated.
func (f *FallbackProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	providers := f.availableProviders()
	seen := make(map[string]struct{})
	var all []llm.ModelInfo

	for _, p := range providers {
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

func (f *FallbackProvider) availableProviders() []llm.Provider {
	f.mu.RLock()
	health := f.health
	providers := f.providers
	f.mu.RUnlock()

	if health == nil {
		result := make([]llm.Provider, len(providers))
		copy(result, providers)
		return result
	}

	var healthy []llm.Provider
	for _, p := range providers {
		if health.IsHealthy(p.Name()) {
			healthy = append(healthy, p)
		}
	}

	// If no healthy providers, try all as last resort
	if len(healthy) == 0 {
		result := make([]llm.Provider, len(providers))
		copy(result, providers)
		return result
	}

	return healthy
}

func (f *FallbackProvider) tagStreamChunks(ch <-chan llm.StreamChunk, providerName string) <-chan llm.StreamChunk {
	out := make(chan llm.StreamChunk, 64)
	go func() {
		defer close(out)
		for chunk := range ch {
			chunk.Provider = providerName
			select {
			case out <- chunk:
			case <-time.After(5 * time.Second):
				return
			}
		}
	}()
	return out
}

// FallbackConfig configures a provider fallback chain in the registry.
type FallbackConfig struct {
	Primary  string
	Fallback []string
}

// RegisterFallback registers a fallback provider chain in the registry.
func (r *Registry) RegisterFallback(name string, config FallbackConfig) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	primary, ok := r.providers[config.Primary]
	if !ok {
		return fmt.Errorf("primary provider not found: %s", config.Primary)
	}

	providers := []llm.Provider{primary}
	for _, fbName := range config.Fallback {
		fb, ok := r.providers[fbName]
		if !ok {
			return fmt.Errorf("fallback provider not found: %s", fbName)
		}
		providers = append(providers, fb)
	}

	fallback := NewFallbackProvider(name, providers...)
	r.providers[name] = fallback
	r.models = nil
	return nil
}
