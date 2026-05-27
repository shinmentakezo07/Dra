package domain

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/mail"
	"net/url"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Password    *string   `json:"-"`
	Role        string    `json:"role"`
	Permissions []string  `json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (u *User) IsAdmin() bool { return u.Role == "admin" || u.Role == "superadmin" }

func (u *User) HasPermission(permission string) bool {
	if u.Role == "superadmin" {
		return true
	}
	for _, p := range u.Permissions {
		if p == "*" || p == permission {
			return true
		}
	}
	return false
}

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
	ContextWindow    int      `json:"contextWindow"`
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
	if r.Password == "" || len(r.Password) < 8 {
		return NewError(ErrBadRequest, 400, "Password must be at least 8 characters")
	}
	if !isPasswordComplex(r.Password) {
		return ErrPasswordTooWeak
	}
	return nil
}

func isPasswordComplex(password string) bool {
	var hasUpper, hasLower, hasDigit bool
	for _, c := range password {
		switch {
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= '0' && c <= '9':
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
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
	parsed, err := url.ParseRequestURI(r.URL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return NewError(ErrBadRequest, 400, "URL must be a valid HTTP(S) URL")
	}
	if len(r.Events) == 0 {
		return NewError(ErrBadRequest, 400, "At least one event is required")
	}
	for _, e := range r.Events {
		if !isValidWebhookEvent(e) {
			return NewError(ErrBadRequest, 400, "Unknown event type: "+e)
		}
	}
	return nil
}

var validWebhookEvents = map[string]bool{
	"chat.completed":       true,
	"credits.purchased":    true,
	"credits.deducted":     true,
	"request.completed":    true,
	"request.failed":       true,
	"user.created":         true,
	"user.deleted":         true,
	"key.created":          true,
	"key.revoked":          true,
	"budget.exceeded":      true,
	"*":                    true,
}

func isValidWebhookEvent(event string) bool {
	return validWebhookEvents[event]
}

type WebhookDelivery struct {
	ID          string     `json:"id"`
	WebhookID   string     `json:"webhookId"`
	EventType   string     `json:"eventType"`
	Payload     []byte     `json:"payload"`
	StatusCode  *int       `json:"statusCode,omitempty"`
	Error       string     `json:"error,omitempty"`
	Attempts    int        `json:"attempts"`
	MaxAttempts int        `json:"maxAttempts"`
	Status      string     `json:"status"`
	DeliveredAt *time.Time `json:"deliveredAt,omitempty"`
	NextRetryAt *time.Time `json:"nextRetryAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type WebhookDeliveryLog struct {
	ID             int64     `json:"id"`
	WebhookID      string    `json:"webhookId"`
	EventType      string    `json:"eventType"`
	Payload        []byte    `json:"payload,omitempty"`
	ResponseStatus *int      `json:"responseStatus,omitempty"`
	DurationMs     int       `json:"durationMs"`
	Success        bool      `json:"success"`
	Attempt        int       `json:"attempt"`
	IdempotencyKey string    `json:"idempotencyKey,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
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

type File struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Name        string    `json:"name"`
	MimeType    string    `json:"mimeType"`
	Size        int64     `json:"size"`
	StoragePath string    `json:"storagePath"`
	CreatedAt   time.Time `json:"createdAt"`
}

type PasswordReset struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Token     string     `json:"token,omitempty"`
	ExpiresAt time.Time  `json:"expiresAt"`
	UsedAt    *time.Time `json:"usedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type Setting struct {
	ID        string    `json:"id"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Changelog struct {
	ID        string    `json:"id"`
	Version   string    `json:"version"`
	Body      string    `json:"body"`
	Published bool      `json:"published"`
	CreatedAt time.Time `json:"createdAt"`
}

type Group struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	CreatedAt   time.Time `json:"createdAt"`
}

type IPEntry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	IP        string    `json:"ip"`
	Action    string    `json:"action"` // allow, block
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"createdAt"`
}

type Conversation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Model     string    `json:"model"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	InputTokens    int       `json:"inputTokens"`
	OutputTokens   int       `json:"outputTokens"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Prompt struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Version   int       `json:"version"`
	Template  string    `json:"template"`
	Model     string    `json:"model"`
	Config    []byte    `json:"config,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Permission struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	CreatedAt   time.Time `json:"createdAt"`
}

type RolePermission struct {
	Role           string    `json:"role"`
	PermissionName string    `json:"permissionName"`
	CreatedAt      time.Time `json:"createdAt"`
}

type BudgetAlert struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	ThresholdPercent int       `json:"thresholdPercent"`
	AlertType        string    `json:"alertType"`
	IsActive         bool      `json:"isActive"`
	CreatedAt        time.Time `json:"createdAt"`
}

type BudgetCap struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	HardLimit      int       `json:"hardLimit"`
	SoftLimit      *int      `json:"softLimit,omitempty"`
	ActionOnExceed string    `json:"actionOnExceed"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
}

type ABComparison struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	ModelA    string     `json:"modelA"`
	ModelB    string     `json:"modelB"`
	Prompt    string     `json:"prompt"`
	ResultA   *string    `json:"resultA,omitempty"`
	ResultB   *string    `json:"resultB,omitempty"`
	LatencyA  *int       `json:"latencyA,omitempty"`
	LatencyB  *int       `json:"latencyB,omitempty"`
	CostA     *int       `json:"costA,omitempty"`
	CostB     *int       `json:"costB,omitempty"`
	TokensA   *int       `json:"tokensA,omitempty"`
	TokensB   *int       `json:"tokensB,omitempty"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"createdAt"`
}

