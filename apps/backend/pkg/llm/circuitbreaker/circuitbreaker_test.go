package circuitbreaker

import (
	"context"
	"fmt"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/guardrails"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.FailureThreshold != 5 {
		t.Errorf("FailureThreshold = %d, want 5", cfg.FailureThreshold)
	}
	if cfg.SuccessThreshold != 2 {
		t.Errorf("SuccessThreshold = %d, want 2", cfg.SuccessThreshold)
	}
	if cfg.Timeout != 30*time.Second {
		t.Errorf("Timeout = %v, want 30s", cfg.Timeout)
	}
	if cfg.HalfOpenMaxCalls != 3 {
		t.Errorf("HalfOpenMaxCalls = %d, want 3", cfg.HalfOpenMaxCalls)
	}
}

func TestNew_InitialState(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cb := New(provider, DefaultConfig())

	if cb.State() != StateClosed {
		t.Errorf("initial state = %v, want %v", cb.State(), StateClosed)
	}
	if cb.Name() != "test" {
		t.Errorf("Name() = %q, want %q", cb.Name(), "test")
	}
	if cb.SupportsThinking() {
		t.Error("SupportsThinking() = true, want false for SandboxProvider")
	}
}

func TestState_String(t *testing.T) {
	tests := []struct {
		state State
		want  string
	}{
		{StateClosed, "closed"},
		{StateOpen, "open"},
		{StateHalfOpen, "half-open"},
		{State(99), "unknown"},
	}
	for _, tt := range tests {
		if got := tt.state.String(); got != tt.want {
			t.Errorf("State(%d).String() = %q, want %q", tt.state, got, tt.want)
		}
	}
}

func TestChat_ClosedState(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cb := New(provider, DefaultConfig())

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "hello"}},
	}

	resp, err := cb.Chat(context.Background(), req)
	if err != nil {
		t.Fatalf("Chat() error = %v", err)
	}
	if resp == nil {
		t.Fatal("Chat() returned nil response")
	}
	if resp.Model != "gpt-4o" {
		t.Errorf("resp.Model = %q, want %q", resp.Model, "gpt-4o")
	}
}

func TestChatStream_ClosedState(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cb := New(provider, DefaultConfig())

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "hello"}},
	}

	ch, err := cb.ChatStream(context.Background(), req)
	if err != nil {
		t.Fatalf("ChatStream() error = %v", err)
	}
	if ch == nil {
		t.Fatal("ChatStream() returned nil channel")
	}

	var chunks int
	for range ch {
		chunks++
	}
	if chunks == 0 {
		t.Error("ChatStream() returned no chunks")
	}
}

func TestCircuitBreaker_OpenAfterFailures(t *testing.T) {
	provider := &failingProvider{}
	cfg := Config{
		FailureThreshold: 3,
		SuccessThreshold: 2,
		Timeout:          100 * time.Millisecond,
		HalfOpenMaxCalls: 3,
	}
	cb := New(provider, cfg)

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}

	for i := 0; i < 3; i++ {
		_, err := cb.Chat(context.Background(), req)
		if err == nil {
			t.Fatalf("Chat() iteration %d: expected error, got nil", i)
		}
	}

	if cb.State() != StateOpen {
		t.Errorf("state = %v, want %v after 3 failures", cb.State(), StateOpen)
	}

	_, err := cb.Chat(context.Background(), req)
	if err == nil {
		t.Fatal("Chat() on open circuit: expected error, got nil")
	}
}

