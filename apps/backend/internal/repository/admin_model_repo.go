package repository

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type AdminModelRepo struct {
	db *db.DB
}

func NewAdminModelRepo(d *db.DB) *AdminModelRepo {
	return &AdminModelRepo{db: d}
}

func (r *AdminModelRepo) ListModels(ctx context.Context, status string) ([]domain.ModelRegistry, error) {
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

	rows, err := r.db.Pool.Query(ctx, query, args...)
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
	return models, nil
}

func (r *AdminModelRepo) GetModel(ctx context.Context, id string) (*domain.ModelRegistry, error) {
	var m domain.ModelRegistry
	err := r.db.Pool.QueryRow(ctx, `
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
	return &m, nil
}

func (r *AdminModelRepo) CreateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO model_registry (id, model_id, provider_id, display_name, description,
			context_window, max_output, input_price_per_1k, output_price_per_1k,
			capabilities, supports_vision, supports_tools, supports_thinking, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		m.ID, m.ModelID, m.ProviderID, m.DisplayName, m.Description,
		m.ContextWindow, m.MaxOutput, m.InputPricePer1k, m.OutputPricePer1k,
		m.Capabilities, m.SupportsVision, m.SupportsTools, m.SupportsThinking, m.Status)
	return fmt.Errorf("create model: %w", err)
}

func (r *AdminModelRepo) UpdateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE model_registry SET display_name=$2, description=$3, context_window=$4, max_output=$5,
			input_price_per_1k=$6, output_price_per_1k=$7, capabilities=$8,
			supports_vision=$9, supports_tools=$10, supports_thinking=$11
		WHERE id=$1`, m.ID, m.DisplayName, m.Description, m.ContextWindow, m.MaxOutput,
		m.InputPricePer1k, m.OutputPricePer1k, m.Capabilities,
		m.SupportsVision, m.SupportsTools, m.SupportsThinking)
	return fmt.Errorf("update model: %w", err)
}

func (r *AdminModelRepo) UpdateModelStatus(ctx context.Context, id string, status domain.ModelStatus, replacementID *string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE model_registry SET status=$2, replacement_model_id=$3 WHERE id=$1`,
		id, status, replacementID)
	return fmt.Errorf("update model status: %w", err)
}

func (r *AdminModelRepo) ListAliases(ctx context.Context) ([]domain.ModelAlias, error) {
	rows, err := r.db.Pool.Query(ctx, `
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
	return aliases, nil
}

func (r *AdminModelRepo) CreateAlias(ctx context.Context, a *domain.ModelAlias) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO model_aliases (id, alias, target_model_id, preferred_provider_id,
			preferred_key_id, rpm_override, tpm_override, monthly_budget,
			allowed_user_ids, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		a.ID, a.Alias, a.TargetModelID, a.PreferredProviderID, a.PreferredKeyID,
		a.RPMOverride, a.TPMOverride, a.MonthlyBudget, a.AllowedUserIDs, a.IsActive)
	return fmt.Errorf("create alias: %w", err)
}

func (r *AdminModelRepo) DeleteAlias(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM model_aliases WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete alias: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("alias not found: %s", id)
	}
	return nil
}
