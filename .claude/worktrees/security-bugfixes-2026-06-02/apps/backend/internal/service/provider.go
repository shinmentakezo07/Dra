package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/circuitbreaker"
	"dra-platform/backend/pkg/llm/pipeline"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	llmrouter "dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/llm/watcher"
)

// ProviderService handles LLM provider operations with SDK features.
type ProviderService struct {
	registry      *llmprovider.Registry
	cache         cache.Cache
	watcher       *watcher.Watcher
	pipeline      *pipeline.Pipeline
	healthChecker *llmprovider.HealthChecker
	groupRouter   *llmrouter.GroupRouter
}

// NewProviderService creates a new provider service.
func NewProviderService(registry *llmprovider.Registry) *ProviderService {
	s := &ProviderService{registry: registry}
	s.setupPipeline()
	return s
}

// NewProviderServiceWithFeatures creates a provider service with full SDK features.
func NewProviderServiceWithFeatures(registry *llmprovider.Registry, c cache.Cache, w *watcher.Watcher) *ProviderService {
	s := &ProviderService{
		registry: registry,
		cache:    c,
		watcher:  w,
	}
	s.setupPipeline()
	s.initHealthChecker()
	return s
}

func (s *ProviderService) initHealthChecker() {
	hc := llmprovider.NewHealthChecker(context.Background(), 30*time.Second, 10*time.Second)
	for _, name := range s.registry.Providers() {
		p, ok := s.registry.Get(name)
		if !ok {
			continue
		}
		// Extract base URL for HTTP health check
		var url string
		if bu, ok := p.(interface{ BaseURL() string }); ok {
			url = bu.BaseURL()
		}
		if url == "" {
			continue
		}
		hc.Register(name, llmprovider.HTTPHealthCheck(&http.Client{Timeout: 10 * time.Second}, url))
	}
	hc.Start()
	s.healthChecker = hc
}

// HealthChecker returns the underlying health checker.
func (s *ProviderService) HealthChecker() *llmprovider.HealthChecker {
	return s.healthChecker
}

// SetGroupRouter sets the group router for model group and fallback resolution.
func (s *ProviderService) SetGroupRouter(gr *llmrouter.GroupRouter) {
	s.groupRouter = gr
}

// ProviderHealthStatuses returns current health statuses for all providers.
func (s *ProviderService) ProviderHealthStatuses() []llmprovider.ProviderHealth {
	if s.healthChecker == nil {
		return nil
	}
	return s.healthChecker.AllStatuses()
}

func (s *ProviderService) setupPipeline() {
	p := pipeline.New()
	p.AddBefore(&pipeline.ValidationStep{})
	p.AddBefore(&pipeline.ThinkingStep{})
	p.AddBefore(&pipeline.ToolStep{})
	p.AddBefore(&pipeline.SanitizationStep{})
	p.AddAfter(&pipeline.LoggingStep{})
	s.pipeline = p
}

func (s *ProviderService) ListModels(ctx context.Context) ([]llm.ModelInfo, *domain.AppError) {
	models, err := s.registry.AllModels(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list models", err)
	}
	return models, nil
}

func (s *ProviderService) Chat(ctx context.Context, req domain.ChatRequest) (*llm.ChatResponse, *domain.AppError) {
	// Resolve model group if applicable
	modelID := req.Model
	if s.groupRouter != nil {
		provName, resolved, err := s.groupRouter.ResolveModel(modelID)
		if err == nil && provName != "" {
			modelID = provName + "/" + resolved
		}
	}

	// Try with fallback support
	if s.groupRouter != nil {
		resp, err := llmrouter.WrapWithFallbackSync(ctx, modelID, s.groupRouter, func(ctx context.Context, model string) (*llm.ChatResponse, error) {
			return s.chatSingle(ctx, req, model)
		})
		if err != nil {
			return nil, domain.Wrap(domain.ErrInternal, 500, "chat failed", err)
		}
		return resp, nil
	}

	resp, err := s.chatSingle(ctx, req, modelID)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *ProviderService) chatSingle(ctx context.Context, req domain.ChatRequest, modelID string) (*llm.ChatResponse, *domain.AppError) {
	provName, modelName := llm.ParseModelID(modelID)
	if provName == "" {
		provName = "nvidia"
		modelName = modelID
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	llmReq := toLLMChatRequest(req)
	llmReq.Model = modelName

	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	resp, err := p.Chat(ctx, llmReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelName, "")
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat failed", err)
	}

	if s.pipeline != nil {
		if err := s.pipeline.RunAfter(ctx, llmReq, resp); err != nil {
			logger.Warn("pipeline_post_processing_failed", "error", err.Error())
		}
	}

	return resp, nil
}

