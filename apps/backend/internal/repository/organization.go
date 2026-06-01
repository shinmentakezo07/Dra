package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type OrganizationRepo struct {
	db *db.DB
}

func NewOrganizationRepo(d *db.DB) *OrganizationRepo { return &OrganizationRepo{db: d} }

func (r *OrganizationRepo) Create(ctx context.Context, name, ownerID, plan string) (*domain.Organization, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO organizations (id, name, owner_id, plan, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, name, owner_id, plan, created_at`,
		id, name, ownerID, plan)
	return scanOrganization(row)
}

func (r *OrganizationRepo) ByID(ctx context.Context, id string) (*domain.Organization, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, name, owner_id, plan, created_at FROM organizations WHERE id = $1`, id)
	return scanOrganization(row)
}

func (r *OrganizationRepo) ByOwner(ctx context.Context, ownerID string) ([]domain.Organization, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, owner_id, plan, created_at FROM organizations WHERE owner_id = $1 ORDER BY created_at DESC`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Organization
	for rows.Next() {
		o, err := scanOrganization(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *o)
	}
	return result, rows.Err()
}

func (r *OrganizationRepo) ListByMember(ctx context.Context, userID string) ([]domain.Organization, error) {
	rows, err := r.db.Query(ctx,
		`SELECT o.id, o.name, o.owner_id, o.plan, o.created_at
		FROM organizations o
		JOIN org_members m ON o.id = m.org_id
		WHERE m.user_id = $1
		ORDER BY o.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Organization
	for rows.Next() {
		o, err := scanOrganization(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *o)
	}
	return result, rows.Err()
}

func (r *OrganizationRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	return err
}

func (r *OrganizationRepo) AddMember(ctx context.Context, orgID, userID, role string) (*domain.OrgMember, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO org_members (id, org_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, org_id, user_id, role, joined_at`,
		id, orgID, userID, role)
	return scanOrgMember(row)
}

func (r *OrganizationRepo) RemoveMember(ctx context.Context, orgID, userID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM org_members WHERE org_id = $1 AND user_id = $2`, orgID, userID)
	return err
}

func (r *OrganizationRepo) GetMember(ctx context.Context, orgID, userID string) (*domain.OrgMember, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, org_id, user_id, role, joined_at FROM org_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID)
	return scanOrgMember(row)
}

func (r *OrganizationRepo) ListMembers(ctx context.Context, orgID string) ([]domain.OrgMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, user_id, role, joined_at FROM org_members WHERE org_id = $1 ORDER BY joined_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.OrgMember
	for rows.Next() {
		m, err := scanOrgMember(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *m)
	}
	return result, rows.Err()
}

func (r *OrganizationRepo) CreateInvite(ctx context.Context, orgID, email, role, token string, expiresAt time.Time) (*domain.Invite, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO invites (id, org_id, email, role, token, expires_at, used_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NULL, NOW())
		RETURNING id, org_id, email, role, token, expires_at, used_at, created_at`,
		id, orgID, email, role, token, expiresAt)
	return scanInvite(row)
}

func (r *OrganizationRepo) GetInviteByToken(ctx context.Context, token string) (*domain.Invite, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, org_id, email, role, token, expires_at, used_at, created_at FROM invites WHERE token = $1`, token)
	return scanInvite(row)
}

func (r *OrganizationRepo) MarkInviteUsed(ctx context.Context, id string) error {
	// Atomic guard: the WHERE used_at IS NULL clause prevents two concurrent
	// accept-invite requests from both succeeding. Without it, both pass the
	// UsedAt == nil check in the service layer and both UPDATE, adding the
	// user as a member twice.
	tag, err := r.db.Exec(ctx,
		`UPDATE invites SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, id)
	if err != nil {
		return fmt.Errorf("mark invite used: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("invite already used or not found: %s", id)
	}
	return nil
}

func (r *OrganizationRepo) ListInvites(ctx context.Context, orgID string) ([]domain.Invite, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, org_id, email, role, token, expires_at, used_at, created_at
		FROM invites WHERE org_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Invite
	for rows.Next() {
		inv, err := scanInvite(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *inv)
	}
	return result, rows.Err()
}

func GenerateInviteToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate invite token: %w", err)
	}
	return "inv_" + hex.EncodeToString(b), nil
}

type orgScanner interface {
	Scan(dest ...interface{}) error
}

func scanOrganization(row orgScanner) (*domain.Organization, error) {
	var o domain.Organization
	if err := row.Scan(&o.ID, &o.Name, &o.OwnerID, &o.Plan, &o.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func scanOrgMember(row orgScanner) (*domain.OrgMember, error) {
	var m domain.OrgMember
	if err := row.Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.JoinedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func scanInvite(row orgScanner) (*domain.Invite, error) {
	var inv domain.Invite
	if err := row.Scan(&inv.ID, &inv.OrgID, &inv.Email, &inv.Role, &inv.Token, &inv.ExpiresAt, &inv.UsedAt, &inv.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &inv, nil
}
