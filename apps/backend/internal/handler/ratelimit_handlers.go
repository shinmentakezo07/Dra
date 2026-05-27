package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListTiers(w http.ResponseWriter, r *http.Request) {
	tiers, err := h.rateLimitSvc.ListTiers(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, tiers)
}

func (h *Handler) UpdateTierLimits(w http.ResponseWriter, r *http.Request) {
	tier := chi.URLParam(r, "tier")
	var req struct {
		RPM       int `json:"rpm"`
		Daily     int `json:"daily"`
		Monthly   int `json:"monthly"`
		MaxTokens int `json:"maxTokens"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.RPM < 0 || req.Daily < 0 || req.Monthly < 0 || req.MaxTokens < 0 {
		response.Error(w, 400, "Values must not be negative")
		return
	}
	if err := h.rateLimitSvc.UpdateTierLimits(r.Context(), tier, req.RPM, req.Daily, req.Monthly, req.MaxTokens); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) SetUserTier(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var req struct {
		Tier string `json:"tier"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Tier == "" {
		response.Error(w, 400, "tier is required")
		return
	}
	if err := h.rateLimitSvc.SetUserTier(r.Context(), userID, req.Tier); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}
