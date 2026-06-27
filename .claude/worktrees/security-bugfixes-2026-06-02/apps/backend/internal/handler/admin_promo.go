package handler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) AdminTogglePromoStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct{ IsActive bool }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.TogglePromoStatus(r.Context(), id, req.IsActive); err != nil {
		adminError(w, r, err, "admin_toggle_promo_status_failed")
		return
	}
	response.OK(w, map[string]bool{"isActive": req.IsActive})
}

func generatePromoCode(length int) (string, error) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, length)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", fmt.Errorf("generate promo code: %w", err)
		}
		code[i] = chars[n.Int64()]
	}
	return string(code), nil
}

func (h *Handler) AdminCreatePromoCodeWithRandom(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	var req struct {
		Code        string `json:"code"`
		Type        string `json:"type"`
		Value       int    `json:"value"`
		MaxUses     int    `json:"maxUses"`
		MinPurchase int    `json:"minPurchase"`
		ExpiresAt   string `json:"expiresAt"`
		Random      bool   `json:"random"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.Value <= 0 {
		response.Error(w, 400, "Value must be greater than 0")
		return
	}
	if req.MaxUses < 0 {
		response.Error(w, 400, "MaxUses must not be negative")
		return
	}
	if req.Type == "" {
		req.Type = "credits"
	}
	code := req.Code
	if req.Random || code == "" {
		generated, err := generatePromoCode(10)
		if err != nil {
			response.Error(w, 500, "Failed to generate promo code")
			return
		}
		code = generated
	}
	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", req.ExpiresAt)
		if err == nil {
			expiresAt = &t
		}
	}
	p := domain.PromoCode{
		ID:        uuid.New().String(),
		Code:      code,
		Type:      req.Type,
		Value:     req.Value,
		MaxUses:   req.MaxUses,
		ExpiresAt: expiresAt,
		IsActive:  true,
		CreatedBy: u.ID,
	}
	if err := h.adminSvc.CreatePromoCode(r.Context(), &p); err != nil {
		adminError(w, r, err, "admin_create_promo_code_with_random_failed")
		return
	}
	response.OK(w, p)
}

func (h *Handler) RedeemPromoCode(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Auth required")
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.Code == "" {
		response.Error(w, 400, "Code required")
		return
	}
	redemption, credits, err := h.adminSvc.RedeemPromoCode(r.Context(), req.Code, u.ID)
	if err != nil {
		// For user-facing promo redemption, show a safe error
		response.Error(w, 400, "Invalid or expired promo code")
		return
	}
	response.OK(w, map[string]interface{}{
		"redemption": redemption,
		"credits":    credits,
	})
}
