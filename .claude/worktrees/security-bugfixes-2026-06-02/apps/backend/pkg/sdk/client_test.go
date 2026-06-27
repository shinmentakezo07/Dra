package sdk

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestClientOAuthLogin(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/oauth", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		var req OAuthRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.Provider != "github" {
			t.Errorf("expected provider github, got %s", req.Provider)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(OAuthResponse{
			User:  User{ID: "1", Name: "Alice", Email: "alice@github.com", Role: "user"},
			Token: "oauth-token",
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.OAuthLogin(context.Background(), OAuthRequest{Provider: "github", Code: "code123"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.User.Email != "alice@github.com" {
		t.Errorf("expected alice@github.com, got %s", resp.User.Email)
	}
	if resp.Token != "oauth-token" {
		t.Errorf("expected oauth-token, got %s", resp.Token)
	}
}

func TestClientForgotPassword(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/forgot-password", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.ForgotPassword(context.Background(), "alice@example.com"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientResetPassword(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/reset-password", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.ResetPassword(context.Background(), "reset-token", "newPass123!"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientGetBudget(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/credits/budget", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(BudgetConfig{
			ID: "b1", UserID: "u1", MonthlyLimit: 10000, DailyLimit: 500, NotifyAtPercent: 80,
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	b, err := client.GetBudget(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if b.MonthlyLimit != 10000 {
		t.Errorf("expected monthly limit 10000, got %d", b.MonthlyLimit)
	}
}

func TestClientSetBudget(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/credits/budget", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PUT" {
			t.Errorf("expected PUT, got %s", r.Method)
		}
		var cfg BudgetConfig
		json.NewDecoder(r.Body).Decode(&cfg)
		if cfg.MonthlyLimit != 20000 {
			t.Errorf("expected monthly limit 20000, got %d", cfg.MonthlyLimit)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(cfg)})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	b, err := client.SetBudget(context.Background(), BudgetConfig{MonthlyLimit: 20000, DailyLimit: 1000, NotifyAtPercent: 90})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if b.MonthlyLimit != 20000 {
		t.Errorf("expected monthly limit 20000, got %d", b.MonthlyLimit)
	}
}

func TestClientListConversations(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{
			Success: true,
			Data:    mustRawJSON([]Conversation{{ID: "c1", Title: "Chat 1", Model: "gpt-4"}}),
			Meta:    &PaginatedMeta{Total: 1, Page: 1, Limit: 20, TotalPages: 1},
		})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	convs, err := client.ListConversations(context.Background(), 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(convs.Data) != 1 {
		t.Errorf("expected 1 conversation, got %d", len(convs.Data))
	}
}

func TestClientCreateConversation(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Conversation{ID: "c2", Title: body["title"], Model: body["model"]})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	conv, err := client.CreateConversation(context.Background(), "New Chat", "gpt-4")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.Title != "New Chat" {
		t.Errorf("expected title 'New Chat', got %s", conv.Title)
	}
}

func TestClientGetConversation(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations/c1", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Conversation{ID: "c1", Title: "Chat 1", Model: "gpt-4"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	conv, err := client.GetConversation(context.Background(), "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.ID != "c1" {
		t.Errorf("expected id c1, got %s", conv.ID)
	}
}

func TestClientDeleteConversation(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations/c1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "DELETE" {
			t.Errorf("expected DELETE, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.DeleteConversation(context.Background(), "c1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientAddMessage(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations/c1/messages", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(ConversationMessage{
			ID: "m1", ConversationID: "c1", Role: "user", Content: "Hello",
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	msg, err := client.AddMessage(context.Background(), "c1", "user", "Hello")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Content != "Hello" {
		t.Errorf("expected content 'Hello', got %s", msg.Content)
	}
}

func TestClientListPrompts(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/prompts", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]Prompt{
			{Name: "greeting", Content: "Hello {{name}}", Template: true},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	prompts, err := client.ListPrompts(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(prompts) != 1 {
		t.Errorf("expected 1 prompt, got %d", len(prompts))
	}
}

func TestClientCreatePrompt(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/prompts", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Prompt{Name: "test-prompt", Content: "Test content"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	p, err := client.CreatePrompt(context.Background(), "test-prompt", "Test content", "", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name != "test-prompt" {
		t.Errorf("expected name 'test-prompt', got %s", p.Name)
	}
}

func TestClientGetPrompt(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/prompts/test-prompt", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Prompt{Name: "test-prompt", Content: "Hello {{name}}"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	p, err := client.GetPrompt(context.Background(), "test-prompt")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name != "test-prompt" {
		t.Errorf("expected name 'test-prompt', got %s", p.Name)
	}
}

func TestClientRenderPrompt(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/prompts/test-prompt/render", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(RenderResponse{Rendered: "Hello Alice"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	rr, err := client.RenderPrompt(context.Background(), "test-prompt", map[string]string{"name": "Alice"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rr.Rendered != "Hello Alice" {
		t.Errorf("expected 'Hello Alice', got %s", rr.Rendered)
	}
}

func TestClientDeletePrompt(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/prompts/test-prompt", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "DELETE" {
			t.Errorf("expected DELETE, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.DeletePrompt(context.Background(), "test-prompt"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientListWebhooks(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/webhooks", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]Webhook{
			{ID: "w1", Name: "My Webhook", URL: "https://example.com/hook", Events: []string{"message.created"}, Active: true},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	hooks, err := client.ListWebhooks(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(hooks) != 1 {
		t.Errorf("expected 1 webhook, got %d", len(hooks))
	}
}

func TestClientCreateWebhook(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/webhooks", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Webhook{ID: "w2", Name: "New Hook", URL: "https://hook.example.com", Events: []string{"message.created"}, Active: true})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	h, err := client.CreateWebhook(context.Background(), "New Hook", "https://hook.example.com", []string{"message.created"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.ID != "w2" {
		t.Errorf("expected id w2, got %s", h.ID)
	}
}

func TestClientGetWebhook(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/webhooks/w1", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Webhook{ID: "w1", Name: "My Webhook"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	h, err := client.GetWebhook(context.Background(), "w1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.Name != "My Webhook" {
		t.Errorf("expected 'My Webhook', got %s", h.Name)
	}
}

func TestClientUpdateWebhook(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/webhooks/w1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PUT" {
			t.Errorf("expected PUT, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Webhook{ID: "w1", Name: "Updated Hook", URL: "https://new-url.com/hook"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	h, err := client.UpdateWebhook(context.Background(), "w1", Webhook{Name: "Updated Hook", URL: "https://new-url.com/hook"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if h.Name != "Updated Hook" {
		t.Errorf("expected 'Updated Hook', got %s", h.Name)
	}
}

func TestClientDeleteWebhook(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/webhooks/w1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "DELETE" {
			t.Errorf("expected DELETE, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.DeleteWebhook(context.Background(), "w1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientListOrganizations(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]Organization{
			{ID: "org1", Name: "My Org", OwnerID: "u1"},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	orgs, err := client.ListOrganizations(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(orgs) != 1 {
		t.Errorf("expected 1 org, got %d", len(orgs))
	}
}

func TestClientCreateOrganization(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Organization{ID: "org2", Name: "New Org"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	org, err := client.CreateOrganization(context.Background(), "New Org")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if org.Name != "New Org" {
		t.Errorf("expected 'New Org', got %s", org.Name)
	}
}

func TestClientGetOrganization(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations/org1", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(Organization{ID: "org1", Name: "My Org"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	org, err := client.GetOrganization(context.Background(), "org1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if org.Name != "My Org" {
		t.Errorf("expected 'My Org', got %s", org.Name)
	}
}

func TestClientInviteMember(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations/org1/invite", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.InviteMember(context.Background(), "org1", "bob@example.com", "member"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientRemoveMember(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations/org1/members/u2", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "DELETE" {
			t.Errorf("expected DELETE, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.RemoveMember(context.Background(), "org1", "u2"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientListMembers(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/organizations/org1/members", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]OrgMember{
			{UserID: "u1", Name: "Alice", Email: "alice@example.com", Role: "owner"},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	members, err := client.ListMembers(context.Background(), "org1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(members) != 1 {
		t.Errorf("expected 1 member, got %d", len(members))
	}
}

func TestClientAcceptInvite(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/invites/accept", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.AcceptInvite(context.Background(), "invite-token"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientSubmitBatch(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/batch", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(BatchJob{ID: "batch1", Status: "pending", Total: 2})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	job, err := client.SubmitBatch(context.Background(), BatchSubmitRequest{
		Requests: []BatchChatRequest{
			{Model: "gpt-4", Messages: []ChatMessage{{Role: "user", Content: "Hi"}}},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if job.Status != "pending" {
		t.Errorf("expected status pending, got %s", job.Status)
	}
}

func TestClientGetBatchJob(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/batch/batch1", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(BatchJob{ID: "batch1", Status: "completed", Total: 10, Completed: 10})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	job, err := client.GetBatchJob(context.Background(), "batch1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if job.Completed != 10 {
		t.Errorf("expected 10 completed, got %d", job.Completed)
	}
}

func TestClientUploadFile(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/files/upload", func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
			t.Errorf("expected multipart/form-data content type")
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(FileInfo{ID: "f1", Name: "test.txt", Size: 11, MimeType: "text/plain"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	content := strings.NewReader("hello world")
	f, err := client.UploadFile(context.Background(), "test.txt", content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.Name != "test.txt" {
		t.Errorf("expected name 'test.txt', got %s", f.Name)
	}
}

func TestClientListFiles(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/files", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]FileInfo{
			{ID: "f1", Name: "test.txt", Size: 1024, MimeType: "text/plain"},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	files, err := client.ListFiles(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(files) != 1 {
		t.Errorf("expected 1 file, got %d", len(files))
	}
}

func TestClientEmbed(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/embeddings", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(EmbeddingResponse{
			Model:      "text-embedding-3",
			Embeddings: [][]float32{{0.1, 0.2, 0.3}},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.Embed(context.Background(), EmbeddingRequest{Model: "text-embedding-3", Input: []string{"hello"}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Model != "text-embedding-3" {
		t.Errorf("expected model text-embedding-3, got %s", resp.Model)
	}
}

func TestClientValidate(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/validate", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(ValidateResponse{Valid: true})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.Validate(context.Background(), ValidateRequest{
		Schema: json.RawMessage(`{"type": "object"}`),
		Data:   json.RawMessage(`{"name": "test"}`),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Valid {
		t.Errorf("expected valid=true")
	}
}

func TestClientOpenAIChatCompletions(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]interface{}{
			"id":      "chatcmpl-123",
			"object":  "chat.completion",
			"choices": []interface{}{},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.OpenAIChatCompletions(context.Background(), json.RawMessage(`{"model":"gpt-4"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Errorf("expected non-nil response data")
	}
}

func TestClientOpenAIListModels(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/models", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]interface{}{
			"object": "list",
			"data":   []interface{}{},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	resp, err := client.OpenAIListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Errorf("expected non-nil response data")
	}
}

func TestClientAdminCircuitBreakers(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/admin/circuit-breakers", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]CircuitBreakerStatus{
			{Provider: "openai", State: "closed", FailureCount: 0},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	statuses, err := client.AdminCircuitBreakers(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(statuses) != 1 {
		t.Errorf("expected 1 status, got %d", len(statuses))
	}
}

func TestClientAdminProviderHealth(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/admin/provider-health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]ProviderHealthStatus{
			{Provider: "openai", Healthy: true, Latency: 150},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	statuses, err := client.AdminProviderHealth(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(statuses) != 1 {
		t.Errorf("expected 1 status, got %d", len(statuses))
	}
}

func TestClientProviderHealth(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health/providers", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]ProviderSummary{
			{Provider: "openai", Status: "healthy", Models: 10},
		})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	summaries, err := client.ProviderHealth(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(summaries) != 1 {
		t.Errorf("expected 1 summary, got %d", len(summaries))
	}
}

func TestVerifyWebhookSignature(t *testing.T) {
	secret := "test-secret"
	payload := []byte(`{"event":"message.created","data":{}}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	validSig := hex.EncodeToString(mac.Sum(nil))

	if err := VerifyWebhookSignature(payload, validSig, secret); err != nil {
		t.Errorf("expected valid signature, got error: %v", err)
	}
	if err := VerifyWebhookSignature(payload, "invalid-sig", secret); err == nil {
		t.Error("expected error for invalid signature")
	}
}

func mustRawJSON(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return json.RawMessage(b)
}

// --- Edge case coverage tests ---

func TestAPIFallbackError(t *testing.T) {
	err := apiError(500, "")
	if err == nil {
		t.Fatal("expected error")
	}
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.Message != "HTTP 500" {
		t.Errorf("expected 'HTTP 500', got %q", apiErr.Message)
	}
}

func TestAPINonJSONBody(t *testing.T) {
	err := apiError(502, "upstream connection refused")
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.Code != ErrInternal {
		t.Errorf("expected INTERNAL_ERROR, got %s", apiErr.Code)
	}
	if apiErr.Message != "upstream connection refused" {
		t.Errorf("expected 'upstream connection refused', got %q", apiErr.Message)
	}
}

func TestPaginatedResultNilMeta(t *testing.T) {
	e := &envelope{
		Success: true,
		Data:    mustRawJSON([]map[string]string{{"id": "1"}}),
		Meta:    nil,
	}
	pr, err := paginatedResult[map[string]string](e)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pr.Page != 1 {
		t.Errorf("expected default page 1, got %d", pr.Page)
	}
	if pr.Limit != 20 {
		t.Errorf("expected default limit 20, got %d", pr.Limit)
	}
	if pr.TotalPages != 0 {
		t.Errorf("expected default totalPages 0, got %d", pr.TotalPages)
	}
}

func TestPaginatedResultEmptyData(t *testing.T) {
	e := &envelope{
		Success: true,
		Data:    mustRawJSON([]map[string]string{}),
		Meta:    &PaginatedMeta{Total: 0, Page: 1, Limit: 20, TotalPages: 0},
	}
	pr, err := paginatedResult[map[string]string](e)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pr.Data) != 0 {
		t.Errorf("expected empty data, got %d items", len(pr.Data))
	}
}

func TestReadSSEEmptyLines(t *testing.T) {
	lines := []string{}
	ReadSSE(strings.NewReader("\n\n\n"), func(line string) bool {
		lines = append(lines, line)
		return true
	})
	if len(lines) != 0 {
		t.Errorf("expected 0 lines, got %d", len(lines))
	}
}

func TestReadSSECarriageReturn(t *testing.T) {
	lines := []string{}
	ReadSSE(strings.NewReader("data: hello\r\ndata: world\r\n"), func(line string) bool {
		lines = append(lines, line)
		return true
	})
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d: %v", len(lines), lines)
	}
	if lines[0] != "data: hello" {
		t.Errorf("expected 'data: hello', got %q", lines[0])
	}
}

func TestReadSSEPartialRead(t *testing.T) {
	r, w := io.Pipe()
	lines := []string{}
	go func() {
		w.Write([]byte("data: hello\nda"))
		w.Close()
	}()
	ReadSSE(r, func(line string) bool {
		lines = append(lines, line)
		return true
	})
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines (full line + remaining buffer), got %d: %v", len(lines), lines)
	}
	if lines[0] != "data: hello" {
		t.Errorf("expected 'data: hello', got %q", lines[0])
	}
	if lines[1] != "da" {
		t.Errorf("expected 'da', got %q", lines[1])
	}
}

func TestReadSSEStreamError(t *testing.T) {
	r, w := io.Pipe()
	lines := []string{}
	go func() {
		w.Write([]byte("data: hello\n"))
		w.CloseWithError(assertAnError{})
	}()
	ReadSSE(r, func(line string) bool {
		lines = append(lines, line)
		return true
	})
	if len(lines) != 1 {
		t.Errorf("expected 1 line before error, got %d", len(lines))
	}
}

type assertAnError struct{}

func (assertAnError) Error() string { return "boom" }

func TestNewWithOptions(t *testing.T) {
	customHTTP := &http.Client{Timeout: 5 * time.Second}
	c := New(
		WithBaseURL("https://api.example.com/"),
		WithAPIKey("test-key"),
		WithHTTPClient(customHTTP),
		WithTimeout(10*time.Second),
		WithRetries(0),
	)
	if c.baseURL != "https://api.example.com" {
		t.Errorf("expected baseURL with trimmed slash, got %q", c.baseURL)
	}
	if c.apiKey != "test-key" {
		t.Errorf("expected apiKey 'test-key', got %q", c.apiKey)
	}
	if c.httpClient.Timeout != 10*time.Second {
		t.Errorf("expected timeout 10s, got %v", c.httpClient.Timeout)
	}
	if c.retries != 0 {
		t.Errorf("expected retries 0, got %d", c.retries)
	}
}

func TestClientNotificationsStream(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/notifications/stream", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("data: {\"type\":\"info\",\"title\":\"Test\",\"message\":\"Hello\"}\n\n"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))
	eventCh, errCh := client.NotificationsStream(context.Background())
	select {
	case event := <-eventCh:
		if event.Title != "Test" {
			t.Errorf("expected title 'Test', got %q", event.Title)
		}
	case err := <-errCh:
		t.Fatalf("unexpected error: %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for event")
	}
}

func TestClientNotificationsStreamError(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/notifications/stream", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(envelope{Success: false, Error: "stream error"})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))
	eventCh, errCh := client.NotificationsStream(context.Background())
	select {
	case <-eventCh:
		t.Fatal("expected error, got event")
	case err := <-errCh:
		if err == nil {
			t.Fatal("expected non-nil error")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for error")
	}
}

func TestRateLimitHeaders(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Request-ID", "req-123")
		w.Header().Set("X-RateLimit-Limit", "100")
		w.Header().Set("X-RateLimit-Remaining", "95")
		w.Header().Set("X-RateLimit-Reset", "1700000000")
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"id": "1", "name": "Alice", "email": "alice@example.com", "role": "user"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	_, err := client.Me(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id := client.LastRequestID(); id != "req-123" {
		t.Errorf("expected request ID 'req-123', got %q", id)
	}
	rl := client.LastRateLimit()
	if rl.Limit != 100 {
		t.Errorf("expected rate limit 100, got %d", rl.Limit)
	}
	if rl.Remaining != 95 {
		t.Errorf("expected rate remaining 95, got %d", rl.Remaining)
	}
}

func TestClientRetryExhausted(t *testing.T) {
	attempts := 0
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusServiceUnavailable)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(2), WithTimeout(5*time.Second))
	_, err := client.Health(context.Background())
	if err == nil {
		t.Fatal("expected error after retries exhausted")
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts (1 initial + 2 retries), got %d", attempts)
	}
}

func TestIsHelperFunctions(t *testing.T) {
	t.Run("IsUnauthorized", func(t *testing.T) {
		if !IsUnauthorized(&APIError{Code: ErrUnauthorized}) {
			t.Error("expected true for unauthorized")
		}
		if IsUnauthorized(&APIError{Code: ErrForbidden}) {
			t.Error("expected false for forbidden")
		}
		if IsUnauthorized(fmt.Errorf("random")) {
			t.Error("expected false for non-APIError")
		}
	})
	t.Run("IsRateLimited", func(t *testing.T) {
		if !IsRateLimited(&APIError{Code: ErrRateLimited}) {
			t.Error("expected true for rate limited")
		}
		if IsRateLimited(fmt.Errorf("random")) {
			t.Error("expected false for non-APIError")
		}
	})
	t.Run("IsPaymentRequired", func(t *testing.T) {
		if !IsPaymentRequired(&APIError{Code: ErrPaymentRequired}) {
			t.Error("expected true for payment required")
		}
		if IsPaymentRequired(fmt.Errorf("random")) {
			t.Error("expected false for non-APIError")
		}
	})
}

func TestClientDoRequestError(t *testing.T) {
	// Invalid URL should fail in doRequest's url.Parse
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))
	// Use a path that's valid but the context will cancel
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := client.Health(ctx)
	if err == nil {
		t.Fatal("expected error with cancelled context")
	}
}

func TestClientChatStream(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("data: {\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"Hello\"},\"finish_reason\":null}]}\n\n"))
		w.Write([]byte("data: [DONE]\n\n"))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	contentCh, errCh := client.ChatStream(context.Background(), "gpt-4", []ChatMessage{{Role: "user", Content: "Hi"}})
	select {
	case content := <-contentCh:
		if content != "Hello" {
			t.Errorf("expected 'Hello', got %q", content)
		}
	case err := <-errCh:
		t.Fatalf("unexpected error: %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for content")
	}
}

func TestClientGetConversationError(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/conversations/nonexistent", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(envelope{Success: false, Error: "Not found"})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	_, err := client.GetConversation(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent conversation")
	}
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.Code != ErrNotFound {
		t.Errorf("expected NOT_FOUND, got %s", apiErr.Code)
	}
}

func TestClientRetryOnServerError(t *testing.T) {
	attempts := 0
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(envelope{Success: false, Error: "server error"})
			return
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"status": "ok"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(3), WithTimeout(5*time.Second))
	_, err := client.Health(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestUnmarshalFailurePath(t *testing.T) {
	// All methods that call unmarshalData should handle failure gracefully.
	// Send back Data that cannot be unmarshalled into the target type.
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(`not an object`)})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	_, err := client.Me(context.Background())
	if err == nil {
		t.Fatal("expected error from unmarshal failure")
	}
}

func TestZeroPercentFunctions(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/signup", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"id": "2", "name": "Bob", "email": "bob@example.com", "role": "user"})})
	})
	mux.HandleFunc("/api/auth/profile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			json.NewEncoder(w).Encode(envelope{Success: true})
		}
	})
	mux.HandleFunc("/api/auth/password", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			json.NewEncoder(w).Encode(envelope{Success: true})
		}
	})
	mux.HandleFunc("/api/keys", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]APIKey{{ID: "k1", Name: "test"}})})
	})
	mux.HandleFunc("/api/credits", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(UserCredits{Balance: 100})})
	})
	mux.HandleFunc("/api/models", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]ModelInfo{{ID: "gpt-4"}})})
	})
	mux.HandleFunc("/api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]User{{ID: "u1"}}), Meta: &PaginatedMeta{Total: 1, Page: 1, Limit: 20, TotalPages: 1}})
	})
	mux.HandleFunc("/api/admin/stats", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(PlatformStats{})})
	})
	mux.HandleFunc("/v1/embeddings", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]interface{}{"object": "list", "data": []interface{}{}})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))

	t.Run("Signup", func(t *testing.T) {
		u, err := client.Signup(context.Background(), "Bob", "bob@example.com", "pass")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if u.ID != "2" {
			t.Errorf("expected id 2, got %s", u.ID)
		}
	})

	t.Run("ListKeys", func(t *testing.T) {
		keys, err := client.ListKeys(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(keys) != 1 {
			t.Errorf("expected 1 key, got %d", len(keys))
		}
	})

	t.Run("GetCredits", func(t *testing.T) {
		cr, err := client.GetCredits(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cr.Balance != 100 {
			t.Errorf("expected balance 100, got %d", cr.Balance)
		}
	})

	t.Run("ListModels", func(t *testing.T) {
		models, err := client.ListModels(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(models) != 1 {
			t.Errorf("expected 1 model, got %d", len(models))
		}
	})

	t.Run("UpdateProfile", func(t *testing.T) {
		if err := client.UpdateProfile(context.Background(), "Bob", "bob@example.com"); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("ChangePassword", func(t *testing.T) {
		if err := client.ChangePassword(context.Background(), "old", "new"); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("OpenAIEmbeddings", func(t *testing.T) {
		data, err := client.OpenAIEmbeddings(context.Background(), json.RawMessage(`{"model":"test"}`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if data == nil {
			t.Error("expected non-nil response data")
		}
	})
}

func TestMoreZeroPercentFunctions(t *testing.T) {
	mux := http.NewServeMux()
	// Create key
	mux.HandleFunc("/api/keys", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(APIKey{ID: "k2", Name: "new-key"})})
		} else if r.Method == "DELETE" {
			// Will be caught by more specific handler
		}
	})
	mux.HandleFunc("/api/keys/k2/revoke", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	mux.HandleFunc("/api/credits/purchase", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(CreditTransaction{ID: "t1", Amount: 100})})
	})
	mux.HandleFunc("/api/transactions", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]CreditTransaction{{ID: "t1"}}), Meta: &PaginatedMeta{Total: 1, Page: 1, Limit: 20, TotalPages: 1}})
	})
	mux.HandleFunc("/api/logs", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]APILog{{ID: "l1"}}), Meta: &PaginatedMeta{Total: 1, Page: 1, Limit: 20, TotalPages: 1}})
	})
	mux.HandleFunc("/api/analytics", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(AnalyticsData{})})
	})
	mux.HandleFunc("/api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			json.NewEncoder(w).Encode(envelope{Success: true})
			return
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON([]User{{ID: "u1"}}), Meta: &PaginatedMeta{Total: 1, Page: 1, Limit: 20, TotalPages: 1}})
	})
	mux.HandleFunc("/api/admin/stats", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(PlatformStats{})})
	})
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		// Non-streaming chat returns JSON
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(ChatCompletionChunk{})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))

	t.Run("CreateKey", func(t *testing.T) {
		k, err := client.CreateKey(context.Background(), "new-key")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if k.Name != "new-key" {
			t.Errorf("expected 'new-key', got %s", k.Name)
		}
	})

	t.Run("PurchaseCredits", func(t *testing.T) {
		tx, err := client.PurchaseCredits(context.Background(), 100, "test")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tx.Amount != 100 {
			t.Errorf("expected 100, got %d", tx.Amount)
		}
	})

	t.Run("ListTransactions", func(t *testing.T) {
		pr, err := client.ListTransactions(context.Background(), 1, 20)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(pr.Data) != 1 {
			t.Errorf("expected 1 tx, got %d", len(pr.Data))
		}
	})

	t.Run("ListLogs", func(t *testing.T) {
		pr, err := client.ListLogs(context.Background(), 1, 20)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(pr.Data) != 1 {
			t.Errorf("expected 1 log, got %d", len(pr.Data))
		}
	})

	t.Run("GetAnalytics", func(t *testing.T) {
		a, err := client.GetAnalytics(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if a == nil {
			t.Error("expected non-nil analytics")
		}
	})

	t.Run("Chat", func(t *testing.T) {
		resp, err := client.Chat(context.Background(), "gpt-4", []ChatMessage{{Role: "user", Content: "Hi"}})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected non-nil response")
		}
	})

	t.Run("AdminListUsers", func(t *testing.T) {
		pr, err := client.AdminListUsers(context.Background(), 1, 20)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(pr.Data) != 1 {
			t.Errorf("expected 1 user, got %d", len(pr.Data))
		}
	})

	t.Run("AdminStats", func(t *testing.T) {
		s, err := client.AdminStats(context.Background())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if s == nil {
			t.Error("expected non-nil stats")
		}
	})
}

