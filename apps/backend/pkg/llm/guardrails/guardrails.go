package guardrails

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Guard applies security and safety checks to requests and responses.
type Guard struct {
	enabled         bool
	blockedPatterns []*regexp.Regexp
	piiPatterns     []*regexp.Regexp
	promptInjection []string
	maxPromptLength int
	mu              sync.RWMutex
}

// Option configures a Guard.
type Option func(*Guard)

// WithBlockedPatterns sets regex patterns for blocked content.
func WithBlockedPatterns(patterns []string) Option {
	return func(g *Guard) {
		for _, p := range patterns {
			if re, err := regexp.Compile(p); err == nil {
				g.blockedPatterns = append(g.blockedPatterns, re)
			}
		}
	}
}

// WithPIIPatterns sets regex patterns for PII detection.
func WithPIIPatterns(patterns []string) Option {
	return func(g *Guard) {
		for _, p := range patterns {
			if re, err := regexp.Compile(p); err == nil {
				g.piiPatterns = append(g.piiPatterns, re)
			}
		}
	}
	}

// WithMaxPromptLength sets maximum prompt length.
func WithMaxPromptLength(max int) Option {
	return func(g *Guard) {
		g.maxPromptLength = max
	}
}

// New creates a new guard with default settings.
func New(opts ...Option) *Guard {
	g := &Guard{
		enabled:         true,
		maxPromptLength: 100000,
		promptInjection: []string{
			"ignore previous instructions",
			"ignore all prior instructions",
			"disregard previous",
			"you are now",
			"new instructions:",
			"system override",
			"DAN mode",
			"jailbreak",
			"ignore the above",
			"do not follow",
		},
	}

	// Default blocked patterns
	g.blockedPatterns = append(g.blockedPatterns,
		regexp.MustCompile(`(?i)\b(attack|kill|murder|bomb|terrorist)\b`),
	)

	// Default PII patterns
	g.piiPatterns = append(g.piiPatterns,
		regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`),                          // SSN
		regexp.MustCompile(`\b(?:\d[ -]*?){13,16}\b`),                        // Credit card
		regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`), // Email
	)

	for _, opt := range opts {
		opt(g)
	}
	return g
}

// SetEnabled enables or disables the guard.
func (g *Guard) SetEnabled(v bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.enabled = v
}

// CheckResult is the result of a guard check.
type CheckResult struct {
	Allowed       bool     `json:"allowed"`
	Reason        string   `json:"reason,omitempty"`
	Violations    []string `json:"violations,omitempty"`
	PIIDetected   bool     `json:"pii_detected"`
	PIIMasked     string   `json:"pii_masked,omitempty"`
	InjectionRisk float64  `json:"injection_risk"`
}

// CheckRequest validates a chat request against guardrails.
func (g *Guard) CheckRequest(ctx context.Context, req *llm.ChatRequest) (*CheckResult, error) {
	g.mu.RLock()
	enabled := g.enabled
	g.mu.RUnlock()

	if !enabled {
		return &CheckResult{Allowed: true}, nil
	}

	result := &CheckResult{Allowed: true, Violations: []string{}}

	// Check prompt length
	var totalLength int
	for _, m := range req.Messages {
		totalLength += len(m.Content)
	}
	if g.maxPromptLength > 0 && totalLength > g.maxPromptLength {
		result.Allowed = false
		result.Reason = fmt.Sprintf("prompt exceeds maximum length of %d characters", g.maxPromptLength)
		return result, nil
	}

	// Check each message for violations
	for i, m := range req.Messages {
		content := m.Content
		if content == "" && len(m.ContentBlocks) > 0 {
			content = llm.MergeContentBlocks(m.ContentBlocks)
		}

		// Blocked content patterns
		for _, re := range g.blockedPatterns {
			if re.MatchString(content) {
				result.Allowed = false
				result.Violations = append(result.Violations, fmt.Sprintf("message %d: blocked content pattern matched", i))
			}
		}

		// Prompt injection detection
		if risk := g.detectInjection(content); risk > 0.5 {
			result.InjectionRisk = risk
			result.Violations = append(result.Violations, fmt.Sprintf("message %d: potential prompt injection detected (risk: %.2f)", i, risk))
			if risk > 0.8 {
				result.Allowed = false
			}
		}
	}

	if len(result.Violations) > 0 && result.Reason == "" {
		result.Reason = strings.Join(result.Violations, "; ")
	}

	return result, nil
}

