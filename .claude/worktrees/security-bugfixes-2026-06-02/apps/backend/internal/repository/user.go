package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type UserRepo struct {
	db    *db.DB
	cache RepoCache
	ttl   time.Duration
}

func NewUserRepo(d *db.DB) *UserRepo { return &UserRepo{db: d} }

func (r *UserRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func (r *UserRepo) ByEmail(ctx context.Context, email string) (*domain.User, error) {
	key := userEmailCacheKey(email)
	var u domain.User
	if r.cache != nil && r.cache.Get(ctx, key, &u) {
		return &u, nil
	}
	row := r.db.QueryRow(ctx,
		`SELECT id, name, email, password, role, created_at FROM users WHERE email = $1`, email)
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, &u, r.ttl)
		_ = r.cache.Set(ctx, userCacheKey(u.ID), &u, r.ttl)
	}
	return &u, nil
}

func (r *UserRepo) ByID(ctx context.Context, id string) (*domain.User, error) {
	key := userCacheKey(id)
	var u domain.User
	if r.cache != nil && r.cache.Get(ctx, key, &u) {
		return &u, nil
	}
	row := r.db.QueryRow(ctx,
		`SELECT id, name, email, password, role, created_at FROM users WHERE id = $1`, id)
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, &u, r.ttl)
	}
	return &u, nil
}

func (r *UserRepo) Create(ctx context.Context, name, email, hashedPassword, role string) (*domain.User, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, password, role, created_at`,
		id, name, email, hashedPassword, role)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, userCacheKey(u.ID), &u, r.ttl)
		_ = r.cache.Set(ctx, userEmailCacheKey(u.Email), &u, r.ttl)
	}
	return &u, nil
}

func (r *UserRepo) UpdateProfile(ctx context.Context, id, name, email string) error {
	// Fetch old email before update so we can invalidate the old cache key (Bug #37)
	var oldEmail string
	if r.cache != nil {
		_ = r.db.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, id).Scan(&oldEmail)
	}
	_, err := r.db.Exec(ctx, `UPDATE users SET name = $2, email = $3 WHERE id = $1`, id, name, email)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, userCacheKey(id))
		_ = r.cache.Delete(ctx, userEmailCacheKey(email))
		if oldEmail != "" && oldEmail != email {
			_ = r.cache.Delete(ctx, userEmailCacheKey(oldEmail))
		}
	}
	return err
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id, hashedPassword string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password = $2 WHERE id = $1`, id, hashedPassword)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, userCacheKey(id))
	}
	return err
}

func (r *UserRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, userCacheKey(id))
	}
	return err
}

func (r *UserRepo) List(ctx context.Context, page, limit int) ([]domain.User, int, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx,
		`SELECT id, name, email, password, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil { return nil, 0, err }
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total); err != nil {
		return nil, 0, err
	}
	return users, total, rows.Err()
}

func (r *UserRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

// PasswordReset creates a password reset token.
func (r *UserRepo) PasswordReset(ctx context.Context, email, token string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)`,
		email, token, expiresAt)
	return err
}

// GetPasswordReset looks up a password reset token.
func (r *UserRepo) GetPasswordReset(ctx context.Context, token string) (*struct {
	Email     string
	ExpiresAt time.Time
	UsedAt    *time.Time
}, error) {
	row := r.db.QueryRow(ctx,
		`SELECT email, expires_at, used_at FROM password_resets WHERE token = $1`, token)
	var pr struct {
		Email     string
		ExpiresAt time.Time
		UsedAt    *time.Time
	}
	if err := row.Scan(&pr.Email, &pr.ExpiresAt, &pr.UsedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	// Check if token is expired
	if time.Now().After(pr.ExpiresAt) {
		return nil, nil
	}
	// Check if token was already used
	if pr.UsedAt != nil {
		return nil, nil
	}
	return &pr, nil
}

// MarkPasswordResetUsed marks a token as used.
func (r *UserRepo) MarkPasswordResetUsed(ctx context.Context, token string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE password_resets SET used_at = NOW() WHERE token = $1 AND used_at IS NULL`, token)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("token already used or not found")
	}
	return nil
}
