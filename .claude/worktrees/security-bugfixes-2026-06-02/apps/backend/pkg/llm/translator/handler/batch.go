package handler

import (
	"sync"

	"dra-platform/backend/pkg/llm"
)

// RequestResult holds the result of translating a single request.
type RequestResult struct {
	Body  map[string]interface{}
	Error error
}

// ResponseItem is a single response to translate.
type ResponseItem struct {
	Body []byte
}

// ResponseResult holds the result of translating a single response.
type ResponseResult struct {
	Response *llm.ChatResponse
	Error    error
}

// BatchTranslator translates multiple requests or responses concurrently.
type BatchTranslator struct {
	handler *Handler
}

// NewBatchTranslator creates a new batch translator.
func NewBatchTranslator(handler *Handler) *BatchTranslator {
	return &BatchTranslator{handler: handler}
}

// TranslateRequests translates multiple requests concurrently.
func (b *BatchTranslator) TranslateRequests(requests []*llm.ChatRequest, fromProvider, toProvider string) []RequestResult {
	if len(requests) == 0 {
		return nil
	}

	results := make([]RequestResult, len(requests))
	var wg sync.WaitGroup

	for i, req := range requests {
		wg.Add(1)
		go func(idx int, r *llm.ChatRequest) {
			defer wg.Done()
			body, err := b.handler.TranslateRequest(r, fromProvider, toProvider)
			results[idx] = RequestResult{Body: body, Error: err}
		}(i, req)
	}

	wg.Wait()
	return results
}

// TranslateResponses translates multiple responses concurrently.
func (b *BatchTranslator) TranslateResponses(responses []ResponseItem, fromProvider, toProvider, model, provider string) []ResponseResult {
	if len(responses) == 0 {
		return nil
	}

	results := make([]ResponseResult, len(responses))
	var wg sync.WaitGroup

	for i, resp := range responses {
		wg.Add(1)
		go func(idx int, r ResponseItem) {
			defer wg.Done()
			translated, err := b.handler.TranslateResponse(r.Body, fromProvider, toProvider, model, provider)
			results[idx] = ResponseResult{Response: translated, Error: err}
		}(i, resp)
	}

	wg.Wait()
	return results
}
