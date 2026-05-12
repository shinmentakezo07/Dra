package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/provider"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/pipeline"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	"dra-platform/backend/pkg/llm/watcher"
)

// ProviderService handles LLM provider operations with SDK features.
type ProviderService struct {
	registry      *provider.Registry
	cache         cache.Cache
	watcher       *watcher.Watcher
	pipeline      *pipeline.Pipeline
	healthChecker *llmprovider.HealthChecker
}

// NewProviderService creates a new provider service.
func NewProviderService(registry *provider.Registry) *ProviderService {
	s := &ProviderService{registry: registry}
	s.setupPipeline()
	return s
}

// NewProviderServiceWithFeatures creates a provider service with full SDK features.
func NewProviderServiceWithFeatures(registry *provider.Registry, c cache.Cache, w *watcher.Watcher) *ProviderService {
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
	hc := llmprovider.NewHealthChecker(30*time.Second, 10*time.Second)
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

// SetCache sets the response cache.
func (s *ProviderService) SetCache(c cache.Cache) {
	s.cache = c
}

// SetWatcher sets the error watcher.
func (s *ProviderService) SetWatcher(w *watcher.Watcher) {
	s.watcher = w
}

// SetPipeline sets the processing pipeline.
func (s *ProviderService) SetPipeline(p *pipeline.Pipeline) {
	s.pipeline = p
}

func (s *ProviderService) ListModels(ctx context.Context) ([]provider.ModelInfo, *domain.AppError) {
	models, err := s.registry.AllModels(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list models", err)
	}
	return models, nil
}

func (s *ProviderService) Chat(ctx context.Context, req domain.ChatRequest) (*provider.ChatResponse, *domain.AppError) {
	provName, modelID := provider.ParseModelID(req.Model)
	if provName == "" {
		provName = "nvidia"
		modelID = req.Model
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	// Build unified LLM request for pipeline
	llmReq := toLLMChatRequest(req)

	// Run pre-processing pipeline
	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	messages := make([]provider.Message, len(llmReq.Messages))
	for i, m := range llmReq.Messages {
		messages[i] = provider.Message{Role: string(m.Role), Content: m.Content}
	}

	chatReq := provider.ChatRequest{
		Model:    modelID,
		Messages: messages,
		Stream:   false,
		System:   llmReq.System,
	}
	if llmReq.MaxTokens != nil {
		chatReq.MaxTokens = llmReq.MaxTokens
	}
	if llmReq.Temperature != nil {
		chatReq.Temperature = llmReq.Temperature
	}

	resp, err := p.Chat(ctx, chatReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelID, "")
		}
		if _, ok := err.(*provider.ErrProviderUnavailable); ok {
			return nil, domain.NewError(domain.ErrServiceUnavailable, 503, fmt.Sprintf("%s provider unavailable", provName))
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat failed", err)
	}

	// Convert to unified response for pipeline
	llmResp := fromProviderResponse(resp, req.Model, provName)

	// Run post-processing pipeline
	if s.pipeline != nil {
		if err := s.pipeline.RunAfter(ctx, llmReq, llmResp); err != nil {
			logger.Warn("pipeline_post_processing_failed", "error", err.Error())
			// Don't fail the request on post-processing errors
		}
	}

	// Apply pipeline modifications back to provider response
	if len(llmResp.Choices) > 0 {
		resp.Content = llmResp.Choices[0].Message.Content
	}

	return resp, nil
}

func (s *ProviderService) ChatStream(ctx context.Context, req domain.ChatRequest) (<-chan provider.StreamChunk, *domain.AppError) {
	provName, modelID := provider.ParseModelID(req.Model)
	if provName == "" {
		provName = "nvidia"
		modelID = req.Model
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	// Build unified LLM request for pipeline
	llmReq := toLLMChatRequest(req)

	// Run pre-processing pipeline
	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	messages := make([]provider.Message, len(llmReq.Messages))
	for i, m := range llmReq.Messages {
		messages[i] = provider.Message{Role: string(m.Role), Content: m.Content}
	}

	chatReq := provider.ChatRequest{
		Model:    modelID,
		Messages: messages,
		Stream:   true,
		System:   llmReq.System,
	}
	if llmReq.MaxTokens != nil {
		chatReq.MaxTokens = llmReq.MaxTokens
	}
	if llmReq.Temperature != nil {
		chatReq.Temperature = llmReq.Temperature
	}

	ch, err := p.ChatStream(ctx, chatReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelID, "")
		}
		if _, ok := err.(*provider.ErrProviderUnavailable); ok {
			return nil, domain.NewError(domain.ErrServiceUnavailable, 503, fmt.Sprintf("%s provider unavailable", provName))
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat stream failed", err)
	}

	return ch, nil
}

// ChatWithThinking sends a chat request with thinking/reasoning enabled.
func (s *ProviderService) ChatWithThinking(ctx context.Context, req domain.ChatRequest, budgetTokens int) (*provider.ChatResponse, *domain.AppError) {
	provName, modelID := provider.ParseModelID(req.Model)
	if provName == "" {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "model must include provider prefix for thinking")
	}

	p, ok := s.registry.Get(provName)
	if !ok {
		return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("unknown provider: %s", provName))
	}

	llmReq := toLLMChatRequest(req)
	llmReq.Thinking = &llm.ThinkingConfig{Enabled: true, BudgetTokens: budgetTokens}

	if s.pipeline != nil {
		if err := s.pipeline.RunBefore(ctx, llmReq); err != nil {
			return nil, domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("pipeline rejected request: %v", err))
		}
	}

	messages := make([]provider.Message, len(llmReq.Messages))
	for i, m := range llmReq.Messages {
		messages[i] = provider.Message{Role: string(m.Role), Content: m.Content}
	}

	chatReq := provider.ChatRequest{
		Model:     modelID,
		Messages:  messages,
		Stream:    false,
		System:    llmReq.System,
		MaxTokens: func() *int { v := 8192; return &v }(),
	}

	resp, err := p.Chat(ctx, chatReq)
	if err != nil {
		if s.watcher != nil {
			s.watcher.Watch(ctx, err, provName, modelID, "")
		}
		if _, ok := err.(*provider.ErrProviderUnavailable); ok {
			return nil, domain.NewError(domain.ErrServiceUnavailable, 503, fmt.Sprintf("%s provider unavailable", provName))
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "chat with thinking failed", err)
	}

	if budgetTokens > 0 {
		resp.Content = fmt.Sprintf("<thinking budget=\"%d\">\n%s\n</thinking>", budgetTokens, resp.Content)
	}

	return resp, nil
}

