package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedAPIKeyRepo wraps APIKeyRepo with transparent caching.
type CachedAPIKeyRepo struct {
	*APIKeyRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedAPIKeyRepo(repo *APIKeyRepo, cache RepoCache, ttl time.Duration) *CachedAPIKeyRepo {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &CachedAPIKeyRepo{APIKeyRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedAPIKeyRepo) ByKey(ctx context.Context, key string) (*domain.APIKey, error) {
	hashed := HashAPIKey(key, r.pepper)
	cacheKey := apiKeyCacheKey(hashed)
	var k domain.APIKey
	if r.cache.Get(ctx, cacheKey, &k) {
		return &k, nil
	}
	apiKey, err := r.APIKeyRepo.ByKey(ctx, key)
	if err != nil || apiKey == nil {
		return apiKey, err
	}
	_ = r.cache.Set(ctx, cacheKey, apiKey, r.ttl)
	return apiKey, nil
}

func (r *CachedAPIKeyRepo) ByID(ctx context.Context, id string) (*domain.APIKey, error) {
	cacheKey := apiKeyCacheKey("id:" + id)
	var k domain.APIKey
	if r.cache.Get(ctx, cacheKey, &k) {
		return &k, nil
	}
	apiKey, err := r.APIKeyRepo.ByID(ctx, id)
	if err != nil || apiKey == nil {
		return apiKey, err
	}
	_ = r.cache.Set(ctx, cacheKey, apiKey, r.ttl)
	return apiKey, nil
}

func (r *CachedAPIKeyRepo) Create(ctx context.Context, userID, name, key string) (*domain.APIKey, error) {
	k, err := r.APIKeyRepo.Create(ctx, userID, name, key)
	if err != nil {
		return nil, err
	}
	_ = r.cache.DeletePrefix(ctx, "apikey:")
	return k, nil
}

func (r *CachedAPIKeyRepo) Delete(ctx context.Context, userID, id string) error {
	err := r.APIKeyRepo.Delete(ctx, userID, id)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, apiKeyCacheKey("id:"+id))
	return nil
}

func (r *CachedAPIKeyRepo) Revoke(ctx context.Context, id string) error {
	err := r.APIKeyRepo.Revoke(ctx, id)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, apiKeyCacheKey("id:"+id))
	return nil
}

func (r *CachedAPIKeyRepo) Touch(ctx context.Context, id string) error {
	return r.APIKeyRepo.Touch(ctx, id)
}