type FineTuningDataset struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	Filename   string    `json:"filename"`
	MimeType   *string   `json:"mimeType,omitempty"`
	Size       int64     `json:"size"`
	StorageKey string    `json:"storageKey"`
	Format     string    `json:"format"`
	CreatedAt  time.Time `json:"createdAt"`
}

type FineTuningJob struct {
	ID            string     `json:"id"`
	UserID        string     `json:"userId"`
	BaseModel     string     `json:"baseModel"`
	DatasetID     *string    `json:"datasetId,omitempty"`
	Status        string     `json:"status"`
	ResultModelID *string    `json:"resultModelId,omitempty"`
	Hyperparams   []byte     `json:"hyperparams,omitempty"`
	Progress      int        `json:"progress"`
	CreatedAt     time.Time  `json:"createdAt"`
	StartedAt     *time.Time `json:"startedAt,omitempty"`
	FinishedAt    *time.Time `json:"finishedAt,omitempty"`
}

type ProviderPlugin struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	Type               string            `json:"type"`
	BaseURL            string            `json:"baseUrl"`
	APIKeyEnv          *string           `json:"apiKeyEnv,omitempty"`
	ModelListEndpoint  string            `json:"modelListEndpoint"`
	ChatEndpoint       string            `json:"chatEndpoint"`
	EmbeddingEndpoint  string            `json:"embeddingEndpoint"`
	Headers            map[string]string `json:"headers,omitempty"`
	IsActive           bool              `json:"isActive"`
	CreatedAt          time.Time         `json:"createdAt"`
}

type ExportJob struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	Type        string     `json:"type"`
	Format      string     `json:"format"`
	Status      string     `json:"status"`
	FilePath    *string    `json:"filePath,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

type CreateBudgetAlertRequest struct {
	ThresholdPercent int    `json:"thresholdPercent"`
	AlertType        string `json:"alertType"`
}

func (r *CreateBudgetAlertRequest) Validate() *AppError {
	if r.ThresholdPercent < 1 || r.ThresholdPercent > 100 {
		return NewError(ErrBadRequest, 400, "Threshold must be between 1 and 100")
	}
	if r.AlertType == "" {
		r.AlertType = "email"
	}
	return nil
}

type CreateBudgetCapRequest struct {
	HardLimit      int    `json:"hardLimit"`
	SoftLimit      *int   `json:"softLimit"`
	ActionOnExceed string `json:"actionOnExceed"`
}

func (r *CreateBudgetCapRequest) Validate() *AppError {
	if r.HardLimit <= 0 {
		return NewError(ErrBadRequest, 400, "Hard limit must be positive")
	}
	if r.ActionOnExceed == "" {
		r.ActionOnExceed = "block"
	}
	return nil
}

type CreateABComparisonRequest struct {
	ModelA string `json:"modelA"`
	ModelB string `json:"modelB"`
	Prompt string `json:"prompt"`
}

func (r *CreateABComparisonRequest) Validate() *AppError {
	if r.ModelA == "" || r.ModelB == "" {
		return NewError(ErrBadRequest, 400, "Both models are required")
	}
	if r.Prompt == "" {
		return NewError(ErrBadRequest, 400, "Prompt is required")
	}
	return nil
}

type CreateFineTuningJobRequest struct {
	BaseModel   string          `json:"baseModel"`
	DatasetID   string          `json:"datasetId"`
	Hyperparams json.RawMessage `json:"hyperparams,omitempty"`
}

func (r *CreateFineTuningJobRequest) Validate() *AppError {
	if r.BaseModel == "" {
		return NewError(ErrBadRequest, 400, "Base model is required")
	}
	if r.DatasetID == "" {
		return NewError(ErrBadRequest, 400, "Dataset ID is required")
	}
	return nil
}

type CreateProviderPluginRequest struct {
	Name              string            `json:"name"`
	Type              string            `json:"type"`
	BaseURL           string            `json:"baseUrl"`
	APIKeyEnv         *string           `json:"apiKeyEnv,omitempty"`
	ModelListEndpoint string            `json:"modelListEndpoint"`
	ChatEndpoint      string            `json:"chatEndpoint"`
	EmbeddingEndpoint string            `json:"embeddingEndpoint"`
	Headers           map[string]string `json:"headers,omitempty"`
}

func (r *CreateProviderPluginRequest) Validate() *AppError {
	if r.Name == "" {
		return NewError(ErrBadRequest, 400, "Name is required")
	}
	if r.BaseURL == "" {
		return NewError(ErrBadRequest, 400, "Base URL is required")
	}
	if r.ChatEndpoint == "" {
		r.ChatEndpoint = "/v1/chat/completions"
	}
	if r.ModelListEndpoint == "" {
		r.ModelListEndpoint = "/v1/models"
	}
	return nil
}

type CreateExportJobRequest struct {
	Type   string `json:"type"`
	Format string `json:"format"`
}

func (r *CreateExportJobRequest) Validate() *AppError {
	if r.Type == "" {
		return NewError(ErrBadRequest, 400, "Export type is required")
	}
	if r.Format == "" {
		r.Format = "csv"
	}
	return nil
}

type RateLimit struct {
	ID                 string    `json:"id"`
	Tier               string    `json:"tier"`
	RPM                int       `json:"rpm"`
	DailyRequests      int       `json:"dailyRequests"`
	MonthlyRequests    int       `json:"monthlyRequests"`
	MaxTokensPerRequest int      `json:"maxTokensPerRequest"`
	CreatedAt          time.Time `json:"createdAt"`
}

func NewID() string { return uuid.New().String() }
