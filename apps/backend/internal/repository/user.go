package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type UserRepo struct {
	db *db.DB
}

func NewUserRepo(d *db.DB) *UserRepo { return &UserRepo{db: d} }

func (r *UserRepo) ByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, name, email, password, role, created_at FROM users WHERE email = $1`, email)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) ByID(ctx context.Context, id string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, name, email, password, role, created_at FROM users WHERE id = $1`, id)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) Create(ctx context.Context, name, email, hashedPassword, role string) (*domain.User, error) {
	id := domain.NewID()
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, password, role, created_at`,
		id, name, email, hashedPassword, role)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) UpdateProfile(ctx context.Context, id, name, email string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE users SET name = $2, email = $3 WHERE id = $1`, id, name, email)
	return err
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id, hashedPassword string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE users SET password = $2 WHERE id = $1`, id, hashedPassword)
	return err
}

func (r *UserRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

func (r *UserRepo) List(ctx context.Context, page, limit int) ([]domain.User, int, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Pool.Query(ctx,
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
	r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total)
	return users, total, rows.Err()
}

func (r *UserRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

// PasswordReset creates a password reset token.
func (r *UserRepo) PasswordReset(ctx context.Context, email, token string, expiresAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx,
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
	row := r.db.Pool.QueryRow(ctx,
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
	return &pr, nil
}

// MarkPasswordResetUsed marks a token as used.
func (r *UserRepo) MarkPasswordResetUsed(ctx context.Context, token string) error {
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE password_resets SET used_at = NOW() WHERE token = $1`, token)
	return err
}
