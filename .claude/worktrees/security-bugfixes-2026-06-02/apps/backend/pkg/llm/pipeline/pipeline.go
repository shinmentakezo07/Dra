package pipeline

import (
	"context"
	"fmt"
	"log/slog"

	"dra-platform/backend/pkg/llm"
)

// Step represents a single pipeline step.
type Step interface {
	Name() string
	Before(ctx context.Context, req *llm.ChatRequest) error
	After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error
}

// Pipeline orchestrates request/response processing.
type Pipeline struct {
	before []Step
	after  []Step
}

// New creates a new pipeline.
func New() *Pipeline {
	return &Pipeline{}
}

// AddBefore adds a pre-processing step.
func (p *Pipeline) AddBefore(step Step) {
	p.before = append(p.before, step)
}

// AddAfter adds a post-processing step.
func (p *Pipeline) AddAfter(step Step) {
	p.after = append(p.after, step)
}

// RunBefore runs all pre-processing steps.
func (p *Pipeline) RunBefore(ctx context.Context, req *llm.ChatRequest) error {
	for _, step := range p.before {
		if err := step.Before(ctx, req); err != nil {
			return fmt.Errorf("pipeline step %s: %w", step.Name(), err)
		}
	}
	return nil
}

// RunAfter runs all post-processing steps.
func (p *Pipeline) RunAfter(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	for _, step := range p.after {
		if err := step.After(ctx, req, resp); err != nil {
			return fmt.Errorf("pipeline step %s: %w", step.Name(), err)
		}
	}
	return nil
}

// ValidationStep validates incoming requests.
type ValidationStep struct{}

func (s *ValidationStep) Name() string { return "validation" }

func (s *ValidationStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return llm.ValidateRequest(req)
}

