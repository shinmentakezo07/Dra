package handler

import (
	"net/http"

	"dra-platform/backend/internal/pkg/response"
)

func (h *Handler) AdminDashboardStats(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]interface{}{
		"users":     map[string]int{"total": 0, "activeToday": 0, "newToday": 0, "suspended": 0},
		"providers": map[string]int{"total": 0, "healthy": 0, "degraded": 0, "down": 0},
	})
}
