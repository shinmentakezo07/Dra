package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dra-platform/backend/internal/handler"
)

func init() {
	// Skip SSRF validation in tests (httptest.NewServer uses localhost)
	handler.SetSkipSSRFCheck(true)
}

func TestAdminFetchModels_InvalidBody(t *testing.T) {
	h := &handler.Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid body, got %d", rr.Code)
	}
}

func TestAdminFetchModels_MissingBaseURL(t *testing.T) {
	h := &handler.Handler{}

	body := map[string]string{"baseUrl": ""}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing baseUrl, got %d", rr.Code)
	}
}

func TestAdminFetchModels_Success(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("expected /v1/models, got %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-api-key" {
			t.Fatalf("expected Bearer test-api-key, got %s", got)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": []interface{}{
				map[string]string{"id": "gpt-4o", "object": "model", "owned_by": "openai"},
				map[string]string{"id": "claude-3-opus", "object": "model", "owned_by": "anthropic"},
			},
		})
	}))
	defer provider.Close()

	h := &handler.Handler{}

	body := map[string]string{"baseUrl": provider.URL, "apiKey": "test-api-key"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	data, ok := resp["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", resp["data"])
	}

	models, ok := data["models"].([]interface{})
	if !ok {
		t.Fatalf("expected models array, got %T", data["models"])
	}
	if len(models) != 2 {
		t.Fatalf("expected 2 models, got %d", len(models))
	}

	total, ok := data["total"].(float64)
	if !ok || total != 2 {
		t.Fatalf("expected total=2, got %v", data["total"])
	}
}

func TestAdminFetchModels_StripsTrailingV1(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("expected /v1/models, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": []interface{}{}})
	}))
	defer provider.Close()

	h := &handler.Handler{}

	body := map[string]string{"baseUrl": provider.URL + "/v1", "apiKey": "key"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 with trailing /v1 in baseUrl, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAdminFetchModels_ProviderError(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "invalid api key"}`))
	}))
	defer provider.Close()

	h := &handler.Handler{}

	body := map[string]string{"baseUrl": provider.URL, "apiKey": "bad-key"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 from provider, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAdminFetchModels_TransformsModelFields(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": []interface{}{
				map[string]interface{}{
					"id":         "gpt-4o-mini",
					"object":     "model",
					"owned_by":   "openai",
					"created":    float64(1700000000),
					"permission": []string{},
				},
			},
		})
	}))
	defer provider.Close()

	h := &handler.Handler{}

	body := map[string]string{"baseUrl": provider.URL}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/providers/models", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AdminFetchModels(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	models := data["models"].([]interface{})
	model := models[0].(map[string]interface{})

	if _, exists := model["created"]; exists {
		t.Fatal("expected 'created' field to be stripped from transformed model")
	}
	if model["id"] != "gpt-4o-mini" {
		t.Fatalf("expected id=gpt-4o-mini, got %v", model["id"])
	}
	if model["owned_by"] != "openai" {
		t.Fatalf("expected owned_by=openai, got %v", model["owned_by"])
	}
}
