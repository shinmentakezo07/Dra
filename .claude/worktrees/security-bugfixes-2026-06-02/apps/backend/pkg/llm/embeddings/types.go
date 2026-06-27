package embeddings

import (
	"context"
	"sync"
)

// Embedding represents a vector embedding for a single input.
type Embedding struct {
	Index     int       `json:"index"`
	Object    string    `json:"object"`
	Embedding []float32 `json:"embedding"`
}

// EmbeddingRequest is the unified embedding request.
type EmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// EmbeddingResponse is the unified embedding response.
type EmbeddingResponse struct {
	Object    string      `json:"object"`
	Data      []Embedding `json:"data"`
	Model     string      `json:"model"`
	Provider  string      `json:"provider"`
	TotalTokens int       `json:"total_tokens"`
}

// Provider is the interface for embedding backends.
type Provider interface {
	Name() string
	Embed(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error)
}

// Registry holds embedding providers.
type Registry struct {
	mu        sync.RWMutex
	providers map[string]Provider
}

// NewRegistry creates a new embedding registry.
func NewRegistry() *Registry {
	return &Registry{providers: make(map[string]Provider)}
}

// Register adds an embedding provider.
func (r *Registry) Register(p Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.Name()] = p
}

// Get retrieves a provider by name.
func (r *Registry) Get(name string) (Provider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[name]
	return p, ok
}

// RouteRequest routes an embedding request by model ID.
func (r *Registry) RouteRequest(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	parts := splitModelID(req.Model)
	if parts[0] == "" {
		return nil, ErrNoProvider
	}
	p, ok := r.Get(parts[0])
	if !ok {
		return nil, ErrProviderNotFound
	}
	// Create a copy to avoid mutating the caller's request
	routedReq := *req
	routedReq.Model = parts[1]
	resp, err := p.Embed(ctx, &routedReq)
	if err != nil {
		return nil, err
	}
	resp.Provider = parts[0]
	return resp, nil
}
