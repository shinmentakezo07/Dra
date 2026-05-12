package sdk

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClientHealth(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"status": "ok", "version": "1.0.0"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.Health(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "ok" {
		t.Errorf("expected status ok, got %s", resp.Status)
	}
}

func TestClientAuth(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]interface{}{
			"user":  map[string]string{"id": "1", "name": "Alice", "email": "alice@example.com", "role": "user"},
			"token": "jwt-token-123",
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.Login(context.Background(), "alice@example.com", "password")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.User.Email != "alice@example.com" {
		t.Errorf("expected alice@example.com, got %s", resp.User.Email)
	}
	if resp.Token != "jwt-token-123" {
		t.Errorf("expected jwt-token-123, got %s", resp.Token)
	}
}

func TestClientErrorMapping(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(envelope{Success: false, Error: "Unauthorized"})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	_, err := client.Me(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected APIError, got %T", err)
	}
	if apiErr.Status != 401 {
		t.Errorf("expected status 401, got %d", apiErr.Status)
	}
}

func TestClientRetry(t *testing.T) {
	attempts := 0
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"status": "ok"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(2), WithTimeout(5*time.Second))
	_, err := client.Health(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if attempts != 2 {
		t.Errorf("expected 2 attempts, got %d", attempts)
	}
}

func mustRawJSON(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return json.RawMessage(b)
}