func (s *ProviderService) ChatStream(ctx context.Context, req domain.ChatRequest) (<-chan llm.StreamChunk, *domain.AppError) {
	// Resolve model group if applicable
	modelID := req.Model
	if s.groupRouter != nil {
		provName, resolved, err := s.groupRouter.ResolveModel(modelID)
		if err == nil && provName != "" {
			modelID = provName + "/" + resolved
		}
	}

	// Try with fallback support
	if s.groupRouter != nil {
		ch, err := llmrouter.WrapWithFallback(ctx, modelID, s.groupRouter, func(ctx context.Context, model string) (<-chan llm.StreamChunk, error) {
			return s.chatStreamSingle(ctx, req, model)
		})
		if err != nil {
			return nil, domain.Wrap(domain.ErrInternal, 500, "chat stream failed", err)
		}
		return ch, nil
	}

	ch, err := s.chatStreamSingle(ctx, req, modelID)
	if err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *ProviderService) chatStreamSingle(ctx context.Context, req domain.ChatRequest, modelID string) (<-chan llm.StreamChunk, *domain.AppError) {
	provName, modelName := llm.ParseModelID(modelID)
	if provName == "" {
		provName = "nvidia"
		modelName = modelID
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	llmReq := toLLMChatRequest(req)
	llmReq.Model = modelName

	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	ch, err := p.ChatStream(ctx, llmReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelName, "")
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat stream failed", err)
	}

	return ch, nil
}

// ChatWithThinking sends a chat request with thinking/reasoning enabled.
func (s *ProviderService) ChatWithThinking(ctx context.Context, req domain.ChatRequest, budgetTokens int) (*llm.ChatResponse, *domain.AppError) {
	provName, modelID := llm.ParseModelID(req.Model)
	if provName == "" {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "model must include provider prefix for thinking")
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	llmReq := toLLMChatRequest(req)
	llmReq.Model = modelID
	llmReq.Thinking = &llm.ThinkingConfig{Enabled: true, BudgetTokens: budgetTokens}
	if llmReq.MaxTokens == nil {
		v := 8192
		llmReq.MaxTokens = &v
	}

	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	resp, err := p.Chat(ctx, llmReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelID, "")
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat with thinking failed", err)
	}

	if budgetTokens > 0 && len(resp.Choices) > 0 {
		resp.Choices[0].Message.Content = fmt.Sprintf("<thinking budget=\"%d\">\n%s\n</thinking>", budgetTokens, resp.Choices[0].Message.Content)
	}

	return resp, nil
}

func (s *ProviderService) ResolveProvider(modelID string) (string, string) {
	return llm.ParseModelID(modelID)
}

func (s *ProviderService) EstimateTokens(modelID string, messages []domain.ChatMessage) (inputTokens, outputTokens int) {
	var totalChars int
	for _, m := range messages {
		totalChars += len(m.Content)
	}
	inputTokens = llm.EstimateTokens(strings.Repeat("x", totalChars))
	if inputTokens == 0 {
		inputTokens = len(messages) * 50
	}
	outputTokens = inputTokens / 3
	return
}

func (s *ProviderService) DefaultModel() string {
	return "nvidia/qwen3-coder-480b"
}

func (s *ProviderService) AllProviders() []string {
	return s.registry.Providers()
}

func (s *ProviderService) ListProviderNames(ctx context.Context) []string {
	return s.registry.Providers()
}

