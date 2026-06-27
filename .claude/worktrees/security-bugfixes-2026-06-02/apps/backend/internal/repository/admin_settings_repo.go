package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminSettingsRepo struct {
	db    *db.DB
	cache RepoCache
	ttl   time.Duration
}

func NewAdminSettingsRepo(d *db.DB) *AdminSettingsRepo {
	return &AdminSettingsRepo{db: d}
}

func (r *AdminSettingsRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func (r *AdminSettingsRepo) List(ctx context.Context, group string) ([]domain.SystemSetting, error) {
	cacheKey := settingCacheKey("list:" + group)
	var list []domain.SystemSetting
	if r.cache != nil && r.cache.Get(ctx, cacheKey, &list) {
		return list, nil
	}
	query := `SELECT key, value, type, description, group_name, is_encrypted, updated_at FROM system_settings`
	args := []interface{}{}

	if group != "" {
		query += " WHERE group_name = $1"
		args = append(args, group)
	}
	query += " ORDER BY key ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list settings: %w", err)
	}
	defer rows.Close()

	var settings []domain.SystemSetting
	for rows.Next() {
		var s domain.SystemSetting
		if err := rows.Scan(&s.Key, &s.Value, &s.Type, &s.Description, &s.GroupName, &s.IsEncrypted, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan setting: %w", err)
		}
		settings = append(settings, s)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, cacheKey, settings, r.ttl)
	}
	return settings, nil
}

func (r *AdminSettingsRepo) Get(ctx context.Context, key string) (*domain.SystemSetting, error) {
	cacheKey := settingCacheKey(key)
	var s domain.SystemSetting
	if r.cache != nil && r.cache.Get(ctx, cacheKey, &s) {
		return &s, nil
	}
	err := r.db.QueryRow(ctx,
		`SELECT key, value, type, description, group_name, is_encrypted, updated_at FROM system_settings WHERE key=$1`, key).
		Scan(&s.Key, &s.Value, &s.Type, &s.Description, &s.GroupName, &s.IsEncrypted, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get setting: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, cacheKey, &s, r.ttl)
	}
	return &s, nil
}

func (r *AdminSettingsRepo) Set(ctx context.Context, s *domain.SystemSetting) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO system_settings (key, value, type, description, group_name, is_encrypted, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,NOW())
		ON CONFLICT (key) DO UPDATE SET value=$2, type=$3, description=$4, group_name=$5, is_encrypted=$6, updated_at=NOW()`,
		s.Key, s.Value, s.Type, s.Description, s.GroupName, s.IsEncrypted)
	if err != nil {
		return fmt.Errorf("set setting: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, settingCacheKey(s.Key))
		_ = r.cache.DeletePrefix(ctx, settingCacheKey("list:"))
	}
	return nil
}

func (r *AdminSettingsRepo) ListFeatureFlags(ctx context.Context) ([]domain.FeatureFlag, error) {
	cacheKey := settingCacheKey("flags")
	var list []domain.FeatureFlag
	if r.cache != nil && r.cache.Get(ctx, cacheKey, &list) {
		return list, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, key, name, description, enabled, targeted_user_ids, targeted_tier_ids, created_at, updated_at
		FROM feature_flags ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list flags: %w", err)
	}
	defer rows.Close()

	var flags []domain.FeatureFlag
	for rows.Next() {
		var f domain.FeatureFlag
		if err := rows.Scan(&f.ID, &f.Key, &f.Name, &f.Description, &f.Enabled,
			&f.TargetedUserIDs, &f.TargetedTierIDs, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan flag: %w", err)
		}
		flags = append(flags, f)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, cacheKey, flags, r.ttl)
	}
	return flags, nil
}

func (r *AdminSettingsRepo) CreateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO feature_flags (id, key, name, description, enabled, targeted_user_ids, targeted_tier_ids)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		f.ID, f.Key, f.Name, f.Description, f.Enabled, f.TargetedUserIDs, f.TargetedTierIDs)
	if err != nil {
		return fmt.Errorf("create flag: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, settingCacheKey("flags"))
	}
	return nil
}

func (r *AdminSettingsRepo) UpdateFeatureFlag(ctx context.Context, id string, enabled bool) error {
	tag, err := r.db.Exec(ctx, `UPDATE feature_flags SET enabled=$2, updated_at=NOW() WHERE id=$1`, id, enabled)
	if err != nil {
		return fmt.Errorf("update flag: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("flag not found: %s", id)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, settingCacheKey("flags"))
	}
	return nil
}
