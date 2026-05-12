// Package websearch provides pluggable web search capabilities for the tools SDK.
package websearch

import "context"

// Result represents a single web search result.
type Result struct {
	Title   string
	URL     string
	Snippet string
}

// Provider defines the interface for web search backends.
type Provider interface {
	// Search executes a web search query and returns results.
	Search(ctx context.Context, query string) ([]Result, error)
}

// ProviderFunc adapts a function to the Provider interface.
type ProviderFunc func(ctx context.Context, query string) ([]Result, error)

// Search implements Provider.
func (f ProviderFunc) Search(ctx context.Context, query string) ([]Result, error) {
	return f(ctx, query)
}
