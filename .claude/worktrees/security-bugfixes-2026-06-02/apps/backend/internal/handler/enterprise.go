package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/llm/audit"
	"dra-platform/backend/pkg/llm/virtualkeys"

	"github.com/go-chi/chi/v5"
)

// --- Credential Vault Endpoints ---

func (h *Handler) ListCredentials(w http.ResponseWriter, r *http.Request) {
	if h.credVault == nil {
		response.Error(w, 503, "credential vault not configured")
		return
	}
	creds, err := h.credVault.List()
	if err != nil {
		response.Error(w, 500, "failed to list credentials")
		return
	}
	// Strip encrypted keys from response
	type safeCred struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		ProviderType string `json:"provider_type"`
		KeyLastFour  string `json:"key_last_four"`
		Priority     int    `json:"priority"`
		IsActive     bool   `json:"is_active"`
		HealthStatus string `json:"health_status"`
		FailureCount int    `json:"failure_count"`
	}
	result := make([]safeCred, len(creds))
	for i, c := range creds {
		result[i] = safeCred{
			ID: c.ID, Name: c.Name, ProviderType: c.ProviderType,
			KeyLastFour: c.KeyLastFour, Priority: c.Priority, IsActive: c.IsActive,
			HealthStatus: c.HealthStatus, FailureCount: c.FailureCount,
		}
	}
	response.OK(w, result)
}

func (h *Handler) AddCredential(w http.ResponseWriter, r *http.Request) {
	if h.credVault == nil {
		response.Error(w, 503, "credential vault not configured")
		return
	}
	var req struct {
		Name         string `json:"name"`
		ProviderType string `json:"provider_type"`
		APIKey       string `json:"api_key"`
		APIBase      string `json:"api_base"`
		Priority     int    `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "invalid request body")
		return
	}
	c, err := h.credVault.Add(req.Name, req.ProviderType, req.APIKey, req.APIBase, req.Priority)
	if err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	if h.auditLogger != nil {
		h.auditLogger.LogCredentialEvent(r.Context(), audit.ActionCredentialCreated, "admin", c.ID, audit.SeverityInfo)
	}
	logger.Info("credential_added", "id", c.ID, "provider", req.ProviderType)
	response.OK(w, map[string]string{"id": c.ID, "status": "created"})
}

func (h *Handler) RotateCredential(w http.ResponseWriter, r *http.Request) {
	if h.credVault == nil {
		response.Error(w, 503, "credential vault not configured")
		return
	}
	id := chi.URLParam(r, "id")
	var req struct {
		NewAPIKey string `json:"new_api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "invalid request body")
		return
	}
	if err := h.credVault.Rotate(id, req.NewAPIKey); err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	if h.auditLogger != nil {
		h.auditLogger.LogCredentialEvent(r.Context(), audit.ActionCredentialRotated, "admin", id, audit.SeverityInfo)
	}
	response.OK(w, map[string]string{"status": "rotated"})
}

