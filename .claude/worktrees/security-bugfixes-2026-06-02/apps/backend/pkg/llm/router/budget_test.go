package router

import (
	"context"
	"testing"

	"dra-platform/backend/pkg/llm"
	llmprovider "dra-platform/backend/pkg/llm/provider"
)

func TestBudgetRouter_FindAffordableModel(t *testing.T) {
	registry := llmprovider.NewRegistry()
	p := &mockProvider{
		name: "test",
		models: []llm.ModelInfo{
			{ID: "expensive", Provider: "test", InputPricePer1k: 10.0, OutputPricePer1k: 10.0, SupportsTools: true, SupportsVision: true},
			{ID: "mid", Provider: "test", InputPricePer1k: 5.0, OutputPricePer1k: 5.0, SupportsTools: true},
			{ID: "cheap", Provider: "test", InputPricePer1k: 1.0, OutputPricePer1k: 1.0, SupportsTools: true},
			{ID: "cheap-both", Provider: "test", InputPricePer1k: 2.0, OutputPricePer1k: 2.0, SupportsTools: true, SupportsVision: true},
			{ID: "vision-only", Provider: "test", InputPricePer1k: 2.0, OutputPricePer1k: 2.0, SupportsVision: true},
		},
	}
	registry.Register(p)

	br := NewBudgetRouter(registry)
	ctx := context.Background()

	t.Run("returns same model when affordable", func(t *testing.T) {
		model, routed := br.FindAffordableModel(ctx, "test/expensive", 100000, 100, 100)
		if routed {
			t.Fatalf("expected no routing, got %s", model)
		}
		if model != "test/expensive" {
			t.Fatalf("expected test/expensive, got %s", model)
		}
	})

	t.Run("downgrades to cheaper model when unaffordable", func(t *testing.T) {
		model, routed := br.FindAffordableModel(ctx, "test/expensive", 0, 100, 100)
		if !routed {
			t.Fatal("expected routing to cheaper model")
		}
		if model != "test/cheap-both" {
			t.Fatalf("expected test/cheap-both, got %s", model)
		}
	})

	t.Run("preserves vision capability", func(t *testing.T) {
		model, routed := br.FindAffordableModel(ctx, "test/expensive", 0, 100, 100)
		if !routed {
			t.Fatal("expected routing")
		}
		if model == "test/cheap" {
			t.Fatal("expected vision-capable model, got cheap which lacks vision")
		}
	})

	t.Run("preserves tool capability", func(t *testing.T) {
		model, routed := br.FindAffordableModel(ctx, "test/mid", 0, 100, 100)
		if !routed {
			t.Fatal("expected routing")
		}
		if model == "test/vision-only" {
			t.Fatal("expected tool-capable model, got vision-only which lacks tools")
		}
	})
}

type mockProvider struct {
	name   string
	models []llm.ModelInfo
}

func (m *mockProvider) Name() string { return m.name }
func (m *mockProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return nil, nil
}
func (m *mockProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	return nil, nil
}
func (m *mockProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) { return m.models, nil }
func (m *mockProvider) SupportsThinking() bool                                  { return false }
