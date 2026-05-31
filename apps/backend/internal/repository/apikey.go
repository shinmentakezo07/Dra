package repository

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type APIKeyRepo struct {
	db     *db.DB
	pepper string
	cache  RepoCache
	ttl    time.Duration
}

func NewAPIKeyRepo(d *db.DB) *APIKeyRepo { return &APIKeyRepo{db: d} }

func NewAPIKeyRepoWithPepper(d *db.DB, pepper string) *APIKeyRepo {
	return &APIKeyRepo{db: d, pepper: pepper}
}

func (r *APIKeyRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func HashAPIKey(key, pepper string) string {
	mac := hmac.New(sha256.New, []byte(pepper))
	_, _ = mac.Write([]byte(key))
	return hex.EncodeToString(mac.Sum(nil))
}

func (r *APIKeyRepo) ByUser(ctx context.Context, userID string) ([]domain.APIKey, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, COALESCE(allowed_models, '{}'::text[]), COALESCE(allowed_ips, '{}'::text[]), COALESCE(max_tokens_per_request, 0), COALESCE(daily_request_limit, 0), COALESCE(monthly_token_limit, 0) FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID)
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
	hashed := HashAPIKey(key, r.pepper)
	cacheKey := apiKeyCacheKey(hashed)
	var k domain.APIKey
	if r.cache != nil && r.cache.Get(ctx, cacheKey, &k) {
		return &k, nil
	}
	// Try hashed key first (new behavior)
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, COALESCE(allowed_models, '{}'::text[]), COALESCE(allowed_ips, '{}'::text[]), COALESCE(max_tokens_per_request, 0), COALESCE(daily_request_limit, 0), COALESCE(monthly_token_limit, 0) FROM api_keys WHERE key = $1`, hashed)
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
		if err != pgx.ErrNoRows {
			return nil, err
		}
		// Fallback: raw key lookup for legacy plaintext keys
		// Bug #38: log warning — plaintext keys are a security weakness, should be migrated
		slog.Warn("api_key_plaintext_fallback_used", "hint", "migrate legacy plaintext keys to HMAC-hashed format")
		row = r.db.QueryRow(ctx,
			`SELECT id, user_id, name, key, last_used, created_at, revoked_at, COALESCE(allowed_models, '{}'::text[]), COALESCE(allowed_ips, '{}'::text[]), COALESCE(max_tokens_per_request, 0), COALESCE(daily_request_limit, 0), COALESCE(monthly_token_limit, 0) FROM api_keys WHERE key = $1`, key)
		if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
			if err == pgx.ErrNoRows { return nil, nil }
			return nil, err
		}
	}
	k.Key = "" // never return stored hash to client
	if r.cache != nil {
		_ = r.cache.Set(ctx, cacheKey, &k, r.ttl)
	}
	return &k, nil
}

func (r *APIKeyRepo) ByID(ctx context.Context, id string) (*domain.APIKey, error) {
	cacheKey := apiKeyCacheKey("id:" + id)
	var k domain.APIKey
	if r.cache != nil && r.cache.Get(ctx, cacheKey, &k) {
		return &k, nil
	}
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, name, key, last_used, created_at, revoked_at, COALESCE(allowed_models, '{}'::text[]), COALESCE(allowed_ips, '{}'::text[]), COALESCE(max_tokens_per_request, 0), COALESCE(daily_request_limit, 0), COALESCE(monthly_token_limit, 0) FROM api_keys WHERE id = $1`, id)
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt, &k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, cacheKey, &k, r.ttl)
	}
	return &k, nil
}

func (r *APIKeyRepo) Create(ctx context.Context, userID, name, key string) (*domain.APIKey, error) {
	id := domain.NewID()
	hashed := HashAPIKey(key, r.pepper)
	row := r.db.QueryRow(ctx,
		`INSERT INTO api_keys (id, user_id, name, key) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, key, last_used, created_at, revoked_at`,
		id, userID, name, hashed)
	var k domain.APIKey
	if err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt); err != nil {
		return nil, err
	}
	k.Key = "" // hash is not returned to client
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, "apikey:")
	}
	return &k, nil
}

func (r *APIKeyRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, id, userID)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, apiKeyCacheKey("id:"+id))
	}
	return err
}

func (r *APIKeyRepo) Touch(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE api_keys SET last_used = NOW() WHERE id = $1`, id)
	return err
}

func (r *APIKeyRepo) Revoke(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`, id)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, apiKeyCacheKey("id:"+id))
	}
	return err
}

func (r *APIKeyRepo) Update(ctx context.Context, id string, name *string, models, ips []string, maxTokens *int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE api_keys SET name = COALESCE($1, name), allowed_models = $2, allowed_ips = $3, max_tokens_per_request = COALESCE($4, max_tokens_per_request) WHERE id = $5`,
		name, models, ips, maxTokens, id)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, apiKeyCacheKey("id:"+id))
	}
	return err
}

func (r *APIKeyRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM api_keys`).Scan(&n)
	return n, err
}
