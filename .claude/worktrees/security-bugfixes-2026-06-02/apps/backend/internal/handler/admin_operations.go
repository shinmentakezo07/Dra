package handler

import (
	"net/http"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminCacheStats(w http.ResponseWriter, r *http.Request) {
	var entries, sizeBytes int
	var hitRate float64
	err := h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(entry_count),0), COALESCE(SUM(size_bytes),0),
		       CASE WHEN SUM(hits+misses) > 0 THEN SUM(hits)::float/SUM(hits+misses) ELSE 0 END
		FROM cache_stats WHERE recorded_at >= $1`, time.Now().Add(-24*time.Hour)).Scan(&entries, &sizeBytes, &hitRate)
	if err != nil {
		entries, sizeBytes = 0, 0
		hitRate = 0.0
	}
	response.OK(w, map[string]interface{}{
		"entries":   entries,
		"sizeBytes": sizeBytes,
		"hitRate":   hitRate,
	})
}

func (h *Handler) AdminClearCache(w http.ResponseWriter, r *http.Request) {
	if h.llmCache != nil {
		_ = h.llmCache.Clear(r.Context())
	}
	_, _ = h.db.Exec(r.Context(), `DELETE FROM cache_stats`)
	response.OK(w, map[string]string{"status": "cache_cleared"})
}

func (h *Handler) AdminListWebhookLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := h.webhookSvc.ListDeliveryLogs(r.Context(), 50)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, logs)
}

func (h *Handler) AdminRetryWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.webhookSvc.RetryDelivery(r.Context(), id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]string{"status": "retried", "id": id})
}

func (h *Handler) AdminListOptimizations(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, type, title, estimated_savings_cents, user_id, applied, created_at
		FROM cost_optimizations WHERE applied=false ORDER BY estimated_savings_cents DESC LIMIT 20`)
	if err != nil {
		response.OK(w, []map[string]interface{}{})
		return
	}
	defer rows.Close()
	type opt struct {
		ID              int64     `json:"id"`
		Type            string    `json:"type"`
		Title           string    `json:"title"`
		EstimatedSavings int64    `json:"estimatedSavingsCents"`
		UserID          string    `json:"userId,omitempty"`
		Applied         bool      `json:"applied"`
		CreatedAt       time.Time `json:"createdAt"`
	}
	var opts []opt
	for rows.Next() {
		var o opt
		if err := rows.Scan(&o.ID, &o.Type, &o.Title, &o.EstimatedSavings, &o.UserID, &o.Applied, &o.CreatedAt); err != nil {
			continue
		}
		opts = append(opts, o)
	}
	response.OK(w, opts)
}

func (h *Handler) AdminGetForecast(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var currentMonthCost float64
	_ = h.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(cost),0) FROM usage_records WHERE created_at >= $1`, monthStart).Scan(&currentMonthCost)

	type trend struct {
		Date string  `json:"date"`
		Cost float64 `json:"costCents"`
	}
	rows, err := h.db.Query(ctx, `
		SELECT DATE(created_at) as d, COALESCE(SUM(cost),0)
		FROM usage_records WHERE created_at >= $1 GROUP BY d ORDER BY d`, monthStart.AddDate(0, -2, 0))
	if err == nil {
		defer rows.Close()
		var trends []trend
		var total float64
		var count int
		for rows.Next() {
			var t trend
			if err := rows.Scan(&t.Date, &t.Cost); err != nil {
				continue
			}
			trends = append(trends, t)
			total += t.Cost
			count++
		}
		avgDaily := 0.0
		if count > 0 {
			avgDaily = total / float64(count)
		}
		daysRemaining := 30 - now.Day()
		forecast := currentMonthCost + avgDaily*float64(daysRemaining)
		response.OK(w, map[string]interface{}{
			"forecast":     forecast,
			"currentSpend": currentMonthCost,
			"avgDailyCost": avgDaily,
			"trend":        trends,
		})
		return
	}
	response.OK(w, map[string]interface{}{
		"forecast":     currentMonthCost * 1.5,
		"currentSpend": currentMonthCost,
	})
}

func (h *Handler) AdminCostBreakdown(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	rows, err := h.db.Query(ctx, `
		SELECT model, COUNT(*) as reqs, COALESCE(SUM(cost),0) as total
		FROM usage_records WHERE created_at >= $1 GROUP BY model ORDER BY total DESC LIMIT 20`, monthStart)
	if err != nil {
		response.Error(w, 500, "Failed to retrieve cost breakdown")
		return
	}
	defer rows.Close()
	type breakdownItem struct {
		Name    string `json:"name"`
		Count   int    `json:"count"`
		Total   int64  `json:"totalCents"`
	}
	var byModel []breakdownItem
	for rows.Next() {
		var b breakdownItem
		if err := rows.Scan(&b.Name, &b.Count, &b.Total); err != nil {
			continue
		}
		byModel = append(byModel, b)
	}

	response.OK(w, map[string]interface{}{
		"byUser":     []interface{}{},
		"byModel":    byModel,
		"byProvider": []interface{}{},
	})
}

func (h *Handler) AdminDashboardStats(w http.ResponseWriter, r *http.Request) {
	var stats domain.DashboardStats
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	yesterday := now.Add(-24 * time.Hour)

	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.Users.Total); err != nil {
		logger.Error("admin_stats_users_failed", "error", err.Error())
		response.Error(w, 500, "Failed to load dashboard stats")
		return
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE last_login_at >= $1", yesterday).Scan(&stats.Users.ActiveToday); err != nil {
		logger.Warn("admin_stats_active_today_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE created_at >= $1", todayStart).Scan(&stats.Users.NewToday); err != nil {
		logger.Warn("admin_stats_new_today_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE status='suspended'").Scan(&stats.Users.Suspended); err != nil {
		logger.Warn("admin_stats_suspended_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Requests.TotalToday); err != nil {
		logger.Warn("admin_stats_requests_today_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records WHERE created_at >= $1", monthStart).Scan(&stats.Requests.TotalMonth); err != nil {
		logger.Warn("admin_stats_requests_month_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COALESCE(AVG(duration_ms),0) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Requests.AvgLatencyMs); err != nil {
		logger.Warn("admin_stats_avg_latency_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COALESCE(SUM(tokens),0) FROM usage_records WHERE created_at >= $1 AND tokens > 0", todayStart).Scan(&stats.Tokens.InputToday); err != nil {
		logger.Warn("admin_stats_tokens_today_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COALESCE(SUM(cost),0) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Revenue.TodayCents); err != nil {
		logger.Warn("admin_stats_revenue_today_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COALESCE(SUM(cost),0) FROM usage_records WHERE created_at >= $1", monthStart).Scan(&stats.Revenue.MonthCents); err != nil {
		logger.Warn("admin_stats_revenue_month_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM providers").Scan(&stats.Providers.Total); err != nil {
		logger.Warn("admin_stats_providers_total_failed", "error", err.Error())
	}
	if err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM providers WHERE status='active'").Scan(&stats.Providers.Healthy); err != nil {
		logger.Warn("admin_stats_providers_healthy_failed", "error", err.Error())
	}

	response.OK(w, stats)
}
