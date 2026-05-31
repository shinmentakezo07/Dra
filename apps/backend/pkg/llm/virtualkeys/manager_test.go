package virtualkeys

import (
	"sync"
	"testing"
	"time"
)

type memoryStore struct {
	mu   sync.RWMutex
	keys map[string]*VirtualKey // by hash
	byID map[string]*VirtualKey
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		keys: make(map[string]*VirtualKey),
		byID: make(map[string]*VirtualKey),
	}
}

func (s *memoryStore) Save(vk *VirtualKey) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if vk.ID == "" {
		vk.ID = "vk-" + time.Now().Format("20060102150405.000000000")
	}
	s.keys[vk.KeyHash] = vk
	s.byID[vk.ID] = vk
	return nil
}

func (s *memoryStore) GetByHash(hash string) (*VirtualKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.keys[hash], nil
}

func (s *memoryStore) GetByID(id string) (*VirtualKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byID[id], nil
}

func (s *memoryStore) GetByUser(userID string) ([]*VirtualKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*VirtualKey
	for _, vk := range s.byID {
		if vk.UserID == userID {
			result = append(result, vk)
		}
	}
	return result, nil
}

func (s *memoryStore) GetByTeam(teamID string) ([]*VirtualKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*VirtualKey
	for _, vk := range s.byID {
		if vk.TeamID == teamID {
			result = append(result, vk)
		}
	}
	return result, nil
}

func (s *memoryStore) UpdateUsage(id string, cents int64, tokens int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if vk, ok := s.byID[id]; ok {
		vk.BudgetUsedCents += cents
		vk.RequestCount++
		vk.TotalTokens += int64(tokens)
	}
	return nil
}

func (s *memoryStore) Deactivate(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if vk, ok := s.byID[id]; ok {
		vk.IsActive = false
	}
	return nil
}

func (s *memoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if vk, ok := s.byID[id]; ok {
		delete(s.keys, vk.KeyHash)
		delete(s.byID, id)
	}
	return nil
}

func (s *memoryStore) List() ([]*VirtualKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*VirtualKey
	for _, vk := range s.byID {
		result = append(result, vk)
	}
	return result, nil
}

func TestCreateAndValidate(t *testing.T) {
	store := newMemoryStore()
	mgr := NewManager(store)

	vk, rawKey, err := mgr.Create(CreateOptions{
		UserID: "user-1",
		Name:   "Test Key",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if rawKey == "" || len(rawKey) < 10 {
		t.Error("expected non-empty raw key")
	}
	if vk.KeyPrefix == "" {
		t.Error("expected non-empty key prefix")
	}

	// Validate the key
	validated, err := mgr.Validate(rawKey)
	if err != nil {
		t.Fatalf("Validate: %v", err)
	}
	if validated.ID != vk.ID {
		t.Errorf("expected ID %s, got %s", vk.ID, validated.ID)
	}
}

func TestValidateInvalidKey(t *testing.T) {
	store := newMemoryStore()
	mgr := NewManager(store)

	_, err := mgr.Validate("sk-invalidkey123456789")
	if err == nil {
		t.Error("expected error for invalid key")
	}

	_, err = mgr.Validate("not-a-key")
	if err == nil {
		t.Error("expected error for non sk- key")
	}
}

func TestModelAccess(t *testing.T) {
	store := newMemoryStore()
	mgr := NewManager(store)

	vk, _, _ := mgr.Create(CreateOptions{
		UserID:      "user-1",
		ModelAccess: []string{"gpt-4", "claude-3-*"},
	})

	// gpt-4 should be allowed
	if err := mgr.CheckModelAccess(vk, "gpt-4"); err != nil {
		t.Errorf("gpt-4 should be allowed: %v", err)
	}

	// claude-3-opus should be allowed (wildcard)
	if err := mgr.CheckModelAccess(vk, "claude-3-opus"); err != nil {
		t.Errorf("claude-3-opus should be allowed: %v", err)
	}

	// gemini-pro should be blocked
	if err := mgr.CheckModelAccess(vk, "gemini-pro"); err == nil {
		t.Error("gemini-pro should be blocked")
	}
}

func TestDeactivate(t *testing.T) {
	store := newMemoryStore()
	mgr := NewManager(store)

	_, rawKey, _ := mgr.Create(CreateOptions{UserID: "user-1"})

	// Validate first
	vk, _ := mgr.Validate(rawKey)
	if !vk.IsActive {
		t.Error("expected active key")
	}

	// Deactivate
	mgr.Deactivate(vk.ID)
	mgr.invalidateCache()

	// Should fail validation
	_, err := mgr.Validate(rawKey)
	if err == nil {
		t.Error("expected error for deactivated key")
	}
}

func TestBudgetTracking(t *testing.T) {
	store := newMemoryStore()
	mgr := NewManager(store)

	vk, _, _ := mgr.Create(CreateOptions{
		UserID:           "user-1",
		BudgetLimitCents: 1000,
	})

	mgr.RecordUsage(vk.ID, 500, 1000)
	mgr.RecordUsage(vk.ID, 300, 500)

	// Refresh from store
	updated, _ := store.GetByID(vk.ID)
	if updated.BudgetUsedCents != 800 {
		t.Errorf("expected budget used 800, got %d", updated.BudgetUsedCents)
	}
	if updated.RequestCount != 2 {
		t.Errorf("expected request count 2, got %d", updated.RequestCount)
	}
	if updated.TotalTokens != 1500 {
		t.Errorf("expected total tokens 1500, got %d", updated.TotalTokens)
	}
}
