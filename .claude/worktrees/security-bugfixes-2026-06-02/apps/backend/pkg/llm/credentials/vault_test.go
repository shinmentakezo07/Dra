package credentials

import (
	"sync"
	"testing"
	"time"
)

type memoryStore struct {
	mu   sync.RWMutex
	data map[string]*Credential
}

func newMemoryStore() *memoryStore {
	return &memoryStore{data: make(map[string]*Credential)}
}

func (s *memoryStore) Save(c *Credential) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if c.ID == "" {
		c.ID = "cred-" + time.Now().Format("20060102150405.000000000")
	}
	s.data[c.ID] = c
	return nil
}

func (s *memoryStore) GetByID(id string) (*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data[id], nil
}

func (s *memoryStore) GetByProvider(providerType string) ([]*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Credential
	for _, c := range s.data {
		if c.ProviderType == providerType {
			result = append(result, c)
		}
	}
	return result, nil
}

func (s *memoryStore) GetActiveByProvider(providerType string) ([]*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Credential
	for _, c := range s.data {
		if c.ProviderType == providerType && c.IsActive {
			result = append(result, c)
		}
	}
	return result, nil
}

func (s *memoryStore) UpdateHealth(id, status string, failureCount int, lastError string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if c, ok := s.data[id]; ok {
		c.HealthStatus = status
		c.FailureCount = failureCount
		c.LastError = lastError
	}
	return nil
}

func (s *memoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, id)
	return nil
}

func (s *memoryStore) List() ([]*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Credential
	for _, c := range s.data {
		result = append(result, c)
	}
	return result, nil
}

func TestVaultAddAndGetKey(t *testing.T) {
	store := newMemoryStore()
	vault, err := NewVault(store, "test-encryption-key-32bytes!")
	if err != nil {
		t.Fatalf("NewVault: %v", err)
	}

	c, err := vault.Add("test-key", "openai", "sk-test123456789", "", 10)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	if c.KeyLastFour != "6789" {
		t.Errorf("expected last four '6789', got '%s'", c.KeyLastFour)
	}

	key, err := vault.GetKey(c.ID)
	if err != nil {
		t.Fatalf("GetKey: %v", err)
	}
	if key != "sk-test123456789" {
		t.Errorf("expected 'sk-test123456789', got '%s'", key)
	}
}

func TestVaultGetBestKey(t *testing.T) {
	store := newMemoryStore()
	vault, _ := NewVault(store, "test-encryption-key-32bytes!")

	vault.Add("key1", "openai", "sk-key1aaaa", "", 5)
	vault.Add("key2", "openai", "sk-key2bbbb", "", 10)

	key, cred, err := vault.GetBestKey("openai")
	if err != nil {
		t.Fatalf("GetBestKey: %v", err)
	}
	if key != "sk-key2bbbb" {
		t.Errorf("expected highest priority key, got '%s'", key)
	}
	if cred.Priority != 10 {
		t.Errorf("expected priority 10, got %d", cred.Priority)
	}
}

func TestVaultRecordFailure(t *testing.T) {
	store := newMemoryStore()
	vault, _ := NewVault(store, "test-encryption-key-32bytes!")

	c, _ := vault.Add("key1", "openai", "sk-test123", "", 5)

	for i := 0; i < 6; i++ {
		vault.RecordFailure(c.ID, nil)
	}

	// After 6 failures, the store should have unhealthy status
	cred, _ := store.GetByID(c.ID)
	if cred == nil {
		t.Fatal("credential not found in store")
	}
	if cred.HealthStatus != "unhealthy" {
		t.Errorf("expected unhealthy status in store, got '%s'", cred.HealthStatus)
	}
	if cred.FailureCount != 6 {
		t.Errorf("expected 6 failures, got %d", cred.FailureCount)
	}
}

func TestVaultRotate(t *testing.T) {
	store := newMemoryStore()
	vault, _ := NewVault(store, "test-encryption-key-32bytes!")

	c, _ := vault.Add("key1", "openai", "sk-old-key", "", 5)

	if err := vault.Rotate(c.ID, "sk-new-key"); err != nil {
		t.Fatalf("Rotate: %v", err)
	}

	key, err := vault.GetKey(c.ID)
	if err != nil {
		t.Fatalf("GetKey: %v", err)
	}
	if key != "sk-new-key" {
		t.Errorf("expected 'sk-new-key', got '%s'", key)
	}
}

func TestVaultDelete(t *testing.T) {
	store := newMemoryStore()
	vault, _ := NewVault(store, "test-encryption-key-32bytes!")

	c, _ := vault.Add("key1", "openai", "sk-test", "", 5)
	if err := vault.Delete(c.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	key, err := vault.GetKey(c.ID)
	if err == nil {
		t.Error("expected error after deletion")
	}
	if key != "" {
		t.Error("expected empty key after deletion")
	}
}

func TestVaultEncryption(t *testing.T) {
	store := newMemoryStore()
	vault, _ := NewVault(store, "test-encryption-key-32bytes!")

	c, _ := vault.Add("key1", "openai", "sk-secret-key", "", 5)

	// Verify stored key is encrypted (not plaintext)
	if c.EncryptedKey == "sk-secret-key" {
		t.Error("stored key should be encrypted, not plaintext")
	}

	// Verify decryption works
	key, _ := vault.GetKey(c.ID)
	if key != "sk-secret-key" {
		t.Errorf("decrypted key mismatch: got '%s'", key)
	}
}
