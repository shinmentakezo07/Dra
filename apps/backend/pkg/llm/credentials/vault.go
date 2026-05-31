// Package credentials provides encrypted API key storage with rotation and health-based failover.
package credentials

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"
)

// Credential represents a stored provider API key.
type Credential struct {
	ID             string
	Name           string
	ProviderType   string
	EncryptedKey   string
	KeyHash        string
	KeyLastFour    string
	APIBase        string
	ExtraConfig    map[string]any
	Priority       int
	IsActive       bool
	HealthStatus   string // healthy, degraded, unhealthy, unknown
	LastHealthCheck *time.Time
	LastRotatedAt  *time.Time
	FailureCount   int
	SuccessCount   int64
	TotalRequests  int64
	LastError      string
}

// Store is the interface for credential persistence.
type Store interface {
	Save(c *Credential) error
	GetByID(id string) (*Credential, error)
	GetByProvider(providerType string) ([]*Credential, error)
	GetActiveByProvider(providerType string) ([]*Credential, error)
	UpdateHealth(id, status string, failureCount int, lastError string) error
	Delete(id string) error
	List() ([]*Credential, error)
}

// Vault manages encrypted API keys with rotation and failover.
type Vault struct {
	store      Store
	cipher     cipher.AEAD
	mu         sync.RWMutex
	cache      map[string][]*Credential // providerType -> credentials
	cacheTime  map[string]time.Time
	cacheTTL   time.Duration
	rotationCh chan string
}

// NewVault creates a new credential vault.
func NewVault(store Store, encryptionKey string) (*Vault, error) {
	if len(encryptionKey) == 0 {
		return nil, fmt.Errorf("encryption key is required")
	}

	key := sha256.Sum256([]byte(encryptionKey))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM: %w", err)
	}

	return &Vault{
		store:      store,
		cipher:     aead,
		cache:      make(map[string][]*Credential),
		cacheTime:  make(map[string]time.Time),
		cacheTTL:   5 * time.Minute,
		rotationCh: make(chan string, 100),
	}, nil
}

// Add stores an encrypted API key.
func (v *Vault) Add(name, providerType, apiKey, apiBase string, priority int) (*Credential, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key cannot be empty")
	}

	encrypted, err := v.encrypt(apiKey)
	if err != nil {
		return nil, fmt.Errorf("encrypt key: %w", err)
	}

	hash := sha256.Sum256([]byte(apiKey))
	lastFour := apiKey
	if len(apiKey) > 4 {
		lastFour = apiKey[len(apiKey)-4:]
	}

	c := &Credential{
		Name:         name,
		ProviderType: strings.ToLower(strings.TrimSpace(providerType)),
		EncryptedKey: encrypted,
		KeyHash:      hex.EncodeToString(hash[:]),
		KeyLastFour:  lastFour,
		APIBase:      apiBase,
		Priority:     priority,
		IsActive:     true,
		HealthStatus: "unknown",
	}

	if err := v.store.Save(c); err != nil {
		return nil, fmt.Errorf("save credential: %w", err)
	}

	v.addToCache(c.ProviderType, c)
	return c, nil
}

// GetKey decrypts and returns the API key for a credential ID.
func (v *Vault) GetKey(id string) (string, error) {
	c, err := v.store.GetByID(id)
	if err != nil {
		return "", fmt.Errorf("get credential: %w", err)
	}
	if c == nil {
		return "", fmt.Errorf("credential not found: %s", id)
	}

	key, err := v.decrypt(c.EncryptedKey)
	if err != nil {
		return "", fmt.Errorf("decrypt key: %w", err)
	}

	return key, nil
}

// GetBestKey returns the best available key for a provider based on health and priority.
func (v *Vault) GetBestKey(providerType string) (string, *Credential, error) {
	creds, err := v.getActiveCredentials(providerType)
	if err != nil {
		return "", nil, err
	}

	// Sort by priority (highest first), then health status
	best := v.selectBest(creds)
	if best == nil {
		return "", nil, fmt.Errorf("no active credentials for provider: %s", providerType)
	}

	key, err := v.decrypt(best.EncryptedKey)
	if err != nil {
		return "", nil, fmt.Errorf("decrypt key: %w", err)
	}

	return key, best, nil
}

// GetAllKeys returns all active decrypted keys for a provider (for failover).
func (v *Vault) GetAllKeys(providerType string) ([]string, []*Credential, error) {
	creds, err := v.getActiveCredentials(providerType)
	if err != nil {
		return nil, nil, err
	}

	var keys []string
	var validCreds []*Credential
	for _, c := range creds {
		key, err := v.decrypt(c.EncryptedKey)
		if err != nil {
			continue
		}
		keys = append(keys, key)
		validCreds = append(validCreds, c)
	}

	return keys, validCreds, nil
}

// RecordSuccess records a successful request for a credential.
func (v *Vault) RecordSuccess(id string) {
	_ = v.store.UpdateHealth(id, "healthy", 0, "")
	v.mu.Lock()
	defer v.mu.Unlock()
	for provider, creds := range v.cache {
		for _, c := range creds {
			if c.ID == id {
				c.HealthStatus = "healthy"
				c.FailureCount = 0
				c.SuccessCount++
				c.TotalRequests++
				v.cacheTime[provider] = time.Time{} // force refresh
				return
			}
		}
	}
}

