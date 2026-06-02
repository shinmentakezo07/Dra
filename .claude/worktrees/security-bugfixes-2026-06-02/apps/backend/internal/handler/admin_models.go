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
	if err != nil {
		adminError(w, r, err, "admin_list_models_failed")
		return
	}
	response.OK(w, models)
}

func (h *Handler) AdminCreateModel(w http.ResponseWriter, r *http.Request) {
	var m domain.ModelRegistry
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.CreateModel(r.Context(), &m); err != nil {
		adminError(w, r, err, "admin_create_model_failed")
		return
	}
	response.OK(w, m)
}

func (h *Handler) AdminDeleteModel(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.adminSvc.DeleteModel(r.Context(), id); err != nil {
		adminError(w, r, err, "admin_delete_model_failed")
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminUpdateModelStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct{ Status string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.UpdateModelStatus(r.Context(), id, domain.ModelStatus(req.Status), nil); err != nil {
		adminError(w, r, err, "admin_update_model_status_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminGetModel(w http.ResponseWriter, r *http.Request) {
	m, err := h.adminSvc.GetModel(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		adminError(w, r, err, "admin_get_model_failed")
		return
	}
	if m == nil {
		response.Error(w, 404, "Not found")
		return
	}
	response.OK(w, m)
}

func (h *Handler) AdminUpdateModel(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var m domain.ModelRegistry
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	m.ID = id
	if err := h.adminSvc.UpdateModel(r.Context(), &m); err != nil {
		adminError(w, r, err, "admin_update_model_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminListAliases(w http.ResponseWriter, r *http.Request) {
	aliases, err := h.adminSvc.ListAliases(r.Context())
	if err != nil {
		adminError(w, r, err, "admin_list_aliases_failed")
		return
	}
	response.OK(w, aliases)
}

func (h *Handler) AdminCreateAlias(w http.ResponseWriter, r *http.Request) {
	var a domain.ModelAlias
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.CreateAlias(r.Context(), &a); err != nil {
		adminError(w, r, err, "admin_create_alias_failed")
		return
	}
	response.OK(w, a)
}

func (h *Handler) AdminUpdateAlias(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var a domain.ModelAlias
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	a.ID = id
	if err := h.adminSvc.UpdateAlias(r.Context(), &a); err != nil {
		adminError(w, r, err, "admin_update_alias_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminDeleteAlias(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.DeleteAlias(r.Context(), chi.URLParam(r, "id")); err != nil {
		adminError(w, r, err, "admin_delete_alias_failed")
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}
