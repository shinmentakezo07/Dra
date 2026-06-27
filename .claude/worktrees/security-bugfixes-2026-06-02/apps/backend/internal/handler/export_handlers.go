package handler

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.CreateExportJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	job, err := h.exportSvc.CreateJob(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, job)
}

func (h *Handler) GetExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	job, err := h.exportSvc.GetJob(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, job)
}

func (h *Handler) ListExportJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	jobs, err := h.exportSvc.ListJobs(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, jobs)
}

func (h *Handler) DownloadExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	job, err := h.exportSvc.GetJob(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	if job.Status != "completed" || job.FilePath == nil {
		response.Error(w, 400, "Export not ready")
		return
	}

	// Prevent path traversal: ensure the resolved path stays within the exports directory
	absPath, absErr := filepath.Abs(*job.FilePath)
	if absErr != nil {
		response.Error(w, 400, "Invalid file path")
		return
	}
	exportsDir := filepath.Join("exports")
	absExportsDir, _ := filepath.Abs(exportsDir)
	if !strings.HasPrefix(absPath, absExportsDir+string(filepath.Separator)) && absPath != absExportsDir {
		response.Error(w, 403, "Access denied")
		return
	}

	http.ServeFile(w, r, absPath)
}
