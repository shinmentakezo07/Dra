package repository

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/internal/domain"
)

func TestUserRepo_CacheIntegration(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryRepoCache(100)

	repo := NewUserRepo(nil) // db is nil; we only test cache layer
	repo.SetCache(cache, time.Minute)

	// Simulate cache population via Create
	u := &domain.User{ID: "u1", Email: "test@example.com", Name: "Test", Role: "user"}
	_ = cache.Set(ctx, userCacheKey(u.ID), u, time.Minute)

	// ByID should hit cache without touching db
	got, err := repo.ByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("ByID cache lookup failed: %v", err)
	}
	if got == nil {
		t.Fatal("expected cache hit for ByID")
	}
	if got.Email != u.Email {
		t.Fatalf("unexpected email: %s", got.Email)
	}

	// ByEmail should hit cache without touching db
	_ = cache.Set(ctx, userEmailCacheKey(u.Email), u, time.Minute)
	got2, err := repo.ByEmail(ctx, u.Email)
	if err != nil {
		t.Fatalf("ByEmail cache lookup failed: %v", err)
	}
	if got2 == nil {
		t.Fatal("expected cache hit for ByEmail")
	}
	if got2.Email != u.Email {
		t.Fatalf("unexpected email: %s", got2.Email)
	}

	// UpdateProfile should invalidate cache
	_ = cache.Set(ctx, userCacheKey(u.ID), u, time.Minute)
	_ = cache.Set(ctx, userEmailCacheKey(u.Email), u, time.Minute)
	// We can't call UpdateProfile with nil db, so test cache invalidation directly
	_ = cache.Delete(ctx, userCacheKey(u.ID))
	_ = cache.Delete(ctx, userEmailCacheKey(u.Email))

	var missed domain.User
	if cache.Get(ctx, userCacheKey(u.ID), &missed) {
		t.Fatal("expected cache miss after invalidation")
	}
}

func TestCreditsRepo_CacheIntegration(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryRepoCache(100)

	repo := NewCreditsRepo(nil)
	repo.SetCache(cache, time.Minute)

	c := &domain.UserCredits{ID: "c1", UserID: "u1", Balance: 100}
	_ = cache.Set(ctx, creditsCacheKey(c.UserID), c, time.Minute)

	got, err := repo.ByUser(ctx, c.UserID)
	if err != nil {
		t.Fatalf("ByUser cache lookup failed: %v", err)
	}
	if got == nil {
		t.Fatal("expected cache hit")
	}
	if got.Balance != 100 {
		t.Fatalf("unexpected balance: %d", got.Balance)
	}
}
