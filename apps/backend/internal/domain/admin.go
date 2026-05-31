package domain

import (
	"encoding/json"
	"time"
)

type AdminRole string

const (
	AdminRoleSuperAdmin AdminRole = "superadmin"
	AdminRoleAdmin      AdminRole = "admin"
	AdminRoleSupport    AdminRole = "support"
	AdminRoleAnalyst    AdminRole = "analyst"
)

type ProviderStatus string

const (
	ProviderStatusActive       ProviderStatus = "active"
	ProviderStatusInactive     ProviderStatus = "inactive"
	ProviderStatusMaintenance  ProviderStatus = "maintenance"
	ProviderStatusDeprecated   ProviderStatus = "deprecated"
)

type ProviderKeyStrategy string

const (
	KeyStrategyRoundRobin ProviderKeyStrategy = "round-robin"
	KeyStrategyFillFirst  ProviderKeyStrategy = "fill-first"
	KeyStrategyWeighted   ProviderKeyStrategy = "weighted"
)

type ModelStatus string

const (
	ModelStatusActive      ModelStatus = "active"
	ModelStatusBeta        ModelStatus = "beta"
	ModelStatusDeprecated  ModelStatus = "deprecated"
	ModelStatusSunset      ModelStatus = "sunset"
	ModelStatusPrivate     ModelStatus = "private"
	ModelStatusDisabled    ModelStatus = "disabled"
)

type AuditAction string

const (
	AuditUserCreated           AuditAction = "user.created"
	AuditUserDeleted           AuditAction = "user.deleted"
	AuditUserSuspended         AuditAction = "user.suspended"
	AuditUserUnsuspended       AuditAction = "user.unsuspended"
	AuditUserRoleChanged       AuditAction = "user.role_changed"
	AuditUserUpdated           AuditAction = "user.updated"
	AuditAdminCreated          AuditAction = "admin.created"
	AuditAdminDeleted          AuditAction = "admin.deleted"
	AuditAdminRoleChanged      AuditAction = "admin.role_changed"
	AuditProviderCreated       AuditAction = "provider.created"
	AuditProviderUpdated       AuditAction = "provider.updated"
	AuditProviderDeleted       AuditAction = "provider.deleted"
	AuditProviderStatusChanged AuditAction = "provider.status_changed"
	AuditModelCreated          AuditAction = "model.created"
	AuditModelUpdated          AuditAction = "model.updated"
	AuditModelDeleted          AuditAction = "model.deleted"
	AuditModelStatusChanged    AuditAction = "model.status_changed"
	AuditAliasCreated          AuditAction = "alias.created"
	AuditAliasDeleted          AuditAction = "alias.deleted"
	AuditKeyCreated            AuditAction = "key.created"
	AuditKeyDeleted            AuditAction = "key.deleted"
	AuditKeyRevoked            AuditAction = "key.revoked"
	AuditKeyReordered          AuditAction = "key.reordered"
	AuditCreditAdjusted        AuditAction = "credit.adjusted"
	AuditSettingsUpdated       AuditAction = "settings.updated"
	AuditFeatureUpdated        AuditAction = "feature.updated"
	AuditAnnouncementCreated   AuditAction = "announcement.created"
	AuditPromoCreated          AuditAction = "promo.created"
	AuditIPListCreated         AuditAction = "ip_list.created"
	AuditImpersonationStarted  AuditAction = "impersonation.started"
	AuditImpersonationEnded    AuditAction = "impersonation.ended"
	AuditSSOUpdated            AuditAction = "sso.updated"
)

type AuditSeverity string

const (
	AuditSeverityInfo     AuditSeverity = "info"
	AuditSeverityWarning  AuditSeverity = "warning"
	AuditSeverityError    AuditSeverity = "error"
	AuditSeverityCritical AuditSeverity = "critical"
)

type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended"
	UserStatusDisabled  UserStatus = "disabled"
	UserStatusDeleted   UserStatus = "deleted"
)

