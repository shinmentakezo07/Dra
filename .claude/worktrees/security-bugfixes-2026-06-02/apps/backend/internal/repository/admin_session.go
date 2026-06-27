package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type AdminSessionRepo struct {
	db *db.DB
}

func NewAdminSessionRepo(d *db.DB) *AdminSessionRepo {
	return &AdminSessionRepo{db: d}
}

func (r *AdminSessionRepo) Create(ctx context.Context, userID, tokenHash, ipAddress, userAgent string, expiresAt time.Time) (*domain.AdminSession, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO admin_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, token_hash, ip_address, user_agent, status, expires_at, revoked_at, created_at`,
		id, userID, tokenHash, ipAddress, userAgent, expiresAt)
	var s domain.AdminSession
	if err := row.Scan(&s.ID, &s.UserID, &s.TokenHash, &s.IPAddress, &s.UserAgent, &s.Status, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *AdminSessionRepo) GetByTokenHash(ctx context.Context, tokenHash string) (*domain.AdminSession, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, token_hash, ip_address, user_agent, status, expires_at, revoked_at, created_at FROM admin_sessions WHERE token_hash = $1`, tokenHash)
	var s domain.AdminSession
	if err := row.Scan(&s.ID, &s.UserID, &s.TokenHash, &s.IPAddress, &s.UserAgent, &s.Status, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *AdminSessionRepo) Revoke(ctx context.Context, id, revokedBy string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE admin_sessions SET status = 'revoked', revoked_at = NOW(), revoked_by = $2 WHERE id = $1`,
		id, revokedBy)
	return err
}

func (r *AdminSessionRepo) RevokeAllForUser(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE admin_sessions SET status = 'revoked', revoked_at = NOW() WHERE user_id = $1 AND status = 'active'`,
		userID)
	return err
}

func (r *AdminSessionRepo) ListActiveByUser(ctx context.Context, userID string) ([]domain.AdminSession, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, token_hash, ip_address, user_agent, status, expires_at, revoked_at, created_at FROM admin_sessions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.AdminSession
	for rows.Next() {
		var s domain.AdminSession
		if err := rows.Scan(&s.ID, &s.UserID, &s.TokenHash, &s.IPAddress, &s.UserAgent, &s.Status, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}
