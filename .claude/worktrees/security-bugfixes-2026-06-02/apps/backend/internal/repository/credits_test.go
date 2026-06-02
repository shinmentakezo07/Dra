package repository_test

import (
	"context"
	"testing"

	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/testutil"
)

func TestCreditsRepo_UpsertAndBalance(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "CreditUser2", "credit2@test.com", "hash", "user")

	repo := repository.NewCreditsRepo(db)

	err := repo.Upsert(ctx, user.ID, 5000, 5000)
	if err != nil {
		t.Fatalf("Upsert error: %v", err)
	}

	credits, err := repo.ByUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("ByUser error: %v", err)
	}
	if credits == nil {
		t.Fatal("expected credits record, got nil")
	}
	if credits.Balance != 5000 {
		t.Errorf("Balance = %d, want 5000", credits.Balance)
	}
}

func TestCreditsRepo_Deduct(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "DeductUser", "deduct@test.com", "hash", "user")

	repo := repository.NewCreditsRepo(db)
	repo.Upsert(ctx, user.ID, 1000, 1000)

	ok, err := repo.Deduct(ctx, user.ID, 300)
	if err != nil {
		t.Fatalf("Deduct error: %v", err)
	}
	if !ok {
		t.Error("expected deduct to succeed")
	}

	credits, _ := repo.ByUser(ctx, user.ID)
	if credits.Balance != 700 {
		t.Errorf("Balance = %d after deduct 300 from 1000, want 700", credits.Balance)
	}
}

func TestCreditsRepo_Deduct_Insufficient(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "PoorUser", "poor@test.com", "hash", "user")

	repo := repository.NewCreditsRepo(db)
	repo.Upsert(ctx, user.ID, 100, 100)

	ok, err := repo.Deduct(ctx, user.ID, 200)
	if err != nil {
		t.Fatalf("Deduct error: %v", err)
	}
	if ok {
		t.Error("expected deduct to fail with insufficient balance")
	}
}

func TestAPIKeyRepo_Delete_NotFound(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	repo := repository.NewAPIKeyRepo(db)
	err := repo.Delete(context.Background(), "nonexistent-user", "nonexistent-key")
	if err == nil {
		t.Error("expected error when deleting nonexistent key")
	}
}

func TestAPIKeyRepo_Revoke_NotFound(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	repo := repository.NewAPIKeyRepo(db)
	err := repo.Revoke(context.Background(), "nonexistent-key")
	if err == nil {
		t.Error("expected error when revoking nonexistent key")
	}
}

func TestUserRepo_DuplicateEmail(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	repo := repository.NewUserRepo(db)
	_, err := repo.Create(ctx, "Alice", "dup@test.com", "hash1", "user")
	if err != nil {
		t.Fatalf("first Create error: %v", err)
	}

	_, err = repo.Create(ctx, "Bob", "dup@test.com", "hash2", "user")
	if err == nil {
		t.Error("expected error for duplicate email")
	}
}

func TestTransactionRepo_ByUser(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "TxUser", "tx@test.com", "hash", "user")

	txRepo := repository.NewTransactionRepo(db)
	txs, total, err := txRepo.ByUser(ctx, user.ID, 1, 10)
	if err != nil {
		t.Fatalf("ByUser error: %v", err)
	}
	if total != 0 {
		t.Errorf("expected 0 transactions, got %d", total)
	}
	if len(txs) != 0 {
		t.Errorf("expected empty transactions, got %d", len(txs))
	}
}
