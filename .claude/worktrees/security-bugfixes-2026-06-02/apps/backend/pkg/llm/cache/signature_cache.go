package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// SignatureEntry holds a cached thinking signature with timestamp.
type SignatureEntry struct {
	Signature string
	Timestamp time.Time
}

const (
	// SignatureCacheTTL is how long signatures are valid.
	SignatureCacheTTL = 3 * time.Hour
	// SignatureTextHashLen is the hex length of the hash key.
	SignatureTextHashLen = 16
	// MinValidSignatureLen is the minimum valid signature length.
	MinValidSignatureLen = 50
	// CacheCleanupInterval controls stale entry purging.
	CacheCleanupInterval = 10 * time.Minute
)

// groupCache is the inner map type for a model group.
type groupCache struct {
	mu      sync.RWMutex
	entries map[string]SignatureEntry
}

// SignatureCache stores thinking signatures by model group -> textHash -> SignatureEntry.
// Used for Claude models that require signed thinking blocks in multi-turn conversations.
type SignatureCache struct {
	cache         sync.Map
	cleanupOnce   sync.Once
	enabled       atomic.Bool
	bypassStrict  atomic.Bool
}

// NewSignatureCache creates a new signature cache.
func NewSignatureCache() *SignatureCache {
	sc := &SignatureCache{}
	sc.enabled.Store(true)
	sc.bypassStrict.Store(false)
	return sc
}

// hashText creates a stable, Unicode-safe key from text content.
func (sc *SignatureCache) hashText(text string) string {
	h := sha256.Sum256([]byte(text))
	return hex.EncodeToString(h[:])[:SignatureTextHashLen]
}

// getOrCreateGroupCache gets or creates a cache bucket for a model group.
func (sc *SignatureCache) getOrCreateGroupCache(groupKey string) *groupCache {
	sc.cleanupOnce.Do(func() { go sc.startCleanup() })

	if val, ok := sc.cache.Load(groupKey); ok {
		return val.(*groupCache)
	}
	gc := &groupCache{entries: make(map[string]SignatureEntry)}
	actual, _ := sc.cache.LoadOrStore(groupKey, gc)
	return actual.(*groupCache)
}

// startCleanup periodically removes expired entries.
func (sc *SignatureCache) startCleanup() {
	ticker := time.NewTicker(CacheCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		sc.purgeExpired()
	}
}

// purgeExpired removes expired entries and empty groups.
func (sc *SignatureCache) purgeExpired() {
	now := time.Now()
	sc.cache.Range(func(key, value any) bool {
		gc := value.(*groupCache)
		gc.mu.Lock()
		for k, entry := range gc.entries {
			if now.Sub(entry.Timestamp) > SignatureCacheTTL {
				delete(gc.entries, k)
			}
		}
		isEmpty := len(gc.entries) == 0
		gc.mu.Unlock()
		if isEmpty {
			sc.cache.Delete(key)
		}
		return true
	})
}

// GetModelGroup returns the model group key for signature caching.
func GetModelGroup(modelName string) string {
	lower := strings.ToLower(modelName)
	switch {
	case strings.Contains(lower, "claude"):
		return "claude"
	case strings.Contains(lower, "gemini"):
		return "gemini"
	case strings.Contains(lower, "gpt"), strings.Contains(lower, "o1"), strings.Contains(lower, "o3"):
		return "openai"
	default:
		return modelName
	}
}

// CacheSignature stores a thinking signature for a model group and text.
func (sc *SignatureCache) CacheSignature(modelName, text, signature string) {
	if text == "" || signature == "" {
		return
	}
	if len(signature) < MinValidSignatureLen {
		return
	}

	groupKey := GetModelGroup(modelName)
	textHash := sc.hashText(text)
	gc := sc.getOrCreateGroupCache(groupKey)
	gc.mu.Lock()
	defer gc.mu.Unlock()

	gc.entries[textHash] = SignatureEntry{
		Signature: signature,
		Timestamp: time.Now(),
	}
}

// GetCachedSignature retrieves a cached signature for a model group and text.
// Returns empty string if not found or expired.
func (sc *SignatureCache) GetCachedSignature(modelName, text string) string {
	groupKey := GetModelGroup(modelName)
	if text == "" {
		return ""
	}

	val, ok := sc.cache.Load(groupKey)
	if !ok {
		return ""
	}
	gc := val.(*groupCache)
	textHash := sc.hashText(text)
	now := time.Now()

	gc.mu.Lock()
	entry, exists := gc.entries[textHash]
	if !exists {
		gc.mu.Unlock()
		return ""
	}
	if now.Sub(entry.Timestamp) > SignatureCacheTTL {
		delete(gc.entries, textHash)
		gc.mu.Unlock()
		return ""
	}
	// Refresh TTL on access (sliding expiration)
	entry.Timestamp = now
	gc.entries[textHash] = entry
	gc.mu.Unlock()

	return entry.Signature
}

// ClearSignatureCache clears cache for a specific model group or all groups.
func (sc *SignatureCache) ClearSignatureCache(modelName string) {
	if modelName == "" {
		sc.cache.Range(func(key, _ any) bool {
			sc.cache.Delete(key)
			return true
		})
		return
	}
	groupKey := GetModelGroup(modelName)
	sc.cache.Delete(groupKey)
}

// HasValidSignature checks if a signature is valid (non-empty and long enough).
func (sc *SignatureCache) HasValidSignature(modelName, signature string) bool {
	return signature != "" && len(signature) >= MinValidSignatureLen
}

// SetEnabled enables or disables the signature cache.
func (sc *SignatureCache) SetEnabled(enabled bool) {
	previous := sc.enabled.Swap(enabled)
	if previous != enabled {
		if !enabled {
			slog.Info("signature cache DISABLED - bypass mode active")
		} else {
			slog.Info("signature cache ENABLED")
		}
	}
}

// Enabled returns whether the signature cache is enabled.
func (sc *SignatureCache) Enabled() bool {
	return sc.enabled.Load()
}

// SetBypassStrictMode controls bypass mode validation strictness.
func (sc *SignatureCache) SetBypassStrictMode(strict bool) {
	sc.bypassStrict.Store(strict)
}

// BypassStrictMode returns whether bypass mode uses strict validation.
func (sc *SignatureCache) BypassStrictMode() bool {
	return sc.bypassStrict.Load()
}
