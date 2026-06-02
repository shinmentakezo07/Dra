package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedAdminModelRepo wraps AdminModelRepo with transparent caching.
type CachedAdminModelRepo struct {
	*AdminModelRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedAdminModelRepo(repo *AdminModelRepo, cache RepoCache, ttl time.Duration) *CachedAdminModelRepo {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &CachedAdminModelRepo{AdminModelRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedAdminModelRepo) GetModel(ctx context.Context, id string) (*domain.ModelRegistry, error) {
	key := modelCacheKey(id)
	var m domain.ModelRegistry
	if r.cache.Get(ctx, key, &m) {
		return &m, nil
	}
	model, err := r.AdminModelRepo.GetModel(ctx, id)
	if err != nil || model == nil {
		return model, err
	}
	_ = r.cache.Set(ctx, key, model, r.ttl)
	return model, nil
}

func (r *CachedAdminModelRepo) ListModels(ctx context.Context, status string) ([]domain.ModelRegistry, error) {
	key := modelListCacheKey() + ":" + status
	var list []domain.ModelRegistry
	if r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	models, err := r.AdminModelRepo.ListModels(ctx, status)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, key, models, r.ttl)
	return models, nil
}

func (r *CachedAdminModelRepo) CreateModel(ctx context.Context, m *domain.ModelRegistry) error {
	err := r.AdminModelRepo.CreateModel(ctx, m)
	if err != nil {
		return err
	}
	_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	return nil
}

func (r *CachedAdminModelRepo) UpdateModel(ctx context.Context, m *domain.ModelRegistry) error {
	err := r.AdminModelRepo.UpdateModel(ctx, m)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, modelCacheKey(m.ID))
	_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	return nil
}

func (r *CachedAdminModelRepo) UpdateModelStatus(ctx context.Context, id string, status domain.ModelStatus, replacementID *string) error {
	err := r.AdminModelRepo.UpdateModelStatus(ctx, id, status, replacementID)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, modelCacheKey(id))
	_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	return nil
}

func (r *CachedAdminModelRepo) ListAliases(ctx context.Context) ([]domain.ModelAlias, error) {
	key := modelCacheKey("aliases")
	var list []domain.ModelAlias
	if r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	aliases, err := r.AdminModelRepo.ListAliases(ctx)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, key, aliases, r.ttl)
	return aliases, nil
}

func (r *CachedAdminModelRepo) CreateAlias(ctx context.Context, a *domain.ModelAlias) error {
	err := r.AdminModelRepo.CreateAlias(ctx, a)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	return nil
}

func (r *CachedAdminModelRepo) UpdateAlias(ctx context.Context, a *domain.ModelAlias) error {
	err := r.AdminModelRepo.UpdateAlias(ctx, a)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	return nil
}

func (r *CachedAdminModelRepo) DeleteAlias(ctx context.Context, id string) error {
	err := r.AdminModelRepo.DeleteAlias(ctx, id)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	return nil
}
