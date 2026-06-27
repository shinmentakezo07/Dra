package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
	"dra-platform/backend/pkg/llm/watcher"
	"dra-platform/backend/pkg/trace"
	"github.com/sashabaranov/go-openai"
)

// BaseProvider provides common functionality for HTTP-based providers.
type BaseProvider struct {
	name       string
	apiKey     string
	baseURL    string
	client     *http.Client
	openaiClient *openai.Client
	translator translator.Translator
	cache      llm.Cache
	watcher    *watcher.Watcher
	supportsThinking bool
	models     []llm.ModelInfo
}

// Option configures a BaseProvider.
type Option func(*BaseProvider)

// WithAPIKey sets the API key.
func WithAPIKey(key string) Option {
	return func(p *BaseProvider) {
		p.apiKey = key
	}
}

// WithBaseURL sets the base URL.
func WithBaseURL(url string) Option {
	return func(p *BaseProvider) {
		p.baseURL = strings.TrimRight(url, "/")
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(client *http.Client) Option {
	return func(p *BaseProvider) {
		p.client = client
	}
}

// WithTranslator sets a translator.
func WithTranslator(t translator.Translator) Option {
	return func(p *BaseProvider) {
		p.translator = t
	}
}

// WithCache sets a cache.
func WithCache(c llm.Cache) Option {
	return func(p *BaseProvider) {
		p.cache = c
	}
}

// WithWatcher sets a watcher.
func WithWatcher(w *watcher.Watcher) Option {
	return func(p *BaseProvider) {
		p.watcher = w
	}
}

// WithSupportsThinking sets thinking support.
func WithSupportsThinking(s bool) Option {
	return func(p *BaseProvider) {
		p.supportsThinking = s
	}
}

// WithModels sets the static model catalog.
func WithModels(models []llm.ModelInfo) Option {
	return func(p *BaseProvider) {
		p.models = models
	}
}

func newBaseProvider(name string, opts ...Option) *BaseProvider {
	p := &BaseProvider{
		name:    name,
		client:  &http.Client{Timeout: 120 * time.Second},
		baseURL: "",
	}
	for _, opt := range opts {
		opt(p)
	}
	return p
}

// Name returns the provider name.
func (p *BaseProvider) Name() string {
	return p.name
}

// BaseURL returns the provider's base URL.
func (p *BaseProvider) BaseURL() string {
	return p.baseURL
}

// SupportsThinking returns whether the provider supports thinking.
func (p *BaseProvider) SupportsThinking() bool {
	return p.supportsThinking
}

// doRequest performs an HTTP request.
func (p *BaseProvider) doRequest(ctx context.Context, method, path string, body []byte, headers map[string]string) (*http.Response, error) {
	url := p.baseURL + path
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if reqID := trace.GetRequestID(ctx); reqID != "" {
		req.Header.Set("X-Request-ID", reqID)
	}

	return p.client.Do(req)
}

// OpenAIProvider implements the OpenAI API.
type OpenAIProvider struct {
	*BaseProvider
}

// NewOpenAIProvider creates a new OpenAI provider.
func NewOpenAIProvider(opts ...Option) *OpenAIProvider {
	base := newBaseProvider("openai", opts...)
	if base.baseURL == "" {
		base.baseURL = "https://api.openai.com/v1"
	}
	if base.openaiClient == nil {
		cfg := openai.DefaultConfig(base.apiKey)
		cfg.BaseURL = base.baseURL
		base.openaiClient = openai.NewClientWithConfig(cfg)
	}
	if base.translator == nil {
		base.translator = translator.NewAnthropicToOpenAI()
	}
	base.supportsThinking = true
	return &OpenAIProvider{BaseProvider: base}
}

// Chat sends a chat completion request via the OpenAI SDK.
func (p *OpenAIProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return chatWithSDK(ctx, p.BaseProvider, req)
}

// ChatStream sends a streaming chat request via the OpenAI SDK.
func (p *OpenAIProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	return chatStreamWithSDK(ctx, p.BaseProvider, req)
}

// ListModels returns available models.
func (p *OpenAIProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return []llm.ModelInfo{
		{ID: "openai/gpt-4o", Name: "GPT-4o", Provider: "openai", InputPricePer1k: 0.0025, OutputPricePer1k: 0.01, ContextWindow: 128000, Description: "OpenAI's most capable multimodal model.", Capabilities: []string{"text", "vision", "code"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
		{ID: "openai/gpt-4o-mini", Name: "GPT-4o Mini", Provider: "openai", InputPricePer1k: 0.00015, OutputPricePer1k: 0.0006, ContextWindow: 128000, Description: "Fast, affordable small model.", Capabilities: []string{"text", "vision"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
		{ID: "openai/gpt-4.1", Name: "GPT-4.1", Provider: "openai", InputPricePer1k: 0.002, OutputPricePer1k: 0.008, ContextWindow: 256000, Description: "Latest GPT model with improved reasoning.", Capabilities: []string{"text", "code", "reasoning"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
		{ID: "openai/o3-mini", Name: "o3 Mini", Provider: "openai", InputPricePer1k: 0.0011, OutputPricePer1k: 0.0044, ContextWindow: 200000, Description: "Reasoning model optimized for STEM tasks.", Capabilities: []string{"text", "reasoning", "code"}, SupportsThinking: true, SupportsVision: false, SupportsTools: true},
		{ID: "openai/o1", Name: "o1", Provider: "openai", InputPricePer1k: 0.015, OutputPricePer1k: 0.06, ContextWindow: 200000, Description: "High-intelligence reasoning model.", Capabilities: []string{"text", "reasoning"}, SupportsThinking: true, SupportsVision: false, SupportsTools: true},
	}, nil
}

// AnthropicProvider implements the Anthropic API.
type AnthropicProvider struct {
	*BaseProvider
}

// NewAnthropicProvider creates a new Anthropic provider.
func NewAnthropicProvider(opts ...Option) *AnthropicProvider {
	base := newBaseProvider("anthropic", opts...)
	if base.baseURL == "" {
		base.baseURL = "https://api.anthropic.com/v1"
	}
	if base.translator == nil {
		base.translator = translator.NewOpenAIToAnthropic()
	}
	base.supportsThinking = true
	return &AnthropicProvider{BaseProvider: base}
}

// Chat sends a chat completion request.
func (p *AnthropicProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("anthropic: API key not configured")
	}

	// Check cache
	if p.cache != nil {
		key := llm.CacheKey(req)
		if cached, err := p.cache.Get(ctx, key); err == nil && cached != nil {
			return cached, nil
		}
	}

	body, err := p.translator.TranslateRequest(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic: translate request: %w", err)
	}

	bodyBytes, _ := json.Marshal(body)

	resp, err := p.doRequest(ctx, "POST", "/messages", bodyBytes, map[string]string{
		"x-api-key":         p.apiKey,
		"anthropic-version": "2023-06-01",
	})
	if err != nil {
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, fmt.Errorf("anthropic: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, fmt.Errorf("anthropic: read response body: %w", readErr)
	}

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("anthropic: HTTP %d: %s", resp.StatusCode, string(respBody))
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, err
	}

	result, err := p.translator.TranslateResponse(respBody, req.Model, p.name)
	if err != nil {
		return nil, fmt.Errorf("anthropic: translate response: %w", err)
	}

	// Cache response
	if p.cache != nil {
		key := llm.CacheKey(req)
		if err := p.cache.Set(ctx, key, result, 5*time.Minute); err != nil {
			slog.Warn("cache_write_failed", "key", key, "error", err.Error())
		}
	}

	return result, nil
}

// ChatStream sends a streaming chat request.
func (p *AnthropicProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("anthropic: API key not configured")
	}

	body, err := p.translator.TranslateRequest(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic: translate request: %w", err)
	}
	body["stream"] = true
	bodyBytes, _ := json.Marshal(body)

	resp, err := p.doRequest(ctx, "POST", "/messages", bodyBytes, map[string]string{
		"x-api-key":         p.apiKey,
		"anthropic-version": "2023-06-01",
		"Accept":            "text/event-stream",
	})
	if err != nil {
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, fmt.Errorf("anthropic: request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		err := fmt.Errorf("anthropic: HTTP %d: %s", resp.StatusCode, string(respBody))
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, err
	}

	ch := make(chan llm.StreamChunk, 64)
	go func() {
		defer close(ch)
		defer resp.Body.Close()

		ReadSSE(resp.Body, func(line string) bool {
			if !strings.HasPrefix(line, "data: ") {
				return true
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				return false
			}
			chunk, err := p.translator.TranslateStreamChunk([]byte(data), req.Model, p.name)
			if err != nil {
				return true
			}
			if chunk == nil {
				return true
			}
			select {
			case ch <- *chunk:
			case <-ctx.Done():
				return false
			}
			return true
		})
	}()

	return ch, nil
}

// ListModels returns available models.
func (p *AnthropicProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return []llm.ModelInfo{
		{ID: "anthropic/claude-sonnet-4-20250514", Name: "Claude Sonnet 4", Provider: "anthropic", InputPricePer1k: 0.003, OutputPricePer1k: 0.015, ContextWindow: 200000, Description: "Balanced intelligence and speed.", Capabilities: []string{"text", "code", "vision"}, SupportsThinking: true, SupportsVision: true, SupportsTools: true},
		{ID: "anthropic/claude-opus-4-20250514", Name: "Claude Opus 4", Provider: "anthropic", InputPricePer1k: 0.015, OutputPricePer1k: 0.075, ContextWindow: 200000, Description: "Maximum intelligence for complex tasks.", Capabilities: []string{"text", "code", "vision", "reasoning"}, SupportsThinking: true, SupportsVision: true, SupportsTools: true},
		{ID: "anthropic/claude-3-5-haiku-20241022", Name: "Claude 3.5 Haiku", Provider: "anthropic", InputPricePer1k: 0.0008, OutputPricePer1k: 0.004, ContextWindow: 200000, Description: "Fast, cost-effective model.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
	}, nil
}

// GenericProvider implements any OpenAI-compatible API.
type GenericProvider struct {
	*BaseProvider
}

// NewGenericProvider creates a new generic OpenAI-compatible provider.
func NewGenericProvider(name, baseURL string, opts ...Option) *GenericProvider {
	allOpts := append([]Option{WithBaseURL(baseURL)}, opts...)
	base := newBaseProvider(name, allOpts...)
	if base.openaiClient == nil {
		cfg := openai.DefaultConfig(base.apiKey)
		cfg.BaseURL = base.baseURL
		base.openaiClient = openai.NewClientWithConfig(cfg)
	}
	if base.translator == nil {
		base.translator = translator.NewAnthropicToOpenAI()
	}
	return &GenericProvider{BaseProvider: base}
}

// Chat sends a chat completion request via the OpenAI SDK.
func (p *GenericProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return chatWithSDK(ctx, p.BaseProvider, req)
}

// ChatStream sends a streaming chat request via the OpenAI SDK.
func (p *GenericProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	return chatStreamWithSDK(ctx, p.BaseProvider, req)
}

// ListModels returns available models (static catalog if configured).
func (p *GenericProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	if len(p.models) > 0 {
		result := make([]llm.ModelInfo, len(p.models))
		copy(result, p.models)
		return result, nil
	}
	return []llm.ModelInfo{}, nil
}

// ModelOverlayEntry holds the DB-managed status for a single model.
type ModelOverlayEntry struct {
	Status      string
	DisplayName string
}

// Registry holds and manages providers.
type Registry struct {
	mu           sync.RWMutex
	providers    map[string]llm.Provider
	models       []llm.ModelInfo
	modelOverlay map[string]ModelOverlayEntry
}

// NewRegistry creates a new provider registry.
func NewRegistry() *Registry {
	return &Registry{
		providers: make(map[string]llm.Provider),
	}
}

// Register adds a provider to the registry.
func (r *Registry) Register(p llm.Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.Name()] = p
	r.models = nil // invalidate cache
}

// Unregister removes a provider from the registry by name.
func (r *Registry) Unregister(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.providers, name)
	r.models = nil // invalidate cache
}

// Get retrieves a provider by name.
func (r *Registry) Get(name string) (llm.Provider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[name]
	return p, ok
}

// GetByModel finds a provider that supports the given model.
func (r *Registry) GetByModel(modelID string) (llm.Provider, string, bool) {
	providerName, modelName := llm.ParseModelID(modelID)

	r.mu.RLock()
	defer r.mu.RUnlock()

	if providerName != "" {
		if p, ok := r.providers[providerName]; ok {
			return p, modelName, true
		}
	}

	// Try to find by model prefix
	for name, p := range r.providers {
		if strings.HasPrefix(modelID, name+"/") {
			_, m := llm.ParseModelID(modelID)
			return p, m, true
		}
	}

	return nil, "", false
}

// Providers returns all registered provider names.
func (r *Registry) Providers() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.providers))
	for n := range r.providers {
		names = append(names, n)
	}
	return names
}

// SetModelOverlay sets the model status overlay from the model_registry DB.
// The key is the fully-qualified model ID (providerName/modelId).
// Calling this invalidates the model cache.
func (r *Registry) SetModelOverlay(overlay map[string]ModelOverlayEntry) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.modelOverlay = overlay
	r.models = nil
}

// AllModels returns all models from all providers.
func (r *Registry) AllModels(ctx context.Context) ([]llm.ModelInfo, error) {
	r.mu.RLock()
	if r.models != nil {
		result := make([]llm.ModelInfo, len(r.models))
		copy(result, r.models)
		r.mu.RUnlock()
		return result, nil
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	var all []llm.ModelInfo
	for _, p := range r.providers {
		models, err := p.ListModels(ctx)
		if err != nil {
			continue
		}
		all = append(all, models...)
	}

	// Apply model_registry overlay: set status, filter disabled/private
	if r.modelOverlay != nil {
		var filtered []llm.ModelInfo
		for _, m := range all {
			if entry, ok := r.modelOverlay[m.ID]; ok {
				if entry.Status == "disabled" || entry.Status == "private" {
					continue
				}
				m.Status = entry.Status
				if entry.DisplayName != "" {
					m.Name = entry.DisplayName
				}
			} else {
				m.Status = "active"
			}
			filtered = append(filtered, m)
		}
		all = filtered
	}

	// Append DB-only models (admin-added for built-in providers)
	if r.modelOverlay != nil {
		existing := make(map[string]bool, len(all))
		for _, m := range all {
			existing[m.ID] = true
		}
		for id, entry := range r.modelOverlay {
			if existing[id] {
				continue
			}
			if entry.Status == "disabled" || entry.Status == "private" {
				continue
			}
			provName, modelID := llm.ParseModelID(id)
			if provName == "" || modelID == "" {
				continue
			}
			all = append(all, llm.ModelInfo{
				ID:       id,
				Name:     entry.DisplayName,
				Provider: provName,
				Status:   entry.Status,
			})
		}
	}

	r.models = all
	result := make([]llm.ModelInfo, len(all))
	copy(result, all)
	return result, nil
}

// InvalidateCache clears the model cache.
func (r *Registry) InvalidateCache() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.models = nil
}

// RouteRequest routes a request to the appropriate provider.
func (r *Registry) RouteRequest(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	providerName, modelName := llm.ParseModelID(req.Model)
	if providerName == "" {
		return nil, fmt.Errorf("no provider specified in model: %s", req.Model)
	}

	p, ok := r.Get(providerName)
	if !ok {
		return nil, fmt.Errorf("provider not found: %s", providerName)
	}

	routedReq := llm.DeepCopyRequest(req)
	routedReq.Model = modelName
	return p.Chat(ctx, routedReq)
}

// RouteStreamRequest routes a streaming request to the appropriate provider.
func (r *Registry) RouteStreamRequest(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	providerName, modelName := llm.ParseModelID(req.Model)
	if providerName == "" {
		return nil, fmt.Errorf("no provider specified in model: %s", req.Model)
	}

	p, ok := r.Get(providerName)
	if !ok {
		return nil, fmt.Errorf("provider not found: %s", providerName)
	}

	routedReq := llm.DeepCopyRequest(req)
	routedReq.Model = modelName
	return p.ChatStream(ctx, routedReq)
}

// ReadSSE reads server-sent events from a reader.
func ReadSSE(r io.Reader, yield func(string) bool) {
	buf := make([]byte, 4096)
	var line []byte
	for {
		n, err := r.Read(buf)
		if n > 0 {
			for i := 0; i < n; i++ {
				b := buf[i]
				if b == '\n' {
					if len(line) > 0 {
						if !yield(string(line)) {
							return
						}
					}
					line = line[:0]
				} else if b != '\r' {
					line = append(line, b)
				}
			}
		}
		if err != nil {
			if len(line) > 0 {
				yield(string(line))
			}
			return
		}
	}
}
