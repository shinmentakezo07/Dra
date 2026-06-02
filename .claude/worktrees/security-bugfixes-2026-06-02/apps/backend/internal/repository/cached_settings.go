package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedAdminSettingsRepo wraps AdminSettingsRepo with transparent caching.
type CachedAdminSettingsRepo struct {
	*AdminSettingsRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedAdminSettingsRepo(repo *AdminSettingsRepo, cache RepoCache, ttl time.Duration) *CachedAdminSettingsRepo {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &CachedAdminSettingsRepo{AdminSettingsRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedAdminSettingsRepo) Get(ctx context.Context, key string) (*domain.SystemSetting, error) {
	cacheKey := settingCacheKey(key)
	var s domain.SystemSetting
	if r.cache.Get(ctx, cacheKey, &s) {
		return &s, nil
	}
	setting, err := r.AdminSettingsRepo.Get(ctx, key)
	if err != nil || setting == nil {
		return setting, err
	}
	_ = r.cache.Set(ctx, cacheKey, setting, r.ttl)
	return setting, nil
}

func (r *CachedAdminSettingsRepo) List(ctx context.Context, group string) ([]domain.SystemSetting, error) {
	cacheKey := settingCacheKey("list:" + group)
	var list []domain.SystemSetting
	if r.cache.Get(ctx, cacheKey, &list) {
		return list, nil
	}
	settings, err := r.AdminSettingsRepo.List(ctx, group)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, cacheKey, settings, r.ttl)
	return settings, nil
}

func (r *CachedAdminSettingsRepo) Set(ctx context.Context, s *domain.SystemSetting) error {
	err := r.AdminSettingsRepo.Set(ctx, s)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, settingCacheKey(s.Key))
	_ = r.cache.DeletePrefix(ctx, settingCacheKey("list:"))
	return nil
}

func (r *CachedAdminSettingsRepo) ListFeatureFlags(ctx context.Context) ([]domain.FeatureFlag, error) {
	cacheKey := settingCacheKey("flags")
	var list []domain.FeatureFlag
	if r.cache.Get(ctx, cacheKey, &list) {
		return list, nil
	}
	flags, err := r.AdminSettingsRepo.ListFeatureFlags(ctx)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, cacheKey, flags, r.ttl)
	return flags, nil
}

func (r *CachedAdminSettingsRepo) CreateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	err := r.AdminSettingsRepo.CreateFeatureFlag(ctx, f)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, settingCacheKey("flags"))
	return nil
}

func (r *CachedAdminSettingsRepo) UpdateFeatureFlag(ctx context.Context, id string, enabled bool) error {
	err := r.AdminSettingsRepo.UpdateFeatureFlag(ctx, id, enabled)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, settingCacheKey("flags"))
	return nil
}
