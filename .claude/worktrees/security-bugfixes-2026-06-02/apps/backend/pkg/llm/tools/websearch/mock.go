package websearch

import (
	"context"
	"fmt"
	"strings"
)

// MockProvider is a test-friendly search provider that returns configurable results.
type MockProvider struct {
	Results map[string][]Result
	Err     error
}

// NewMockProvider creates a mock provider with predefined results.
func NewMockProvider() *MockProvider {
	return &MockProvider{
		Results: make(map[string][]Result),
	}
}

// Search implements Provider by looking up the query in the mock results map.
func (m *MockProvider) Search(ctx context.Context, query string) ([]Result, error) {
	if m.Err != nil {
		return nil, m.Err
	}

	key := strings.ToLower(strings.TrimSpace(query))
	if results, ok := m.Results[key]; ok {
		return results, nil
	}

	return nil, fmt.Errorf("no mock results for query: %s", query)
}

// AddResult registers a mock result for a query.
func (m *MockProvider) AddResult(query string, result Result) {
	key := strings.ToLower(strings.TrimSpace(query))
	m.Results[key] = append(m.Results[key], result)
}

// StaticProvider returns a fixed set of results for any query.
type StaticProvider struct {
	Results []Result
}

// Search implements Provider.
func (s *StaticProvider) Search(ctx context.Context, query string) ([]Result, error) {
	return s.Results, nil
}
