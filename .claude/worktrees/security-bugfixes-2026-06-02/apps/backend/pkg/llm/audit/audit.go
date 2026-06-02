// Package audit provides comprehensive audit logging for all API operations,
// configuration changes, and admin actions with immutable storage and compliance reporting.
package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"time"
)

// Action represents an audit action.
type Action string

const (
	// Key actions
	ActionKeyCreated    Action = "api_key.created"
	ActionKeyRotated    Action = "api_key.rotated"
	ActionKeyRevoked    Action = "api_key.revoked"
	ActionKeyUsed       Action = "api_key.used"
	ActionKeyDeactivated Action = "api_key.deactivated"

	// Model actions
	ActionModelAccessed Action = "model.accessed"
	ActionModelDenied   Action = "model.denied"

	// Budget actions
	ActionBudgetExceeded  Action = "budget.exceeded"
	ActionBudgetAlert     Action = "budget.alert"
	ActionBudgetReset     Action = "budget.reset"

	// Security actions
	ActionInjectionBlocked Action = "security.injection_blocked"
	ActionJailbreakBlocked Action = "security.jailbreak_blocked"
	ActionPIIDetected      Action = "security.pii_detected"
	ActionSecretDetected   Action = "security.secret_detected"

	// Credential actions
	ActionCredentialCreated  Action = "credential.created"
	ActionCredentialRotated  Action = "credential.rotated"
	ActionCredentialDeleted  Action = "credential.deleted"
	ActionCredentialFailed   Action = "credential.failed"

	// Admin actions
	ActionAdminLogin      Action = "admin.login"
	ActionAdminLogout     Action = "admin.logout"
	ActionAdminConfigChange Action = "admin.config_change"
	ActionAdminUserAction  Action = "admin.user_action"

	// Team actions
	ActionTeamCreated  Action = "team.created"
	ActionTeamUpdated  Action = "team.updated"
	ActionTeamDeleted  Action = "team.deleted"
	ActionTeamMemberAdded   Action = "team.member_added"
	ActionTeamMemberRemoved Action = "team.member_removed"

	// Provider actions
	ActionProviderHealthChange Action = "provider.health_change"
	ActionProviderFailover     Action = "provider.failover"
)

// Severity levels.
type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityWarning  Severity = "warning"
	SeverityError    Severity = "error"
	SeverityCritical Severity = "critical"
)

// Entry represents an audit log entry.
type Entry struct {
	ID           string
	ActorID      string
	ActorType    string // user, api_key, system, admin
	Action       Action
	ResourceType string
	ResourceID   string
	Details      map[string]any
	IPAddress    string
	UserAgent    string
	Severity     Severity
	RequestID    string
	CreatedAt    time.Time
}

// Store is the interface for audit log persistence.
type Store interface {
	Save(entry *Entry) error
	Query(filter Filter) ([]*Entry, int, error)
	GetByID(id string) (*Entry, error)
}

// Filter for querying audit logs.
type Filter struct {
	ActorID      string
	Action       Action
	ResourceType string
	Severity     Severity
	StartDate    *time.Time
	EndDate      *time.Time
	Page         int
	Limit        int
}

// Logger is the audit logger.
type Logger struct {
	store   Store
	mu      sync.RWMutex
	entries []*Entry // in-memory buffer for recent entries
	buffer  int
	stopCh  chan struct{}
}

// NewLogger creates a new audit logger.
func NewLogger(store Store) *Logger {
	l := &Logger{
		store:   store,
		buffer:  1000,
		stopCh:  make(chan struct{}),
	}
	return l
}

// Log creates an audit log entry.
func (l *Logger) Log(ctx context.Context, entry *Entry) {
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}
	if entry.Severity == "" {
		entry.Severity = SeverityInfo
	}

	// Extract request ID from context if available
	if entry.RequestID == "" {
		if reqID, ok := ctx.Value("request_id").(string); ok {
			entry.RequestID = reqID
		}
	}

	// Save to store (async to avoid blocking)
	go func() {
		if err := l.store.Save(entry); err != nil {
			// Log error but don't fail the request
			fmt.Printf("audit log save error: %v\n", err)
		}
	}()

	// Keep in-memory buffer
	l.mu.Lock()
	l.entries = append(l.entries, entry)
	if len(l.entries) > l.buffer {
		l.entries = l.entries[len(l.entries)-l.buffer:]
	}
	l.mu.Unlock()
}