// RecordFailure records a failed request for a credential.
func (v *Vault) RecordFailure(id string, err error) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
		if len(errMsg) > 500 {
			errMsg = errMsg[:500]
		}
	}

	v.mu.Lock()
	var provider string
	var newFailures int
	for p, creds := range v.cache {
		for _, c := range creds {
			if c.ID == id {
				c.FailureCount++
				c.TotalRequests++
				c.LastError = errMsg
				newFailures = c.FailureCount
				provider = p
				break
			}
		}
	}
	v.mu.Unlock()

	// If not found in cache, get from store directly
	if newFailures == 0 {
		c, _ := v.store.GetByID(id)
		if c != nil {
			newFailures = c.FailureCount + 1
			provider = c.ProviderType
		}
	}

	status := "degraded"
	if newFailures >= 5 {
		status = "unhealthy"
	}
	_ = v.store.UpdateHealth(id, status, newFailures, errMsg)

	if provider != "" {
		v.invalidateCache(provider)
	}
}

// Rotate replaces an existing credential's API key.
func (v *Vault) Rotate(id, newAPIKey string) error {
	c, err := v.store.GetByID(id)
	if err != nil {
		return fmt.Errorf("get credential: %w", err)
	}
	if c == nil {
		return fmt.Errorf("credential not found: %s", id)
	}

	encrypted, err := v.encrypt(newAPIKey)
	if err != nil {
		return fmt.Errorf("encrypt new key: %w", err)
	}

	hash := sha256.Sum256([]byte(newAPIKey))
	lastFour := newAPIKey
	if len(newAPIKey) > 4 {
		lastFour = newAPIKey[len(newAPIKey)-4:]
	}

	now := time.Now()
	c.EncryptedKey = encrypted
	c.KeyHash = hex.EncodeToString(hash[:])
	c.KeyLastFour = lastFour
	c.LastRotatedAt = &now
	c.FailureCount = 0
	c.HealthStatus = "unknown"

	if err := v.store.Save(c); err != nil {
		return fmt.Errorf("save rotated credential: %w", err)
	}

	v.invalidateCache(c.ProviderType)
	return nil
}

// Delete removes a credential.
func (v *Vault) Delete(id string) error {
	c, err := v.store.GetByID(id)
	if err != nil {
		return fmt.Errorf("get credential: %w", err)
	}
	if c == nil {
		return fmt.Errorf("credential not found: %s", id)
	}

	if err := v.store.Delete(id); err != nil {
		return fmt.Errorf("delete credential: %w", err)
	}

	v.invalidateCache(c.ProviderType)
	return nil
}

// List returns all credentials (decrypted keys excluded).
func (v *Vault) List() ([]*Credential, error) {
	return v.store.List()
}

// GetByProvider returns all credentials for a provider.
func (v *Vault) GetByProvider(providerType string) ([]*Credential, error) {
	return v.store.GetByProvider(strings.ToLower(providerType))
}

func (v *Vault) getActiveCredentials(providerType string) ([]*Credential, error) {
	providerType = strings.ToLower(providerType)

	v.mu.RLock()
	cached, ok := v.cache[providerType]
	cachedAt, _ := v.cacheTime[providerType]
	if ok && time.Since(cachedAt) < v.cacheTTL {
		v.mu.RUnlock()
		return cached, nil
	}
	v.mu.RUnlock()

	creds, err := v.store.GetActiveByProvider(providerType)
	if err != nil {
		return nil, err
	}

	v.mu.Lock()
	v.cache[providerType] = creds
	v.cacheTime[providerType] = time.Now()
	v.mu.Unlock()

	return creds, nil
}

func (v *Vault) selectBest(creds []*Credential) *Credential {
	if len(creds) == 0 {
		return nil
	}

	// Priority: healthy+high priority > healthy > degraded+high priority > degraded > unhealthy
	bestHealth := 999
	bestPriority := -1
	var best *Credential

	for _, c := range creds {
		if !c.IsActive {
			continue
		}

		healthScore := v.healthScore(c.HealthStatus)
		if healthScore < bestHealth || (healthScore == bestHealth && c.Priority > bestPriority) {
			bestHealth = healthScore
			bestPriority = c.Priority
			best = c
		}
	}

	return best
}

func (v *Vault) healthScore(status string) int {
	switch status {
	case "healthy":
		return 0
	case "unknown":
		return 1
	case "degraded":
		return 2
	case "unhealthy":
		return 3
	default:
		return 4
	}
}

func (v *Vault) invalidateCache(providerType string) {
	v.mu.Lock()
	delete(v.cache, providerType)
	delete(v.cacheTime, providerType)
	v.mu.Unlock()
}

func (v *Vault) addToCache(providerType string, cred *Credential) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if existing, ok := v.cache[providerType]; ok {
		v.cache[providerType] = append(existing, cred)
	} else {
		v.cache[providerType] = []*Credential{cred}
	}
}

func (v *Vault) encrypt(plaintext string) (string, error) {
	nonce := make([]byte, v.cipher.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := v.cipher.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (v *Vault) decrypt(encoded string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	nonceSize := v.cipher.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := v.cipher.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plaintext), nil
}
