package provider

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

func TestRoundRobinBalancer_Next(t *testing.T) {
	p1 := &mockProvider{name: "p1"}
	p2 := &mockProvider{name: "p2"}
	p3 := &mockProvider{name: "p3"}

	b := NewRoundRobinBalancer(p1, p2, p3)

	if b.Next().Name() != "p1" {
		t.Error("expected p1")
	}
	if b.Next().Name() != "p2" {
		t.Error("expected p2")
	}
	if b.Next().Name() != "p3" {
		t.Error("expected p3")
	}
	if b.Next().Name() != "p1" {
		t.Error("expected p1 again")
	}
}

func TestRoundRobinBalancer_Empty(t *testing.T) {
	b := NewRoundRobinBalancer()
	if b.Next() != nil {
		t.Error("expected nil for empty balancer")
	}
}

func TestRoundRobinBalancer_All(t *testing.T) {
	p1 := &mockProvider{name: "p1"}
	b := NewRoundRobinBalancer(p1)
	all := b.All()
	if len(all) != 1 || all[0].Name() != "p1" {
		t.Errorf("All() = %v, want [p1]", all)
	}
}

func TestWeightedRoundRobinBalancer_Next(t *testing.T) {
	p1 := &mockProvider{name: "p1"}
	p2 := &mockProvider{name: "p2"}

	b := NewWeightedRoundRobinBalancer(
		WeightedProvider{Provider: p1, Weight: 2},
		WeightedProvider{Provider: p2, Weight: 1},
	)

	// With weights 2:1, sequence should be p1, p1, p2, p1, p1, p2, ...
	sequence := make([]string, 6)
	for i := range sequence {
		sequence[i] = b.Next().Name()
	}

	expected := []string{"p1", "p1", "p2", "p1", "p1", "p2"}
	for i, exp := range expected {
		if sequence[i] != exp {
			t.Errorf("sequence[%d] = %v, want %v", i, sequence[i], exp)
		}
	}
}

func TestWeightedRoundRobinBalancer_ZeroWeight(t *testing.T) {
	p1 := &mockProvider{name: "p1"}
	b := NewWeightedRoundRobinBalancer(
		WeightedProvider{Provider: p1, Weight: 0},
	)
	if b.Next().Name() != "p1" {
		t.Error("expected p1 with default weight 1")
	}
}

func TestBalancedProvider_Name(t *testing.T) {
	p1 := &mockProvider{name: "p1"}
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer(p1))
	if bp.Name() != "pool" {
		t.Errorf("Name() = %v, want pool", bp.Name())
	}
}

func TestBalancedProvider_SupportsThinking(t *testing.T) {
	p1 := &mockProvider{name: "p1", supportsThinking: false}
	p2 := &mockProvider{name: "p2", supportsThinking: true}
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer(p1, p2))
	if !bp.SupportsThinking() {
		t.Error("expected SupportsThinking = true")
	}
}

func TestBalancedProvider_Chat(t *testing.T) {
	p1 := &mockProvider{name: "p1", chatResp: &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "balanced"}}}}}
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer(p1))

	resp, err := bp.Chat(context.Background(), &llm.ChatRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Provider != "pool" {
		t.Errorf("Provider = %v, want pool", resp.Provider)
	}
}

func TestBalancedProvider_Chat_NoHealthy(t *testing.T) {
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer())
	_, err := bp.Chat(context.Background(), &llm.ChatRequest{})
	if err == nil {
		t.Fatal("expected error for empty balancer")
	}
}

func TestBalancedProvider_ListModels(t *testing.T) {
	p1 := &mockProvider{name: "p1", models: []llm.ModelInfo{{ID: "m1"}}}
	p2 := &mockProvider{name: "p2", models: []llm.ModelInfo{{ID: "m1"}, {ID: "m2"}}}
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer(p1, p2))

	models, err := bp.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(models) != 2 {
		t.Errorf("len(models) = %v, want 2", len(models))
	}
}

func TestBalancedProvider_WithHealthChecker(t *testing.T) {
	p1 := &mockProvider{name: "p1", chatErr: context.Canceled}
	p2 := &mockProvider{name: "p2", chatResp: &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "ok"}}}}}
	bp := NewBalancedProvider("pool", NewRoundRobinBalancer(p1, p2))

	hc := NewHealthChecker(time.Hour, time.Second)
	hc.Register("p1", func(ctx context.Context) (HealthStatus, error) {
		return HealthUnhealthy, context.Canceled
	})
	hc.Register("p2", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})
	hc.checkProvider("p1", hc.checkers["p1"])
	hc.checkProvider("p2", hc.checkers["p2"])

	bp.WithHealthChecker(hc)

	resp, err := bp.Chat(context.Background(), &llm.ChatRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "ok" {
		t.Errorf("Content = %v, want ok", resp.Choices[0].Message.Content)
	}
}
