package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
)

// CachedUserRepo wraps UserRepo with transparent caching.
type CachedUserRepo struct {
	*UserRepo
	cache RepoCache
	ttl   time.Duration
}

func NewCachedUserRepo(repo *UserRepo, cache RepoCache, ttl time.Duration) *CachedUserRepo {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &CachedUserRepo{UserRepo: repo, cache: cache, ttl: ttl}
}

func (r *CachedUserRepo) ByEmail(ctx context.Context, email string) (*domain.User, error) {
	key := userEmailCacheKey(email)
	var u domain.User
	if r.cache.Get(ctx, key, &u) {
		return &u, nil
	}
	user, err := r.UserRepo.ByEmail(ctx, email)
	if err != nil || user == nil {
		return user, err
	}
	_ = r.cache.Set(ctx, key, user, r.ttl)
	_ = r.cache.Set(ctx, userCacheKey(user.ID), user, r.ttl)
	return user, nil
}

func (r *CachedUserRepo) ByID(ctx context.Context, id string) (*domain.User, error) {
	key := userCacheKey(id)
	var u domain.User
	if r.cache.Get(ctx, key, &u) {
		return &u, nil
	}
	user, err := r.UserRepo.ByID(ctx, id)
	if err != nil || user == nil {
		return user, err
	}
	_ = r.cache.Set(ctx, key, user, r.ttl)
	return user, nil
}

func (r *CachedUserRepo) Create(ctx context.Context, name, email, hashedPassword, role string) (*domain.User, error) {
	u, err := r.UserRepo.Create(ctx, name, email, hashedPassword, role)
	if err != nil {
		return nil, err
	}
	_ = r.cache.Set(ctx, userCacheKey(u.ID), u, r.ttl)
	_ = r.cache.Set(ctx, userEmailCacheKey(u.Email), u, r.ttl)
	return u, nil
}

func (r *CachedUserRepo) UpdateProfile(ctx context.Context, id, name, email string) error {
	err := r.UserRepo.UpdateProfile(ctx, id, name, email)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, userCacheKey(id))
	_ = r.cache.Delete(ctx, userEmailCacheKey(email))
	return nil
}

func (r *CachedUserRepo) UpdatePassword(ctx context.Context, id, hashedPassword string) error {
	err := r.UserRepo.UpdatePassword(ctx, id, hashedPassword)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, userCacheKey(id))
	return nil
}

func (r *CachedUserRepo) Delete(ctx context.Context, id string) error {
	err := r.UserRepo.Delete(ctx, id)
	if err != nil {
		return err
	}
	_ = r.cache.Delete(ctx, userCacheKey(id))
	return nil
}
