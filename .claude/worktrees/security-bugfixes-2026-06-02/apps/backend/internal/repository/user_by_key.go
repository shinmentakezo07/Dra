package repository

import (
	"context"
	"log/slog"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

func GetUserByAPIKey(ctx context.Context, db *db.DB, key, pepper string) (*domain.User, *domain.APIKey, error) {
	// Try hashed key first
	hashed := HashAPIKey(key, pepper)
	row := db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, u.password, u.role, u.created_at,
		       k.id, k.user_id, k.name, k.key, k.last_used, k.created_at, k.revoked_at,
		       k.allowed_models, k.allowed_ips, k.max_tokens_per_request, k.daily_request_limit, k.monthly_token_limit
		FROM api_keys k
		JOIN users u ON u.id = k.user_id
		WHERE k.key = $1 AND k.revoked_at IS NULL
	`, hashed)

	var u domain.User
	var k domain.APIKey
	err := row.Scan(
		&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt,
		&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt,
		&k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit,
	)
	if err != nil {
		if err != pgx.ErrNoRows {
			return nil, nil, err
		}
		// Fallback: raw key lookup for legacy plaintext keys
		// Bug #38: log warning — plaintext keys are a security weakness, should be migrated
		slog.Warn("api_key_plaintext_fallback_used", "hint", "migrate legacy plaintext keys to HMAC-hashed format")
		row = db.QueryRow(ctx, `
			SELECT u.id, u.name, u.email, u.password, u.role, u.created_at,
			       k.id, k.user_id, k.name, k.key, k.last_used, k.created_at, k.revoked_at,
			       k.allowed_models, k.allowed_ips, k.max_tokens_per_request, k.daily_request_limit, k.monthly_token_limit
			FROM api_keys k
			JOIN users u ON u.id = k.user_id
			WHERE k.key = $1 AND k.revoked_at IS NULL
		`, key)
		err = row.Scan(
			&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt,
			&k.ID, &k.UserID, &k.Name, &k.Key, &k.LastUsed, &k.CreatedAt, &k.RevokedAt,
			&k.AllowedModels, &k.AllowedIPs, &k.MaxTokensPerRequest, &k.DailyRequestLimit, &k.MonthlyTokenLimit,
		)
		if err != nil {
			if err == pgx.ErrNoRows { return nil, nil, nil }
			return nil, nil, err
		}
	}
	k.Key = "" // never return stored hash to client
	return &u, &k, nil
}
