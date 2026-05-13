package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminListModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.adminSvc.ListModels(r.Context(), r.URL.Query().Get("status"))
	if err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, models)
}

func (h *Handler) AdminCreateModel(w http.ResponseWriter, r *http.Request) {
	var m domain.ModelRegistry
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.CreateModel(r.Context(), &m); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, m)
}

func (h *Handler) AdminUpdateModelStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct{ Status string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.UpdateModelStatus(r.Context(), id, domain.ModelStatus(req.Status), nil); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminListAliases(w http.ResponseWriter, r *http.Request) {
	aliases, err := h.adminSvc.ListAliases(r.Context())
	if err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, aliases)
}

func (h *Handler) AdminCreateAlias(w http.ResponseWriter, r *http.Request) {
	var a domain.ModelAlias
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.CreateAlias(r.Context(), &a); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, a)
}

func (h *Handler) AdminDeleteAlias(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.DeleteAlias(r.Context(), chi.URLParam(r, "id")); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "deleted"})
}
