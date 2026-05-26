package webhook

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	SetSkipWebhookSSRFCheck(true)
	os.Exit(m.Run())
}

func TestIsEventAllowed(t *testing.T) {
	tests := []struct {
		eventType string
		allowed   []string
		want      bool
	}{
		{"chat.completed", []string{"chat.completed"}, true},
		{"chat.completed", []string{"*"}, true},
		{"chat.completed", []string{"key.created"}, false},
		{"chat.completed", nil, true},
		{"chat.completed", []string{}, true},
	}
	for _, tt := range tests {
		got := isEventAllowed(tt.eventType, tt.allowed)
		if got != tt.want {
			t.Errorf("isEventAllowed(%q, %v) = %v, want %v", tt.eventType, tt.allowed, got, tt.want)
		}
	}
}

func TestSignPayload(t *testing.T) {
	sig := signPayload([]byte("test-payload"), "secret-key")
	if sig == "" {
		t.Fatal("signPayload returned empty signature")
	}
	if len(sig) != 64 {
		t.Errorf("signature length = %d, want 64 (sha256 hex)", len(sig))
	}
}

func TestGenerateID(t *testing.T) {
	id1 := generateID()
	id2 := generateID()
	if !strings.HasPrefix(id1, "wh_") {
		t.Errorf("ID %q should start with wh_", id1)
	}
	if id1 == id2 {
		t.Error("generateID() returned duplicate IDs")
	}
}

func TestDispatcher_Send_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", r.Header.Get("Content-Type"))
		}
		if r.Header.Get("X-Event-Type") != "chat.completed" {
			t.Errorf("X-Event-Type = %q, want chat.completed", r.Header.Get("X-Event-Type"))
		}
		if !strings.HasPrefix(r.Header.Get("X-Webhook-Signature"), "sha256=") {
			t.Error("X-Webhook-Signature should start with sha256=")
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:    server.URL,
		Secret: "test-secret",
		Events: []string{"chat.completed"},
	}
	event := Event{
		Type:      "chat.completed",
		Timestamp: time.Now(),
		Payload:   map[string]interface{}{"model": "gpt-4o"},
	}

	delivery, err := d.Send(context.Background(), cfg, event)
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if delivery.Status != http.StatusOK {
		t.Errorf("Status = %d, want %d", delivery.Status, http.StatusOK)
	}
	if delivery.URL != server.URL {
		t.Errorf("URL = %q, want %q", delivery.URL, server.URL)
	}
}

func TestDispatcher_Send_EventNotAllowed(t *testing.T) {
	d := NewDispatcher()
	cfg := Config{
		URL:    "http://localhost:9999",
		Events: []string{"key.created"},
	}
	event := Event{Type: "chat.completed", Timestamp: time.Now()}

	_, err := d.Send(context.Background(), cfg, event)
	if err == nil {
		t.Fatal("Send() for disallowed event: expected error, got nil")
	}
	if !strings.Contains(err.Error(), "not subscribed") {
		t.Errorf("error = %q, want 'not subscribed'", err.Error())
	}
}

func TestDispatcher_Send_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:    server.URL,
		Events: []string{"*"},
	}
	event := Event{Type: "test", Timestamp: time.Now()}

	_, err := d.Send(context.Background(), cfg, event)
	if err == nil {
		t.Fatal("Send() with 500: expected error, got nil")
	}
}

func TestDispatcher_Send_CustomHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Custom-Header") != "custom-value" {
			t.Errorf("X-Custom-Header = %q, want custom-value", r.Header.Get("X-Custom-Header"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:     server.URL,
		Events:  []string{"*"},
		Headers: map[string]string{"X-Custom-Header": "custom-value"},
	}
	event := Event{Type: "test", Timestamp: time.Now()}

	_, err := d.Send(context.Background(), cfg, event)
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
}

func TestDispatcher_SendWithRetry_Success(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:      server.URL,
		Events:   []string{"*"},
		RetryMax: 3,
		Timeout:  5 * time.Second,
	}
	event := Event{Type: "test", Timestamp: time.Now()}

	delivery, err := d.SendWithRetry(context.Background(), cfg, event)
	if err != nil {
		t.Fatalf("SendWithRetry() error = %v", err)
	}
	if delivery.Attempts != 2 {
		t.Errorf("Attempts = %d, want 2", delivery.Attempts)
	}
}

func TestDispatcher_SendWithRetry_Exhausted(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:      server.URL,
		Events:   []string{"*"},
		RetryMax: 1,
		Timeout:  time.Second,
	}
	event := Event{Type: "test", Timestamp: time.Now()}

	_, err := d.SendWithRetry(context.Background(), cfg, event)
	if err == nil {
		t.Fatal("SendWithRetry() with all failures: expected error, got nil")
	}
}

func TestDispatcher_SendWithRetry_NoRetryOn4xx(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:      server.URL,
		Events:   []string{"*"},
		RetryMax: 3,
		Timeout:  time.Second,
	}
	event := Event{Type: "test", Timestamp: time.Now()}

	_, err := d.SendWithRetry(context.Background(), cfg, event)
	if err == nil {
		t.Fatal("SendWithRetry() with 400: expected error, got nil")
	}
	if attempts != 1 {
		t.Errorf("attempts = %d, want 1 (no retry on 4xx)", attempts)
	}
}

func TestExponentialBackoff(t *testing.T) {
	d1 := exponentialBackoff(1)
	d2 := exponentialBackoff(2)
	d3 := exponentialBackoff(10)

	if d1 <= 0 {
		t.Errorf("backoff(1) = %v, want > 0", d1)
	}
	if d2 <= d1 {
		t.Errorf("backoff(2) = %v, want > backoff(1) = %v", d2, d1)
	}
	if d3 > 60*time.Second {
		t.Errorf("backoff(10) = %v, want <= 60s (cap)", d3)
	}
}

func TestNewDispatcher(t *testing.T) {
	d := NewDispatcher()
	if d == nil {
		t.Fatal("NewDispatcher() returned nil")
	}
	if d.client.Timeout != 30*time.Second {
		t.Errorf("client timeout = %v, want 30s", d.client.Timeout)
	}
}

func TestDispatcher_SendWithIdempotency(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Idempotency-Key") != "test-key-123" {
			t.Errorf("X-Idempotency-Key = %q, want test-key-123", r.Header.Get("X-Idempotency-Key"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	d := NewDispatcher()
	cfg := Config{
		URL:    server.URL,
		Secret: "test-secret",
		Events: []string{"chat.completed"},
	}
	event := Event{
		Type:      "chat.completed",
		Timestamp: time.Now(),
		Payload:   map[string]interface{}{"model": "gpt-4o"},
	}

	delivery, err := d.SendWithIdempotency(context.Background(), cfg, event, "test-key-123")
	if err != nil {
		t.Fatalf("SendWithIdempotency() error = %v", err)
	}
	if delivery.Status != http.StatusOK {
		t.Errorf("Status = %d, want %d", delivery.Status, http.StatusOK)
	}
}
