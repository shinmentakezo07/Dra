package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminRevenueSummary(w http.ResponseWriter, r *http.Request) {
	from, _ := time.Parse("2006-01-02", r.URL.Query().Get("from"))
	to, _ := time.Parse("2006-01-02", r.URL.Query().Get("to"))
	if to.IsZero() {
		to = time.Now()
	}
	if from.IsZero() {
		from = to.AddDate(0, -1, 0)
	}
	data, err := h.adminSvc.RevenueSummary(r.Context(), from, to)
	if err != nil {
		adminError(w, r, err, "admin_revenue_summary_failed")
		return
	}
	response.OK(w, data)
}

func (h *Handler) AdminListTransactions(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	filter := domain.UsageFilter{
		UserID: r.URL.Query().Get("userId"),
		Model:  r.URL.Query().Get("model"),
		Page:   page,
		Limit:  limit,
	}
	records, total, err := h.adminSvc.ListUsageRecords(r.Context(), filter)
	if err != nil {
		adminError(w, r, err, "admin_list_transactions_failed")
		return
	}
	response.Paginated(w, records, total, page, limit)
}

func (h *Handler) AdminAdjustCredits(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	var req struct {
		UserID      string `json:"userId"`
		Amount      int    `json:"amount"`
		Reason      string `json:"reason"`
		ReferenceID string `json:"referenceId,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.UserID == "" || req.Reason == "" {
		response.Error(w, 400, "userId and reason required")
		return
	}
	adj := &domain.CreditAdjustment{
		UserID:      req.UserID,
		Amount:      req.Amount,
		Reason:      req.Reason,
		AdminID:     u.ID,
		ReferenceID: req.ReferenceID,
	}
	if err := h.adminSvc.AdjustCredits(r.Context(), adj); err != nil {
		adminError(w, r, err, "admin_adjust_credits_failed")
		return
	}
	response.OK(w, adj)
}

func (h *Handler) AdminListAdjustments(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	if userID == "" {
		userID = r.URL.Query().Get("userId")
	}
	page, limit := parsePagination(r)
	adjustments, total, err := h.adminSvc.ListAdjustments(r.Context(), userID, page, limit)
	if err != nil {
		adminError(w, r, err, "admin_list_adjustments_failed")
		return
	}
	response.Paginated(w, adjustments, total, page, limit)
}

func (h *Handler) AdminUsageDaily(w http.ResponseWriter, r *http.Request) {
	from, _ := time.Parse("2006-01-02", r.URL.Query().Get("from"))
	to, _ := time.Parse("2006-01-02", r.URL.Query().Get("to"))
	if to.IsZero() {
		to = time.Now()
	}
	if from.IsZero() {
		from = to.AddDate(0, -7, 0)
	}
	data, err := h.adminSvc.UsageDaily(r.Context(), from, to, r.URL.Query().Get("groupBy"))
	if err != nil {
		adminError(w, r, err, "admin_usage_daily_failed")
		return
	}
	response.OK(w, data)
}
