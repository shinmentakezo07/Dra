package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
)

// TokenBlacklistRepo manages blacklisted JWT tokens for server-side logout.
type TokenBlacklistRepo struct {
	db *db.DB
}

// NewTokenBlacklistRepo creates a new TokenBlacklistRepo.
func NewTokenBlacklistRepo(database *db.DB) *TokenBlacklistRepo {
	return &TokenBlacklistRepo{db: database}
}

// hashToken returns the SHA-256 hash of a token string for storage.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// Blacklist adds a token to the blacklist.
func (r *TokenBlacklistRepo) Blacklist(ctx context.Context, token string, userID string, expiresAt time.Time) error {
	tokenHash := hashToken(token)
	_, err := r.db.Pool.Exec(ctx,
		`INSERT INTO token_blacklist (token_hash, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO NOTHING`,
		tokenHash, userID, expiresAt)
	if err != nil {
		return fmt.Errorf("blacklist token: %w", err)
	}
	return nil
}

// IsBlacklisted checks if a token has been blacklisted.
func (r *TokenBlacklistRepo) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	tokenHash := hashToken(token)
	var exists bool
	err := r.db.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM token_blacklist WHERE token_hash = $1 AND expires_at > NOW())`,
		tokenHash).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check blacklist: %w", err)
	}
	return exists, nil
}

// Cleanup removes expired tokens from the blacklist.
func (r *TokenBlacklistRepo) Cleanup(ctx context.Context) (int64, error) {
	tag, err := r.db.Pool.Exec(ctx,
		`DELETE FROM token_blacklist WHERE expires_at < NOW()`)
	if err != nil {
		return 0, fmt.Errorf("cleanup blacklist: %w", err)
	}
	return tag.RowsAffected(), nil
}
