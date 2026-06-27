package embeddings

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSplitModelID(t *testing.T) {
	tests := []struct {
		input    string
		wantProv string
		wantModel string
	}{
		{"openai/text-embedding-3-small", "openai", "text-embedding-3-small"},
		{"text-embedding", "", "text-embedding"},
	}
	for _, tt := range tests {
		got := splitModelID(tt.input)
		if got[0] != tt.wantProv || got[1] != tt.wantModel {
			t.Errorf("splitModelID(%q) = %q, %q; want %q, %q", tt.input, got[0], got[1], tt.wantProv, tt.wantModel)
		}
	}
}

func TestEstimateTokens(t *testing.T) {
	if EstimateTokens("") != 0 {
		t.Error("expected 0 for empty string")
	}
	if EstimateTokens("hello world") != 2 {
		t.Errorf("expected 2, got %d", EstimateTokens("hello world"))
	}
}

func TestEstimateRequestTokens(t *testing.T) {
	req := &EmbeddingRequest{Input: []string{"hello", "world"}}
	got := EstimateRequestTokens(req)
	if got != 2 {
		t.Errorf("expected 2, got %d", got)
	}
}

func TestRegistry_RegisterAndGet(t *testing.T) {
	r := NewRegistry()
	p := &mockEmbeddingProvider{name: "test"}
	r.Register(p)

	got, ok := r.Get("test")
	if !ok {
		t.Fatal("expected provider")
	}
	if got.Name() != "test" {
		t.Errorf("Name = %v, want test", got.Name())
	}
}

func TestRegistry_RouteRequest_MissingProvider(t *testing.T) {
	r := NewRegistry()
	_, err := r.RouteRequest(context.Background(), &EmbeddingRequest{Model: "missing/model"})
	if !errors.Is(err, ErrProviderNotFound) {
		t.Errorf("error = %v, want ErrProviderNotFound", err)
	}
}

func TestRegistry_RouteRequest_NoProvider(t *testing.T) {
	r := NewRegistry()
	_, err := r.RouteRequest(context.Background(), &EmbeddingRequest{Model: "model"})
	if !errors.Is(err, ErrNoProvider) {
		t.Errorf("error = %v, want ErrNoProvider", err)
	}
}

func TestOpenAIProvider_Name(t *testing.T) {
	p := NewOpenAIProvider("key")
	if p.Name() != "openai" {
		t.Errorf("Name = %v, want openai", p.Name())
	}
}

func TestOpenAIProvider_Embed_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("Authorization = %v, want Bearer test-key", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"object": "list",
			"data": [
				{"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
			],
			"model": "text-embedding-3-small",
			"usage": {"total_tokens": 5}
		}`))
	}))
	defer server.Close()

	p := NewOpenAIProvider("test-key")
	p.baseURL = server.URL

	resp, err := p.Embed(context.Background(), &EmbeddingRequest{
		Model: "text-embedding-3-small",
		Input: []string{"hello"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 embedding, got %d", len(resp.Data))
	}
	if len(resp.Data[0].Embedding) != 3 {
		t.Errorf("expected 3 dims, got %d", len(resp.Data[0].Embedding))
	}
	if resp.TotalTokens != 5 {
		t.Errorf("TotalTokens = %d, want 5", resp.TotalTokens)
	}
}

func TestOpenAIProvider_Embed_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error": {"message": "invalid key"}}`))
	}))
	defer server.Close()

	p := NewOpenAIProvider("bad-key")
	p.baseURL = server.URL

	_, err := p.Embed(context.Background(), &EmbeddingRequest{Input: []string{"test"}})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestOpenAIProvider_Embed_NoKey(t *testing.T) {
	p := NewOpenAIProvider("")
	_, err := p.Embed(context.Background(), &EmbeddingRequest{Input: []string{"test"}})
	if err == nil {
		t.Fatal("expected error")
	}
}

type mockEmbeddingProvider struct {
	name   string
	resp   *EmbeddingResponse
	err    error
}

func (m *mockEmbeddingProvider) Name() string { return m.name }
func (m *mockEmbeddingProvider) Embed(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.resp, nil
}