type RateLimitTier struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	RPM           int       `json:"rpm"`
	TPM           int       `json:"tpm"`
	RPD           int       `json:"rpd"`
	Concurrent    int       `json:"concurrent"`
	MonthlyBudget int64     `json:"monthlyBudget"`
	CreatedAt     time.Time `json:"createdAt"`
}

type Provider struct {
	ID                        string          `json:"id"`
	Name                      string          `json:"name"`
	DisplayName               string          `json:"displayName"`
	ProviderType              string          `json:"providerType"`
	BaseURL                   string          `json:"baseUrl"`
	Status                    ProviderStatus  `json:"status"`
	Priority                  int             `json:"priority"`
	TimeoutMS                 int             `json:"timeoutMs"`
	CircuitBreakerEnabled     bool            `json:"circuitBreakerEnabled"`
	CircuitBreakerThreshold   int             `json:"circuitBreakerThreshold"`
	CircuitBreakerRecoveryMS  int             `json:"circuitBreakerRecoveryMs"`
	CircuitBreakerHalfOpenMax int             `json:"circuitBreakerHalfOpenMax"`
	MaxRetries                int             `json:"maxRetries"`
	RateLimitRPM              int             `json:"rateLimitRpm"`
	RateLimitTPM              int             `json:"rateLimitTpm"`
	Metadata                  json.RawMessage `json:"metadata"`
	CreatedAt                 time.Time       `json:"createdAt"`
	UpdatedAt                 time.Time       `json:"updatedAt"`
}

type ProviderKey struct {
	ID           string             `json:"id"`
	ProviderID   string             `json:"providerId"`
	Label        string             `json:"label"`
	KeyPrefix    string             `json:"keyPrefix"`
	KeyHash      string             `json:"-"`
	KeyLastFour  string             `json:"keyLastFour"`
	Strategy     ProviderKeyStrategy `json:"strategy"`
	Weight       int                `json:"weight"`
	SortOrder    int                `json:"sortOrder"`
	FillCurrent  int                `json:"fillCurrent"`
	RPMLimit     int                `json:"rpmLimit"`
	TPMLimit     int                `json:"tpmLimit"`
	MonthlyQuota int64              `json:"monthlyQuota"`
	MonthlyUsed  int64              `json:"monthlyUsed"`
	IsActive     bool               `json:"isActive"`
	UsageCount   int64              `json:"usageCount"`
	TotalTokens  int64              `json:"totalTokens"`
	LastUsedAt   *time.Time         `json:"lastUsedAt,omitempty"`
	ExpiresAt    *time.Time         `json:"expiresAt,omitempty"`
	CreatedAt    time.Time          `json:"createdAt"`
}

type ProviderHealthCheck struct {
	Status    string    `json:"status"`
	LatencyMS int       `json:"latencyMs"`
	Error     string    `json:"error,omitempty"`
	CheckedAt time.Time `json:"checkedAt"`
}

type ModelRegistry struct {
	ID                 string          `json:"id"`
	ModelID            string          `json:"modelId"`
	ProviderID         string          `json:"providerId"`
	DisplayName        string          `json:"displayName"`
	Description        string          `json:"description"`
	ContextWindow      int             `json:"contextWindow"`
	MaxOutput          int             `json:"maxOutput"`
	InputPricePer1k    float64         `json:"inputPricePer1k"`
	OutputPricePer1k   float64         `json:"outputPricePer1k"`
	Capabilities       []string        `json:"capabilities"`
	SupportsVision     bool            `json:"supportsVision"`
	SupportsTools      bool            `json:"supportsTools"`
	SupportsThinking   bool            `json:"supportsThinking"`
	Status             ModelStatus     `json:"status"`
	SunsetDate         *time.Time      `json:"sunsetDate,omitempty"`
	ReplacementModelID *string         `json:"replacementModelId,omitempty"`
	Metadata           json.RawMessage `json:"metadata"`
	ModelGroup         string          `json:"modelGroup,omitempty"`
	FallbackModels     json.RawMessage `json:"fallbackModels,omitempty"`
	CredentialName     string          `json:"credentialName,omitempty"`
	RoutingWeight      int             `json:"routingWeight"`
	IsWildcard         bool            `json:"isWildcard"`
	CreatedAt          time.Time       `json:"createdAt"`
}

