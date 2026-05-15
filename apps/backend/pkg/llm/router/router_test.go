package router

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

type testProvider struct {
	name             string
	models           []llm.ModelInfo
	thinking         bool
}

func (m *testProvider) Name() string { return m.name }
func (m *testProvider) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return &llm.ChatResponse{Model: req.Model, Provider: m.name}, nil
}
func (m *testProvider) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk)
	close(ch)
	return ch, nil
}
func (m *testProvider) ListModels(ctx context.Context) ([]llm.ModelInfo, error) { return m.models, nil }
func (m *testProvider) SupportsThinking() bool { return m.thinking }

func TestNewRouter(t *testing.T) {
	r := New(StrategyCost)
	if r == nil {
		t.Fatal("nil router")
	}
}

func TestRouter_NoProviders(t *testing.T) {
	r := New(StrategyCost)
	_, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err == nil {
		t.Fatal("expected error with no providers")
	}
}

func TestRouter_RouteByCost(t *testing.T) {
	r := New(StrategyCost)

	r.Register(&testProvider{
		name: "cheap",
		models: []llm.ModelInfo{{ID: "gpt-4", InputPricePer1k: 0.01, OutputPricePer1k: 0.02}},
	})
	r.Register(&testProvider{
		name: "expensive",
		models: []llm.ModelInfo{{ID: "gpt-4", InputPricePer1k: 0.10, OutputPricePer1k: 0.20}},
	})

	p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "cheap" {
		t.Errorf("got %q, want cheap", p.Name())
	}
}

func TestRouter_RouteByLatency(t *testing.T) {
	r := New(StrategyLatency)

	r.Register(&testProvider{name: "fast"})
	r.Register(&testProvider{name: "slow"})

	r.RecordLatency("fast", 100*time.Millisecond)
	r.RecordLatency("fast", 120*time.Millisecond)
	r.RecordLatency("slow", 500*time.Millisecond)
	r.RecordLatency("slow", 600*time.Millisecond)

	p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "fast" {
		t.Errorf("got %q, want fast", p.Name())
	}
}

func TestRouter_RouteByReliability(t *testing.T) {
	r := New(StrategyReliability)

	r.Register(&testProvider{name: "reliable"})
	r.Register(&testProvider{name: "flaky"})

	r.RecordResult("reliable", true)
	r.RecordResult("reliable", true)
	r.RecordResult("reliable", true)
	r.RecordResult("flaky", false)
	r.RecordResult("flaky", false)
	r.RecordResult("flaky", true)

	p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "reliable" {
		t.Errorf("got %q, want reliable", p.Name())
	}
}

func TestRouter_RouteByCapability(t *testing.T) {
	r := New(StrategyCapability)

	r.Register(&testProvider{name: "dumb-provider"})
	r.Register(&testProvider{name: "smart-provider", thinking: true})

	temp := 1.0
	p, err := r.Route(context.Background(), &llm.ChatRequest{
		Model: "claude",
		Tools: []llm.ToolDefinition{{Type: "function"}},
		Temperature: &temp,
	})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "smart-provider" {
		t.Errorf("got %q, want smart-provider", p.Name())
	}
}

func TestRouter_RouteRandom(t *testing.T) {
	r := New(StrategyRandom)

	r.Register(&testProvider{name: "a"})
	r.Register(&testProvider{name: "b"})

	seen := make(map[string]bool)
	for i := 0; i < 20; i++ {
		p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
		if err != nil {
			t.Fatalf("Route error: %v", err)
		}
		seen[p.Name()] = true
	}

	if len(seen) < 2 {
		t.Errorf("random should select different providers, got %v", seen)
	}
}

func TestRouter_SetStrategy(t *testing.T) {
	r := New(StrategyCost)
	r.SetStrategy(StrategyLatency)

	r.Register(&testProvider{name: "p1"})
	r.Register(&testProvider{name: "p2"})

	r.RecordLatency("p2", 50*time.Millisecond)
	r.RecordLatency("p1", 200*time.Millisecond)

	p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "p2" {
		t.Errorf("got %q, want p2", p.Name())
	}
}

