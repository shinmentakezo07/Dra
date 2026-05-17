package repository

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/internal/domain"
)

func TestMemoryRepoCache_BasicOps(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryRepoCache(100)

	u := &domain.User{ID: "u1", Email: "test@example.com", Name: "Test", Role: "user"}

	// Set and get
	if err := cache.Set(ctx, userCacheKey(u.ID), u, time.Minute); err != nil {
		t.Fatalf("set failed: %v", err)
	}

	var got domain.User
	if !cache.Get(ctx, userCacheKey(u.ID), &got) {
		t.Fatal("expected cache hit")
	}
	if got.ID != u.ID || got.Email != u.Email {
		t.Fatalf("unexpected value: %+v", got)
	}

	// Delete
	if err := cache.Delete(ctx, userCacheKey(u.ID)); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if cache.Get(ctx, userCacheKey(u.ID), &got) {
		t.Fatal("expected cache miss after delete")
	}
}

func TestMemoryRepoCache_TTLExpiration(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryRepoCache(100)

	u := &domain.User{ID: "u2", Email: "exp@example.com", Name: "Exp", Role: "user"}
	if err := cache.Set(ctx, userCacheKey(u.ID), u, 1*time.Millisecond); err != nil {
		t.Fatalf("set failed: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	var got domain.User
	if cache.Get(ctx, userCacheKey(u.ID), &got) {
		t.Fatal("expected cache miss after TTL expiration")
	}
}

func TestMemoryRepoCache_DeletePrefix(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryRepoCache(100)

	u1 := &domain.User{ID: "u1", Email: "a@example.com", Name: "A", Role: "user"}
	u2 := &domain.User{ID: "u2", Email: "b@example.com", Name: "B", Role: "user"}

	_ = cache.Set(ctx, userCacheKey(u1.ID), u1, time.Minute)
	_ = cache.Set(ctx, userCacheKey(u2.ID), u2, time.Minute)
	_ = cache.Set(ctx, apiKeyCacheKey("k1"), &domain.APIKey{ID: "k1"}, time.Minute)

	if err := cache.DeletePrefix(ctx, "user:"); err != nil {
		t.Fatalf("delete prefix failed: %v", err)
	}

	var got domain.User
	if cache.Get(ctx, userCacheKey(u1.ID), &got) {
		t.Fatal("expected u1 to be deleted")
	}
	if cache.Get(ctx, userCacheKey(u2.ID), &got) {
		t.Fatal("expected u2 to be deleted")
	}

	var k domain.APIKey
	if !cache.Get(ctx, apiKeyCacheKey("k1"), &k) {
		t.Fatal("expected api key to remain")
	}
}

func TestCacheKeyHelpers(t *testing.T) {
	if got := userCacheKey("123"); got != "user:id:123" {
		t.Fatalf("unexpected userCacheKey: %s", got)
	}
	if got := userEmailCacheKey("a@b.com"); got != "user:email:a@b.com" {
		t.Fatalf("unexpected userEmailCacheKey: %s", got)
	}
	if got := apiKeyCacheKey("hash"); got != "apikey:hash" {
		t.Fatalf("unexpected apiKeyCacheKey: %s", got)
	}
	if got := creditsCacheKey("u1"); got != "credits:u1" {
		t.Fatalf("unexpected creditsCacheKey: %s", got)
	}
}