func (h *Handler) DeleteCredential(w http.ResponseWriter, r *http.Request) {
	if h.credVault == nil {
		response.Error(w, 503, "credential vault not configured")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.credVault.Delete(id); err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	if h.auditLogger != nil {
		h.auditLogger.LogCredentialEvent(r.Context(), audit.ActionCredentialDeleted, "admin", id, audit.SeverityWarning)
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

// --- Virtual Key Endpoints ---

func (h *Handler) ListVirtualKeys(w http.ResponseWriter, r *http.Request) {
	if h.vkeyManager == nil {
		response.Error(w, 503, "virtual key manager not configured")
		return
	}
	keys, err := h.vkeyManager.List()
	if err != nil {
		response.Error(w, 500, "failed to list virtual keys")
		return
	}
	response.OK(w, keys)
}

func (h *Handler) CreateVirtualKey(w http.ResponseWriter, r *http.Request) {
	if h.vkeyManager == nil {
		response.Error(w, 503, "virtual key manager not configured")
		return
	}
	var req struct {
		Name              string   `json:"name"`
		TeamID            string   `json:"team_id"`
		UserID            string   `json:"user_id"`
		ModelAccess       []string `json:"model_access"`
		RateLimitRPM      int      `json:"rate_limit_rpm"`
		RateLimitRPD      int      `json:"rate_limit_rpd"`
		BudgetLimitCents  int64    `json:"budget_limit_cents"`
		BudgetResetPeriod string   `json:"budget_reset_period"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "invalid request body")
		return
	}
	if req.UserID == "" {
		// Get user ID from auth context
		if u := getUserFromRequest(r); u != nil {
			req.UserID = u.ID
		}
	}
	vk, rawKey, err := h.vkeyManager.Create(virtualkeys.CreateOptions{
		Name: req.Name, TeamID: req.TeamID, UserID: req.UserID,
		ModelAccess: req.ModelAccess, RateLimitRPM: req.RateLimitRPM,
		RateLimitRPD: req.RateLimitRPD, BudgetLimitCents: req.BudgetLimitCents,
		BudgetResetPeriod: req.BudgetResetPeriod,
	})
	if err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	if h.auditLogger != nil {
		h.auditLogger.LogKeyCreated(r.Context(), req.UserID, vk.ID, req.Name)
	}
	// Return the raw key only once — it cannot be retrieved again
	response.OK(w, map[string]any{
		"id":      vk.ID,
		"key":     rawKey,
		"prefix":  vk.KeyPrefix,
		"name":    vk.Name,
		"message": "Store this key securely — it cannot be retrieved again",
	})
}

func (h *Handler) DeactivateVirtualKey(w http.ResponseWriter, r *http.Request) {
	if h.vkeyManager == nil {
		response.Error(w, 503, "virtual key manager not configured")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.vkeyManager.Deactivate(id); err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	response.OK(w, map[string]string{"status": "deactivated"})
}

// --- Security Endpoints ---

func (h *Handler) GetSecurityEvents(w http.ResponseWriter, r *http.Request) {
	if h.securityGuard == nil {
		response.Error(w, 503, "security guard not configured")
		return
	}
	events := h.securityGuard.RecentEvents(100)
	response.OK(w, events)
}

func (h *Handler) ScanContent(w http.ResponseWriter, r *http.Request) {
	if h.securityGuard == nil {
		response.Error(w, 503, "security guard not configured")
		return
	}
	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "invalid request body")
		return
	}
	detections, action, err := h.securityGuard.Scan(r.Context(), req.Text, nil)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]any{
		"detections": detections,
		"action":     action,
		"safe":       len(detections) == 0,
	})
}

// --- Usage Endpoints ---

func (h *Handler) GetUsageSummary(w http.ResponseWriter, r *http.Request) {
	if h.usageTracker == nil {
		response.Error(w, 503, "usage tracker not configured")
		return
	}
	since := time.Now().AddDate(0, 0, -30) // Last 30 days
	summary, err := h.usageTracker.GetGlobalSummary(since)
	if err != nil {
		response.Error(w, 500, "failed to get usage summary")
		return
	}
	response.OK(w, summary)
}

func (h *Handler) ListPricing(w http.ResponseWriter, r *http.Request) {
	if h.usageTracker == nil {
		response.Error(w, 503, "usage tracker not configured")
		return
	}
	pricing, err := h.usageTracker.ListPricing()
	if err != nil {
		response.Error(w, 500, "failed to list pricing")
		return
	}
	response.OK(w, pricing)
}

// --- Audit Log Endpoints ---

func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	if h.auditLogger == nil {
		response.Error(w, 503, "audit logger not configured")
		return
	}
	entries, total, err := h.auditLogger.Query(audit.Filter{
		ActorID: r.URL.Query().Get("actor_id"),
		Action:  audit.Action(r.URL.Query().Get("action")),
		Limit:   50,
		Page:    1,
	})
	if err != nil {
		response.Error(w, 500, "failed to query audit logs")
		return
	}
	response.OK(w, map[string]any{
		"entries": entries,
		"total":   total,
	})
}

// --- Load Balancer Endpoints ---

func (h *Handler) GetLoadBalancerStats(w http.ResponseWriter, r *http.Request) {
	if h.loadBalancer == nil {
		response.Error(w, 503, "load balancer not configured")
		return
	}
	stats := h.loadBalancer.Stats()
	endpoints := h.loadBalancer.Endpoints()
	type endpointInfo struct {
		ID           string  `json:"id"`
		Provider     string  `json:"provider"`
		Model        string  `json:"model"`
		IsActive     bool    `json:"is_active"`
		IsHealthy    bool    `json:"is_health"`
		ActiveReqs   int64   `json:"active_requests"`
		TotalReqs    int64   `json:"total_requests"`
		TotalErrors  int64   `json:"total_errors"`
		AvgLatencyMs float64 `json:"avg_latency_ms"`
		SuccessRate  float64 `json:"success_rate"`
	}
	var result []endpointInfo
	for _, e := range endpoints {
		s := stats[e.ID]
		info := endpointInfo{
			ID: e.ID, Provider: e.Provider, Model: e.Model,
			IsActive: e.IsActive, IsHealthy: e.IsHealthy,
		}
		if s != nil {
			info.ActiveReqs = s.ActiveRequests.Load()
			info.TotalReqs = s.TotalRequests.Load()
			info.TotalErrors = s.TotalErrors.Load()
			info.AvgLatencyMs = s.AvgLatencyMs
			info.SuccessRate = s.SuccessRate
		}
		result = append(result, info)
	}
	response.OK(w, result)
}

// --- WebSocket Endpoint ---

func (h *Handler) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if h.wsGateway == nil {
		response.Error(w, 503, "websocket gateway not configured")
		return
	}
	// For now, return SSE fallback since actual WebSocket upgrade requires
	// gorilla/websocket or similar. This is a placeholder for the SSE path.
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, 500, "streaming not supported")
		return
	}
	w.Write([]byte("event: connected\ndata: {\"status\":\"ok\"}\n\n"))
	flusher.Flush()

	ctx := r.Context()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.Write([]byte(": keepalive\n\n"))
			flusher.Flush()
		}
	}
}

// --- Health Enhancement ---

func (h *Handler) ProviderHealthDetailed(w http.ResponseWriter, r *http.Request) {
	type providerHealth struct {
		Name        string  `json:"name"`
		Status      string  `json:"status"`
		ActiveReqs  int64   `json:"active_requests"`
		TotalReqs   int64   `json:"total_requests"`
		SuccessRate float64 `json:"success_rate"`
		AvgLatency  float64 `json:"avg_latency_ms"`
	}

	var result []providerHealth

	// From load balancer
	if h.loadBalancer != nil {
		stats := h.loadBalancer.Stats()
		for _, e := range h.loadBalancer.Endpoints() {
			ph := providerHealth{Name: e.ID, Status: "healthy"}
			if !e.IsHealthy {
				ph.Status = "unhealthy"
			}
			if s, ok := stats[e.ID]; ok {
				ph.ActiveReqs = s.ActiveRequests.Load()
				ph.TotalReqs = s.TotalRequests.Load()
				ph.SuccessRate = s.SuccessRate
				ph.AvgLatency = s.AvgLatencyMs
			}
			result = append(result, ph)
		}
	}

	if result == nil {
		result = []providerHealth{}
	}
	response.OK(w, result)
}

// getUserFromRequest extracts user from request context (set by auth middleware).
func getUserFromRequest(r *http.Request) *userInfo {
	if u, ok := r.Context().Value("user").(*userInfo); ok {
		return u
	}
	return nil
}

type userInfo struct {
	ID string
}