// LogKeyCreated logs API key creation.
func (l *Logger) LogKeyCreated(ctx context.Context, actorID, keyID, keyName string) {
	l.Log(ctx, &Entry{
		ActorID:      actorID,
		ActorType:    "user",
		Action:       ActionKeyCreated,
		ResourceType: "api_key",
		ResourceID:   keyID,
		Severity:     SeverityInfo,
		Details: map[string]any{
			"key_name": keyName,
		},
	})
}

// LogKeyRotated logs API key rotation.
func (l *Logger) LogKeyRotated(ctx context.Context, actorID, keyID string) {
	l.Log(ctx, &Entry{
		ActorID:      actorID,
		ActorType:    "user",
		Action:       ActionKeyRotated,
		ResourceType: "api_key",
		ResourceID:   keyID,
		Severity:     SeverityInfo,
	})
}

// LogKeyRevoked logs API key revocation.
func (l *Logger) LogKeyRevoked(ctx context.Context, actorID, keyID, reason string) {
	l.Log(ctx, &Entry{
		ActorID:      actorID,
		ActorType:    "user",
		Action:       ActionKeyRevoked,
		ResourceType: "api_key",
		ResourceID:   keyID,
		Severity:     SeverityWarning,
		Details: map[string]any{
			"reason": reason,
		},
	})
}

// LogSecurityEvent logs a security event.
func (l *Logger) LogSecurityEvent(ctx context.Context, action Action, userID, requestID, description string, severity Severity) {
	l.Log(ctx, &Entry{
		ActorID:      userID,
		ActorType:    "user",
		Action:       action,
		ResourceType: "security",
		Severity:     severity,
		RequestID:    requestID,
		Details: map[string]any{
			"description": description,
		},
	})
}

// LogBudgetEvent logs a budget event.
func (l *Logger) LogBudgetEvent(ctx context.Context, action Action, targetType, targetID string, usedCents, limitCents int64) {
	l.Log(ctx, &Entry{
		ActorID:      "system",
		ActorType:    "system",
		Action:       action,
		ResourceType: "budget",
		ResourceID:   targetID,
		Severity:     SeverityWarning,
		Details: map[string]any{
			"target_type":   targetType,
			"used_cents":    usedCents,
			"limit_cents":   limitCents,
		},
	})
}

// LogCredentialEvent logs a credential event.
func (l *Logger) LogCredentialEvent(ctx context.Context, action Action, actorID, credentialID string, severity Severity) {
	l.Log(ctx, &Entry{
		ActorID:      actorID,
		ActorType:    "admin",
		Action:       action,
		ResourceType: "credential",
		ResourceID:   credentialID,
		Severity:     severity,
	})
}

// LogProviderEvent logs a provider event.
func (l *Logger) LogProviderEvent(ctx context.Context, action Action, provider, oldStatus, newStatus string) {
	l.Log(ctx, &Entry{
		ActorID:      "system",
		ActorType:    "system",
		Action:       action,
		ResourceType: "provider",
		ResourceID:   provider,
		Severity:     SeverityWarning,
		Details: map[string]any{
			"old_status": oldStatus,
			"new_status": newStatus,
		},
	})
}

// RecentEntries returns recent audit log entries.
func (l *Logger) RecentEntries(limit int) []*Entry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if limit <= 0 || limit > len(l.entries) {
		limit = len(l.entries)
	}
	start := len(l.entries) - limit
	if start < 0 {
		start = 0
	}
	return l.entries[start:]
}

// Query queries audit logs from the store.
func (l *Logger) Query(filter Filter) ([]*Entry, int, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 500 {
		filter.Limit = 500
	}
	return l.store.Query(filter)
}

// Stop stops the audit logger.
func (l *Logger) Stop() {
	close(l.stopCh)
}

// EntryToJSON converts an audit entry to JSON.
func EntryToJSON(e *Entry) string {
	data := map[string]any{
		"id":         e.ID,
		"actor_id":   e.ActorID,
		"actor_type": e.ActorType,
		"action":     string(e.Action),
		"severity":   string(e.Severity),
		"timestamp":  e.CreatedAt.Format(time.RFC3339),
	}
	if e.ResourceType != "" {
		data["resource_type"] = e.ResourceType
	}
	if e.ResourceID != "" {
		data["resource_id"] = e.ResourceID
	}
	if e.IPAddress != "" {
		data["ip_address"] = e.IPAddress
	}
	if e.RequestID != "" {
		data["request_id"] = e.RequestID
	}
	if len(e.Details) > 0 {
		data["details"] = e.Details
	}
	b, _ := json.Marshal(data)
	return string(b)
}

// SanitizeIP extracts the IP address from a remote address string.
func SanitizeIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return remoteAddr
	}
	return host
}
