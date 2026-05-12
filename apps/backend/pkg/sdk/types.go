package sdk

import "time"

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
	RecentLogs     []APILog               `json:"recentLogs"`
	ModelBreakdown []map[string]interface{} `json:"modelBreakdown"`
	DailyUsage     []map[string]interface{} `json:"dailyUsage"`
}

// PlatformStats represents platform-wide statistics.
type PlatformStats struct {
	Users    map[string]int         `json:"users"`
	APIKeys  map[string]int         `json:"apiKeys"`
	Logs     map[string]int         `json:"logs"`
	Credits  map[string]int64       `json:"credits"`
	RecentActivity []APILog         `json:"recentActivity"`
}
