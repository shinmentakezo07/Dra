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
