package provider

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/translator"
	"dra-platform/backend/pkg/llm/watcher"
)

func TestNewOpenAIProvider_Options(t *testing.T) {
	p := NewOpenAIProvider(
		WithAPIKey("test-key"),
		WithBaseURL("https://example.com/v1"),
	)
	if p.Name() != "openai" {
		t.Errorf("Name() = %q, want openai", p.Name())
	}
	if p.BaseURL() != "https://example.com/v1" {
		t.Errorf("BaseURL() = %q", p.BaseURL())
	}
	if !p.SupportsThinking() {
		t.Error("OpenAI provider should support thinking")
	}
}

func TestNewOpenAIProvider_DefaultURL(t *testing.T) {
	p := NewOpenAIProvider(WithAPIKey("k"))
	if p.BaseURL() != "https://api.openai.com/v1" {
		t.Errorf("BaseURL() = %q", p.BaseURL())
	}
}

func TestNewAnthropicProvider_Options(t *testing.T) {
	p := NewAnthropicProvider(
		WithAPIKey("test-key"),
		WithBaseURL("https://example.com/v1"),
	)
	if p.Name() != "anthropic" {
		t.Errorf("Name() = %q, want anthropic", p.Name())
	}
	if p.BaseURL() != "https://example.com/v1" {
		t.Errorf("BaseURL() = %q", p.BaseURL())
	}
}

func TestNewAnthropicProvider_DefaultURL(t *testing.T) {
	p := NewAnthropicProvider(WithAPIKey("k"))
	if p.BaseURL() != "https://api.anthropic.com/v1" {
		t.Errorf("BaseURL() = %q", p.BaseURL())
	}
}

func TestNewGenericProvider(t *testing.T) {
	p := NewGenericProvider("custom", "https://custom.ai/v1", WithAPIKey("k"))
	if p.Name() != "custom" {
		t.Errorf("Name() = %q, want custom", p.Name())
	}
	if p.BaseURL() != "https://custom.ai/v1" {
		t.Errorf("BaseURL() = %q", p.BaseURL())
	}
}

func TestGenericProvider_ListModels(t *testing.T) {
	models := []llm.ModelInfo{{ID: "custom/model-a", Name: "Model A"}}
	p := NewGenericProvider("custom", "https://custom.ai/v1",
		WithAPIKey("k"),
		WithModels(models),
	)

	got, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "custom/model-a" {
		t.Errorf("got %+v, want custom/model-a", got)
	}
}

func TestGenericProvider_ListModels_Empty(t *testing.T) {
	p := NewGenericProvider("custom", "https://custom.ai/v1", WithAPIKey("k"))

	got, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %d models, want 0", len(got))
	}
}

func TestRegistry_RegisterAndGet(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "p1"})

	p, ok := r.Get("p1")
	if !ok {
		t.Fatal("provider not found")
	}
	if p.Name() != "p1" {
		t.Errorf("Name() = %q, want p1", p.Name())
	}

	_, ok = r.Get("nonexistent")
	if ok {
		t.Error("expected not found")
	}
}

func TestRegistry_Providers(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "a"})
	r.Register(&testProv{name: "b"})

	names := r.Providers()
	if len(names) != 2 {
		t.Fatalf("got %d providers, want 2", len(names))
	}
}

func TestRegistry_GetByModel(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "openai"})

	p, model, ok := r.GetByModel("openai/gpt-4")
	if !ok {
		t.Fatal("GetByModel not found")
	}
	if p.Name() != "openai" {
		t.Errorf("provider = %q, want openai", p.Name())
	}
	if model != "gpt-4" {
		t.Errorf("model = %q, want gpt-4", model)
	}
}

func TestRegistry_GetByModel_NotFound(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "openai"})

	_, _, ok := r.GetByModel("unknown/model")
	if ok {
		t.Error("expected not found")
	}
}

func TestRegistry_AllModels(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "p1", models: []llm.ModelInfo{{ID: "p1/m1"}}})
	r.Register(&testProv{name: "p2", models: []llm.ModelInfo{{ID: "p2/m2"}}})

	models, err := r.AllModels(context.Background())
	if err != nil {
		t.Fatalf("AllModels error: %v", err)
	}
	if len(models) != 2 {
		t.Fatalf("got %d models, want 2", len(models))
	}
}

func TestRegistry_AllModels_Cache(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "p1", models: []llm.ModelInfo{{ID: "p1/m1"}}})

	models1, _ := r.AllModels(context.Background())
	models2, _ := r.AllModels(context.Background())

	if len(models1) != len(models2) {
		t.Error("cached models length mismatch")
	}
}

func TestRegistry_InvalidateCache(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "p1", models: []llm.ModelInfo{{ID: "p1/m1"}}})

	r.AllModels(context.Background())
	r.InvalidateCache()

	models, _ := r.AllModels(context.Background())
	if len(models) != 1 {
		t.Errorf("got %d models after invalidation, want 1", len(models))
	}
}

func TestRegistry_RouteRequest(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "openai", models: []llm.ModelInfo{{ID: "gpt-4"}}})

	resp, err := r.RouteRequest(context.Background(), &llm.ChatRequest{Model: "openai/gpt-4"})
	if err != nil {
		t.Fatalf("RouteRequest error: %v", err)
	}
	if resp.Provider != "openai" {
		t.Errorf("Provider = %q, want openai", resp.Provider)
	}
}

func TestRegistry_RouteRequest_NoProvider(t *testing.T) {
	r := NewRegistry()

	_, err := r.RouteRequest(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "no provider specified") {
		t.Errorf("error = %v", err)
	}
}