func TestCircuitBreaker_RecoveryAfterTimeout(t *testing.T) {
	failCount := 2
	prov := &counterFailProvider{maxFails: &failCount}
	cfg := Config{
		FailureThreshold: 2,
		SuccessThreshold: 1,
		Timeout:          50 * time.Millisecond,
		HalfOpenMaxCalls: 3,
	}
	cb := New(prov, cfg)

	req := &llm.ChatRequest{
		Model:    "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}

	for i := 0; i < 2; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	if cb.State() != StateOpen {
		t.Fatalf("state = %v, want %v", cb.State(), StateOpen)
	}

	time.Sleep(60 * time.Millisecond)

	if cb.State() != StateOpen {
		t.Errorf("state after timeout (before call) = %v, want %v", cb.State(), StateOpen)
	}

	_, err := cb.Chat(context.Background(), req)
	if err != nil {
		t.Fatalf("Chat() after timeout: unexpected error = %v", err)
	}

	if cb.State() != StateClosed {
		t.Errorf("state after recovery = %v, want %v", cb.State(), StateClosed)
	}
}

type counterFailProvider struct {
	maxFails *int
}

func (f *counterFailProvider) Name() string                          { return "counter-fail" }
func (f *counterFailProvider) SupportsThinking() bool                { return false }
func (f *counterFailProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if f.maxFails != nil && *f.maxFails > 0 {
		*f.maxFails--
		return nil, fmt.Errorf("provider error")
	}
	return &llm.ChatResponse{
		ID:      "ok", Object: "chat.completion", Created: 0, Model: req.Model,
		Choices: []llm.Choice{{Index: 0, Message: llm.Message{Role: llm.RoleAssistant, Content: "ok"}, FinishReason: llm.FinishReasonStop}},
	}, nil
}
func (f *counterFailProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk)
	close(ch)
	return ch, nil
}
func (f *counterFailProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return nil, nil
}

func TestCircuitBreaker_HalfOpenLimitsCalls(t *testing.T) {
	provider := &failingProvider{}
	cfg := Config{
		FailureThreshold: 2,
		SuccessThreshold: 1,
		Timeout:          10 * time.Millisecond,
		HalfOpenMaxCalls: 2,
	}
	cb := New(provider, cfg)

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}

	for i := 0; i < 2; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	time.Sleep(20 * time.Millisecond)

	for i := 0; i < 2; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	_, err := cb.Chat(context.Background(), req)
	if err == nil {
		t.Fatal("Chat() after half-open limit: expected error, got nil")
	}
}

func TestCircuitBreaker_ClosesOnSuccess(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cfg := Config{
		FailureThreshold: 2,
		SuccessThreshold: 1,
		Timeout:          30 * time.Second,
		HalfOpenMaxCalls: 3,
	}
	cb := New(provider, cfg)

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}

	for i := 0; i < 2; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	time.Sleep(40 * time.Millisecond)

	_, err := cb.Chat(context.Background(), req)
	if err != nil {
		t.Fatalf("Chat() error = %v", err)
	}

	if cb.State() != StateClosed {
		t.Errorf("state = %v, want %v after success in half-open", cb.State(), StateClosed)
	}
}

func TestCircuitBreaker_ResetsFailuresOnSuccess(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cfg := Config{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		Timeout:          30 * time.Second,
		HalfOpenMaxCalls: 3,
	}
	cb := New(provider, cfg)

	req := &llm.ChatRequest{
		Model: "gpt-4o",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}

	for i := 0; i < 4; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	if cb.State() != StateClosed {
		t.Fatalf("state = %v, want %v", cb.State(), StateClosed)
	}

	for i := 0; i < 5; i++ {
		_, _ = cb.Chat(context.Background(), req)
	}

	if cb.State() != StateClosed {
		t.Errorf("state = %v, want %v after successes reset failures", cb.State(), StateClosed)
	}
}

func TestListModels(t *testing.T) {
	provider := guardrails.NewSandboxProvider("test")
	cb := New(provider, DefaultConfig())

	models, err := cb.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels() error = %v", err)
	}
	if models == nil {
		t.Error("ListModels() returned nil")
	}
}

type failingProvider struct{}

func (f *failingProvider) Name() string                          { return "failing" }
func (f *failingProvider) SupportsThinking() bool                { return false }
func (f *failingProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return nil, fmt.Errorf("provider error")
}
func (f *failingProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	return nil, fmt.Errorf("provider error")
}
func (f *failingProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return nil, nil
}
