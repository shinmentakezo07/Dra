package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type AdminModelRepo struct {
	db    *db.DB
	cache RepoCache
	ttl   time.Duration
}

func NewAdminModelRepo(d *db.DB) *AdminModelRepo {
	return &AdminModelRepo{db: d}
}

func (r *AdminModelRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func (r *AdminModelRepo) ListModels(ctx context.Context, status string) ([]domain.ModelRegistry, error) {
	key := modelListCacheKey() + ":" + status
	var list []domain.ModelRegistry
	if r.cache != nil && r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	query := `SELECT id, model_id, provider_id, display_name, description,
		context_window, max_output, input_price_per_1k, output_price_per_1k,
		capabilities, supports_vision, supports_tools, supports_thinking,
		status, sunset_date, replacement_model_id, created_at
		FROM model_registry`
	args := []interface{}{}

	if status != "" {
		query += " WHERE status = $1"
		args = append(args, status)
	}
	query += " ORDER BY display_name ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list models: %w", err)
	}
	defer rows.Close()

	var models []domain.ModelRegistry
	for rows.Next() {
		var m domain.ModelRegistry
		if err := rows.Scan(&m.ID, &m.ModelID, &m.ProviderID, &m.DisplayName, &m.Description,
			&m.ContextWindow, &m.MaxOutput, &m.InputPricePer1k, &m.OutputPricePer1k,
			&m.Capabilities, &m.SupportsVision, &m.SupportsTools, &m.SupportsThinking,
			&m.Status, &m.SunsetDate, &m.ReplacementModelID, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan model: %w", err)
		}
		models = append(models, m)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, models, r.ttl)
	}
	return models, nil
}

func (r *AdminModelRepo) GetModel(ctx context.Context, id string) (*domain.ModelRegistry, error) {
	key := modelCacheKey(id)
	var m domain.ModelRegistry
	if r.cache != nil && r.cache.Get(ctx, key, &m) {
		return &m, nil
	}
	err := r.db.QueryRow(ctx, `
		SELECT id, model_id, provider_id, display_name, description,
			context_window, max_output, input_price_per_1k, output_price_per_1k,
			capabilities, supports_vision, supports_tools, supports_thinking,
			status, sunset_date, replacement_model_id, created_at
		FROM model_registry WHERE id = $1`, id).
		Scan(&m.ID, &m.ModelID, &m.ProviderID, &m.DisplayName, &m.Description,
			&m.ContextWindow, &m.MaxOutput, &m.InputPricePer1k, &m.OutputPricePer1k,
			&m.Capabilities, &m.SupportsVision, &m.SupportsTools, &m.SupportsThinking,
			&m.Status, &m.SunsetDate, &m.ReplacementModelID, &m.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get model: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, &m, r.ttl)
	}
	return &m, nil
}

