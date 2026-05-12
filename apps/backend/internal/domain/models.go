package domain

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/mail"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  *string   `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

func (u *User) IsAdmin() bool { return u.Role == "admin" }

type APIKey struct {
	ID                  string     `json:"id"`
	UserID              string     `json:"userId"`
	Name                string     `json:"name"`
	Key                 string     `json:"key,omitempty"`
	LastUsed            *time.Time `json:"lastUsed,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	RevokedAt           *time.Time `json:"revokedAt,omitempty"`
	AllowedModels       []string   `json:"allowedModels,omitempty"`
	AllowedIPs          []string   `json:"allowedIPs,omitempty"`
	MaxTokensPerRequest int        `json:"maxTokensPerRequest,omitempty"`
	DailyRequestLimit   int        `json:"dailyRequestLimit,omitempty"`
	MonthlyTokenLimit   int        `json:"monthlyTokenLimit,omitempty"`
}

func (k *APIKey) Masked() string {
	if len(k.Key) > 12 {
		return k.Key[:12] + "..."
	}
	return k.Key
}

func GenerateAPIKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate api key: %w", err)
	}
	return "dra_" + hex.EncodeToString(b), nil
}

type APILog struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	APIKeyID     *string   `json:"apiKeyId,omitempty"`
	Model        string    `json:"model"`
	Provider     string    `json:"provider"`
	InputTokens  int       `json:"inputTokens"`
	OutputTokens int       `json:"outputTokens"`
	Cost         int       `json:"cost"`
	Latency      int       `json:"latency"`
	Status       string    `json:"status"`
	ErrorMessage *string   `json:"errorMessage,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type UserCredits struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	Balance        int       `json:"balance"`
	TotalPurchased int       `json:"totalPurchased"`
	TotalSpent     int       `json:"totalSpent"`
	MonthlyBudget  *int      `json:"monthlyBudget,omitempty"`
	DailyBudget    *int      `json:"dailyBudget,omitempty"`
	DailySpent     int       `json:"dailySpent"`
	MonthlySpent   int       `json:"monthlySpent"`
	BudgetResetAt  *time.Time `json:"budgetResetAt,omitempty"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type CreditTransaction struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	Amount       int       `json:"amount"`
	Type         string    `json:"type"`
	Description  string    `json:"description"`
	RelatedLogID *string   `json:"relatedLogId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type ModelInfo struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Provider         string   `json:"provider"`
	InputPricePer1k  float64  `json:"inputPricePer1k"`
	OutputPricePer1k float64  `json:"outputPricePer1k"`
	ContextWindow    string   `json:"contextWindow"`
	Description      string   `json:"description"`
	Capabilities     []string `json:"capabilities"`
}

type SignupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *SignupRequest) Validate() *AppError {
	if r.Name == "" || len(r.Name) < 2 {
		return NewError(ErrBadRequest, 400, "Name must be at least 2 characters")
	}
	if r.Email == "" {
		return NewError(ErrBadRequest, 400, "Email is required")
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return NewError(ErrBadRequest, 400, "Invalid email format")
	}
	if r.Password == "" || len(r.Password) < 6 {
		return NewError(ErrBadRequest, 400, "Password must be at least 6 characters")
	}
	return nil
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *LoginRequest) Validate() *AppError {
	if r.Email == "" {
		return NewError(ErrBadRequest, 400, "Email is required")
	}
	if r.Password == "" {
		return NewError(ErrBadRequest, 400, "Password is required")
	}
	return nil
}

type CreateKeyRequest struct {
	Name string `json:"name"`
}

func (r *CreateKeyRequest) Validate() *AppError {
	if r.Name == "" || len(r.Name) > 100 {
		return NewError(ErrBadRequest, 400, "Name must be between 1 and 100 characters")
	}
	return nil
}

type PurchaseRequest struct {
	Amount      int    `json:"amount"`
	Description string `json:"description"`
}

func (r *PurchaseRequest) Validate() *AppError {
	if r.Amount < 1000 {
		return NewError(ErrBadRequest, 400, "Minimum purchase is 1000 credits")
	}
	if r.Amount > 100_000_000 {
		return NewError(ErrBadRequest, 400, "Maximum purchase is 100M credits")
	}
	return nil
}

type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
	Model    string        `json:"model"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (r *ChatRequest) Validate() *AppError {
	if len(r.Messages) == 0 {
		return NewError(ErrBadRequest, 400, "Messages are required")
	}
	if r.Model == "" {
		r.Model = "qwen/qwen3-coder-480b-a35b-instruct"
	}
	return nil
}

type Webhook struct {
	ID        string            `json:"id"`
	UserID    string            `json:"userId"`
	URL       string            `json:"url"`
	Secret    string            `json:"secret,omitempty"`
	Events    []string          `json:"events"`
	Headers   map[string]string `json:"headers,omitempty"`
	Active    bool              `json:"active"`
	CreatedAt time.Time         `json:"createdAt"`
}

type CreateWebhookRequest struct {
	URL     string            `json:"url"`
	Secret  string            `json:"secret"`
	Events  []string          `json:"events"`
	Headers map[string]string `json:"headers,omitempty"`
}

func (r *CreateWebhookRequest) Validate() *AppError {
	if r.URL == "" {
		return NewError(ErrBadRequest, 400, "URL is required")
	}
	if len(r.Events) == 0 {
		return NewError(ErrBadRequest, 400, "At least one event is required")
	}
	return nil
}

type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	OwnerID   string    `json:"ownerId"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"createdAt"`
}

type OrgMember struct {
	ID       string    `json:"id"`
	OrgID    string    `json:"orgId"`
	UserID   string    `json:"userId"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joinedAt"`
}

type Invite struct {
	ID        string     `json:"id"`
	OrgID     string     `json:"orgId"`
	Email     string     `json:"email"`
	Role      string     `json:"role"`
	Token     string     `json:"token,omitempty"`
	ExpiresAt time.Time  `json:"expiresAt"`
	UsedAt    *time.Time `json:"usedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type CreateOrgRequest struct {
	Name string `json:"name"`
}

func (r *CreateOrgRequest) Validate() *AppError {
	if r.Name == "" || len(r.Name) < 2 {
		return NewError(ErrBadRequest, 400, "Name must be at least 2 characters")
	}
	return nil
}

type InviteMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (r *InviteMemberRequest) Validate() *AppError {
	if r.Email == "" {
		return NewError(ErrBadRequest, 400, "Email is required")
	}
	if r.Role == "" {
		r.Role = "member"
	}
	return nil
}

type BatchJob struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	Status    string     `json:"status"`
	Items     []byte     `json:"items"`     // JSONB
	Results   []byte     `json:"results"`   // JSONB
	Error     string     `json:"error,omitempty"`
	Progress  int        `json:"progress"`
	Total     int        `json:"total"`
	CreatedAt time.Time  `json:"createdAt"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
	EndedAt   *time.Time `json:"endedAt,omitempty"`
}

type BatchRequest struct {
	Items []BatchItem `json:"items"`
}

type BatchItem struct {
	ID      string      `json:"id"`
	Request ChatRequest `json:"request"`
}

func NewID() string { return uuid.New().String() }