func TestRegistry_RouteRequest_ProviderNotFound(t *testing.T) {
	r := NewRegistry()

	_, err := r.RouteRequest(context.Background(), &llm.ChatRequest{Model: "unknown/gpt-4"})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "provider not found") {
		t.Errorf("error = %v", err)
	}
}

func TestRegistry_RouteStreamRequest(t *testing.T) {
	r := NewRegistry()
	r.Register(&testProv{name: "openai", models: []llm.ModelInfo{{ID: "gpt-4"}}})

	ch, err := r.RouteStreamRequest(context.Background(), &llm.ChatRequest{Model: "openai/gpt-4"})
	if err != nil {
		t.Fatalf("RouteStreamRequest error: %v", err)
	}
	if ch == nil {
		t.Fatal("expected channel")
	}
}

func TestRegistry_RouteStreamRequest_NoProvider(t *testing.T) {
	r := NewRegistry()

	_, err := r.RouteStreamRequest(context.Background(), &llm.ChatRequest{Model: "gpt-4"})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestReadSSE(t *testing.T) {
	data := "data: hello\ndata: world\n\n"
	var lines []string

	ReadSSE(strings.NewReader(data), func(line string) bool {
		lines = append(lines, line)
		return true
	})

	if len(lines) != 2 {
		t.Fatalf("got %d lines, want 2", len(lines))
	}
	if lines[0] != "data: hello" {
		t.Errorf("line[0] = %q", lines[0])
	}
	if lines[1] != "data: world" {
		t.Errorf("line[1] = %q", lines[1])
	}
}

func TestReadSSE_EarlyStop(t *testing.T) {
	data := "data: first\ndata: second\ndata: third\n"
	var lines []string

	ReadSSE(strings.NewReader(data), func(line string) bool {
		lines = append(lines, line)
		return len(lines) < 2
	})

	if len(lines) != 2 {
		t.Fatalf("got %d lines, want 2", len(lines))
	}
}

func TestReadSSE_Done(t *testing.T) {
	data := "data: hello\ndata: [DONE]\ndata: after\n"
	var lines []string

	ReadSSE(strings.NewReader(data), func(line string) bool {
		lines = append(lines, line)
		return !strings.Contains(line, "[DONE]")
	})

	if len(lines) != 2 {
		t.Fatalf("got %d lines, want 2", len(lines))
	}
	if lines[1] != "data: [DONE]" {
		t.Errorf("line[1] = %q, want data: [DONE]", lines[1])
	}
}

func TestBaseProvider_Options(t *testing.T) {
	c := cache.NewMemoryCache()
	p := newBaseProvider("test",
		WithAPIKey("k"),
		WithBaseURL("https://example.com"),
		WithSupportsThinking(true),
		WithCache(c),
		WithModels([]llm.ModelInfo{{ID: "m1"}}),
	)

	if p.name != "test" {
		t.Errorf("name = %q", p.name)
	}
	if p.apiKey != "k" {
		t.Errorf("apiKey = %q", p.apiKey)
	}
	if p.baseURL != "https://example.com" {
		t.Errorf("baseURL = %q", p.baseURL)
	}
	if !p.supportsThinking {
		t.Error("supportsThinking = false")
	}
	if p.cache != c {
		t.Error("cache mismatch")
	}
}

func TestOpenAIProvider_ListModels(t *testing.T) {
	p := NewOpenAIProvider(WithAPIKey("k"))
	models, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels error: %v", err)
	}
	if len(models) < 3 {
		t.Errorf("got %d models, want >= 3", len(models))
	}
}

func TestAnthropicProvider_ListModels(t *testing.T) {
	p := NewAnthropicProvider(WithAPIKey("k"))
	models, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels error: %v", err)
	}
	if len(models) < 2 {
		t.Errorf("got %d models, want >= 2", len(models))
	}
}

func TestAnthropicProvider_Chat_NoAPIKey(t *testing.T) {
	p := NewAnthropicProvider()
	_, err := p.Chat(context.Background(), &llm.ChatRequest{Model: "claude"})
	if err == nil {
		t.Fatal("expected error for missing API key")
	}
	if !strings.Contains(err.Error(), "API key not configured") {
		t.Errorf("error = %v", err)
	}
}

func TestAnthropicProvider_ChatStream_NoAPIKey(t *testing.T) {
	p := NewAnthropicProvider()
	_, err := p.ChatStream(context.Background(), &llm.ChatRequest{Model: "claude"})
	if err == nil {
		t.Fatal("expected error for missing API key")
	}
}

type testProv struct {
	name   string
	models []llm.ModelInfo
}

func (t *testProv) Name() string { return t.name }
func (t *testProv) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return &llm.ChatResponse{Model: req.Model, Provider: t.name}, nil
}
func (t *testProv) ChatStream(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk)
	close(ch)
	return ch, nil
}
func (t *testProv) ListModels(ctx context.Context) ([]llm.ModelInfo, error) { return t.models, nil }
func (t *testProv) SupportsThinking() bool                                 { return false }

func TestWithHTTPClient(t *testing.T) {
	customClient := &http.Client{Timeout: 5 * time.Second}
	p := newBaseProvider("test", WithHTTPClient(customClient))
	if p.client != customClient {
		t.Error("WithHTTPClient did not set client")
	}
}

func TestWithWatcher(t *testing.T) {
	w := watcher.New()
	p := newBaseProvider("test", WithWatcher(w))
	if p.watcher != w {
		t.Error("WithWatcher did not set watcher")
	}
}

func TestWithTranslator(t *testing.T) {
	tr := translator.NewAnthropicToOpenAI()
	p := newBaseProvider("test", WithTranslator(tr))
	if p.translator == nil {
		t.Error("WithTranslator did not set translator")
	}
}
