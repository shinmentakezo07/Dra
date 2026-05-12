package repository

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type APIKeyRepo struct {
	db     *db.DB
	pepper string
}

func NewAPIKeyRepo(d *db.DB) *APIKeyRepo { return &APIKeyRepo{db: d} }

func NewAPIKeyRepoWithPepper(d *db.DB, pepper string) *APIKeyRepo {
	return &APIKeyRepo{db: d, pepper: pepper}
}

func HashAPIKey(key, pepper string) string {
	mac := hmac.New(sha256.New, []byte(pepper))
	_, _ = mac.Write([]byte(key))
	return hex.EncodeToString(mac.Sum(nil))
}

func (r *APIKeyRepo) ByUser(ctx context.Context, userID string) ([]domain.APIKey, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, allowed_models, allowed_ips, max_tokens_per_request, daily_request_limit, monthly_token_limit FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil { return nil, err }
	defer rows.Close()

	var keys []domain.APIKey
	for rows.Next() {
		var k domain.APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
			return nil, err
		}
		k.Key = "" // never return stored hash to client
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (r *APIKeyRepo) ByKey(ctx context.Context, key string) (*domain.APIKey, error) {
	// Try hashed key first (new behavior)
	hashed := HashAPIKey(key, r.pepper)
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, allowed_models, allowed_ips, max_tokens_per_request, daily_request_limit, monthly_token_limit FROM api_keys WHERE key = $1`, hashed)
	var k domain.APIKey
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
		if err != pgx.ErrNoRows {
			return nil, err
		}
		// Fallback: raw key lookup for legacy plaintext keys
		row = r.db.Pool.QueryRow(ctx,
			`SELECT id, user_id, name, key, last_used, created_at, revoked_at, allowed_models, allowed_ips, max_tokens_per_request, daily_request_limit, monthly_token_limit FROM api_keys WHERE key = $1`, key)
		if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
			if err == pgx.ErrNoRows { return nil, nil }
			return nil, err
		}
	}
	k.Key = "" // never return stored hash to client
	return &k, nil
}

func (r *APIKeyRepo) ByID(ctx context.Context, id string) (*domain.APIKey, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, allowed_models, allowed_ips, max_tokens_per_request, daily_request_limit, monthly_token_limit FROM api_keys WHERE id = $1`, id)
	var k domain.APIKey
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	return &k, nil
}

func (r *APIKeyRepo) Create(ctx context.Context, userID, name, key string) (*domain.APIKey, error) {
	id := domain.NewID()
	hashed := HashAPIKey(key, r.pepper)
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO api_keys (id, user_id, name, key) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, key, last_used, created_at, revoked_at`,
		id, userID, name, hashed)
	var k domain.APIKey
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt); err != nil {
		return nil, err
	}
	k.Key = "" // hash is not returned to client
	return &k, nil
}

func (r *APIKeyRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *APIKeyRepo) Touch(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE api_keys SET last_used = NOW() WHERE id = $1`, id)
	return err
}

func (r *APIKeyRepo) Revoke(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *APIKeyRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_keys`).Scan(&n)
	return n, err
}
