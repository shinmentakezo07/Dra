package websearch

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"dra-platform/backend/pkg/llm/tools"
)

// Tool creates a web search tool backed by the given provider.
func Tool(provider Provider) tools.Tool {
	return tools.Tool{
		Metadata: tools.ToolMetadata{
			Name:        "web_search",
			Description: "Search the web for information using a search engine backend.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {
						"type": "string",
						"description": "The search query"
					},
					"max_results": {
						"type": "integer",
						"description": "Maximum number of results to return (default 5)",
						"minimum": 1,
						"maximum": 20
					}
				},
				"required": ["query"]
			}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			if provider == nil {
				return nil, fmt.Errorf("web search provider is required")
			}

			var params struct {
				Query      string `json:"query"`
				MaxResults int    `json:"max_results"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, fmt.Errorf("invalid web_search arguments: %w", err)
			}

			query := strings.TrimSpace(params.Query)
			if query == "" {
				return nil, fmt.Errorf("query is required")
			}

			if params.MaxResults <= 0 {
				params.MaxResults = 5
			}
			if params.MaxResults > 20 {
				params.MaxResults = 20
			}

			results, err := provider.Search(ctx, query)
			if err != nil {
				return nil, fmt.Errorf("web search failed: %w", err)
			}

			if len(results) > params.MaxResults {
				results = results[:params.MaxResults]
			}

			return formatResults(results), nil
		},
	}
}

func formatResults(results []Result) string {
	if len(results) == 0 {
		return "No results found."
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Found %d result(s):\n\n", len(results)))
	for i, r := range results {
		sb.WriteString(fmt.Sprintf("%d. %s\n   URL: %s\n   %s\n\n", i+1, r.Title, r.URL, r.Snippet))
	}
	return sb.String()
}
