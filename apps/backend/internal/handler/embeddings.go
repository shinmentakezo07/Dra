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

// Embed handles embedding requests.
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

	// Use OpenAI embeddings by default
	provider := embeddings.NewOpenAIProvider(h.cfg.OpenAIAPIKey)
	resp, err := provider.Embed(r.Context(), &embeddings.EmbeddingRequest{
		Model: req.Model,
		Input: req.Input,
	})
	if err != nil {
		logger.Error("embedding_failed", "error", err.Error(), "user_id", u.ID, "model", req.Model)
		response.Error(w, 502, "Embedding provider unavailable")
		return
	}

	response.OK(w, resp)
}
