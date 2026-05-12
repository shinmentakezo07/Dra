package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/llm/batch"

	"github.com/go-chi/chi/v5"
)

type batchRequest struct {
	Items []batch.JobItem `json:"items"`
}

// BatchChat submits a batch of chat requests.
func (h *Handler) BatchChat(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	var req batchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if len(req.Items) == 0 {
		response.Error(w, 400, "Items are required")
		return
	}
	if len(req.Items) > 100 {
		response.Error(w, 400, "Maximum 100 items per batch")
		return
	}

	job, appErr := h.batchSvc.Submit(r.Context(), u.ID, req.Items)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}

	response.Created(w, job)
}

// GetBatchJob retrieves a batch job status.
func (h *Handler) GetBatchJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	id := chi.URLParam(r, "id")
	job, appErr := h.batchSvc.Get(r.Context(), u.ID, id)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}

	response.OK(w, job)
}
