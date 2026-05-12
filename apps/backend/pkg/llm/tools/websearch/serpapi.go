package websearch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// SerpAPIProvider searches using the SerpAPI service.
type SerpAPIProvider struct {
	apiKey  string
	client  *http.Client
	baseURL string
}

// NewSerpAPIProvider creates a SerpAPI provider. Reads SERPAPI_KEY from environment.
func NewSerpAPIProvider() *SerpAPIProvider {
	return &SerpAPIProvider{
		apiKey:  os.Getenv("SERPAPI_KEY"),
		client:  &http.Client{Timeout: 15 * time.Second},
		baseURL: "https://serpapi.com/search",
	}
}

// NewSerpAPIProviderWithKey creates a SerpAPI provider with an explicit API key.
func NewSerpAPIProviderWithKey(apiKey string) *SerpAPIProvider {
	return &SerpAPIProvider{
		apiKey:  apiKey,
		client:  &http.Client{Timeout: 15 * time.Second},
		baseURL: "https://serpapi.com/search",
	}
}

// Search implements Provider.
func (s *SerpAPIProvider) Search(ctx context.Context, query string) ([]Result, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("SERPAPI_KEY not configured")
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}

	u, err := url.Parse(s.baseURL)
	if err != nil {
		return nil, fmt.Errorf("parse serpapi base URL: %w", err)
	}
	q := u.Query()
	q.Set("q", query)
	q.Set("api_key", s.apiKey)
	q.Set("engine", "google")
	q.Set("num", "10")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("serpapi request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("serpapi returned status %d", resp.StatusCode)
	}

	var payload struct {
		OrganicResults []struct {
			Title   string `json:"title"`
			Link    string `json:"link"`
			Snippet string `json:"snippet"`
		} `json:"organic_results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to decode serpapi response: %w", err)
	}

	results := make([]Result, 0, len(payload.OrganicResults))
	for _, r := range payload.OrganicResults {
		results = append(results, Result{
			Title:   r.Title,
			URL:     r.Link,
			Snippet: r.Snippet,
		})
	}
	return results, nil
}
