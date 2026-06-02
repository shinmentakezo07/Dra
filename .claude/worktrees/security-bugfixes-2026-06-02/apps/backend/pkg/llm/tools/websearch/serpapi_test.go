package websearch

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSerpAPIProvider_Search(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("api_key") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		response := map[string]interface{}{
			"organic_results": []map[string]string{
				{
					"title":   "Test Title",
					"link":    "https://example.com",
					"snippet": "Test snippet",
				},
			},
		}
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	results, err := provider.Search(context.Background(), "test query")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "Test Title" {
		t.Errorf("got title %q, want Test Title", results[0].Title)
	}
	if results[0].URL != "https://example.com" {
		t.Errorf("got URL %q, want https://example.com", results[0].URL)
	}
}

func TestSerpAPIProvider_NoAPIKey(t *testing.T) {
	provider := NewSerpAPIProvider()
	_, err := provider.Search(context.Background(), "test")
	if err == nil {
		t.Fatal("expected error when API key is missing")
	}
}

func TestSerpAPIProvider_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	_, err := provider.Search(context.Background(), "test")
	if err == nil {
		t.Fatal("expected error for server error")
	}
}

func TestSerpAPIProvider_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	_, err := provider.Search(context.Background(), "test")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestSerpAPIProvider_ContextTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Write([]byte(`{}`))
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	_, err := provider.Search(ctx, "test")
	if err == nil {
		t.Fatal("expected error for context timeout")
	}
}

func TestSerpAPIProvider_EmptyQuery(t *testing.T) {
	provider := NewSerpAPIProviderWithKey("test-key")
	_, err := provider.Search(context.Background(), "   ")
	if err == nil {
		t.Fatal("expected error for empty query")
	}
}

func TestSerpAPIProvider_MultipleResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"organic_results": []map[string]string{
				{"title": "Result 1", "link": "https://1.com", "snippet": "Snippet 1"},
				{"title": "Result 2", "link": "https://2.com", "snippet": "Snippet 2"},
				{"title": "Result 3", "link": "https://3.com", "snippet": "Snippet 3"},
			},
		}
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	results, err := provider.Search(context.Background(), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
}

func TestNewSerpAPIProviderWithKey(t *testing.T) {
	provider := NewSerpAPIProviderWithKey("my-key")
	if provider.apiKey != "my-key" {
		t.Errorf("got apiKey %q, want my-key", provider.apiKey)
	}
	if provider.baseURL != "https://serpapi.com/search" {
		t.Errorf("got baseURL %q, want https://serpapi.com/search", provider.baseURL)
	}
}

func TestNewSerpAPIProvider_ReadsEnv(t *testing.T) {
	t.Setenv("SERPAPI_KEY", "env-key")
	provider := NewSerpAPIProvider()
	if provider.apiKey != "env-key" {
		t.Errorf("got apiKey %q, want env-key", provider.apiKey)
	}
}

func TestSerpAPIProvider_EmptyResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"organic_results": []map[string]string{},
		}
		_ = json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	provider := &SerpAPIProvider{
		apiKey:  "test-key",
		client:  &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}

	results, err := provider.Search(context.Background(), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}