func TestClientCreateKeyDeleteKeyRevoke(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/keys", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(APIKey{ID: "k1", Name: "test", Key: "dra-xxx"})})
		}
	})
	mux.HandleFunc("/api/keys/k1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			json.NewEncoder(w).Encode(envelope{Success: true})
		}
	})
	mux.HandleFunc("/api/keys/k1/revoke", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))

	k, err := client.CreateKey(context.Background(), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if k.Key != "dra-xxx" {
		t.Errorf("expected key 'dra-xxx', got %s", k.Key)
	}

	if err := client.RevokeKey(context.Background(), "k1"); err != nil {
		t.Fatalf("unexpected revoke error: %v", err)
	}

	if err := client.DeleteKey(context.Background(), "k1"); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}
}

func TestClientAdminDeleteUser(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/admin/users/u1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			json.NewEncoder(w).Encode(envelope{Success: true})
		}
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	if err := client.AdminDeleteUser(context.Background(), "u1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDoUploadErrorStatus(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/files/upload", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(envelope{Success: false, Error: "upload failed"})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL))
	_, err := client.UploadFile(context.Background(), "test.txt", strings.NewReader("hello"))
	if err == nil {
		t.Fatal("expected error for upload failure")
	}
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.Status != 400 {
		t.Errorf("expected status 400, got %d", apiErr.Status)
	}
}

