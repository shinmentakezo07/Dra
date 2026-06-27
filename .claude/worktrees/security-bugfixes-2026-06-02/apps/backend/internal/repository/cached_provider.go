package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedAdminProviderRepo wraps AdminProviderRepo with transparent caching.
type CachedAdminProviderRepo struct {
	*AdminProviderRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedAdminProviderRepo(repo *AdminProviderRepo, cache RepoCache, ttl time.Duration) *CachedAdminProviderRepo {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &CachedAdminProviderRepo{AdminProviderRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedAdminProviderRepo) Get(ctx context.Context, id string) (*domain.Provider, error) {
	key := providerCacheKey(id)
	var p domain.Provider
	if r.cache.Get(ctx, key, &p) {
		return &p, nil
	}
	provider, err := r.AdminProviderRepo.Get(ctx, id)
	if err != nil || provider == nil {
		return provider, err
	}
	_ = r.cache.Set(ctx, key, provider, r.ttl)
	return provider, nil
}

func (r *CachedAdminProviderRepo) List(ctx context.Context) ([]domain.Provider, error) {
	key := providerListCacheKey()
	var list []domain.Provider
	if r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	providers, err := r.AdminProviderRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, key, providers, r.ttl)
	return providers, nil
}

func (r *CachedAdminProviderRepo) Create(ctx context.Context, p *domain.Provider) error {
	err := r.AdminProviderRepo.Create(ctx, p)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, providerListCacheKey())
	return nil
}

func (r *CachedAdminProviderRepo) Update(ctx context.Context, p *domain.Provider) error {
	err := r.AdminProviderRepo.Update(ctx, p)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, providerCacheKey(p.ID))
	_ = r.cache.Delete(ctx, providerListCacheKey())
	return nil
}

func (r *CachedAdminProviderRepo) UpdateStatus(ctx context.Context, id string, status domain.ProviderStatus) error {
	err := r.AdminProviderRepo.UpdateStatus(ctx, id, status)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, providerCacheKey(id))
	_ = r.cache.Delete(ctx, providerListCacheKey())
	return nil
}

func (r *CachedAdminProviderRepo) CreateKey(ctx context.Context, k *domain.ProviderKey) error {
	err := r.AdminProviderRepo.CreateKey(ctx, k)
	if err != nil {
		return err
	}
	_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	return nil
}

func (r *CachedAdminProviderRepo) UpdateKey(ctx context.Context, k *domain.ProviderKey) error {
	err := r.AdminProviderRepo.UpdateKey(ctx, k)
	if err != nil {
		return err
	}
	_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	return nil
}

func (r *CachedAdminProviderRepo) DeleteKey(ctx context.Context, id string) error {
	err := r.AdminProviderRepo.DeleteKey(ctx, id)
	if err != nil {
		return err
	}
	_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	return nil
}

func (r *CachedAdminProviderRepo) ReorderKeys(ctx context.Context, providerID string, keyIDs []string) error {
	err := r.AdminProviderRepo.ReorderKeys(ctx, providerID, keyIDs)
	if err != nil {
		return err
	}
	_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	return nil
}