// CheckResponse validates a response against output guardrails.
func (g *Guard) CheckResponse(ctx context.Context, resp *llm.ChatResponse) (*CheckResult, error) {
	g.mu.RLock()
	enabled := g.enabled
	g.mu.RUnlock()

	if !enabled {
		return &CheckResult{Allowed: true}, nil
	}

	result := &CheckResult{Allowed: true, Violations: []string{}}

	for i, c := range resp.Choices {
		content := c.Message.Content
		if content == "" && len(c.Message.ContentBlocks) > 0 {
			content = llm.MergeContentBlocks(c.Message.ContentBlocks)
		}

		// PII detection in output
		for _, re := range g.piiPatterns {
			if re.MatchString(content) {
				result.PIIDetected = true
				result.Violations = append(result.Violations, fmt.Sprintf("choice %d: PII detected in output", i))
			}
		}
	}

	return result, nil
}

// MaskPII replaces PII patterns with placeholders.
func (g *Guard) MaskPII(text string) string {
	g.mu.RLock()
	patterns := make([]*regexp.Regexp, len(g.piiPatterns))
	copy(patterns, g.piiPatterns)
	g.mu.RUnlock()

	for i, re := range patterns {
		text = re.ReplaceAllString(text, fmt.Sprintf("[REDACTED-%d]", i))
	}
	return text
}

func (g *Guard) detectInjection(text string) float64 {
	lower := strings.ToLower(text)
	var matches int
	for _, phrase := range g.promptInjection {
		if strings.Contains(lower, phrase) {
			matches++
		}
	}
	if matches == 0 {
		return 0
	}
	// Risk score based on number of injection phrases found
	risk := float64(matches) / float64(len(g.promptInjection))
	if risk > 1 {
		risk = 1
	}
	return risk
}

// SandboxProvider returns mock responses without calling real providers.
type SandboxProvider struct {
	name string
}

// NewSandboxProvider creates a sandbox provider.
func NewSandboxProvider(name string) *SandboxProvider {
	return &SandboxProvider{name: name}
}

// Name returns the provider name.
func (s *SandboxProvider) Name() string { return s.name }

// SupportsThinking returns false.
func (s *SandboxProvider) SupportsThinking() bool { return false }

// Chat returns a mock response.
func (s *SandboxProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return &llm.ChatResponse{
		ID:      "sandbox-chat-" + generateSandboxID(),
		Object:  "chat.completion",
		Created: 0,
		Model:   req.Model,
		Provider: s.name,
		Choices: []llm.Choice{{
			Index: 0,
			Message: llm.Message{
				Role:    llm.RoleAssistant,
				Content: "[SANDBOX MODE] This is a mock response. No actual LLM provider was called.",
			},
			FinishReason: llm.FinishReasonStop,
		}},
		Usage: llm.Usage{
			PromptTokens:     llm.EstimateRequestTokens(req),
			CompletionTokens: 20,
			TotalTokens:      llm.EstimateRequestTokens(req) + 20,
		},
	}, nil
}

// ChatStream returns a mock stream.
func (s *SandboxProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk, 4)
	go func() {
		defer close(ch)
		words := []string{"[SANDBOX", "MODE]", "This", "is", "a", "mock", "streaming", "response."}
		for i, word := range words {
			select {
			case ch <- llm.StreamChunk{
				ID:      "sandbox-chunk-" + generateSandboxID(),
				Object:  "chat.completion.chunk",
				Created: 0,
				Model:   req.Model,
				Index:   i,
				Delta:   llm.Message{Role: llm.RoleAssistant, Content: word + " "},
			}:
			case <-ctx.Done():
				return
			}
		}
		fr := llm.FinishReasonStop
		ch <- llm.StreamChunk{
			ID:           "sandbox-chunk-" + generateSandboxID(),
			Object:       "chat.completion.chunk",
			Created:      0,
			Model:        req.Model,
			Index:        len(words),
			Delta:        llm.Message{},
			FinishReason: &fr,
		}
	}()
	return ch, nil
}

// ListModels returns empty list.
func (s *SandboxProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return []llm.ModelInfo{}, nil
}

var sandboxCounter uint64

func generateSandboxID() string {
	return fmt.Sprintf("sandbox-%d-%d", time.Now().UnixNano(), atomic.AddUint64(&sandboxCounter, 1))
}