func TestHeadersWithoutAPIKey(t *testing.T) {
	c := New(WithBaseURL("http://localhost"))
	h := c.headers()
	if h.Get("X-Api-Key") != "" {
		t.Error("expected no API key header")
	}
	if h.Get("Content-Type") != "application/json" {
		t.Errorf("expected application/json, got %s", h.Get("Content-Type"))
	}
}

func TestClientWithAPIKeyHeaders(t *testing.T) {
	// Tests that headers() and doRequest pass the API key header
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") != "my-key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(map[string]string{"id": "1"})})
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithAPIKey("my-key"))
	_, err := client.Me(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClientPostPutDeleteError(t *testing.T) {
	mux := http.NewServeMux()
	// Chat triggers post with body
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(envelope{Success: true, Data: mustRawJSON(ChatCompletionChunk{})})
	})
	// UpdateProfile triggers put
	mux.HandleFunc("/api/auth/profile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			json.NewEncoder(w).Encode(envelope{Success: true})
		}
	})
	// Delete with invalid path triggers doRequest error
	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithRetries(0))

	_, err := client.Chat(context.Background(), "gpt-4", []ChatMessage{{Role: "user", Content: "Hi"}})
	if err != nil {
		t.Fatalf("chat error: %v", err)
	}
	if err := client.UpdateProfile(context.Background(), "Alice", "alice@example.com"); err != nil {
		t.Fatalf("profile error: %v", err)
	}
}

