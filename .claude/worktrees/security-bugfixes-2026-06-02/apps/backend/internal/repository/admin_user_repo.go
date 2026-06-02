package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type AdminUserRepo struct{ db *db.DB }

func NewAdminUserRepo(d *db.DB) *AdminUserRepo { return &AdminUserRepo{db: d} }

func (r *AdminUserRepo) ListUsers(ctx context.Context, f domain.UserFilter) ([]domain.AdminUserDetail, int, error) {
	offset := (f.Page - 1) * f.Limit
	if offset < 0 { offset = 0 }
	w := "WHERE u.deleted_at IS NULL"
	args := []interface{}{}; n := 1

	if f.Query != "" {
		w += fmt.Sprintf(" AND (u.email ILIKE $%d OR u.name ILIKE $%d OR u.id::text ILIKE $%d)", n, n+1, n+2)
		q := "%" + f.Query + "%"
		args = append(args, q, q, q)
		n += 3
	}
	if f.Status != "" {
		w += fmt.Sprintf(" AND COALESCE(u.status, 'active') = $%d", n)
		args = append(args, f.Status); n++
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery("users u", w), args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count: %w", err)
	}

	cols := "u.id,u.name,u.email,u.role,COALESCE(u.status,'active'),u.created_at,u.last_login_at,COALESCE(u.last_login_ip,''),COALESCE(u.notes,''),COALESCE(u.tags,'{}')"
	q, _ := paginatedQuery(cols, "users u", w, n)
	rows, err := r.db.Query(ctx, q, append(args, f.Limit, offset)...)
	if err != nil { return nil, 0, fmt.Errorf("query: %w", err) }
	defer rows.Close()

	var users []domain.AdminUserDetail
	for rows.Next() {
		var u domain.AdminUserDetail
		var lip, notes string
		var tags []string
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt, &u.LastLoginAt, &lip, &notes, &tags); err != nil {
			return nil, 0, fmt.Errorf("scan: %w", err)
		}
		u.LastLoginIP = lip; u.Notes = notes; u.Tags = tags
		users = append(users, u)
	}
	return users, total, nil
}

func (r *AdminUserRepo) GetUser(ctx context.Context, id string) (*domain.AdminUserDetail, error) {
	var u domain.AdminUserDetail
	var lip, notes string
	var tags []string
	err := r.db.QueryRow(ctx, `SELECT id,name,email,role,COALESCE(status,'active'),created_at,last_login_at,COALESCE(last_login_ip,''),COALESCE(notes,''),COALESCE(tags,'{}') FROM users WHERE id=$1 AND deleted_at IS NULL`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt, &u.LastLoginAt, &lip, &notes, &tags)
	if err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, fmt.Errorf("get user: %w", err)
	}
	u.LastLoginIP = lip; u.Notes = notes; u.Tags = tags
	return &u, nil
}

func (r *AdminUserRepo) UpdateUserStatus(ctx context.Context, userID, status, reason, actorID string) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET status=$2,suspension_reason=$3,suspended_by=$4,suspended_at=$5 WHERE id=$1`, userID, status, reason, actorID, time.Now())
	if err != nil { return fmt.Errorf("update status: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) UpdateUserRole(ctx context.Context, userID, role string) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET role=$2 WHERE id=$1`, userID, role)
	if err != nil { return fmt.Errorf("update role: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) SoftDelete(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET email='deleted-'||id||'@deleted',name='Deleted User',password='',status='deleted',deleted_at=NOW() WHERE id=$1`, userID)
	if err != nil {
		return fmt.Errorf("soft delete: %w", err)
	}
	return nil
}

func (r *AdminUserRepo) GetAdminUser(ctx context.Context, userID string) (*domain.AdminUser, error) {
	var a domain.AdminUser
	err := r.db.QueryRow(ctx, `
		SELECT au.user_id, au.role, COALESCE(au.permissions, '{}'), au.is_active, au.created_by, au.created_at, au.updated_at
		FROM admin_users au WHERE au.user_id=$1`, userID).
		Scan(&a.UserID, &a.Role, &a.Permissions, &a.IsActive, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get admin user: %w", err)
	}
	return &a, nil
}

func (r *AdminUserRepo) SearchByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.db.QueryRow(ctx, `SELECT id,name,email,role,created_at FROM users WHERE email=$1 AND deleted_at IS NULL`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, fmt.Errorf("search: %w", err)
	}
	return &u, nil
}

// ListAdminUsers returns all active admin users.
func (r *AdminUserRepo) ListAdminUsers(ctx context.Context) ([]domain.AdminUser, error) {
	rows, err := r.db.Query(ctx, `
		SELECT au.user_id, au.role, au.permissions, COALESCE(au.is_active, true),
		       COALESCE(au.created_by::text, ''), au.created_at, COALESCE(au.updated_at, au.created_at)
		FROM admin_users au
		JOIN users u ON u.id = au.user_id
		WHERE au.is_active = true
		ORDER BY au.created_at`)
	if err != nil {
		return nil, fmt.Errorf("list admin users: %w", err)
	}
	defer rows.Close()

	var admins []domain.AdminUser
	for rows.Next() {
		var a domain.AdminUser
		if err := rows.Scan(&a.UserID, &a.Role, &a.Permissions, &a.IsActive,
			&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan admin user: %w", err)
		}
		admins = append(admins, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin users: %w", err)
	}
	return admins, nil
}

// CreateAdminUser creates or reactivates an admin user.
func (r *AdminUserRepo) CreateAdminUser(ctx context.Context, userID, role, createdBy string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_users (user_id, role, permissions, is_active, created_by)
		VALUES ($1, $2, '{}', true, $3)
		ON CONFLICT (user_id) DO UPDATE SET role = $2, is_active = true`,
		userID, role, createdBy)
	if err != nil {
		return fmt.Errorf("create admin user: %w", err)
	}
	return nil
}

// RemoveAdmin deactivates an admin user.
func (r *AdminUserRepo) RemoveAdmin(ctx context.Context, userID string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM admin_users WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("remove admin: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("admin user not found: %s", userID)
	}
	return nil
}
