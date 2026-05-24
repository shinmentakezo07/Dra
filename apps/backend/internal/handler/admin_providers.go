package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminListProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := h.adminSvc.ListProviders(r.Context())
	if err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, providers)
}

func (h *Handler) AdminGetProvider(w http.ResponseWriter, r *http.Request) {
	p, err := h.adminSvc.GetProvider(r.Context(), chi.URLParam(r, "id"))
	if err != nil { response.Error(w, 500, err.Error()); return }
	if p == nil { response.Error(w, 404, "Not found"); return }
	response.OK(w, p)
}

// AdminCreateProvider creates a new provider. Accepts optional apiKey and models
// fields for a one-step "add OpenAI-compatible provider" flow.
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

	if err := h.adminSvc.CreateProviderFull(r.Context(), &req.Provider, req.APIKey, req.Models); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, req.Provider)
}

func (h *Handler) AdminUpdateProvider(w http.ResponseWriter, r *http.Request) {
	var p domain.Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.UpdateProvider(r.Context(), &p); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminUpdateProviderStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct{ Status string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.ToggleProviderStatus(r.Context(), id, domain.ProviderStatus(req.Status)); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminListProviderKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := h.adminSvc.ListProviderKeys(r.Context(), chi.URLParam(r, "id"))
	if err != nil { response.Error(w, 500, err.Error()); return }
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
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, req.ProviderKey)
}

func (h *Handler) AdminDeleteProviderKey(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.DeleteProviderKey(r.Context(), chi.URLParam(r, "keyId")); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminDeleteProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.adminSvc.DeleteProvider(r.Context(), id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminReorderProviderKeys(w http.ResponseWriter, r *http.Request) {
	var req struct{ KeyIDs []string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid body"); return }
	if err := h.adminSvc.ReorderProviderKeys(r.Context(), chi.URLParam(r, "id"), req.KeyIDs); err != nil { response.Error(w, 500, err.Error()); return }
	response.OK(w, map[string]string{"status": "reordered"})
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

	// Normalize base URL: strip trailing /v1 if present, then append /v1/models
	baseURL := strings.TrimRight(req.BaseURL, "/")
	if strings.HasSuffix(baseURL, "/v1") {
		baseURL = strings.TrimSuffix(baseURL, "/v1")
	}
	modelsURL := baseURL + "/v1/models"

	client := &http.Client{}
	httpReq, err := http.NewRequestWithContext(r.Context(), "GET", modelsURL, nil)
	if err != nil {
		response.Error(w, 500, fmt.Sprintf("create request: %v", err))
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if req.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		response.Error(w, 502, fmt.Sprintf("failed to fetch models: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		response.Error(w, resp.StatusCode, fmt.Sprintf("provider returned %d: %s", resp.StatusCode, string(body)))
		return
	}

	// Parse OpenAI-compatible response: {"data": [{"id": "...", ...}, ...]}
	var result struct {
		Data []map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		response.Error(w, 500, fmt.Sprintf("parse response: %v", err))
		return
	}

	// Transform to a simpler format for the admin UI
	type ModelInfo struct {
		ID     string `json:"id"`
		Object string `json:"object,omitempty"`
		Owned  string `json:"owned_by,omitempty"`
	}
	models := make([]ModelInfo, 0, len(result.Data))
	for _, m := range result.Data {
		info := ModelInfo{}
		if id, ok := m["id"].(string); ok {
			info.ID = id
		}
		if obj, ok := m["object"].(string); ok {
			info.Object = obj
		}
		if owned, ok := m["owned_by"].(string); ok {
			info.Owned = owned
		}
		models = append(models, info)
	}

	response.OK(w, map[string]interface{}{
		"models": models,
		"total":  len(models),
	})
}