func TestInferCodeRemainingCodes(t *testing.T) {
	// Cover the remaining inferCode branches not hit by other tests
	tests := []struct {
		status int
		code   ErrorCode
	}{
		{400, ErrBadRequest},
		{403, ErrForbidden},
		{409, ErrConflict},
		{429, ErrRateLimited},
		{402, ErrPaymentRequired},
		{503, ErrServiceUnavailable},
	}
	for _, tt := range tests {
		code := inferCode(tt.status)
		if code != tt.code {
			t.Errorf("inferCode(%d) = %s, want %s", tt.status, code, tt.code)
		}
	}
}

// Full integration-style test: auth → authenticated call → response parsing
func TestIntegrationAuthFlow(t *testing.T) {
	mux := http.NewServeMux()

	// Login endpoint
	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		w.Header().Set("X-Request-ID", "req-login-001")
		w.Header().Set("X-RateLimit-Limit", "100")
		w.Header().Set("X-RateLimit-Remaining", "99")
		w.Header().Set("X-RateLimit-Reset", "1700000000")
		json.NewEncoder(w).Encode(envelope{
			Success: true,
			Data: mustRawJSON(AuthResponse{
				User:  User{ID: "u1", Name: "Alice", Email: "alice@example.com", Role: "user"},
				Token: "jwt-integration-test",
			}),
		})
	})

	// Authenticated endpoints
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("X-Api-Key")
		if auth == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(envelope{Success: false, Error: "Missing API key"})
			return
		}
		w.Header().Set("X-Request-ID", "req-me-002")
		json.NewEncoder(w).Encode(envelope{
			Success: true,
			Data:    mustRawJSON(User{ID: "u1", Name: "Alice", Email: "alice@example.com", Role: "user"}),
		})
	})

	mux.HandleFunc("/api/keys", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("X-Request-ID", "req-keys-003")
		json.NewEncoder(w).Encode(envelope{
			Success: true,
			Data:    mustRawJSON([]APIKey{{ID: "k1", Name: "Integration Key", Key: "dra-int-xxx"}}),
		})
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	client := New(WithBaseURL(server.URL), WithAPIKey("test-integration-key"), WithRetries(0))

	// 1. Login
	authResp, err := client.Login(context.Background(), "alice@example.com", "password")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if authResp.Token != "jwt-integration-test" {
		t.Errorf("expected jwt token, got %s", authResp.Token)
	}
	if client.LastRequestID() != "req-login-001" {
		t.Errorf("expected request ID 'req-login-001', got %s", client.LastRequestID())
	}
	rl := client.LastRateLimit()
	if rl.Limit != 100 {
		t.Errorf("expected rate limit 100, got %d", rl.Limit)
	}

	// 2. Get current user
	user, err := client.Me(context.Background())
	if err != nil {
		t.Fatalf("me failed: %v", err)
	}
	if user.Email != "alice@example.com" {
		t.Errorf("expected alice@example.com, got %s", user.Email)
	}
	if client.LastRequestID() != "req-me-002" {
		t.Errorf("expected request ID 'req-me-002', got %s", client.LastRequestID())
	}

	// 3. List API keys
	keys, err := client.ListKeys(context.Background())
	if err != nil {
		t.Fatalf("list keys failed: %v", err)
	}
	if len(keys) != 1 || keys[0].Name != "Integration Key" {
		t.Errorf("expected 1 integration key, got %d", len(keys))
	}
	if client.LastRequestID() != "req-keys-003" {
		t.Errorf("expected request ID 'req-keys-003', got %s", client.LastRequestID())
	}
}

func TestUnmarshalDataEmpty(t *testing.T) {
	var v map[string]interface{}
	if err := unmarshalData(nil, &v); err != nil {
		t.Errorf("expected no error for nil data, got %v", err)
	}
	if err := unmarshalData(json.RawMessage{}, &v); err != nil {
		t.Errorf("expected no error for empty data, got %v", err)
	}
}
