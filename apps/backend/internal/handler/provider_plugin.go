package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type ProviderPluginHandler struct {
	svc *service.ProviderPluginService
}

func NewProviderPluginHandler(svc *service.ProviderPluginService) *ProviderPluginHandler {
	return &ProviderPluginHandler{svc: svc}
}

func (h *ProviderPluginHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateProviderPluginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	p, err := h.svc.Create(r.Context(), "", req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, p)
}

func (h *ProviderPluginHandler) List(w http.ResponseWriter, r *http.Request) {
	plugins, err := h.svc.List(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, plugins)
}

func (h *ProviderPluginHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, p)
}

func (h *ProviderPluginHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if err := h.svc.Toggle(r.Context(), id, req.Active); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *ProviderPluginHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}
