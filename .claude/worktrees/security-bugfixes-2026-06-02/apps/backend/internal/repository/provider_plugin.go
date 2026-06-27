package repository

import (
	"context"
	"encoding/json"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type ProviderPluginRepo struct {
	db *db.DB
}

func NewProviderPluginRepo(d *db.DB) *ProviderPluginRepo { return &ProviderPluginRepo{db: d} }

func (r *ProviderPluginRepo) Create(ctx context.Context, userID string, req domain.CreateProviderPluginRequest) (*domain.ProviderPlugin, error) {
	id := domain.NewID()
	now := time.Now()
	headersJSON, _ := json.Marshal(req.Headers)
	row := r.db.QueryRow(ctx,
		`INSERT INTO provider_plugins (id, name, type, base_url, api_key_env, model_list_endpoint, chat_endpoint, embedding_endpoint, headers, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, name, type, base_url, api_key_env, model_list_endpoint, chat_endpoint, embedding_endpoint, headers, is_active, created_at`,
		id, req.Name, req.Type, req.BaseURL, req.APIKeyEnv, req.ModelListEndpoint, req.ChatEndpoint, req.EmbeddingEndpoint, headersJSON, true, now)
	var p domain.ProviderPlugin
	var headersRaw json.RawMessage
	if err := row.Scan(&p.ID, &p.Name, &p.Type, &p.BaseURL, &p.APIKeyEnv, &p.ModelListEndpoint, &p.ChatEndpoint, &p.EmbeddingEndpoint, &headersRaw, &p.IsActive, &p.CreatedAt); err != nil {
		return nil, err
	}
	if headersRaw != nil {
		_ = json.Unmarshal(headersRaw, &p.Headers)
	}
	return &p, nil
}

func (r *ProviderPluginRepo) List(ctx context.Context) ([]domain.ProviderPlugin, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, type, base_url, api_key_env, model_list_endpoint, chat_endpoint, embedding_endpoint, headers, is_active, created_at FROM provider_plugins ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.ProviderPlugin
	for rows.Next() {
		var p domain.ProviderPlugin
		var headersRaw json.RawMessage
		if err := rows.Scan(&p.ID, &p.Name, &p.Type, &p.BaseURL, &p.APIKeyEnv, &p.ModelListEndpoint, &p.ChatEndpoint, &p.EmbeddingEndpoint, &headersRaw, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		if headersRaw != nil {
			_ = json.Unmarshal(headersRaw, &p.Headers)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *ProviderPluginRepo) GetByID(ctx context.Context, id string) (*domain.ProviderPlugin, error) {
	var p domain.ProviderPlugin
	var headersRaw json.RawMessage
	err := r.db.QueryRow(ctx,
		`SELECT id, name, type, base_url, api_key_env, model_list_endpoint, chat_endpoint, embedding_endpoint, headers, is_active, created_at FROM provider_plugins WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.Type, &p.BaseURL, &p.APIKeyEnv, &p.ModelListEndpoint, &p.ChatEndpoint, &p.EmbeddingEndpoint, &headersRaw, &p.IsActive, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	if headersRaw != nil {
		_ = json.Unmarshal(headersRaw, &p.Headers)
	}
	return &p, nil
}

func (r *ProviderPluginRepo) Toggle(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx, `UPDATE provider_plugins SET is_active = $1 WHERE id = $2`, active, id)
	return err
}

func (r *ProviderPluginRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM provider_plugins WHERE id = $1`, id)
	return err
}
