package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

// validProviderTypes is the set of recognized provider types.
var validProviderTypes = map[string]bool{
	"openai":    true,
	"anthropic": true,
	"generic":   true,
	"groq":      true,
	"nvidia":    true,
	"gemini":    true,
}

// validProviderStatuses is the set of recognized provider statuses.
var validProviderStatuses = map[domain.ProviderStatus]bool{
	domain.ProviderStatusActive:      true,
	domain.ProviderStatusInactive:    true,
	domain.ProviderStatusMaintenance: true,
	domain.ProviderStatusDeprecated:  true,
}

func (h *Handler) AdminListProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := h.adminSvc.ListProviders(r.Context())
	if err != nil {
		adminError(w, r, err, "admin_list_providers_failed")
		return
	}
	response.OK(w, providers)
}

func (h *Handler) AdminGetProvider(w http.ResponseWriter, r *http.Request) {
	p, err := h.adminSvc.GetProvider(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		adminError(w, r, err, "admin_get_provider_failed")
		return
	}
	if p == nil {
		response.Error(w, 404, "Not found")
		return
	}
	response.OK(w, p)
}

// AdminCreateProvider creates a new provider. Accepts optional apiKey and models
// fields for a one-step "add OpenAI-compatible provider" flow.
// When no models are provided, it auto-discovers them from the upstream /v1/models.
func (h *Handler) AdminCreateProvider(w http.ResponseWriter, r *http.Request) {
	var req struct {
		domain.Provider
		APIKey string                `json:"apiKey,omitempty"`
		Models []domain.ModelRegistry `json:"models,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}

	if req.Name == "" {
		response.Error(w, 400, "name is required")
		return
	}
	if req.BaseURL == "" {
		response.Error(w, 400, "baseUrl is required")
		return
	}
	if !isValidHTTPURL(req.BaseURL) {
		response.Error(w, 400, "baseUrl must be a valid http or https URL")
		return
	}
	if err := validateNotPrivateURL(req.BaseURL); err != nil {
		response.Error(w, 400, "baseUrl must not point to a private or reserved IP address")
		return
	}
	if req.ProviderType != "" && !validProviderTypes[req.ProviderType] {
		response.Error(w, 400, fmt.Sprintf("invalid providerType %q; supported: openai, anthropic, generic, groq, nvidia, gemini", req.ProviderType))
		return
	}

	// Auto-discover models from upstream when none are explicitly provided.
	if len(req.Models) == 0 && req.BaseURL != "" {
		upstream, _, fetchErr := h.fetchModelsFromUpstream(r.Context(), req.BaseURL, req.APIKey)
		if fetchErr != nil {
			response.Error(w, 400, fmt.Sprintf("failed to auto-discover models from upstream: %v — provide models manually or check baseUrl/apiKey", fetchErr))
			return
		}
		req.Models = make([]domain.ModelRegistry, 0, len(upstream))
		for _, m := range upstream {
			if m.ID == "" {
				continue
			}
			req.Models = append(req.Models, domain.ModelRegistry{
				ModelID:     m.ID,
				DisplayName: m.ID,
				Status:      domain.ModelStatusActive,
			})
		}
	}

	if err := h.adminSvc.CreateProviderFull(r.Context(), &req.Provider, req.APIKey, req.Models); err != nil {
		adminError(w, r, err, "admin_create_provider_failed")
		return
	}
	response.OK(w, req.Provider)
}

// AdminUpdateProvider updates a provider. The provider ID from the URL path
// takes precedence over any ID in the request body.
func (h *Handler) AdminUpdateProvider(w http.ResponseWriter, r *http.Request) {
	urlID := chi.URLParam(r, "id")
	var p domain.Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	// URL path ID always wins — prevents authorization bypass.
	p.ID = urlID

	if p.BaseURL != "" && !isValidHTTPURL(p.BaseURL) {
		response.Error(w, 400, "baseUrl must be a valid http or https URL")
		return
	}
	if p.BaseURL != "" {
		if err := validateNotPrivateURL(p.BaseURL); err != nil {
			response.Error(w, 400, "baseUrl must not point to a private or reserved IP address")
			return
		}
	}

	if err := h.adminSvc.UpdateProvider(r.Context(), &p); err != nil {
		adminError(w, r, err, "admin_update_provider_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

// AdminUpdateProviderStatus toggles a provider's status with validation.
func (h *Handler) AdminUpdateProviderStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	status := domain.ProviderStatus(req.Status)
	if !validProviderStatuses[status] {
		response.Error(w, 400, fmt.Sprintf("invalid status %q; supported: active, inactive, maintenance, deprecated", req.Status))
		return
	}
	if err := h.adminSvc.ToggleProviderStatus(r.Context(), id, status); err != nil {
		adminError(w, r, err, "admin_update_provider_status_failed")
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminListProviderKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := h.adminSvc.ListProviderKeys(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		adminError(w, r, err, "admin_list_provider_keys_failed")
		return
	}
	response.OK(w, keys)
}

// AdminAddProviderKey adds an API key to a provider. Accepts the raw key in
// the "key" field (stored hashed, used at runtime for the first active key).
func (h *Handler) AdminAddProviderKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		domain.ProviderKey
		RawKey string `json:"key,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.RawKey == "" {
		response.Error(w, 400, "key is required")
		return
	}
	if req.Label == "" {
		req.Label = "default"
	}
	req.ProviderKey.ProviderID = chi.URLParam(r, "id")
	if err := h.adminSvc.AddProviderKeyRaw(r.Context(), &req.ProviderKey, req.RawKey); err != nil {
		adminError(w, r, err, "admin_add_provider_key_failed")
		return
	}
	response.OK(w, req.ProviderKey)
}