func (s *ValidationStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// SanitizationStep sanitizes message content.
type SanitizationStep struct{}

func (s *SanitizationStep) Name() string { return "sanitization" }

func (s *SanitizationStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	for i := range req.Messages {
		req.Messages[i].Content = llm.SanitizeContent(req.Messages[i].Content)
	}
	req.System = llm.SanitizeContent(req.System)
	return nil
}

func (s *SanitizationStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// LoggingStep logs request/response metadata.
type LoggingStep struct {
	Logger *slog.Logger
}

func (s *LoggingStep) Name() string { return "logging" }

func (s *LoggingStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *LoggingStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	log := s.Logger
	if log == nil {
		log = slog.Default()
	}

	log.Info("[LLM]",
		"model", req.Model,
		"provider", resp.Provider,
		"tokens", resp.Usage,
		"finish", resp.FinishReason,
	)
	return nil
}

// ThinkingStep handles thinking/reasoning configuration.
type ThinkingStep struct{}

func (s *ThinkingStep) Name() string { return "thinking" }

func (s *ThinkingStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	if req.Thinking != nil && req.Thinking.Enabled {
		if !llm.IsThinkingModel(req.Model) {
			// Disable thinking for models that don't support it
			req.Thinking.Enabled = false
			return nil
		}
		// Set default budget if not specified
		if req.Thinking.BudgetTokens == 0 {
			req.Thinking.BudgetTokens = 4096
		}
		// Cap budget at reasonable limit
		if req.Thinking.BudgetTokens > 32000 {
			req.Thinking.BudgetTokens = 32000
		}
	}
	return nil
}

func (s *ThinkingStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// ToolStep handles tool configuration.
type ToolStep struct{}

func (s *ToolStep) Name() string { return "tools" }

func (s *ToolStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	if len(req.Tools) > 0 && !llm.IsToolModel(req.Model) {
		return fmt.Errorf("model %s does not support tool calls", req.Model)
	}
	return nil
}

func (s *ToolStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// --- Middleware Chain & Interceptors (CLIProxyAPI-inspired) ---

// RequestInterceptor inspects/modifies requests before provider execution.
type RequestInterceptor interface {
	Name() string
	Intercept(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error)
}

// ResponseInterceptor inspects/modifies responses after provider execution.
type ResponseInterceptor interface {
	Name() string
	Intercept(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) (*llm.ChatResponse, error)
}

// ChainPipeline extends Pipeline with middleware chain and interceptors.
type ChainPipeline struct {
	*Pipeline
	interceptors       []RequestInterceptor
	responseInterceptors []ResponseInterceptor
}

// NewChain creates a new chain pipeline with middleware support.
func NewChain() *ChainPipeline {
	return &ChainPipeline{
		Pipeline: New(),
	}
}

// AddRequestInterceptor adds a request interceptor to the chain.
func (cp *ChainPipeline) AddRequestInterceptor(i RequestInterceptor) {
	cp.interceptors = append(cp.interceptors, i)
}

// AddResponseInterceptor adds a response interceptor to the chain.
func (cp *ChainPipeline) AddResponseInterceptor(i ResponseInterceptor) {
	cp.responseInterceptors = append(cp.responseInterceptors, i)
}

// RunRequestInterceptors runs all request interceptors in order.
func (cp *ChainPipeline) RunRequestInterceptors(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error) {
	var err error
	for _, interceptor := range cp.interceptors {
		req, err = interceptor.Intercept(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("interceptor %s: %w", interceptor.Name(), err)
		}
	}
	return req, nil
}

// RunResponseInterceptors runs all response interceptors in order.
func (cp *ChainPipeline) RunResponseInterceptors(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) (*llm.ChatResponse, error) {
	var err error
	for _, interceptor := range cp.responseInterceptors {
		resp, err = interceptor.Intercept(ctx, req, resp)
		if err != nil {
			return nil, fmt.Errorf("response interceptor %s: %w", interceptor.Name(), err)
		}
	}
	return resp, nil
}

// Execute runs the full pipeline: before steps -> request interceptors -> handler -> response interceptors -> after steps.
func (cp *ChainPipeline) Execute(ctx context.Context, req *llm.ChatRequest, handler func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)) (*llm.ChatResponse, error) {
	// 1. Pre-processing steps
	if err := cp.RunBefore(ctx, req); err != nil {
		return nil, err
	}

	// 2. Request interceptors
	req, err := cp.RunRequestInterceptors(ctx, req)
	if err != nil {
		return nil, err
	}

	// 3. Execute handler
	resp, err := handler(ctx, req)
	if err != nil {
		return nil, err
	}

	// 4. Response interceptors
	resp, err = cp.RunResponseInterceptors(ctx, req, resp)
	if err != nil {
		return nil, err
	}

	// 5. Post-processing steps
	if err := cp.RunAfter(ctx, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}

// --- Built-in Interceptors ---

// ModelValidationInterceptor validates that the requested model is available.
type ModelValidationInterceptor struct {
	IsAvailable func(model string) bool
}

func (i *ModelValidationInterceptor) Name() string { return "model_validation" }

func (i *ModelValidationInterceptor) Intercept(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error) {
	if i.IsAvailable != nil && !i.IsAvailable(req.Model) {
		return nil, fmt.Errorf("model %s is not available", req.Model)
	}
	return req, nil
}

// RateLimitInterceptor enforces rate limiting per model or user.
type RateLimitInterceptor struct {
	CheckLimit func(model, userID string) error
}

func (i *RateLimitInterceptor) Name() string { return "rate_limit" }

func (i *RateLimitInterceptor) Intercept(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error) {
	if i.CheckLimit != nil {
		userID := ""
		if req.Metadata != nil {
			userID = req.Metadata["user_id"]
		}
		if err := i.CheckLimit(req.Model, userID); err != nil {
			return nil, err
		}
	}
	return req, nil
}

// GuardrailInterceptor applies input guardrails.
type GuardrailInterceptor struct {
	Check func(req *llm.ChatRequest) error
}

func (i *GuardrailInterceptor) Name() string { return "guardrail" }

func (i *GuardrailInterceptor) Intercept(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error) {
	if i.Check != nil {
		if err := i.Check(req); err != nil {
			return nil, err
		}
	}
	return req, nil
}

// TelemetryInterceptor records request metrics.
type TelemetryInterceptor struct {
	Record func(model, provider string, usage llm.Usage, duration int64)
}

func (i *TelemetryInterceptor) Name() string { return "telemetry" }

func (i *TelemetryInterceptor) Intercept(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) (*llm.ChatResponse, error) {
	if i.Record != nil {
		i.Record(req.Model, resp.Provider, resp.Usage, 0)
	}
	return resp, nil
}