type ModelAlias struct {
	ID                 string   `json:"id"`
	Alias              string   `json:"alias"`
	TargetModelID      string   `json:"targetModelId"`
	PreferredProviderID *string `json:"preferredProviderId,omitempty"`
	PreferredKeyID     *string  `json:"preferredKeyId,omitempty"`
	RPMOverride        int      `json:"rpmOverride"`
	TPMOverride        int      `json:"tpmOverride"`
	MonthlyBudget      int64    `json:"monthlyBudget"`
	AllowedUserIDs     []string `json:"allowedUserIds"`
	IsActive           bool     `json:"isActive"`
	CreatedAt          time.Time `json:"createdAt"`
}

type CredentialVault struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	ProviderType    string          `json:"providerType"`
	APIKeyEncrypted string          `json:"-"`
	APIBase         string          `json:"apiBase,omitempty"`
	ExtraConfig     json.RawMessage `json:"extraConfig,omitempty"`
	Description     string          `json:"description,omitempty"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type CreditAdjustment struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Amount        int       `json:"amount"`
	BalanceBefore int       `json:"balanceBefore"`
	BalanceAfter  int       `json:"balanceAfter"`
	Reason        string    `json:"reason"`
	AdminID       string    `json:"adminId"`
	ReferenceID   string    `json:"referenceId,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

