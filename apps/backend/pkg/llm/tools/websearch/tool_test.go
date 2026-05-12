package websearch

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestTool_MockProvider(t *testing.T) {
	mock := NewMockProvider()
	mock.AddResult("golang", Result{
		Title:   "The Go Programming Language",
		URL:     "https://go.dev",
		Snippet: "Go is an open source programming language.",
	})
	mock.AddResult("golang", Result{
		Title:   "A Tour of Go",
		URL:     "https://go.dev/tour",
		Snippet: "Welcome to a tour of the Go programming language.",
	})

	wst := Tool(mock)

	args, _ := json.Marshal(map[string]interface{}{"query": "golang", "max_results": 3})
	result, err := wst.Handler(context.Background(), args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str, ok := result.(string)
	if !ok {
		t.Fatalf("expected string result, got %T", result)
	}
	if !strings.Contains(str, "The Go Programming Language") {
		t.Errorf("expected result to contain title")
	}
	if !strings.Contains(str, "https://go.dev") {
		t.Errorf("expected result to contain URL")
	}
}

func TestTool_NilProvider(t *testing.T) {
	wst := Tool(nil)

	args, _ := json.Marshal(map[string]interface{}{"query": "golang"})
	_, err := wst.Handler(context.Background(), args)
	if err == nil {
		t.Fatal("expected error for nil provider")
	}
}

func TestTool_StaticProvider(t *testing.T) {
	static := &StaticProvider{
		Results: []Result{
			{Title: "Static Result", URL: "https://example.com", Snippet: "Hello"},
		},
	}

	wst := Tool(static)
	args, _ := json.Marshal(map[string]interface{}{"query": "anything"})
	result, err := wst.Handler(context.Background(), args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str := result.(string)
	if !strings.Contains(str, "Static Result") {
		t.Errorf("expected static result")
	}
}

func TestTool_ProviderError(t *testing.T) {
	mock := NewMockProvider()
	mock.Err = errors.New("search service unavailable")

	wst := Tool(mock)
	args, _ := json.Marshal(map[string]interface{}{"query": "test"})
	_, err := wst.Handler(context.Background(), args)
	if err == nil {
		t.Fatal("expected error from provider")
	}
}

func TestTool_EmptyQuery(t *testing.T) {
	mock := NewMockProvider()
	wst := Tool(mock)

	args, _ := json.Marshal(map[string]interface{}{"query": "   "})
	_, err := wst.Handler(context.Background(), args)
	if err == nil {
		t.Fatal("expected error for empty query")
	}
}

func TestTool_MaxResultsClamping(t *testing.T) {
	mock := NewMockProvider()
	for i := 0; i < 25; i++ {
		mock.AddResult("many", Result{Title: "Result", URL: "https://example.com", Snippet: "Snippet"})
	}

	wst := Tool(mock)
	args, _ := json.Marshal(map[string]interface{}{"query": "many", "max_results": 30})
	result, err := wst.Handler(context.Background(), args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str := result.(string)
	count := strings.Count(str, "https://example.com")
	if count > 20 {
		t.Errorf("expected max 20 results, got %d", count)
	}
}

func TestTool_DefaultMaxResults(t *testing.T) {
	mock := NewMockProvider()
	for i := 0; i < 10; i++ {
		mock.AddResult("default", Result{Title: "Result", URL: "https://example.com", Snippet: "Snippet"})
	}

	wst := Tool(mock)
	args, _ := json.Marshal(map[string]interface{}{"query": "default"})
	result, err := wst.Handler(context.Background(), args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str := result.(string)
	count := strings.Count(str, "https://example.com")
	if count > 5 {
		t.Errorf("expected default max 5 results, got %d", count)
	}
}

func TestTool_InvalidArguments(t *testing.T) {
	mock := NewMockProvider()
	wst := Tool(mock)

	_, err := wst.Handler(context.Background(), json.RawMessage(`{invalid`))
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestTool_Metadata(t *testing.T) {
	mock := NewMockProvider()
	wst := Tool(mock)

	if wst.Metadata.Name != "web_search" {
		t.Errorf("got name %q, want web_search", wst.Metadata.Name)
	}
	if wst.Metadata.Parameters == nil {
		t.Error("expected non-nil parameters schema")
	}
}

func TestFormatResults_Empty(t *testing.T) {
	result := formatResults(nil)
	if result != "No results found." {
		t.Errorf("got %q, want 'No results found.'", result)
	}
}

func TestProviderFunc(t *testing.T) {
	var called bool
	f := ProviderFunc(func(ctx context.Context, query string) ([]Result, error) {
		called = true
		return []Result{{Title: query, URL: "https://test.com", Snippet: "Test"}}, nil
	})

	results, err := f.Search(context.Background(), "hello")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Error("expected ProviderFunc to be called")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
}
