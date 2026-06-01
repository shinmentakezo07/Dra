package repository_test

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/testutil"
)

func newTestDB(t *testing.T) (*db.DB, func()) {
	t.Helper()
	testutil.SkipIfNoDB(t)

	database, err := testutil.NewTestDB()
	if err != nil {
		t.Fatalf("NewTestDB error: %v", err)
	}
	return database, func() { database.Close() }
}

func TestUserRepo_CreateAndFindByEmail(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	repo := repository.NewUserRepo(db)
	ctx := context.Background()

	user, err := repo.Create(ctx, "Alice", "alice@test.com", "hash123", "user")
	if err != nil {
		t.Fatalf("Create error: %v", err)
	}
	if user.Name != "Alice" {
		t.Errorf("Name = %q, want Alice", user.Name)
	}

	found, err := repo.ByEmail(ctx, "alice@test.com")
	if err != nil {
		t.Fatalf("ByEmail error: %v", err)
	}
	if found == nil || found.ID != user.ID {
		t.Error("should find created user")
	}
}

func TestUserRepo_ByID_NotFound(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	repo := repository.NewUserRepo(db)
	found, err := repo.ByID(context.Background(), "nonexistent")
	if err != nil {
		t.Fatalf("ByID error: %v", err)
	}
	if found != nil {
		t.Error("should return nil for nonexistent user")
	}
}

func TestAPIKeyRepo_CreateAndFindByUser(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "KeyUser", "keyuser@test.com", "hash", "user")

	keyRepo := repository.NewAPIKeyRepo(db)
	rawKey := "dra_testkey1234567890abcdef"
	key, err := keyRepo.Create(ctx, user.ID, "Test Key", rawKey)
	if err != nil {
		t.Fatalf("Create error: %v", err)
	}
	if key.Name != "Test Key" {
		t.Errorf("Name = %q, want Test Key", key.Name)
	}

	keys, err := keyRepo.ByUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("ByUser error: %v", err)
	}
	if len(keys) != 1 {
		t.Errorf("got %d keys, want 1", len(keys))
	}
}

func TestCreditsRepo_InitAndBalance(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "CreditUser", "credit@test.com", "hash", "user")

	creditsRepo := repository.NewCreditsRepo(db)
	credits, err := creditsRepo.ByUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("ByUser error: %v", err)
	}
	if credits == nil {
		t.Error("expected credits record for new user")
	}
}

func TestLogRepo_EmptyList(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	repo := repository.NewLogRepo(db)
	logs, total, err := repo.ByUser(context.Background(), "nonexistent", 1, 10)
	if err != nil {
		t.Fatalf("ByUser error: %v", err)
	}
	if len(logs) != 0 || total != 0 {
		t.Errorf("got %d logs, total %d, want 0", len(logs), total)
	}
}

func TestOrganizationRepo_CreateAndFind(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "OrgOwner", "orgowner@test.com", "hash", "user")

	orgRepo := repository.NewOrganizationRepo(db)
	org, err := orgRepo.Create(ctx, "Acme Corp", user.ID, "free")
	if err != nil {
		t.Fatalf("Create error: %v", err)
	}
	if org.Name != "Acme Corp" {
		t.Errorf("Name = %q, want Acme Corp", org.Name)
	}

	found, err := orgRepo.ByID(ctx, org.ID)
	if err != nil {
		t.Fatalf("ByID error: %v", err)
	}
	if found == nil {
		t.Error("should find created org")
	}
}

// TestOrganizationRepo_MarkInviteUsed_Idempotent (C20) — MarkInviteUsed
// must be atomic via WHERE used_at IS NULL. Without that guard, two
// concurrent accept-invite requests both pass the UsedAt == nil check
// in the service layer and both UPDATE, adding the user as a member
// twice. The second call must return a non-nil error.
func TestOrganizationRepo_MarkInviteUsed_Idempotent(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "Invitee", "invitee@test.com", "hash", "user")
	orgRepo := repository.NewOrganizationRepo(db)
	org, _ := orgRepo.Create(ctx, "TestOrg", user.ID, "free")
	invite, err := orgRepo.CreateInvite(ctx, org.ID, "invitee@test.com", "member", "tok-123", time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("CreateInvite error: %v", err)
	}

	if err := orgRepo.MarkInviteUsed(ctx, invite.ID); err != nil {
		t.Fatalf("first MarkInviteUsed error: %v", err)
	}

	err = orgRepo.MarkInviteUsed(ctx, invite.ID)
	if err == nil {
		t.Fatal("expected second MarkInviteUsed to return an error (invite already used)")
	}
}