type UsageRecord struct {
	ID         int64     `json:"id"`
	UserID     string    `json:"userId"`
	APIKeyID   string    `json:"apiKeyId,omitempty"`
	ProviderID *string   `json:"providerId,omitempty"`
	RequestID  string    `json:"requestId"`
	Model      string    `json:"model"`
	Tokens     int       `json:"tokens"`
	Cost       int       `json:"cost"`
	DurationMs int       `json:"durationMs"`
	StatusCode int       `json:"statusCode"`
	Error      string    `json:"error,omitempty"`
	IPAddress  string    `json:"ipAddress,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type SystemSetting struct {
	Key         string          `json:"key"`
	Value       json.RawMessage `json:"value"`
	Type        string          `json:"type"`
	Description string          `json:"description"`
	GroupName   string          `json:"groupName"`
	IsEncrypted bool            `json:"isEncrypted"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type FeatureFlag struct {
	ID              string    `json:"id"`
	Key             string    `json:"key"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Enabled         bool      `json:"enabled"`
	TargetedUserIDs []string  `json:"targetedUserIds,omitempty"`
	TargetedTierIDs []string  `json:"targetedTierIds,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type ChangeEntry struct {
	Field string      `json:"field"`
	Old   interface{} `json:"old"`
	New   interface{} `json:"new"`
}

type AuditLog struct {
	ID         int64         `json:"id"`
	ActorID    string        `json:"actorId"`
	ActorEmail string        `json:"actorEmail"`
	Action     AuditAction   `json:"action"`
	TargetType string        `json:"targetType"`
	TargetID   string        `json:"targetId"`
	Changes    []ChangeEntry `json:"changes,omitempty"`
	IPAddress  string        `json:"ipAddress,omitempty"`
	Severity   AuditSeverity `json:"severity"`
	CreatedAt  time.Time     `json:"createdAt"`
}

type AdminUser struct {
	UserID      string    `json:"userId"`
	Role        AdminRole `json:"role"`
	Permissions []string  `json:"permissions"`
	IsActive    bool      `json:"isActive"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (a *AdminUser) HasPermission(permission string) bool {
	if a.Role == AdminRoleSuperAdmin {
		return true
	}
	for _, p := range a.Permissions {
		if p == "*" || p == permission {
			return true
		}
	}
	return false
}

type RevenueSummary struct {
	Date  time.Time `json:"date"`
	Cost  int       `json:"cost"`
	Count int       `json:"count"`
}

type UsageDaily struct {
	Date         time.Time `json:"date"`
	UserID       string    `json:"userId"`
	ProviderID   *string   `json:"providerId,omitempty"`
	ModelID      string    `json:"modelId"`
	APIKeyID     string    `json:"apiKeyId,omitempty"`
	RequestCount int       `json:"requestCount"`
	Tokens       int64     `json:"tokens"`
	Cost         int       `json:"cost"`
	Errors       int       `json:"errors"`
	LatencyP50Ms int       `json:"latencyP50Ms"`
	LatencyP95Ms int       `json:"latencyP95Ms"`
	LatencyP99Ms int       `json:"latencyP99Ms"`
}

type IPList struct {
	ID        string     `json:"id"`
	IPOrCIDR  string     `json:"ipOrCidr"`
	Action    string     `json:"action"`
	Scope     string     `json:"scope"`
	ScopeID   string     `json:"scopeId,omitempty"`
	Reason    string     `json:"reason,omitempty"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type IPAccessLog struct {
	ID          int64     `json:"id"`
	IPAddress   string    `json:"ipAddress"`
	UserID      string    `json:"userId,omitempty"`
	APIKeyID    string    `json:"apiKeyId,omitempty"`
	Method      string    `json:"method"`
	Path        string    `json:"path"`
	UserAgent   string    `json:"userAgent,omitempty"`
	Country     string    `json:"country,omitempty"`
	IsProxy     bool      `json:"isProxy"`
	Blocked     bool      `json:"blocked"`
	RateLimited bool      `json:"rateLimited"`
	CreatedAt   time.Time `json:"createdAt"`
}

type SuspiciousActivity struct {
	ID          int64           `json:"id"`
	Category    string          `json:"category"`
	Severity    string          `json:"severity"`
	UserID      string          `json:"userId,omitempty"`
	APIKeyID    string          `json:"apiKeyId,omitempty"`
	IP          string          `json:"ip,omitempty"`
	Details     json.RawMessage `json:"details"`
	AutoBlocked bool            `json:"autoBlocked"`
	Reviewed    bool            `json:"reviewed"`
	Resolved    bool            `json:"resolved"`
	CreatedAt   time.Time       `json:"createdAt"`
}

type ImpersonationSession struct {
	ID           string     `json:"id"`
	AdminID      string     `json:"adminId"`
	TargetUserID string     `json:"targetUserId"`
	Reason       string     `json:"reason"`
	StartedAt    time.Time  `json:"startedAt"`
	EndedAt      *time.Time `json:"endedAt,omitempty"`
}

type Announcement struct {
	ID         string     `json:"id"`
	Title      string     `json:"title"`
	Body       string     `json:"body"`
	Priority   string     `json:"priority"`
	TargetType string     `json:"targetType"`
	TargetIDs  []string   `json:"targetIds,omitempty"`
	StartsAt   time.Time  `json:"startsAt"`
	EndsAt     *time.Time `json:"endsAt,omitempty"`
	ShowInApp  bool       `json:"showInApp"`
	SendEmail  bool       `json:"sendEmail"`
	CreatedBy  string     `json:"createdBy"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type PromoCode struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	Type        string     `json:"type"`
	Value       int        `json:"value"`
	MaxUses     int        `json:"maxUses"`
	CurrentUses int        `json:"currentUses"`
	MinPurchase int        `json:"minPurchase"`
	ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
	IsActive    bool       `json:"isActive"`
	CreatedBy   string     `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type PromoRedemption struct {
	ID             string    `json:"id"`
	PromoID        string    `json:"promoId"`
	UserID         string    `json:"userId"`
	Discount       int       `json:"discount"`
	CreditsAwarded int       `json:"creditsAwarded"`
	RedeemedAt     time.Time `json:"redeemedAt"`
}

type UserGroup struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ScheduledReport struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Frequency   string     `json:"frequency"`
	Format      string     `json:"format"`
	Sections    []string   `json:"sections"`
	Recipients  []string   `json:"recipients"`
	NextSendAt  *time.Time `json:"nextSendAt,omitempty"`
	LastSentAt  *time.Time `json:"lastSentAt,omitempty"`
	IsActive    bool       `json:"isActive"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type ChangelogEntry struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Body        string     `json:"body"`
	Version     string     `json:"version"`
	Type        string     `json:"type"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	IsDraft     bool       `json:"isDraft"`
	CreatedBy   string     `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type SSOConfig struct {
	ID             string    `json:"id"`
	Provider       string    `json:"provider"`
	Label          string    `json:"label"`
	Issuer         string    `json:"issuer"`
	ClientID       string    `json:"clientId"`
	AllowedDomains []string  `json:"allowedDomains"`
	AutoProvision  bool      `json:"autoProvision"`
	DefaultRole    string    `json:"defaultRole"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
}

type AdminUserDetail struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	LastLoginAt *time.Time `json:"lastLoginAt,omitempty"`
	LastLoginIP string     `json:"lastLoginIp,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	Tags        []string   `json:"tags,omitempty"`
}

type DashboardStats struct {
	Users struct {
		Total       int `json:"total"`
		ActiveToday int `json:"activeToday"`
		NewToday    int `json:"newToday"`
		Suspended   int `json:"suspended"`
	} `json:"users"`
	Requests struct {
		TotalToday   int     `json:"totalToday"`
		TotalMonth   int     `json:"totalMonth"`
		AvgLatencyMs float64 `json:"avgLatencyMs"`
	} `json:"requests"`
	Tokens struct {
		InputToday  int64 `json:"inputToday"`
		OutputToday int64 `json:"outputToday"`
	} `json:"tokens"`
	Revenue struct {
		TodayCents int `json:"todayCents"`
		MonthCents int `json:"monthCents"`
	} `json:"revenue"`
	Providers struct {
		Total    int `json:"total"`
		Healthy  int `json:"healthy"`
		Degraded int `json:"degraded"`
		Down     int `json:"down"`
	} `json:"providers"`
}

type RateLimitOverrides struct {
	RPM               *int `json:"rpm,omitempty"`
	TPM               *int `json:"tpm,omitempty"`
	RPD               *int `json:"rpd,omitempty"`
	ConcurrentRequests *int `json:"concurrentRequests,omitempty"`
}

type UserFilter struct {
	Query  string `json:"query,omitempty"`
	Status string `json:"status,omitempty"`
	Role   string `json:"role,omitempty"`
	Tag    string `json:"tag,omitempty"`
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
}

type AuditLogFilter struct {
	ActorID    string     `json:"actorId,omitempty"`
	Action     string     `json:"action,omitempty"`
	TargetType string     `json:"targetType,omitempty"`
	Severity   string     `json:"severity,omitempty"`
	StartDate  *time.Time `json:"startDate,omitempty"`
	EndDate    *time.Time `json:"endDate,omitempty"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
}

type UsageFilter struct {
	UserID     string     `json:"userId,omitempty"`
	ProviderID string     `json:"providerId,omitempty"`
	Model      string     `json:"model,omitempty"`
	StatusCode int        `json:"statusCode,omitempty"`
	StartDate  *time.Time `json:"startDate,omitempty"`
	EndDate    *time.Time `json:"endDate,omitempty"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
}

type SuspiciousFilter struct {
	Category string     `json:"category,omitempty"`
	Severity string     `json:"severity,omitempty"`
	Reviewed *bool      `json:"reviewed,omitempty"`
	Resolved *bool      `json:"resolved,omitempty"`
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
}

type IPAccessLogFilter struct {
	IPAddress string     `json:"ipAddress,omitempty"`
	UserID    string     `json:"userId,omitempty"`
	Blocked   *bool      `json:"blocked,omitempty"`
	StartDate *time.Time `json:"startDate,omitempty"`
	EndDate   *time.Time `json:"endDate,omitempty"`
	Page      int        `json:"page"`
	Limit     int        `json:"limit"`
}

type AdminSession struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	TokenHash string     `json:"tokenHash"`
	IPAddress string     `json:"ipAddress"`
	UserAgent string     `json:"userAgent"`
	Status    string     `json:"status"`
	ExpiresAt time.Time  `json:"expiresAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
	RevokedBy *string    `json:"revokedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}