func (s *ProviderService) ResolveProvider(modelID string) (string, string) {
	return provider.ParseModelID(modelID)
}

func (s *ProviderService) EstimateTokens(modelID string, messages []domain.ChatMessage) (inputTokens, outputTokens int) {
	var totalChars int
	for _, m := range messages {
		totalChars += len(m.Content)
	}
	inputTokens = provider.CountTokens(strings.Repeat("x", totalChars))
	if inputTokens == 0 {
		inputTokens = len(messages) * 50
	}
	outputTokens = inputTokens
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
	prov, _ := provider.ParseModelID(modelID)
	if prov == "" {
		return "", false
	}
	_, ok := s.registry.Get(prov)
	return prov, ok
}

func (s *ProviderService) FindModel(ctx context.Context, modelID string) (*provider.ModelInfo, *domain.AppError) {
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

// FormatSSEChunk formats a chunk as a Server-Sent Event.
func (s *ProviderService) FormatSSEChunk(content, finishReason string) string {
	data, _ := json.Marshal(map[string]interface{}{
		"choices": []map[string]interface{}{{
			"delta": map[string]string{"content": content},
			"finish_reason": finishReason,
		}},
	})
	return fmt.Sprintf("data: %s\n\n", string(data))
}

// toLLMChatRequest converts a domain.ChatRequest to pkg/llm.ChatRequest.
func toLLMChatRequest(req domain.ChatRequest) *llm.ChatRequest {
	messages := make([]llm.Message, len(req.Messages))
	for i, m := range req.Messages {
		messages[i] = llm.Message{
			Role:    llm.Role(m.Role),
			Content: m.Content,
		}
	}
	return &llm.ChatRequest{
		Model:    req.Model,
		Messages: messages,
		System:   "You are Shinmen, a distinguished PhD in Computer Science and Information Technology with over 20 years of experience.",
	}
}

// fromProviderResponse converts a provider.ChatResponse to pkg/llm.ChatResponse.
func fromProviderResponse(resp *provider.ChatResponse, modelID, provName string) *llm.ChatResponse {
	return &llm.ChatResponse{
		Model:    modelID,
		Provider: provName,
		Choices: []llm.Choice{{
			Message: llm.Message{Role: llm.RoleAssistant, Content: resp.Content},
		}},
		Usage: llm.Usage{
			PromptTokens:     resp.InputTokens,
			CompletionTokens: resp.OutputTokens,
		},
	}
}
