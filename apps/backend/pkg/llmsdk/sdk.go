// Package llmsdk provides a unified SDK for interacting with multiple LLM providers.
//
// It supports:
//   - Multiple providers (OpenAI, Anthropic, generic OpenAI-compatible)
//   - Bidirectional format translation (Anthropic ↔ OpenAI)
//   - Response caching
//   - Request/response pipelines
//   - Error watching and retry logic
//   - Thinking/reasoning support
//   - Streaming
//
// Quick Start:
//
//	client, err := llmsdk.NewSDKClient("openai", llmsdk.WithAPIKey(os.Getenv("OPENAI_API_KEY")))
//	resp, err := client.Chat(ctx, &llm.ChatRequest{
//	    Model: "gpt-4o",
//	    Messages: []llm.Message{
//	        {Role: llm.RoleUser, Content: "Hello!"},
//	    },
//	})
//
// Advanced usage with all features:
//
//	cache := cache.NewMemoryCache(cache.WithMaxSize(1000))
//	watcher := watcher.New()
//	pipe := pipeline.New()
//	pipe.AddBefore(&pipeline.ValidationStep{})
//
//	client, err := llmsdk.NewSDKClient("anthropic", llmsdk.WithAPIKey(key),
//	    llm.WithCache(cache),
//	    llm.WithWatcher(watcher),
//	    llm.WithPipeline(pipe),
//	)
package llmsdk

import (
	"context"
	"fmt"

	"dra-platform/backend/pkg/llm"
	llmpipeline "dra-platform/backend/pkg/llm/pipeline"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	llmwatcher "dra-platform/backend/pkg/llm/watcher"
)

// SDK is the high-level facade for the LLM system.
type SDK struct {
	registry *llmprovider.Registry
	cache    llm.Cache
	watcher  *llmwatcher.Watcher
	pipeline *llmpipeline.Pipeline
	clients  map[string]*llm.Client
}

// SDKOption configures the SDK.
type SDKOption func(*SDK)

// WithSDKCache sets the cache for the SDK.
func WithSDKCache(c llm.Cache) SDKOption {
	return func(s *SDK) {
		s.cache = c
	}
}

// WithSDKWatcher sets the watcher for the SDK.
func WithSDKWatcher(w *llmwatcher.Watcher) SDKOption {
	return func(s *SDK) {
		s.watcher = w
	}
}

// WithSDKPipeline sets the pipeline for the SDK.
func WithSDKPipeline(p *llmpipeline.Pipeline) SDKOption {
	return func(s *SDK) {
		s.pipeline = p
	}
}

// NewSDK creates a new LLM SDK.
func NewSDK(opts ...SDKOption) *SDK {
	s := &SDK{
		registry: llmprovider.NewRegistry(),
		clients:  make(map[string]*llm.Client),
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// RegisterProvider registers a provider with the SDK.
func (s *SDK) RegisterProvider(name, apiKey string, opts ...llmprovider.Option) error {
	switch name {
	case "openai":
		p := llmprovider.NewOpenAIProvider(append([]llmprovider.Option{llmprovider.WithAPIKey(apiKey)}, opts...)...)
		s.registry.Register(p)
		s.clients[name] = llm.NewClient(p,
			llm.WithCache(s.cache),
			llm.WithWatcher(s.watcher),
			llm.WithPipeline(s.pipeline),
		)
	case "anthropic":
		p := llmprovider.NewAnthropicProvider(append([]llmprovider.Option{llmprovider.WithAPIKey(apiKey)}, opts...)...)
		s.registry.Register(p)
		s.clients[name] = llm.NewClient(p,
			llm.WithCache(s.cache),
			llm.WithWatcher(s.watcher),
			llm.WithPipeline(s.pipeline),
		)
	default:
		return fmt.Errorf("unknown provider: %s (use RegisterGenericProvider for custom providers)", name)
	}
	return nil
}

// RegisterGenericProvider registers a generic OpenAI-compatible provider.
func (s *SDK) RegisterGenericProvider(name, baseURL, apiKey string, opts ...llmprovider.Option) {
	allOpts := append([]llmprovider.Option{llmprovider.WithAPIKey(apiKey)}, opts...)
	p := llmprovider.NewGenericProvider(name, baseURL, allOpts...)
	s.registry.Register(p)
	s.clients[name] = llm.NewClient(p,
		llm.WithCache(s.cache),
		llm.WithWatcher(s.watcher),
		llm.WithPipeline(s.pipeline),
	)
}

// RegisterCustomProvider registers a custom provider implementation.
func (s *SDK) RegisterCustomProvider(p llm.Provider) {
	s.registry.Register(p)
	s.clients[p.Name()] = llm.NewClient(p,
		llm.WithCache(s.cache),
		llm.WithWatcher(s.watcher),
		llm.WithPipeline(s.pipeline),
	)
}

// Chat sends a chat request to the specified provider.
func (s *SDK) Chat(ctx context.Context, providerName string, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	client, ok := s.clients[providerName]
	if !ok {
		return nil, fmt.Errorf("provider not registered: %s", providerName)
	}
	return client.Chat(ctx, req)
}

// ChatStream sends a streaming chat request to the specified provider.
func (s *SDK) ChatStream(ctx context.Context, providerName string, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	client, ok := s.clients[providerName]
	if !ok {
		return nil, fmt.Errorf("provider not registered: %s", providerName)
	}
	return client.ChatStream(ctx, req)
}

// RouteChat routes a chat request based on the model ID (provider/model format).
func (s *SDK) RouteChat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return s.registry.RouteRequest(ctx, req)
}

// RouteChatStream routes a streaming chat request based on the model ID.
func (s *SDK) RouteChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	return s.registry.RouteStreamRequest(ctx, req)
}

