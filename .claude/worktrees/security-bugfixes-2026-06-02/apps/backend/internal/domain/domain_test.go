package domain

import (
	"testing"
)

func TestSignupRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     SignupRequest
		wantErr bool
		wantMsg string
	}{
		{
			name:    "valid signup",
			req:     SignupRequest{Name: "Alice", Email: "alice@example.com", Password: "Password123"},
			wantErr: false,
		},
		{
			name:    "name too short",
			req:     SignupRequest{Name: "A", Email: "alice@example.com", Password: "Password123"},
			wantErr: true,
			wantMsg: "Name must be at least 2 characters",
		},
		{
			name:    "name empty",
			req:     SignupRequest{Name: "", Email: "alice@example.com", Password: "Password123"},
			wantErr: true,
			wantMsg: "Name must be at least 2 characters",
		},
		{
			name:    "email empty",
			req:     SignupRequest{Name: "Alice", Email: "", Password: "Password123"},
			wantErr: true,
			wantMsg: "Email is required",
		},
		{
			name:    "password too short",
			req:     SignupRequest{Name: "Alice", Email: "alice@example.com", Password: "Ab1"},
			wantErr: true,
			wantMsg: "Password must be at least 8 characters",
		},
		{
			name:    "password empty",
			req:     SignupRequest{Name: "Alice", Email: "alice@example.com", Password: ""},
			wantErr: true,
			wantMsg: "Password must be at least 8 characters",
		},
		{
			name:    "password no uppercase",
			req:     SignupRequest{Name: "Alice", Email: "alice@example.com", Password: "password123"},
			wantErr: true,
			wantMsg: "Password does not meet complexity requirements",
		},
		{
			name:    "password no digit",
			req:     SignupRequest{Name: "Alice", Email: "alice@example.com", Password: "Passwordd"},
			wantErr: true,
			wantMsg: "Password does not meet complexity requirements",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if err.Message != tt.wantMsg {
					t.Fatalf("expected message %q, got %q", tt.wantMsg, err.Message)
				}
				if err.Status != 400 {
					t.Fatalf("expected status 400, got %d", err.Status)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestLoginRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     LoginRequest
		wantErr bool
		wantMsg string
	}{
		{
			name:    "valid login",
			req:     LoginRequest{Email: "alice@example.com", Password: "password123"},
			wantErr: false,
		},
		{
			name:    "email empty",
			req:     LoginRequest{Email: "", Password: "password123"},
			wantErr: true,
			wantMsg: "Email is required",
		},
		{
			name:    "password empty",
			req:     LoginRequest{Email: "alice@example.com", Password: ""},
			wantErr: true,
			wantMsg: "Password is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if err.Message != tt.wantMsg {
					t.Fatalf("expected message %q, got %q", tt.wantMsg, err.Message)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestCreateKeyRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateKeyRequest
		wantErr bool
		wantMsg string
	}{
		{
			name:    "valid name",
			req:     CreateKeyRequest{Name: "Production"},
			wantErr: false,
		},
		{
			name:    "empty name",
			req:     CreateKeyRequest{Name: ""},
			wantErr: true,
			wantMsg: "Name must be between 1 and 100 characters",
		},
		{
			name:    "name too long",
			req:     CreateKeyRequest{Name: string(make([]byte, 101))},
			wantErr: true,
			wantMsg: "Name must be between 1 and 100 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if err.Message != tt.wantMsg {
					t.Fatalf("expected message %q, got %q", tt.wantMsg, err.Message)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestPurchaseRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     PurchaseRequest
		wantErr bool
		wantMsg string
	}{
		{
			name:    "valid purchase",
			req:     PurchaseRequest{Amount: 5000},
			wantErr: false,
		},
		{
			name:    "amount too low",
			req:     PurchaseRequest{Amount: 100},
			wantErr: true,
			wantMsg: "Minimum purchase is 1000 credits",
		},
		{
			name:    "amount too high",
			req:     PurchaseRequest{Amount: 200_000_000},
			wantErr: true,
			wantMsg: "Maximum purchase is 100M credits",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if err.Message != tt.wantMsg {
					t.Fatalf("expected message %q, got %q", tt.wantMsg, err.Message)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestChatRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     ChatRequest
		wantErr bool
		wantMsg string
	}{
		{
			name:    "valid chat",
			req:     ChatRequest{Messages: []ChatMessage{{Role: "user", Content: "hi"}}, Model: "gpt-4"},
			wantErr: false,
		},
		{
			name:    "empty messages",
			req:     ChatRequest{Messages: []ChatMessage{}, Model: "gpt-4"},
			wantErr: true,
			wantMsg: "Messages are required",
		},
		{
			name:    "nil messages",
			req:     ChatRequest{Messages: nil, Model: "gpt-4"},
			wantErr: true,
			wantMsg: "Messages are required",
		},
		{
			name:    "missing model defaults",
			req:     ChatRequest{Messages: []ChatMessage{{Role: "user", Content: "hi"}}},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if err.Message != tt.wantMsg {
					t.Fatalf("expected message %q, got %q", tt.wantMsg, err.Message)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestUser_IsAdmin(t *testing.T) {
	tests := []struct {
		name string
		role string
		want bool
	}{
		{"admin", "admin", true},
		{"user", "user", false},
		{"empty", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &User{Role: tt.role}
			if got := u.IsAdmin(); got != tt.want {
				t.Fatalf("IsAdmin() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAPIKey_Masked(t *testing.T) {
	tests := []struct {
		name string
		key  string
		want string
	}{
		{"long key", "dra_1234567890abcdef", "dra_12345678..."},
		{"short key", "dra_123", "dra_123"},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k := &APIKey{Key: tt.key}
			if got := k.Masked(); got != tt.want {
				t.Fatalf("Masked() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGenerateAPIKey(t *testing.T) {
	k1, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey() error = %v", err)
	}
	if len(k1) < 10 {
		t.Fatalf("API key too short: %q", k1)
	}
	if k1[:4] != "dra_" {
		t.Fatalf("API key missing prefix: %q", k1)
	}

	k2, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey() error = %v", err)
	}
	if k1 == k2 {
		t.Fatalf("API keys should be unique")
	}
}

func TestNewID(t *testing.T) {
	id1 := NewID()
	id2 := NewID()
	if id1 == "" || id2 == "" {
		t.Fatalf("NewID() returned empty string")
	}
	if id1 == id2 {
		t.Fatalf("NewID() should return unique values")
	}
}

func TestUser_HasPermission(t *testing.T) {
	u := &User{Role: "superadmin"}
	if !u.HasPermission("anything") {
		t.Error("superadmin should have all permissions")
	}

	u = &User{Role: "user", Permissions: []string{"read", "write"}}
	if !u.HasPermission("read") {
		t.Error("user should have read permission")
	}
	if u.HasPermission("delete") {
		t.Error("user should not have delete permission")
	}

	u = &User{Role: "user", Permissions: []string{"*"}}
	if !u.HasPermission("anything") {
		t.Error("wildcard permission should grant all")
	}
}

func TestCreateWebhookRequest_Validate(t *testing.T) {
	if err := (&CreateWebhookRequest{URL: "https://example.com/hook", Events: []string{"chat.completed"}}).Validate(); err != nil {
		t.Fatalf("valid webhook: unexpected error = %v", err)
	}
	if err := (&CreateWebhookRequest{URL: "", Events: []string{"test"}}).Validate(); err == nil {
		t.Fatal("empty URL: expected error")
	}
	if err := (&CreateWebhookRequest{URL: "https://example.com", Events: []string{}}).Validate(); err == nil {
		t.Fatal("empty events: expected error")
	}
}

func TestCreateOrgRequest_Validate(t *testing.T) {
	if err := (&CreateOrgRequest{Name: "Acme"}).Validate(); err != nil {
		t.Fatalf("valid org: unexpected error = %v", err)
	}
	if err := (&CreateOrgRequest{Name: "A"}).Validate(); err == nil {
		t.Fatal("name too short: expected error")
	}
	if err := (&CreateOrgRequest{Name: ""}).Validate(); err == nil {
		t.Fatal("empty name: expected error")
	}
}

func TestInviteMemberRequest_Validate(t *testing.T) {
	r := &InviteMemberRequest{Email: "user@example.com"}
	if err := r.Validate(); err != nil {
		t.Fatalf("valid invite: unexpected error = %v", err)
	}
	if r.Role != "member" {
		t.Errorf("default Role = %q, want member", r.Role)
	}

	if err := (&InviteMemberRequest{Email: ""}).Validate(); err == nil {
		t.Fatal("empty email: expected error")
	}
}

func TestSignupRequest_InvalidEmail(t *testing.T) {
	err := (&SignupRequest{Name: "Alice", Email: "not-an-email", Password: "password123"}).Validate()
	if err == nil {
		t.Fatal("invalid email: expected error")
	}
	if err.Message != "Invalid email format" {
		t.Errorf("Message = %q, want Invalid email format", err.Message)
	}
}
