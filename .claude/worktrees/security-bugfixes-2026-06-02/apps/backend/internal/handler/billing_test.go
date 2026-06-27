package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dra-platform/backend/internal/handler"
	"dra-platform/backend/internal/pkg/response"
)

func TestEmbed_RequiresAuth(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/embeddings", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.Embed(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestEmbed_InvalidJSON(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/embeddings", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.Embed(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestEmbed_MissingModel(t *testing.T) {
	h := &handler.Handler{}
	body := map[string]any{"model": "", "input": []string{"hello"}}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/embeddings", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.Embed(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestEmbed_MissingInput(t *testing.T) {
	h := &handler.Handler{}
	body := map[string]any{"model": "text-embedding-3-small", "input": []string{}}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/embeddings", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.Embed(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestStripeWebhook_NotConfigured(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.StripeWebhook(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 when stripe not configured, got %d", rr.Code)
	}
}

func TestCreateBudgetAlert_InvalidJSON(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/credits/budget/alerts", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateBudgetAlert(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestDeleteBudgetAlert_RequiresAuth(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodDelete, "/api/credits/budget/alerts/123", nil)
	rr := httptest.NewRecorder()

	h.DeleteBudgetAlert(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestGetBudgetCap_RequiresAuth(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodGet, "/api/credits/budget/cap", nil)
	rr := httptest.NewRecorder()

	h.GetBudgetCap(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestResponseEnvelopeFormat(t *testing.T) {
	rr := httptest.NewRecorder()
	response.OK(rr, map[string]string{"test": "value"})

	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if _, ok := body["success"]; !ok {
		t.Error("expected 'success' field in response envelope")
	}
	if _, ok := body["data"]; !ok {
		t.Error("expected 'data' field in response envelope")
	}
}

func TestResponseErrorEnvelope(t *testing.T) {
	rr := httptest.NewRecorder()
	response.Error(rr, 400, "bad request")

	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if success, ok := body["success"].(bool); !ok || success {
		t.Error("expected success=false in error response")
	}
	if msg, ok := body["error"].(string); !ok || msg != "bad request" {
		t.Errorf("expected error='bad request', got %v", body["error"])
	}
}
