package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateFineTuningJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.CreateFineTuningJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	j, err := h.fineTuningSvc.CreateJob(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, j)
}

func (h *Handler) GetFineTuningJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "jobId")
	j, err := h.fineTuningSvc.GetJob(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, j)
}

func (h *Handler) ListFineTuningJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	jobs, err := h.fineTuningSvc.ListJobs(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, jobs)
}

func (h *Handler) CreateFineTuningDataset(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		Filename string `json:"filename"`
		Format   string `json:"format"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Filename == "" || req.Format == "" {
		response.Error(w, 400, "filename and format are required")
		return
	}
	ds, err := h.fineTuningSvc.CreateDataset(r.Context(), u.ID, req.Filename, req.Format)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, ds)
}

func (h *Handler) ListFineTuningDatasets(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	datasets, err := h.fineTuningSvc.ListDatasets(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, datasets)
}

func (h *Handler) DeleteFineTuningDataset(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.fineTuningSvc.DeleteDataset(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}