func TestRouter_DefaultStrategy(t *testing.T) {
	r := New(Strategy(99))
	r.Register(&testProvider{name: "first"})
	r.Register(&testProvider{name: "second"})

	p, err := r.Route(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err != nil {
		t.Fatalf("Route error: %v", err)
	}
	if p.Name() != "first" {
		t.Errorf("got %q, want first (default)", p.Name())
	}
}

func TestStrategy_String(t *testing.T) {
	tests := []struct {
		s    Strategy
		want string
	}{
		{StrategyCost, "cost"},
		{StrategyLatency, "latency"},
		{StrategyReliability, "reliability"},
		{StrategyCapability, "capability"},
		{StrategyRandom, "random"},
		{Strategy(99), "unknown"},
	}
	for _, tt := range tests {
		if got := tt.s.String(); got != tt.want {
			t.Errorf("Strategy(%d).String() = %q, want %q", tt.s, got, tt.want)
		}
	}
}

func TestMatchesModel(t *testing.T) {
	tests := []struct {
		modelID, pattern string
		want             bool
	}{
		{"gpt-4", "gpt-4", true},
		{"openai/gpt-4", "gpt-4", true},
		{"anthropic/claude-3-opus", "claude", true},
		{"gpt-4", "gpt-3", false},
	}
	for _, tt := range tests {
		if got := matchesModel(tt.modelID, tt.pattern); got != tt.want {
			t.Errorf("matchesModel(%q, %q) = %v, want %v", tt.modelID, tt.pattern, got, tt.want)
		}
	}
}

func TestABRouter(t *testing.T) {
	ab := NewABRouter()

	_, _, err := ab.Route(context.Background())
	if err == nil {
		t.Fatal("expected error with no variants")
	}

	ab.RegisterVariant(&Variant{
		Name:       "A",
		Provider:   &testProvider{name: "a"},
		TrafficPct: 0.8,
	})
	ab.RegisterVariant(&Variant{
		Name:       "B",
		Provider:   &testProvider{name: "b"},
		TrafficPct: 0.2,
	})

	seen := make(map[string]bool)
	for i := 0; i < 50; i++ {
		p, name, err := ab.Route(context.Background())
		if err != nil {
			t.Fatalf("Route error: %v", err)
		}
		seen[name] = true
		_ = p
	}

	if !seen["A"] || !seen["B"] {
		t.Errorf("both variants should be selected, got %v", seen)
	}
}

func TestABRouter_Stats(t *testing.T) {
	ab := NewABRouter()
	ab.RegisterVariant(&Variant{
		Name:       "X",
		Provider:   &testProvider{name: "x"},
		TrafficPct: 1.0,
	})

	ab.Route(context.Background())
	ab.Route(context.Background())
	ab.Route(context.Background())

	stats := ab.Stats()
	if stats["X"] != 3 {
		t.Errorf("stats[X] = %d, want 3", stats["X"])
	}
}

func TestLatencyTracker(t *testing.T) {
	lt := newLatencyTracker()
	lt.add(100 * time.Millisecond)
	lt.add(200 * time.Millisecond)

	avg := lt.avg()
	if avg != 150*time.Millisecond {
		t.Errorf("avg = %v, want 150ms", avg)
	}
}

func TestLatencyTracker_Empty(t *testing.T) {
	lt := newLatencyTracker()
	if lt.avg() != 0 {
		t.Errorf("empty tracker avg = %v, want 0", lt.avg())
	}
}

func TestLatencyTracker_MaxSamples(t *testing.T) {
	lt := newLatencyTracker()
	for i := 0; i < 150; i++ {
		lt.add(time.Duration(i) * time.Millisecond)
	}
	if len(lt.samples) != 100 {
		t.Errorf("samples = %d, want 100", len(lt.samples))
	}
}

func TestErrorTracker(t *testing.T) {
	et := &errorTracker{}
	et.record(true)
	et.record(true)
	et.record(false)

	rate := et.errorRate()
	if rate != 1.0/3.0 {
		t.Errorf("errorRate = %f, want %f", rate, 1.0/3.0)
	}
}

func TestErrorTracker_Empty(t *testing.T) {
	et := &errorTracker{}
	if et.errorRate() != 0 {
		t.Errorf("empty tracker errorRate = %f, want 0", et.errorRate())
	}
}
