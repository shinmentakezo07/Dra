package provider

import (
	"context"
	"errors"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

type mockProvider struct {
	name            string
	chatResp        *llm.ChatResponse
	chatErr         error
	streamCh        <-chan llm.StreamChunk
	streamErr       error
	models          []llm.ModelInfo
	supportsThinking bool
}

func (m *mockProvider) Name() string { return m.name }
func (m *mockProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if m.chatErr != nil {
		return nil, m.chatErr
	}
	resp := m.chatResp
	if resp == nil {
		resp = &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "mock"}}}}
	}
	resp.Provider = m.name
	return resp, nil
}
func (m *mockProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	if m.streamErr != nil {
		return nil, m.streamErr
	}
	return m.streamCh, nil
}
func (m *mockProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) {
	return m.models, nil
}
func (m *mockProvider) SupportsThinking() bool { return m.supportsThinking }

func TestFallbackProvider_Name(t *testing.T) {
	fp := NewFallbackProvider("my-fallback")
	if fp.Name() != "my-fallback" {
		t.Errorf("Name() = %v, want my-fallback", fp.Name())
	}
}

func TestFallbackProvider_Chat_Success(t *testing.T) {
	p1 := &mockProvider{name: "p1", chatResp: &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "ok"}}}}}
	fp := NewFallbackProvider("fb", p1)

	resp, err := fp.Chat(context.Background(), &llm.ChatRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "ok" {
		t.Errorf("Content = %v, want ok", resp.Choices[0].Message.Content)
	}
}

func TestFallbackProvider_Chat_Fallback(t *testing.T) {
	wantErr := errors.New("primary down")
	p1 := &mockProvider{name: "p1", chatErr: wantErr}
	p2 := &mockProvider{name: "p2", chatResp: &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "fallback-ok"}}}}}
	fp := NewFallbackProvider("fb", p1, p2)

	resp, err := fp.Chat(context.Background(), &llm.ChatRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "fallback-ok" {
		t.Errorf("Content = %v, want fallback-ok", resp.Choices[0].Message.Content)
	}
}

func TestFallbackProvider_Chat_AllFail(t *testing.T) {
	p1 := &mockProvider{name: "p1", chatErr: errors.New("e1")}
	p2 := &mockProvider{name: "p2", chatErr: errors.New("e2")}
	fp := NewFallbackProvider("fb", p1, p2)

	_, err := fp.Chat(context.Background(), &llm.ChatRequest{})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestFallbackProvider_Chat_NoProviders(t *testing.T) {
	fp := NewFallbackProvider("fb")
	_, err := fp.Chat(context.Background(), &llm.ChatRequest{})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestFallbackProvider_SupportsThinking(t *testing.T) {
	p1 := &mockProvider{name: "p1", supportsThinking: false}
	p2 := &mockProvider{name: "p2", supportsThinking: true}
	fp := NewFallbackProvider("fb", p1, p2)

	if !fp.SupportsThinking() {
		t.Error("expected SupportsThinking = true")
	}

	fp2 := NewFallbackProvider("fb2", p1)
	if fp2.SupportsThinking() {
		t.Error("expected SupportsThinking = false")
	}
}

func TestFallbackProvider_WithHealthChecker(t *testing.T) {
	p1 := &mockProvider{name: "p1", chatErr: errors.New("down")}
	p2 := &mockProvider{name: "p2", chatResp: &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "ok"}}}}}
	fp := NewFallbackProvider("fb", p1, p2)

	hc := NewHealthChecker(time.Hour, time.Second)
	hc.Register("p1", func(ctx context.Context) (HealthStatus, error) {
		return HealthUnhealthy, errors.New("down")
	})
	hc.Register("p2", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})
	hc.checkProvider("p1", hc.checkers["p1"])
	hc.checkProvider("p2", hc.checkers["p2"])

	fp.WithHealthChecker(hc)

	resp, err := fp.Chat(context.Background(), &llm.ChatRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "ok" {
		t.Errorf("Content = %v, want ok", resp.Choices[0].Message.Content)
	}
}

func TestFallbackProvider_ListModels(t *testing.T) {
	p1 := &mockProvider{name: "p1", models: []llm.ModelInfo{{ID: "m1"}}}
	p2 := &mockProvider{name: "p2", models: []llm.ModelInfo{{ID: "m1"}, {ID: "m2"}}}
	fp := NewFallbackProvider("fb", p1, p2)

	models, err := fp.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(models) != 2 {
		t.Errorf("len(models) = %v, want 2", len(models))
	}
}

func TestRegistry_RegisterFallback(t *testing.T) {
	reg := NewRegistry()
	p1 := &mockProvider{name: "openai"}
	p2 := &mockProvider{name: "anthropic"}
	reg.Register(p1)
	reg.Register(p2)

	err := reg.RegisterFallback("ai-gateway", FallbackConfig{
		Primary:  "openai",
		Fallback: []string{"anthropic"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	p, ok := reg.Get("ai-gateway")
	if !ok {
		t.Fatal("expected fallback provider to be registered")
	}
	if p.Name() != "ai-gateway" {
		t.Errorf("Name = %v, want ai-gateway", p.Name())
	}
}

func TestRegistry_RegisterFallback_MissingPrimary(t *testing.T) {
	reg := NewRegistry()
	err := reg.RegisterFallback("fb", FallbackConfig{Primary: "missing"})
	if err == nil {
		t.Fatal("expected error for missing primary")
	}
}

func TestRegistry_RegisterFallback_MissingFallback(t *testing.T) {
	reg := NewRegistry()
	reg.Register(&mockProvider{name: "primary"})
	err := reg.RegisterFallback("fb", FallbackConfig{
		Primary:  "primary",
		Fallback: []string{"missing"},
	})
	if err == nil {
		t.Fatal("expected error for missing fallback")
	}
}
