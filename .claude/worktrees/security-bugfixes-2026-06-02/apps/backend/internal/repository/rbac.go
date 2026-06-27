package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type RBACRepo struct {
	db *db.DB
}

func NewRBACRepo(d *db.DB) *RBACRepo { return &RBACRepo{db: d} }

func (r *RBACRepo) GetUserPermissions(ctx context.Context, userID string) ([]domain.Permission, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.name, p.description, p.resource, p.action, p.created_at
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_name = p.name
		JOIN users u ON u.role = rp.role
		WHERE u.id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []domain.Permission
	for rows.Next() {
		var p domain.Permission
		if err := rows.Scan(&p.Name, &p.Description, &p.Resource, &p.Action, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}

func (r *RBACRepo) GetUserRole(ctx context.Context, userID string) (string, error) {
	var role string
	err := r.db.QueryRow(ctx, `SELECT role FROM users WHERE id = $1`, userID).Scan(&role)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return role, err
}

func (r *RBACRepo) HasPermission(ctx context.Context, userID, resource, action string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM permissions p
			JOIN role_permissions rp ON rp.permission_name = p.name
			JOIN users u ON u.role = rp.role
			WHERE u.id = $1 AND p.resource = $2 AND p.action = $3
		)`, userID, resource, action).Scan(&exists)
	return exists, err
}

func (r *RBACRepo) ListRoles(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT DISTINCT role FROM role_permissions ORDER BY role`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

func (r *RBACRepo) GetRolePermissions(ctx context.Context, role string) ([]domain.Permission, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.name, p.description, p.resource, p.action, p.created_at
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_name = p.name
		WHERE rp.role = $1 ORDER BY p.resource, p.action`, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []domain.Permission
	for rows.Next() {
		var p domain.Permission
		if err := rows.Scan(&p.Name, &p.Description, &p.Resource, &p.Action, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}

func (r *RBACRepo) AddRolePermission(ctx context.Context, role, permissionName string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO role_permissions (role, permission_name, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		role, permissionName, time.Now())
	return err
}

func (r *RBACRepo) RemoveRolePermission(ctx context.Context, role, permissionName string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM role_permissions WHERE role = $1 AND permission_name = $2`, role, permissionName)
	return err
}

func (r *RBACRepo) UpdateUserRole(ctx context.Context, userID, role string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET role = $1 WHERE id = $2`, role, userID)
	return err
}

func (r *RBACRepo) ListPermissions(ctx context.Context) ([]domain.Permission, error) {
	rows, err := r.db.Query(ctx, `SELECT name, description, resource, action, created_at FROM permissions ORDER BY resource, action`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []domain.Permission
	for rows.Next() {
		var p domain.Permission
		if err := rows.Scan(&p.Name, &p.Description, &p.Resource, &p.Action, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}
