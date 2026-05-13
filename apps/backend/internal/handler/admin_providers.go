package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminListProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := h.adminSvc.ListProviders(r.Context())
	if err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, providers)
}

func (h *Handler) AdminGetProvider(w http.ResponseWriter, r *http.Request) {
	p, err := h.adminSvc.GetProvider(r.Context(), chi.URLParam(r, "id"))
	if err != nil { response.Error(w, 500, err.Error()); return }
	if p == nil { response.Error(w, 404, "Not found"); return }
	response.OK(w, p)
}

func (h *Handler) AdminCreateProvider(w http.ResponseWriter, r *http.Request) {
	var p domain.Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.CreateProvider(r.Context(), &p); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, p)
}

func (h *Handler) AdminUpdateProvider(w http.ResponseWriter, r *http.Request) {
	var p domain.Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.UpdateProvider(r.Context(), &p); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminUpdateProviderStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct{ Status string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.ToggleProviderStatus(r.Context(), id, domain.ProviderStatus(req.Status)); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminListProviderKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := h.adminSvc.ListProviderKeys(r.Context(), chi.URLParam(r, "id"))
	if err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, keys)
}

func (h *Handler) AdminAddProviderKey(w http.ResponseWriter, r *http.Request) {
	var k domain.ProviderKey
	if err := json.NewDecoder(r.Body).Decode(&k); err != nil { response.Error(w, 400, "Invalid body"); return }
	k.ProviderID = chi.URLParam(r, "id")
	if err := h.adminSvc.AddProviderKey(r.Context(), &k); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, k)
}

func (h *Handler) AdminDeleteProviderKey(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.DeleteProviderKey(r.Context(), chi.URLParam(r, "keyId")); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminReorderProviderKeys(w http.ResponseWriter, r *http.Request) {
	var req struct{ KeyIDs []string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.ReorderProviderKeys(r.Context(), chi.URLParam(r, "id"), req.KeyIDs); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "reordered"})
}
