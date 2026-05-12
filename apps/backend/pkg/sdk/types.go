package sdk

import (
	"encoding/json"
	"time"
)

// User represents a platform user.
type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// APIKey represents an API key.
type APIKey struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	Name      string     `json:"name"`
	Key       string     `json:"key,omitempty"`
	LastUsed  *time.Time `json:"lastUsed,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
}

// APILog represents an API usage log.
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

// UserCredits represents a user's credit balance.
type UserCredits struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	Balance        int       `json:"balance"`
	TotalPurchased int       `json:"totalPurchased"`
	TotalSpent     int       `json:"totalSpent"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// CreditTransaction represents a credit transaction.
type CreditTransaction struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	Amount       int       `json:"amount"`
	Type         string    `json:"type"`
	Description  string    `json:"description"`
	RelatedLogID *string   `json:"relatedLogId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ModelInfo describes an available AI model.
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

// ChatMessage represents a chat message.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatCompletionChunk represents a chat completion response chunk.
type ChatCompletionChunk struct {
	Choices []struct {
		Delta        ChatMessage `json:"delta"`
		FinishReason *string     `json:"finish_reason,omitempty"`
	} `json:"choices"`
}

// PaginatedResult is a generic paginated response.
type PaginatedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
}

// AnalyticsData represents user analytics.
type AnalyticsData struct {
	Summary struct {
		TotalRequests   int `json:"totalRequests"`
		SuccessRequests int `json:"successRequests"`
		ErrorRequests   int `json:"errorRequests"`
	} `json:"summary"`
	RecentLogs     []APILog                 `json:"recentLogs"`
	ModelBreakdown []map[string]interface{} `json:"modelBreakdown"`
	DailyUsage     []map[string]interface{} `json:"dailyUsage"`
}

// PlatformStats represents platform-wide statistics.
type PlatformStats struct {
	Users          map[string]int   `json:"users"`
	APIKeys        map[string]int   `json:"apiKeys"`
	Logs           map[string]int   `json:"logs"`
	Credits        map[string]int64 `json:"credits"`
	RecentActivity []APILog         `json:"recentActivity"`
}

// OAuthRequest represents an OAuth login request.
type OAuthRequest struct {
	Provider string `json:"provider"`
	Code     string `json:"code"`
}

// OAuthResponse represents an OAuth login response.
type OAuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

// BudgetConfig represents a user's spending budget configuration.
type BudgetConfig struct {
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	MonthlyLimit    int       `json:"monthlyLimit"`
	DailyLimit      int       `json:"dailyLimit"`
	NotifyAtPercent int       `json:"notifyAtPercent"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Conversation represents a chat conversation.
type Conversation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Model     string    `json:"model"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ConversationMessage represents a message within a conversation.
type ConversationMessage struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}

// Prompt represents a saved prompt template.
type Prompt struct {
	Name        string    `json:"name"`
	Content     string    `json:"content"`
	Description string    `json:"description,omitempty"`
	Template    bool      `json:"template"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// RenderRequest represents a prompt render request.
type RenderRequest struct {
	Template  string            `json:"template"`
	Variables map[string]string `json:"variables"`
}

// RenderResponse represents a rendered prompt response.
type RenderResponse struct {
	Rendered string `json:"rendered"`
}

// Webhook represents a registered webhook.
type Webhook struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Secret    string    `json:"secret,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Organization represents a user organization.
type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	OwnerID   string    `json:"ownerId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OrgMember represents a member within an organization.
type OrgMember struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

// InviteRequest represents an invitation to join an organization.
type InviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
}

// AcceptInviteRequest represents an invitation acceptance request.
type AcceptInviteRequest struct {
	Token string `json:"token"`
}

// BatchJob represents a batch processing job.
type BatchJob struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Status    string    `json:"status"`
	Total     int       `json:"total"`
	Completed int       `json:"completed"`
	Failed    int       `json:"failed"`
	CreatedAt time.Time `json:"createdAt"`
}

// BatchSubmitRequest represents a batch job submission request.
type BatchSubmitRequest struct {
	Requests []BatchChatRequest `json:"requests"`
}

// BatchChatRequest represents a single chat request within a batch.
type BatchChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
}

// FileInfo represents an uploaded file's metadata.
type FileInfo struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	MimeType  string    `json:"mimeType"`
	CreatedAt time.Time `json:"createdAt"`
}

// EmbeddingRequest represents a request to generate embeddings.
type EmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// EmbeddingResponse represents an embedding generation response.
type EmbeddingResponse struct {
	Model      string      `json:"model"`
	Embeddings [][]float32 `json:"embeddings"`
	Usage      struct {
		PromptTokens int `json:"promptTokens"`
		TotalTokens  int `json:"totalTokens"`
	} `json:"usage"`
}

// ValidateRequest represents a structured output validation request.
type ValidateRequest struct {
	Schema json.RawMessage `json:"schema"`
	Data   json.RawMessage `json:"data"`
}

// ValidateResponse represents a validation result.
type ValidateResponse struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}

// NotificationEvent represents a server-sent notification event.
type NotificationEvent struct {
	Type    string `json:"type"`
	Title   string `json:"title"`
	Message string `json:"message"`
	Read    bool   `json:"read"`
}

// CircuitBreakerStatus represents the status of a provider circuit breaker.
type CircuitBreakerStatus struct {
	Provider     string     `json:"provider"`
	State        string     `json:"state"`
	FailureCount int        `json:"failureCount"`
	LastFailure  *time.Time `json:"lastFailure,omitempty"`
}

// ProviderHealthStatus represents a provider's health check result.
type ProviderHealthStatus struct {
	Provider  string    `json:"provider"`
	Healthy   bool      `json:"healthy"`
	Latency   int       `json:"latency"`
	LastCheck time.Time `json:"lastCheck"`
}

// ProviderSummary represents a public provider health summary.
type ProviderSummary struct {
	Provider string `json:"provider"`
	Status   string `json:"status"`
	Models   int    `json:"models"`
}

// RateLimitInfo contains rate limit headers from API responses.
type RateLimitInfo struct {
	Limit     int `json:"-"`
	Remaining int `json:"-"`
	Reset     int `json:"-"`
}
