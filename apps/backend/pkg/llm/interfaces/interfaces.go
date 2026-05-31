// Package interfaces provides core interface types for the LLM gateway pipeline.
// Defines translator function types, provider executor interfaces, and middleware hooks.
// Inspired by CLIProxyAPI's interfaces package.
package interfaces

import (
	"context"

	"dra-platform/backend/pkg/llm"
)

// TranslateRequestFunc translates a raw JSON request from one format to another.
// Parameters: raw JSON body, model name, whether streaming.
// Returns: translated raw JSON body.
type TranslateRequestFunc func(body []byte, model string, stream bool) []byte

// TranslateResponseFunc translates a streaming response chunk.
// Parameters: context, model name, original request, translated request, raw chunk.
// Returns: translated response lines.
type TranslateResponseFunc func(ctx context.Context, modelName string, originalReq, translatedReq, rawChunk []byte) [][]byte

// TranslateResponseNonStreamFunc translates a non-streaming response.
// Parameters: context, model name, original request, translated request, raw response.
// Returns: translated response.
type TranslateResponseNonStreamFunc func(ctx context.Context, modelName string, originalReq, translatedReq, rawResp []byte) []byte

// ProviderExecutor defines the interface for executing requests against an LLM provider.
type ProviderExecutor interface {
	// Name returns the provider name (e.g., "openai", "anthropic", "gemini").
	Name() string
	// Execute sends a non-streaming request and returns the response.
	Execute(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)
	// ExecuteStream sends a streaming request and returns chunks via channel.
	ExecuteStream(ctx context.Context, req *llm.ChatRequest) (<-chan *llm.StreamChunk, error)
	// HealthCheck checks if the provider is available.
	HealthCheck(ctx context.Context) error
}

// MiddlewareFunc is a function that wraps a request handler.
type MiddlewareFunc func(next RequestHandler) RequestHandler

// RequestHandler processes an LLM request.
type RequestHandler func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)

// StreamRequestHandler processes a streaming LLM request.
type StreamRequestHandler func(ctx context.Context, req *llm.ChatRequest) (<-chan *llm.StreamChunk, error)

// InterceptorFunc can inspect/modify a request before it reaches the provider.
// Returns the (possibly modified) request, or an error to reject the request.
type InterceptorFunc func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatRequest, error)

// ResponseInterceptorFunc can inspect/modify a response after the provider returns.
type ResponseInterceptorFunc func(ctx context.Context, req *llm.ChatRequest, resp *llm.ChatResponse) (*llm.ChatResponse, error)

// ErrorHandler handles errors from the pipeline.
type ErrorHandler func(ctx context.Context, err error, provider, model string) error
