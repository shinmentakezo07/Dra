package audit

import (
	"context"
	"sync"
	"testing"
	"time"
)

type memoryStore struct {
	mu      sync.RWMutex
	entries []*Entry
}

func (s *memoryStore) Save(entry *Entry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry.ID = "audit-" + time.Now().Format("20060102150405.000000000")
	s.entries = append(s.entries, entry)
	return nil
}

func (s *memoryStore) Query(filter Filter) ([]*Entry, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Entry
	for _, e := range s.entries {
		if filter.ActorID != "" && e.ActorID != filter.ActorID {
			continue
		}
		if filter.Action != "" && e.Action != filter.Action {
			continue
		}
		if filter.StartDate != nil && e.CreatedAt.Before(*filter.StartDate) {
			continue
		}
		if filter.EndDate != nil && e.CreatedAt.After(*filter.EndDate) {
			continue
		}
		result = append(result, e)
	}

	total := len(result)
	if total == 0 {
		return nil, 0, nil
	}
	start := (filter.Page - 1) * filter.Limit
	if start >= total {
		return nil, total, nil
	}
	if start < 0 {
		start = 0
	}
	end := start + filter.Limit
	if end > total {
		end = total
	}
	return result[start:end], total, nil
}

func (s *memoryStore) GetByID(id string) (*Entry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, e := range s.entries {
		if e.ID == id {
			return e, nil
		}
	}
	return nil, nil
}

func TestAuditLog(t *testing.T) {
	store := &memoryStore{}
	logger := NewLogger(store)

	ctx := context.Background()
	logger.LogKeyCreated(ctx, "user-1", "key-1", "My API Key")
	logger.LogKeyRotated(ctx, "user-1", "key-1")
	logger.LogKeyRevoked(ctx, "user-1", "key-1", "compromised")

	// Wait for async saves
	time.Sleep(50 * time.Millisecond)

	entries := logger.RecentEntries(10)
	if len(entries) != 3 {
		t.Errorf("expected 3 entries, got %d", len(entries))
	}
}

func TestAuditLogSecurityEvent(t *testing.T) {
	store := &memoryStore{}
	logger := NewLogger(store)

	ctx := context.Background()
	logger.LogSecurityEvent(ctx, ActionInjectionBlocked, "user-1", "req-1", "prompt injection detected", SeverityCritical)

	time.Sleep(50 * time.Millisecond)

	entries := logger.RecentEntries(10)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Severity != SeverityCritical {
		t.Errorf("expected critical severity, got %s", entries[0].Severity)
	}
}

func TestAuditQuery(t *testing.T) {
	store := &memoryStore{}
	logger := NewLogger(store)

	ctx := context.Background()
	logger.Log(ctx, &Entry{ActorID: "user-1", Action: ActionKeyCreated, ActorType: "user"})
	logger.Log(ctx, &Entry{ActorID: "user-2", Action: ActionKeyCreated, ActorType: "user"})
	logger.Log(ctx, &Entry{ActorID: "user-1", Action: ActionKeyRotated, ActorType: "user"})

	time.Sleep(50 * time.Millisecond)

	entries, total, _ := store.Query(Filter{ActorID: "user-1", Limit: 10})
	if total != 2 {
		t.Errorf("expected 2 entries for user-1, got %d", total)
	}
	if len(entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(entries))
	}
}

func TestAuditEntryToJSON(t *testing.T) {
	entry := &Entry{
		ID:           "test-1",
		ActorID:      "user-1",
		ActorType:    "user",
		Action:       ActionKeyCreated,
		ResourceType: "api_key",
		ResourceID:   "key-1",
		Severity:     SeverityInfo,
		RequestID:    "req-1",
		IPAddress:    "192.168.1.1",
		Details:      map[string]any{"key_name": "test"},
		CreatedAt:    time.Now(),
	}

	json := EntryToJSON(entry)
	if json == "" {
		t.Error("expected non-empty JSON")
	}
	if len(json) < 10 {
		t.Error("JSON too short")
	}
}

func TestSanitizeIP(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"192.168.1.1:12345", "192.168.1.1"},
		{"[::1]:12345", "::1"},
		{"10.0.0.1", "10.0.0.1"},
	}

	for _, tt := range tests {
		got := SanitizeIP(tt.input)
		if got != tt.want {
			t.Errorf("SanitizeIP(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