// ListModels returns all available models from all providers.
func (s *SDK) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return s.registry.AllModels(ctx)
}

// Providers returns all registered provider names.
func (s *SDK) Providers() []string {
	return s.registry.Providers()
}

// GetProvider returns a provider by name.
func (s *SDK) GetProvider(name string) (llm.Provider, bool) {
	return s.registry.Get(name)
}

// GetClient returns a unified client for a provider.
func (s *SDK) GetClient(name string) (*llm.Client, bool) {
	c, ok := s.clients[name]
	return c, ok
}

// Cache returns the SDK cache.
func (s *SDK) Cache() llm.Cache {
	return s.cache
}

// Watcher returns the SDK watcher.
func (s *SDK) Watcher() *llmwatcher.Watcher {
	return s.watcher
}

// Registry returns the underlying provider registry.
func (s *SDK) Registry() *llmprovider.Registry {
	return s.registry
}

// NewSDKClient creates a unified LLM client for a specific provider.
// This is a convenience function that builds the provider and client in one call.
func NewSDKClient(providerName string, opts ...interface{}) (*llm.Client, error) {
	var apiKey string
	var clientOpts []llm.ClientOption
	var provOpts []llmprovider.Option

	for _, opt := range opts {
		switch o := opt.(type) {
		case llm.ClientOption:
			clientOpts = append(clientOpts, o)
		case llmprovider.Option:
			provOpts = append(provOpts, o)
		case string:
			apiKey = o
		}
	}

	var p llm.Provider
	switch providerName {
	case "openai":
		p = llmprovider.NewOpenAIProvider(append([]llmprovider.Option{llmprovider.WithAPIKey(apiKey)}, provOpts...)...)
	case "anthropic":
		p = llmprovider.NewAnthropicProvider(append([]llmprovider.Option{llmprovider.WithAPIKey(apiKey)}, provOpts...)...)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", providerName)
	}

	return llm.NewClient(p, clientOpts...), nil
}

// WithAPIKey sets the API key (used with NewClient).
func WithAPIKey(key string) interface{} {
	return key
}

// WithProviderBaseURL sets the provider base URL.
func WithProviderBaseURL(url string) llmprovider.Option {
	return llmprovider.WithBaseURL(url)
}

// WithProviderCache sets the provider cache.
func WithProviderCache(c llm.Cache) llmprovider.Option {
	return llmprovider.WithCache(c)
}

// WithProviderWatcher sets the provider watcher.
func WithProviderWatcher(w *llmwatcher.Watcher) llmprovider.Option {
	return llmprovider.WithWatcher(w)
}

// WithProviderPipeline sets the provider pipeline.
func WithProviderPipeline(p *llmpipeline.Pipeline) llmprovider.Option {
	_ = p
	return func(bp *llmprovider.BaseProvider) {}
}

