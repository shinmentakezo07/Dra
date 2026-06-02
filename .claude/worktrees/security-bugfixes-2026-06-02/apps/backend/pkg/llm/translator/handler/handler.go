package handler

import (
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/translator"
)

// Handler provides high-level translation operations.
type Handler struct {
	registry *translator.Registry
}

// NewHandler creates a new translation handler.
// If registry is nil, a default registry with built-in translators is used.
func NewHandler(registry *translator.Registry) *Handler {
	if registry == nil {
		registry = translator.DefaultRegistry()
	}
	return &Handler{registry: registry}
}

// TranslateRequest translates a chat request between provider formats.
func (h *Handler) TranslateRequest(req *llm.ChatRequest, fromProvider, toProvider string) (map[string]interface{}, error) {
	dir, err := DetectDirection(fromProvider, toProvider)
	if err != nil {
		return nil, err
	}

	t, ok := h.registry.Get(dir)
	if !ok {
		return nil, &UnsupportedDirectionError{From: fromProvider, To: toProvider}
	}

	body, err := t.TranslateRequest(req)
	if err != nil {
		return nil, &TranslationError{
			Direction: FormatDirection(dir),
			Message:   err.Error(),
		}
	}
	return body, nil
}

// TranslateResponse translates a provider response body to unified format.
func (h *Handler) TranslateResponse(body []byte, fromProvider, toProvider, model, provider string) (*llm.ChatResponse, error) {
	dir, err := DetectDirection(fromProvider, toProvider)
	if err != nil {
		return nil, err
	}

	t, ok := h.registry.Get(dir)
	if !ok {
		return nil, &UnsupportedDirectionError{From: fromProvider, To: toProvider}
	}

	resp, err := t.TranslateResponse(body, model, provider)
	if err != nil {
		return nil, &TranslationError{
			Direction: FormatDirection(dir),
			Message:   err.Error(),
		}
	}
	return resp, nil
}

// TranslateStreamChunk translates a provider stream chunk to unified format.
func (h *Handler) TranslateStreamChunk(data []byte, fromProvider, toProvider, model, provider string) (*llm.StreamChunk, error) {
	dir, err := DetectDirection(fromProvider, toProvider)
	if err != nil {
		return nil, err
	}

	t, ok := h.registry.Get(dir)
	if !ok {
		return nil, &UnsupportedDirectionError{From: fromProvider, To: toProvider}
	}

	chunk, err := t.TranslateStreamChunk(data, model, provider)
	if err != nil {
		return nil, &TranslationError{
			Direction: FormatDirection(dir),
			Message:   err.Error(),
		}
	}
	return chunk, nil
}