func (s *ProviderService) ModelProvider(modelID string) (string, bool) {
	prov, _ := llm.ParseModelID(modelID)
	if prov == "" {
		return "", false
	}
	_, ok := s.registry.Get(prov)
	return prov, ok
}

func (s *ProviderService) FindModel(ctx context.Context, modelID string) (*llm.ModelInfo, *domain.AppError) {
	models, err := s.registry.AllModels(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list models", err)
	}
	for _, m := range models {
		if m.ID == modelID || strings.HasSuffix(m.ID, modelID) {
			return &m, nil
		}
	}
	return nil, domain.NewError(domain.ErrNotFound, 404, "model not found")
}

// GetCacheStats returns cache statistics if caching is enabled.
func (s *ProviderService) GetCacheStats(ctx context.Context) (cache.Stats, error) {
	if s.cache == nil {
		return cache.Stats{}, fmt.Errorf("cache not enabled")
	}
	return s.cache.Stats(ctx)
}

// IsThinkingModel checks if a model supports thinking/reasoning.
func (s *ProviderService) IsThinkingModel(modelID string) bool {
	return llm.IsThinkingModel(modelID)
}

// IsVisionModel checks if a model supports vision.
func (s *ProviderService) IsVisionModel(modelID string) bool {
	return llm.IsVisionModel(modelID)
}

// SupportsTools checks if a model supports tool calls.
func (s *ProviderService) SupportsTools(modelID string) bool {
	return llm.IsToolModel(modelID)
}

// GetContextWindow returns the context window for a model.
func (s *ProviderService) GetContextWindow(ctx context.Context, modelID string) int {
	models, err := s.registry.AllModels(ctx)
	if err != nil {
		return 128000
	}
	for _, m := range models {
		if m.ID == modelID {
			return m.ContextWindow
		}
	}
	return 128000
}

// CircuitBreakerStatuses returns circuit breaker states for all registered providers.
func (s *ProviderService) CircuitBreakerStatuses() []map[string]interface{} {
	if s.registry == nil {
		return []map[string]interface{}{}
	}

	var result []map[string]interface{}
	for _, name := range s.registry.Providers() {
		p, ok := s.registry.Get(name)
		if !ok {
			continue
		}
		item := map[string]interface{}{
			"provider": name,
			"state":    "unknown",
		}
		if cb, ok := p.(*circuitbreaker.CircuitBreaker); ok {
			item["state"] = cb.State().String()
		}
		result = append(result, item)
	}
	return result
}

// ValidateRequest validates a chat request using the pipeline.
func (s *ProviderService) ValidateRequest(req domain.ChatRequest) *domain.AppError {
	messages := make([]llm.Message, len(req.Messages))
	for i, m := range req.Messages {
		messages[i] = llm.Message{Role: llm.Role(m.Role), Content: m.Content}
	}
	llmReq := &llm.ChatRequest{
		Model:    req.Model,
		Messages: messages,
	}
	if err := llm.ValidateRequest(llmReq); err != nil {
		return domain.NewError(domain.ErrBadRequest, 400, err.Error())
	}
	return nil
}

// DefaultSystemPrompt returns the default system prompt.
func (s *ProviderService) DefaultSystemPrompt() string {
	return "You are Shinmen, a distinguished PhD in Computer Science and Information Technology with over 20 years of experience."
}

// toLLMChatRequest converts a domain.ChatRequest to pkg/llm.ChatRequest.
func toLLMChatRequest(req domain.ChatRequest) *llm.ChatRequest {
	messages := make([]llm.Message, len(req.Messages))
	hasSystem := false
	for i, m := range req.Messages {
		messages[i] = llm.Message{
			Role:    llm.Role(m.Role),
			Content: m.Content,
		}
		if m.Role == "system" {
			hasSystem = true
		}
	}
	var system string
	if !hasSystem {
		system = "You are Shinmen, a distinguished PhD in Computer Science and Information Technology with over 20 years of experience."
	}
	return &llm.ChatRequest{
		Model:    req.Model,
		Messages: messages,
		System:   system,
	}
}
