package handler

import (
	"net/http"
	"strings"

	"dra-platform/backend/internal/pkg/response"
)

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.analyticsSvc.PlatformStats(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, stats)
}

func (h *Handler) ProviderHealth(w http.ResponseWriter, r *http.Request) {
	statuses := h.providerSvc.ProviderHealthStatuses()
	if statuses == nil {
		providers := h.providerSvc.ListProviderNames(r.Context())
		result := make([]map[string]interface{}, 0, len(providers))
		for _, name := range providers {
			result = append(result, map[string]interface{}{
				"provider": name,
				"status":   "unknown",
			})
		}
		response.OK(w, result)
		return
	}

	result := make([]map[string]interface{}, 0, len(statuses))
	for _, s := range statuses {
		item := map[string]interface{}{
			"provider":     s.Provider,
			"status":       s.Status.String(),
			"last_checked": s.LastChecked,
			"latency_ms":   s.Latency.Milliseconds(),
		}
		if s.LastError != nil {
			errStr := s.LastError.Error()
			if strings.Contains(errStr, "http") || strings.Contains(errStr, "sk-") || strings.Contains(errStr, "nvapi-") || strings.Contains(errStr, "key") || strings.Contains(errStr, "gsk-") || strings.Contains(errStr, "xai-") || strings.Contains(errStr, "AIza") {
				errStr = "provider request failed"
			}
			item["last_error"] = errStr
		}
		result = append(result, item)
	}
	response.OK(w, result)
}

func (h *Handler) AdminCircuitBreakers(w http.ResponseWriter, r *http.Request) {
	response.OK(w, h.providerSvc.CircuitBreakerStatuses())
}