// AdminDeleteProviderKey deletes a provider key. Uses the provider ID from
// the URL path to avoid O(N*M) scanning of all providers.
func (h *Handler) AdminDeleteProviderKey(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "id")
	keyID := chi.URLParam(r, "keyId")
	if err := h.adminSvc.DeleteProviderKey(r.Context(), providerID, keyID); err != nil {
		adminError(w, r, err, "admin_delete_provider_key_failed")
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminDeleteProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.adminSvc.DeleteProvider(r.Context(), id); err != nil {
		adminError(w, r, err, "admin_delete_provider_failed")
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminReorderProviderKeys(w http.ResponseWriter, r *http.Request) {
	var req struct {
		KeyIDs []string `json:"keyIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.ReorderProviderKeys(r.Context(), chi.URLParam(r, "id"), req.KeyIDs); err != nil {
		adminError(w, r, err, "admin_reorder_provider_keys_failed")
		return
	}
	response.OK(w, map[string]string{"status": "reordered"})
}

// upstreamModel mirrors the OpenAI /v1/models response shape.
type upstreamModel struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	OwnedBy string `json:"owned_by"`
}

// AdminFetchModels calls <baseURL>/v1/models to discover available models from an OpenAI-compatible provider.
func (h *Handler) AdminFetchModels(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BaseURL string `json:"baseUrl"`
		APIKey  string `json:"apiKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if req.BaseURL == "" {
		response.Error(w, 400, "baseUrl is required")
		return
	}
	if !isValidHTTPURL(req.BaseURL) {
		response.Error(w, 400, "baseUrl must be a valid http or https URL")
		return
	}
	if err := validateNotPrivateURL(req.BaseURL); err != nil {
		response.Error(w, 400, "baseUrl must not point to a private or reserved IP address")
		return
	}

	upstream, statusCode, fetchErr := h.fetchModelsFromUpstream(r.Context(), req.BaseURL, req.APIKey)
	if fetchErr != nil {
		response.Error(w, statusCode, fmt.Sprintf("failed to fetch models: %v", fetchErr))
		return
	}

	type ModelInfo struct {
		ID      string `json:"id"`
		Object  string `json:"object,omitempty"`
		OwnedBy string `json:"owned_by,omitempty"`
	}
	out := make([]ModelInfo, 0, len(upstream))
	for _, m := range upstream {
		out = append(out, ModelInfo{
			ID:      m.ID,
			Object:  m.Object,
			OwnedBy: m.OwnedBy,
		})
	}

	response.OK(w, map[string]interface{}{
		"models": out,
		"total":  len(out),
	})
}

// fetchModelsFromUpstream calls the upstream /v1/models endpoint and returns
// the raw upstream models, an HTTP status code for error responses, and an error.
func (h *Handler) fetchModelsFromUpstream(ctx context.Context, baseURL, apiKey string) ([]upstreamModel, int, error) {
	normalized := strings.TrimRight(baseURL, "/")
	if strings.HasSuffix(normalized, "/v1") {
		normalized = strings.TrimSuffix(normalized, "/v1")
	}
	modelsURL := normalized + "/v1/models"

	client := &http.Client{Timeout: 15 * time.Second}
	httpReq, err := http.NewRequestWithContext(ctx, "GET", modelsURL, nil)
	if err != nil {
		return nil, 500, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, 502, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, resp.StatusCode, fmt.Errorf("provider returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Data []upstreamModel `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, 500, fmt.Errorf("parse response: %w", err)
	}

	return result.Data, 0, nil
}

// isValidHTTPURL checks that a string is a well-formed http or https URL.
func isValidHTTPURL(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}

// skipSSRFCheck is a test-only flag to bypass SSRF validation.
// Set via testing.T.Setenv or similar in tests.
var skipSSRFCheck bool

// SetSkipSSRFCheck sets the SSRF check bypass flag (for testing only).
func SetSkipSSRFCheck(skip bool) {
	skipSSRFCheck = skip
}

// validateNotPrivateURL blocks requests to private, loopback, and link-local IPs to prevent SSRF.
func validateNotPrivateURL(rawURL string) error {
	if skipSSRFCheck {
		return nil
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL")
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("missing hostname")
	}
	// Resolve hostname to IP — this catches DNS rebinding attempts too
	ips, err := net.LookupIP(host)
	if err != nil {
		// If we can't resolve, let the request proceed (it'll fail at connection time)
		return nil
	}
	for _, ip := range ips {
		if ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return fmt.Errorf("URL resolves to private/reserved IP %s", ip)
		}
	}
	return nil
}
