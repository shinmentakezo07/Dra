package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// OpenAIProvider implements OpenAI embedding API.
type OpenAIProvider struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// NewOpenAIProvider creates a new OpenAI embedding provider.
func NewOpenAIProvider(apiKey string) *OpenAIProvider {
	return &OpenAIProvider{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1",
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

// Name returns the provider name.
func (p *OpenAIProvider) Name() string { return "openai" }

// Embed sends an embedding request.
func (p *OpenAIProvider) Embed(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("openai: API key not configured")
	}

	body := map[string]interface{}{
		"model": req.Model,
		"input": req.Input,
	}
	bodyBytes, _ := json.Marshal(body)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/embeddings", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("openai: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openai: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if decodeErr := json.NewDecoder(resp.Body).Decode(&errBody); decodeErr != nil || errBody.Error.Message == "" {
			return nil, fmt.Errorf("openai: HTTP %d: %s", resp.StatusCode, http.StatusText(resp.StatusCode))
		}
		return nil, fmt.Errorf("openai: HTTP %d: %s", resp.StatusCode, errBody.Error.Message)
	}

	var result struct {
		Object string `json:"object"`
		Data   []struct {
			Object    string    `json:"object"`
			Index     int       `json:"index"`
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
		Model string `json:"model"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("openai: decode response: %w", err)
	}

	data := make([]Embedding, len(result.Data))
	for i, d := range result.Data {
		data[i] = Embedding{
			Index:     d.Index,
			Object:    d.Object,
			Embedding: d.Embedding,
		}
	}

	return &EmbeddingResponse{
		Object:      result.Object,
		Data:        data,
		Model:       result.Model,
		TotalTokens: result.Usage.TotalTokens,
	}, nil
}
