package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type FineTuningHandler struct {
	svc *service.FineTuningService
}

func NewFineTuningHandler(svc *service.FineTuningService) *FineTuningHandler {
	return &FineTuningHandler{svc: svc}
}

func (h *FineTuningHandler) ListDatasets(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	datasets, err := h.svc.ListDatasets(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, datasets)
}

func (h *FineTuningHandler) GetDataset(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "datasetId")
	d, err := h.svc.GetDataset(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, d)
}

func (h *FineTuningHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
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
	dsID := req.DatasetID
	j, err := h.svc.CreateJob(r.Context(), u.ID, req.BaseModel, &dsID, req.Hyperparams)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, j)
}

func (h *FineTuningHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "jobId")
	j, err := h.svc.GetJob(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, j)
}

func (h *FineTuningHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	jobs, err := h.svc.ListJobs(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, jobs)
}
