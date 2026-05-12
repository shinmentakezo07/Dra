package pipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

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

// StandardPipeline returns a pipeline with common steps.
func StandardPipeline() *Pipeline {
	p := New()
	p.AddBefore(&ValidationStep{})
	p.AddBefore(&TokenCheckStep{})
	p.AddBefore(&SanitizationStep{})
	p.AddAfter(&LoggingStep{})
	p.AddAfter(&MetricsStep{})
	return p
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

// TokenCheckStep checks if the request fits within context window.
type TokenCheckStep struct {
	GetContextWindow func(model string) int
}

func (s *TokenCheckStep) Name() string { return "token_check" }

func (s *TokenCheckStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	if s.GetContextWindow == nil {
		return nil
	}
	window := s.GetContextWindow(req.Model)
	if window == 0 {
		return nil
	}
	if !llm.IsWithinContextWindow(req, window) {
		return fmt.Errorf("request estimated at %d tokens exceeds context window of %d",
			llm.EstimateRequestTokens(req), window)
	}
	return nil
}

func (s *TokenCheckStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
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
	Logger *log.Logger
}

func (s *LoggingStep) Name() string { return "logging" }

func (s *LoggingStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *LoggingStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	logger := s.Logger
	if logger == nil {
		logger = log.Default()
	}

	logger.Printf("[LLM] model=%s provider=%s tokens=%+v finish=%s",
		req.Model,
		resp.Provider,
		resp.Usage,
		resp.FinishReason,
	)
	return nil
}

// MetricsStep records usage metrics.
type MetricsStep struct {
	OnMetrics func(model, provider string, usage llm.Usage, latency time.Duration)
}

func (s *MetricsStep) Name() string { return "metrics" }

func (s *MetricsStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *MetricsStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	if s.OnMetrics != nil {
		s.OnMetrics(req.Model, resp.Provider, resp.Usage, 0)
	}
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

// FormatStep formats responses according to configured output format.
type FormatStep struct{}

func (s *FormatStep) Name() string { return "format" }

func (s *FormatStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *FormatStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	if req.ResponseFormat == nil || req.ResponseFormat.Type != "json_object" {
		return nil
	}
	// Validate JSON output
	if len(resp.Choices) > 0 {
		content := resp.Choices[0].Message.Content
		var dummy interface{}
		if err := json.Unmarshal([]byte(content), &dummy); err != nil {
			// Wrap invalid JSON in a JSON structure
			resp.Choices[0].Message.Content = fmt.Sprintf(`{"content": %q}`, content)
		}
	}
	return nil
}

// StreamingAdapterStep adapts responses for streaming consumers.
type StreamingAdapterStep struct {
	Format string // "openai", "anthropic", "unified"
}

func (s *StreamingAdapterStep) Name() string { return "streaming_adapter" }

func (s *StreamingAdapterStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *StreamingAdapterStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// CostTrackingStep tracks costs.
type CostTrackingStep struct {
	GetPrices func(model string) (inputPrice, outputPrice float64)
	OnCost    func(model string, cost float64, usage llm.Usage)
}

func (s *CostTrackingStep) Name() string { return "cost_tracking" }

func (s *CostTrackingStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *CostTrackingStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	if s.GetPrices == nil || s.OnCost == nil {
		return nil
	}
	inputPrice, outputPrice := s.GetPrices(req.Model)
	if inputPrice > 0 || outputPrice > 0 {
		cost := llm.Cost(resp.Usage.PromptTokens, resp.Usage.CompletionTokens, inputPrice, outputPrice)
		s.OnCost(req.Model, cost, resp.Usage)
	}
	return nil
}

// RateLimitStep enforces rate limits.
type RateLimitStep struct {
	CheckLimit func(ctx context.Context, key string) (allowed bool, remaining int, resetAt time.Time, err error)
	KeyFunc    func(req *llm.ChatRequest) string
}

func (s *RateLimitStep) Name() string { return "rate_limit" }

func (s *RateLimitStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	if s.CheckLimit == nil {
		return nil
	}
	key := "global"
	if s.KeyFunc != nil {
		key = s.KeyFunc(req)
	}
	allowed, _, _, err := s.CheckLimit(ctx, key)
	if err != nil {
		return fmt.Errorf("rate limit check failed: %w", err)
	}
	if !allowed {
		return fmt.Errorf("rate limit exceeded")
	}
	return nil
}

func (s *RateLimitStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// TruncationStep truncates messages if they exceed token budget.
type TruncationStep struct {
	MaxTokens int
}

func (s *TruncationStep) Name() string { return "truncation" }

func (s *TruncationStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	if s.MaxTokens <= 0 {
		return nil
	}
	req.Messages = llm.TruncateMessages(req.Messages, s.MaxTokens)
	return nil
}

func (s *TruncationStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	return nil
}

// AuditStep logs detailed audit information.
type AuditStep struct {
	OnAudit func(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse, err error)
}

func (s *AuditStep) Name() string { return "audit" }

func (s *AuditStep) Before(ctx context.Context, req *llm.ChatRequest) error {
	return nil
}

func (s *AuditStep) After(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) error {
	if s.OnAudit != nil {
		s.OnAudit(ctx, req, resp, nil)
	}
	return nil
}

// Helper function to build pipeline with custom steps
func BuildPipeline(steps ...Step) *Pipeline {
	p := New()
	for _, step := range steps {
		if step != nil {
			p.AddBefore(step)
			p.AddAfter(step)
		}
	}
	return p
}

// ChainPipelines chains multiple pipelines together.
func ChainPipelines(pipelines ...*Pipeline) *Pipeline {
	combined := New()
	for _, p := range pipelines {
		if p != nil {
			for _, step := range p.before {
				combined.AddBefore(step)
			}
			for _, step := range p.after {
				combined.AddAfter(step)
			}
		}
	}
	return combined
}
