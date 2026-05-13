package repository

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminSettingsRepo struct {
	db *db.DB
}

func NewAdminSettingsRepo(d *db.DB) *AdminSettingsRepo {
	return &AdminSettingsRepo{db: d}
}

func (r *AdminSettingsRepo) List(ctx context.Context, group string) ([]domain.SystemSetting, error) {
	query := `SELECT key, value, type, description, group_name, is_encrypted, updated_at FROM system_settings`
	args := []interface{}{}

	if group != "" {
		query += " WHERE group_name = $1"
		args = append(args, group)
	}
	query += " ORDER BY key ASC"

	rows, err := r.db.Pool.Query(ctx, query, args...)
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
	return settings, nil
}

func (r *AdminSettingsRepo) Get(ctx context.Context, key string) (*domain.SystemSetting, error) {
	var s domain.SystemSetting
	err := r.db.Pool.QueryRow(ctx,
		`SELECT key, value, type, description, group_name, is_encrypted, updated_at FROM system_settings WHERE key=$1`, key).
		Scan(&s.Key, &s.Value, &s.Type, &s.Description, &s.GroupName, &s.IsEncrypted, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get setting: %w", err)
	}
	return &s, nil
}

func (r *AdminSettingsRepo) Set(ctx context.Context, s *domain.SystemSetting) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO system_settings (key, value, type, description, group_name, is_encrypted, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,NOW())
		ON CONFLICT (key) DO UPDATE SET value=$2, type=$3, description=$4, group_name=$5, is_encrypted=$6, updated_at=NOW()`,
		s.Key, s.Value, s.Type, s.Description, s.GroupName, s.IsEncrypted)
	return fmt.Errorf("set setting: %w", err)
}

func (r *AdminSettingsRepo) ListFeatureFlags(ctx context.Context) ([]domain.FeatureFlag, error) {
	rows, err := r.db.Pool.Query(ctx, `
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
	return flags, nil
}

func (r *AdminSettingsRepo) CreateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO feature_flags (id, key, name, description, enabled, targeted_user_ids, targeted_tier_ids)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		f.ID, f.Key, f.Name, f.Description, f.Enabled, f.TargetedUserIDs, f.TargetedTierIDs)
	return fmt.Errorf("create flag: %w", err)
}

func (r *AdminSettingsRepo) UpdateFeatureFlag(ctx context.Context, id string, enabled bool) error {
	tag, err := r.db.Pool.Exec(ctx, `UPDATE feature_flags SET enabled=$2, updated_at=NOW() WHERE id=$1`, id, enabled)
	if err != nil {
		return fmt.Errorf("update flag: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("flag not found: %s", id)
	}
	return nil
}
