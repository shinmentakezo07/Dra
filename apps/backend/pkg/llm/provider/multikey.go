package provider

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"

	"dra-platform/backend/pkg/llm"
)

// KeyInstance holds an API key and its provider instance.
type KeyInstance struct {
	APIKey   string
	Provider llm.Provider
	Weight   int
}

// MultiKeyProvider load-balances across multiple API keys for the same provider.
type MultiKeyProvider struct {
	name      string
	instances []KeyInstance
	counter   uint64
	mu        sync.RWMutex
}

// NewMultiKeyProvider creates a provider that rotates across multiple API keys.
func NewMultiKeyProvider(name string, instances []KeyInstance) *MultiKeyProvider {
	return &MultiKeyProvider{
		name:      name,
		instances: instances,
	}
}

// Name returns the provider name.
func (m *MultiKeyProvider) Name() string {
	return m.name
}

// SupportsThinking returns true if any instance supports thinking.
func (m *MultiKeyProvider) SupportsThinking() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, inst := range m.instances {
		if inst.Provider.SupportsThinking() {
			return true
		}
	}
	return false
}

// Chat sends a request using the next API key in rotation.
func (m *MultiKeyProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	inst := m.nextInstance()
	if inst == nil {
		return nil, fmt.Errorf("multi-key %s: no instances available", m.name)
	}
	resp, err := inst.Provider.Chat(ctx, req)
	if err != nil {
		return nil, err
	}
	resp.Provider = m.name
	return resp, nil
}

// ChatStream sends a streaming request using the next API key.
func (m *MultiKeyProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	inst := m.nextInstance()
	if inst == nil {
		return nil, fmt.Errorf("multi-key %s: no instances available", m.name)
	}
	return inst.Provider.ChatStream(ctx, req)
}

// ListModels returns models from the first instance.
func (m *MultiKeyProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.instances) == 0 {
		return []llm.ModelInfo{}, nil
	}
	return m.instances[0].Provider.ListModels(ctx)
}

func (m *MultiKeyProvider) nextInstance() *KeyInstance {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.instances) == 0 {
		return nil
	}

	// Weighted round-robin
	totalWeight := 0
	for _, inst := range m.instances {
		w := inst.Weight
		if w <= 0 {
			w = 1
		}
		totalWeight += w
	}

	idx := atomic.AddUint64(&m.counter, 1) - 1
	pos := int(idx % uint64(totalWeight))
	for i := range m.instances {
		w := m.instances[i].Weight
		if w <= 0 {
			w = 1
		}
		pos -= w
		if pos < 0 {
			return &m.instances[i]
		}
	}
	return &m.instances[0]
}