// ListModelsByProvider returns active models for a given provider.
func (r *AdminModelRepo) ListModelsByProvider(ctx context.Context, providerID string) ([]domain.ModelRegistry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, model_id, provider_id, display_name, description,
			context_window, max_output, input_price_per_1k, output_price_per_1k,
			capabilities, supports_vision, supports_tools, supports_thinking,
			status, sunset_date, replacement_model_id, created_at
		FROM model_registry WHERE provider_id = $1 AND status = 'active'
		ORDER BY display_name ASC`, providerID)
	if err != nil {
		return nil, fmt.Errorf("list models by provider: %w", err)
	}
	defer rows.Close()

	var models []domain.ModelRegistry
	for rows.Next() {
		var m domain.ModelRegistry
		if err := rows.Scan(&m.ID, &m.ModelID, &m.ProviderID, &m.DisplayName, &m.Description,
			&m.ContextWindow, &m.MaxOutput, &m.InputPricePer1k, &m.OutputPricePer1k,
			&m.Capabilities, &m.SupportsVision, &m.SupportsTools, &m.SupportsThinking,
			&m.Status, &m.SunsetDate, &m.ReplacementModelID, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan model: %w", err)
		}
		models = append(models, m)
	}
	return models, nil
}

func (r *AdminModelRepo) CreateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO model_registry (id, model_id, provider_id, display_name, description,
			context_window, max_output, input_price_per_1k, output_price_per_1k,
			capabilities, supports_vision, supports_tools, supports_thinking, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		m.ID, m.ModelID, m.ProviderID, m.DisplayName, m.Description,
		m.ContextWindow, m.MaxOutput, m.InputPricePer1k, m.OutputPricePer1k,
		m.Capabilities, m.SupportsVision, m.SupportsTools, m.SupportsThinking, m.Status)
	if err != nil {
		return fmt.Errorf("create model: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	}
	return nil
}

func (r *AdminModelRepo) UpdateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Exec(ctx, `
		UPDATE model_registry SET display_name=$2, description=$3, context_window=$4, max_output=$5,
			input_price_per_1k=$6, output_price_per_1k=$7, capabilities=$8,
			supports_vision=$9, supports_tools=$10, supports_thinking=$11
		WHERE id=$1`, m.ID, m.DisplayName, m.Description, m.ContextWindow, m.MaxOutput,
		m.InputPricePer1k, m.OutputPricePer1k, m.Capabilities,
		m.SupportsVision, m.SupportsTools, m.SupportsThinking)
	if err != nil {
		return fmt.Errorf("update model: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, modelCacheKey(m.ID))
		_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	}
	return nil
}

func (r *AdminModelRepo) UpdateModelStatus(ctx context.Context, id string, status domain.ModelStatus, replacementID *string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE model_registry SET status=$2, replacement_model_id=$3 WHERE id=$1`,
		id, status, replacementID)
	if err != nil {
		return fmt.Errorf("update model status: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, modelCacheKey(id))
		_ = r.cache.DeletePrefix(ctx, modelListCacheKey())
	}
	return nil
}

func (r *AdminModelRepo) ListAliases(ctx context.Context) ([]domain.ModelAlias, error) {
	key := modelCacheKey("aliases")
	var list []domain.ModelAlias
	if r.cache != nil && r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, alias, target_model_id, preferred_provider_id, preferred_key_id,
			rpm_override, tpm_override, monthly_budget, allowed_user_ids, is_active, created_at
		FROM model_aliases ORDER BY alias ASC`)
	if err != nil {
		return nil, fmt.Errorf("list aliases: %w", err)
	}
	defer rows.Close()

	var aliases []domain.ModelAlias
	for rows.Next() {
		var a domain.ModelAlias
		if err := rows.Scan(&a.ID, &a.Alias, &a.TargetModelID,
			&a.PreferredProviderID, &a.PreferredKeyID,
			&a.RPMOverride, &a.TPMOverride, &a.MonthlyBudget,
			&a.AllowedUserIDs, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan alias: %w", err)
		}
		aliases = append(aliases, a)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, aliases, r.ttl)
	}
	return aliases, nil
}

func (r *AdminModelRepo) CreateAlias(ctx context.Context, a *domain.ModelAlias) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO model_aliases (id, alias, target_model_id, preferred_provider_id,
			preferred_key_id, rpm_override, tpm_override, monthly_budget,
			allowed_user_ids, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		a.ID, a.Alias, a.TargetModelID, a.PreferredProviderID, a.PreferredKeyID,
		a.RPMOverride, a.TPMOverride, a.MonthlyBudget, a.AllowedUserIDs, a.IsActive)
	if err != nil {
		return fmt.Errorf("create alias: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	}
	return nil
}

func (r *AdminModelRepo) UpdateAlias(ctx context.Context, a *domain.ModelAlias) error {
	_, err := r.db.Exec(ctx, `
		UPDATE model_aliases SET alias=$2, target_model_id=$3, preferred_provider_id=$4,
			preferred_key_id=$5, rpm_override=$6, tpm_override=$7, monthly_budget=$8,
			allowed_user_ids=$9, is_active=$10
		WHERE id=$1`,
		a.ID, a.Alias, a.TargetModelID, a.PreferredProviderID, a.PreferredKeyID,
		a.RPMOverride, a.TPMOverride, a.MonthlyBudget, a.AllowedUserIDs, a.IsActive)
	if err != nil {
		return fmt.Errorf("update alias: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	}
	return nil
}

func (r *AdminModelRepo) DeleteAlias(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM model_aliases WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete alias: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("alias not found: %s", id)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, modelCacheKey("aliases"))
	}
	return nil
}
