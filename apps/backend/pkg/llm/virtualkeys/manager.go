// Package virtualkeys provides virtual API key management with team scoping, budget limits,
// rate limits, and model access control. Inspired by LiteLLM's virtual key system.
package virtualkeys

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"
)

// VirtualKey represents a virtual API key.
type VirtualKey struct {
	ID                 string
	KeyHash            string
	KeyPrefix          string
	Name               string
	TeamID             string
	UserID             string
	ModelAccess        []string // nil = all models
	RateLimitRPM       int
	RateLimitRPD       int
	RateLimitTPM       int
	BudgetLimitCents   int64 // 0 = unlimited
	BudgetUsedCents    int64
	BudgetResetPeriod  string // monthly, daily, weekly
	MaxTokensPerReq    int    // 0 = unlimited
	AllowedIPs         []string // nil = all IPs
	ExpiresAt          *time.Time
	LastUsedAt         *time.Time
	LastUsedIP         string
	RequestCount       int64
	TotalTokens        int64
	IsActive           bool
	Metadata           map[string]any
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// Store is the interface for virtual key persistence.
type Store interface {
	Save(key *VirtualKey) error
	GetByHash(hash string) (*VirtualKey, error)
	GetByID(id string) (*VirtualKey, error)
	GetByUser(userID string) ([]*VirtualKey, error)
	GetByTeam(teamID string) ([]*VirtualKey, error)
	UpdateUsage(id string, cents int64, tokens int) error
	Deactivate(id string) error
	Delete(id string) error
	List() ([]*VirtualKey, error)
}

// Manager manages virtual API keys.
type Manager struct {
	store     Store
	mu        sync.RWMutex
	cache     map[string]*VirtualKey // hash -> key
	cacheTime time.Time
	cacheTTL  time.Duration
}

// NewManager creates a new virtual key manager.
func NewManager(store Store) *Manager {
	return &Manager{
		store:     store,
		cache:     make(map[string]*VirtualKey),
		cacheTTL:  2 * time.Minute,
	}
}

// Create generates a new virtual API key.
func (m *Manager) Create(opts CreateOptions) (*VirtualKey, string, error) {
	if opts.UserID == "" {
		return nil, "", fmt.Errorf("user ID is required")
	}

	// Generate random key
	rawKey, err := generateKey()
	if err != nil {
		return nil, "", fmt.Errorf("generate key: %w", err)
	}

	hash := sha256.Sum256([]byte(rawKey))
	prefix := rawKey[:12] // "sk-xxxxxxxx"

	vk := &VirtualKey{
		KeyHash:           hex.EncodeToString(hash[:]),
		KeyPrefix:         prefix,
		Name:              opts.Name,
		TeamID:            opts.TeamID,
		UserID:            opts.UserID,
		ModelAccess:       opts.ModelAccess,
		RateLimitRPM:      opts.RateLimitRPM,
		RateLimitRPD:      opts.RateLimitRPD,
		RateLimitTPM:      opts.RateLimitTPM,
		BudgetLimitCents:  opts.BudgetLimitCents,
		BudgetResetPeriod: opts.BudgetResetPeriod,
		MaxTokensPerReq:   opts.MaxTokensPerReq,
		AllowedIPs:        opts.AllowedIPs,
		ExpiresAt:         opts.ExpiresAt,
		IsActive:          true,
		Metadata:          opts.Metadata,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if vk.RateLimitRPM == 0 {
		vk.RateLimitRPM = 60
	}
	if vk.RateLimitRPD == 0 {
		vk.RateLimitRPD = 10000
	}
	if vk.BudgetResetPeriod == "" {
		vk.BudgetResetPeriod = "monthly"
	}

	if err := m.store.Save(vk); err != nil {
		return nil, "", fmt.Errorf("save key: %w", err)
	}

	m.invalidateCache()
	return vk, rawKey, nil
}

// Validate checks if a raw API key is valid and returns the virtual key.
func (m *Manager) Validate(rawKey string) (*VirtualKey, error) {
	if rawKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	// Strip sk- prefix if present
	if !strings.HasPrefix(rawKey, "sk-") {
		return nil, fmt.Errorf("invalid key format: must start with sk-")
	}

	hash := sha256.Sum256([]byte(rawKey))
	hashStr := hex.EncodeToString(hash[:])

	// Check cache first
	m.mu.RLock()
	if cached, ok := m.cache[hashStr]; ok && time.Since(m.cacheTime) < m.cacheTTL {
		m.mu.RUnlock()
		if !cached.IsActive {
			return nil, fmt.Errorf("API key is deactivated")
		}
		if cached.ExpiresAt != nil && cached.ExpiresAt.Before(time.Now()) {
			return nil, fmt.Errorf("API key has expired")
		}
		return cached, nil
	}
	m.mu.RUnlock()

	vk, err := m.store.GetByHash(hashStr)
	if err != nil {
		return nil, fmt.Errorf("lookup key: %w", err)
	}
	if vk == nil {
		return nil, fmt.Errorf("invalid API key")
	}

	// Cache it
	m.mu.Lock()
	m.cache[hashStr] = vk
	m.cacheTime = time.Now()
	m.mu.Unlock()

	if !vk.IsActive {
		return nil, fmt.Errorf("API key is deactivated")
	}
	if vk.ExpiresAt != nil && vk.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("API key has expired")
	}

	return vk, nil
}

// CheckModelAccess checks if a virtual key has access to a model.
func (m *Manager) CheckModelAccess(vk *VirtualKey, model string) error {
	if len(vk.ModelAccess) == 0 {
		return nil // all models allowed
	}

	model = strings.ToLower(model)
	for _, allowed := range vk.ModelAccess {
		allowed = strings.ToLower(strings.TrimSpace(allowed))
		if model == allowed || strings.HasPrefix(model, allowed) || strings.HasSuffix(allowed, "*") && strings.HasPrefix(model, strings.TrimSuffix(allowed, "*")) {
			return nil
		}
	}

	return fmt.Errorf("model '%s' is not allowed for this API key", model)
}

// RecordUsage records usage for a virtual key.
func (m *Manager) RecordUsage(id string, costCents int64, tokens int) error {
	if err := m.store.UpdateUsage(id, costCents, tokens); err != nil {
		return fmt.Errorf("update usage: %w", err)
	}

	// Update cache
	m.mu.Lock()
	for _, vk := range m.cache {
		if vk.ID == id {
			vk.BudgetUsedCents += costCents
			vk.RequestCount++
			vk.TotalTokens += int64(tokens)
			now := time.Now()
			vk.LastUsedAt = &now
			break
		}
	}
	m.mu.Unlock()

	return nil
}

// Deactivate deactivates a virtual key.
func (m *Manager) Deactivate(id string) error {
	if err := m.store.Deactivate(id); err != nil {
		return err
	}
	m.invalidateCache()
	return nil
}

// GetByUser returns all virtual keys for a user.
func (m *Manager) GetByUser(userID string) ([]*VirtualKey, error) {
	return m.store.GetByUser(userID)
}

// GetByTeam returns all virtual keys for a team.
func (m *Manager) GetByTeam(teamID string) ([]*VirtualKey, error) {
	return m.store.GetByTeam(teamID)
}

// List returns all virtual keys.
func (m *Manager) List() ([]*VirtualKey, error) {
	return m.store.List()
}

func (m *Manager) invalidateCache() {
	m.mu.Lock()
	m.cache = make(map[string]*VirtualKey)
	m.cacheTime = time.Time{}
	m.mu.Unlock()
}

// CreateOptions configures a new virtual key.
type CreateOptions struct {
	Name              string
	TeamID            string
	UserID            string
	ModelAccess       []string
	RateLimitRPM      int
	RateLimitRPD      int
	RateLimitTPM      int
	BudgetLimitCents  int64
	BudgetResetPeriod string
	MaxTokensPerReq   int
	AllowedIPs        []string
	ExpiresAt         *time.Time
	Metadata          map[string]any
}

func generateKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "sk-" + hex.EncodeToString(b), nil
}
