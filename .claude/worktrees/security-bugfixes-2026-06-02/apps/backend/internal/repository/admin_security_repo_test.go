package repository_test

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"github.com/google/uuid"
)

func TestAdminSecurityRepo_ListIPEntriesWithoutActionFilter(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	ctx := context.Background()
	repo := repository.NewAdminSecurityRepo(db)

	if _, err := db.Exec(ctx, "DELETE FROM ip_lists"); err != nil {
		t.Fatalf("clear ip_lists error: %v", err)
	}

	entryA := &domain.IPList{
		ID:       uuid.New().String(),
		IPOrCIDR: "203.0.113.10",
		Action:   "allow",
		Scope:    "global",
		Reason:   "test allow",
	}
	entryB := &domain.IPList{
		ID:       uuid.New().String(),
		IPOrCIDR: "198.51.100.0/24",
		Action:   "block",
		Scope:    "global",
		Reason:   "test block",
		ExpiresAt: func() *time.Time {
			t := time.Now().UTC().Add(time.Hour)
			return &t
		}(),
	}

	if err := repo.AddIPEntry(ctx, entryA); err != nil {
		t.Fatalf("AddIPEntry entryA error: %v", err)
	}
	if err := repo.AddIPEntry(ctx, entryB); err != nil {
		t.Fatalf("AddIPEntry entryB error: %v", err)
	}

	entries, err := repo.ListIPEntries(ctx, "")
	if err != nil {
		t.Fatalf("ListIPEntries without action filter error: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2", len(entries))
	}

	foundAllow := false
	foundBlock := false
	for _, entry := range entries {
		if entry.ID == entryA.ID && entry.Action == entryA.Action {
			foundAllow = true
		}
		if entry.ID == entryB.ID && entry.Action == entryB.Action {
			foundBlock = true
		}
	}

	if !foundAllow || !foundBlock {
		t.Fatalf("expected both seeded entries, foundAllow=%v foundBlock=%v", foundAllow, foundBlock)
	}
}
