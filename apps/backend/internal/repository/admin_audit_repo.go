package repository

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminAuditRepo struct {
	db *db.DB
}

func NewAdminAuditRepo(d *db.DB) *AdminAuditRepo {
	return &AdminAuditRepo{db: d}
}

func (r *AdminAuditRepo) Insert(ctx context.Context, log *domain.AuditLog) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, changes, ip_address, severity)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		log.ActorID, log.ActorEmail, log.Action, log.TargetType, log.TargetID,
		log.Changes, log.IPAddress, log.Severity)
	if err != nil {
		return fmt.Errorf("insert audit: %w", err)
	}
	return nil
}

func (r *AdminAuditRepo) List(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	offset := (filter.Page - 1) * filter.Limit
	if offset < 0 {
		offset = 0
	}

	where := "WHERE 1=1"
	args := []interface{}{}
	argN := 1

	if filter.ActorID != "" {
		where += fmt.Sprintf(" AND actor_id = $%d", argN)
		args = append(args, filter.ActorID)
		argN++
	}
	if filter.Action != "" {
		where += fmt.Sprintf(" AND action = $%d", argN)
		args = append(args, filter.Action)
		argN++
	}
	if filter.TargetType != "" {
		where += fmt.Sprintf(" AND target_type = $%d", argN)
		args = append(args, filter.TargetType)
		argN++
	}
	if filter.Severity != "" {
		where += fmt.Sprintf(" AND severity = $%d", argN)
		args = append(args, filter.Severity)
		argN++
	}
	if filter.StartDate != nil {
		where += fmt.Sprintf(" AND created_at >= $%d", argN)
		args = append(args, *filter.StartDate)
		argN++
	}
	if filter.EndDate != nil {
		where += fmt.Sprintf(" AND created_at <= $%d", argN)
		args = append(args, *filter.EndDate)
		argN++
	}

	var total int
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_logs "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, actor_id, actor_email, action, target_type, target_id,
			changes, ip_address, severity, created_at
		FROM audit_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argN, argN+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list audit: %w", err)
	}
	defer rows.Close()

	var logs []domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		if err := rows.Scan(&l.ID, &l.ActorID, &l.ActorEmail, &l.Action, &l.TargetType,
			&l.TargetID, &l.Changes, &l.IPAddress, &l.Severity, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan audit: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}
