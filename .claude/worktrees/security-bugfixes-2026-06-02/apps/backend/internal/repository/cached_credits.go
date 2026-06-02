package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedCreditsRepo wraps CreditsRepo with transparent caching.
type CachedCreditsRepo struct {
	*CreditsRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedCreditsRepo(repo *CreditsRepo, cache RepoCache, ttl time.Duration) *CachedCreditsRepo {
	if ttl == 0 {
		ttl = 2 * time.Minute
	}
	return &CachedCreditsRepo{CreditsRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedCreditsRepo) ByUser(ctx context.Context, userID string) (*domain.UserCredits, error) {
	key := creditsCacheKey(userID)
	var c domain.UserCredits
	if r.cache.Get(ctx, key, &c) {
		return &c, nil
	}
	credits, err := r.CreditsRepo.ByUser(ctx, userID)
	if err != nil || credits == nil {
		return credits, err
	}
	_ = r.cache.Set(ctx, key, credits, r.ttl)
	return credits, nil
}

func (r *CachedCreditsRepo) Upsert(ctx context.Context, userID string, balanceDelta, purchasedDelta int) error {
	err := r.CreditsRepo.Upsert(ctx, userID, balanceDelta, purchasedDelta)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, creditsCacheKey(userID))
	return nil
}

func (r *CachedCreditsRepo) Deduct(ctx context.Context, userID string, amount int) (bool, error) {
	ok, err := r.CreditsRepo.Deduct(ctx, userID, amount)
	if err != nil {
		return ok, err
	}
	_ = r.cache.Delete(ctx, creditsCacheKey(userID))
	return ok, nil
}
