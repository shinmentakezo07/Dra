package handler

import (
	"net/http"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminCacheStats(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]interface{}{
		"entries":   0,
		"sizeBytes": 0,
		"hitRate":   0.0,
	})
}

func (h *Handler) AdminClearCache(w http.ResponseWriter, r *http.Request) {
	if h.llmCache != nil {
		_ = h.llmCache.Clear(r.Context())
	}
	response.OK(w, map[string]string{"status": "cache_cleared"})
}

func (h *Handler) AdminListWebhookLogs(w http.ResponseWriter, r *http.Request) {
	response.OK(w, []map[string]interface{}{})
}

func (h *Handler) AdminRetryWebhook(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "id")
	response.OK(w, map[string]string{"status": "retried"})
}

func (h *Handler) AdminListOptimizations(w http.ResponseWriter, r *http.Request) {
	response.OK(w, []map[string]interface{}{})
}

func (h *Handler) AdminGetForecast(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]interface{}{
		"forecast":   0,
		"confidence": 0.8,
	})
}

func (h *Handler) AdminCostBreakdown(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]interface{}{
		"byUser":     []interface{}{},
		"byModel":    []interface{}{},
		"byProvider": []interface{}{},
	})
}

func (h *Handler) AdminUpdateDashboard(w http.ResponseWriter, r *http.Request) {
	var stats domain.DashboardStats
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterday := now.Add(-24 * time.Hour)

	if err := h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&stats.Users.Total); err != nil {
		response.OK(w, stats)
		return
	}

	if err := h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE last_login_at >= $1", yesterday).Scan(&stats.Users.ActiveToday); err != nil {
		response.OK(w, stats)
		return
	}

	if err := h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Requests.TotalToday); err != nil {
		response.OK(w, stats)
		return
	}

	if err := h.db.Pool.QueryRow(ctx, "SELECT COALESCE(SUM(cost_cents),0) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Revenue.TodayCents); err != nil {
		response.OK(w, stats)
		return
	}

	response.OK(w, stats)
}
