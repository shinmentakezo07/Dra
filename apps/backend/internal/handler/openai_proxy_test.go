package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dra-platform/backend/internal/handler"
)

func TestChatProxy_RequiresAuth(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.ChatProxy(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestChatProxy_InvalidJSON(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.ChatProxy(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without user context, got %d", rr.Code)
	}
}

func TestAnthropicMessages_InvalidJSON(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AnthropicMessages(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid JSON, got %d", rr.Code)
	}
}

func TestAnthropicMessages_MissingModel(t *testing.T) {
	h := &handler.Handler{}
	body := map[string]any{"model": "", "messages": []map[string]string{{"role": "user", "content": "hi"}}}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AnthropicMessages(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing model, got %d", rr.Code)
	}
}

func TestBatchChat_RequiresAuth(t *testing.T) {
	h := &handler.Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/batch", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.BatchChat(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestAnthropicMessages_MissingMessages(t *testing.T) {
	h := &handler.Handler{}
	body := map[string]any{"model": "claude-3", "messages": []any{}}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.AnthropicMessages(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing messages, got %d", rr.Code)
	}
}
