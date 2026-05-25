package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/llm/embeddings"
)

type embeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// Embed handles embedding requests with provider routing.
func (h *Handler) Embed(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	var req embeddingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Model == "" {
		response.Error(w, 400, "Model is required")
		return
	}
	if len(req.Input) == 0 {
		response.Error(w, 400, "Input is required")
		return
	}

	// Use embedding registry for provider routing
	if h.embeddingRegistry == nil {
		response.Error(w, 503, "Embedding service not configured")
		return
	}

	embedReq := &embeddings.EmbeddingRequest{
		Model: req.Model,
		Input: req.Input,
	}

	resp, err := h.embeddingRegistry.RouteRequest(r.Context(), embedReq)
	if err != nil {
		logger.Error("embedding_failed", "error", err.Error(), "user_id", u.ID, "model", req.Model)
		// Return safe error message without leaking internal details
		response.Error(w, 502, "Embedding provider unavailable")
		return
	}

	response.OK(w, resp)
}
