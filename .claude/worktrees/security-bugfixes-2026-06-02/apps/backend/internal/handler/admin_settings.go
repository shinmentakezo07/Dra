package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) AdminListSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.adminSvc.ListSettings(r.Context(), r.URL.Query().Get("group"))
	if err != nil {
		adminError(w, r, err, "admin_list_settings_failed")
		return
	}
	response.OK(w, settings)
}

func (h *Handler) AdminUpdateSetting(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Value       json.RawMessage `json:"value"`
		Type        string          `json:"type"`
		Description string          `json:"description"`
		GroupName   string          `json:"groupName"`
		IsEncrypted bool            `json:"isEncrypted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	setting := domain.SystemSetting{
		Key:         chi.URLParam(r, "key"),
		Value:       req.Value,
		Type:        req.Type,
		Description: req.Description,
		GroupName:   req.GroupName,
		IsEncrypted: req.IsEncrypted,
	}
	if err := h.adminSvc.UpdateSetting(r.Context(), &setting); err != nil {
		adminError(w, r, err, "admin_update_setting_failed")
		return
	}
	response.OK(w, setting)
}

func (h *Handler) AdminListFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags, err := h.adminSvc.ListFeatureFlags(r.Context())
	if err != nil {
		adminError(w, r, err, "admin_list_feature_flags_failed")
		return
	}
	response.OK(w, flags)
}

func (h *Handler) AdminCreateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Key         string `json:"key"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.Key == "" {
		response.Error(w, 400, "Key is required")
		return
	}
	f := domain.FeatureFlag{
		ID:          uuid.New().String(),
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		Enabled:     req.Enabled,
	}
	if err := h.adminSvc.CreateFeatureFlag(r.Context(), &f); err != nil {
		adminError(w, r, err, "admin_create_feature_flag_failed")
		return
	}
	response.OK(w, f)
}

func (h *Handler) AdminToggleFeatureFlag(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.ToggleFeatureFlag(r.Context(), id, req.Enabled); err != nil {
		adminError(w, r, err, "admin_toggle_feature_flag_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}
