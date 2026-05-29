package repository

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// allowedTables whitelists table names for paginated queries to prevent SQL injection.
var allowedTables = map[string]bool{
	"suspicious_activities": true,
	"ip_access_logs":       true,
	"users u":              true,
	"users":                true,
}

// validIdentifier validates that a string is a safe SQL identifier or function call (letters, digits, underscores, dots, spaces, parens, quotes for COALESCE/etc).
var validIdentifier = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_.(){}'",* ]*$`)

type AdminSecurityRepo struct{ db *db.DB }

func NewAdminSecurityRepo(d *db.DB) *AdminSecurityRepo { return &AdminSecurityRepo{db: d} }

func (r *AdminSecurityRepo) AddIPEntry(ctx context.Context, e *domain.IPList) error {
	_, err := r.db.Exec(ctx, `INSERT INTO ip_lists(id,ip_or_cidr,action,scope,scope_id,reason,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, e.ID, e.IPOrCIDR, e.Action, e.Scope, e.ScopeID, e.Reason, e.ExpiresAt)
	if err != nil {
		return fmt.Errorf("add ip: %w", err)
	}
	return nil
}

func (r *AdminSecurityRepo) ListIPEntries(ctx context.Context, action string) ([]domain.IPList, error) {
	q := `SELECT id,ip_or_cidr,action,scope,COALESCE(scope_id,''),COALESCE(reason,''),expires_at,created_at FROM ip_lists`
	var (
		rows pgx.Rows
		err  error
	)
	if action != "" {
		q += " WHERE action=$1"
		rows, err = r.db.Query(ctx, q, action)
	} else {
		rows, err = r.db.Query(ctx, q)
	}
	if err != nil { return nil, fmt.Errorf("list ips: %w", err) }
	defer rows.Close()
	var entries []domain.IPList
	for rows.Next() {
		var e domain.IPList
		if err := rows.Scan(&e.ID, &e.IPOrCIDR, &e.Action, &e.Scope, &e.ScopeID, &e.Reason, &e.ExpiresAt, &e.CreatedAt); err != nil { return nil, fmt.Errorf("scan ip: %w", err) }
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil { return nil, fmt.Errorf("iterate ip rows: %w", err) }
	return entries, nil
}

func (r *AdminSecurityRepo) RemoveIPEntry(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM ip_lists WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("remove ip: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("ip not found: %s", id) }
	return nil
}

func validateTableName(from string) error {
	if !allowedTables[from] {
		return fmt.Errorf("invalid table name: %s", from)
	}
	return nil
}

func validateColumns(cols string) error {
	// Split by top-level commas (not inside parentheses)
	var parts []string
	depth := 0
	start := 0
	for i, c := range cols {
		switch c {
		case '(':
			depth++
		case ')':
			depth--
		case ',':
			if depth == 0 {
				parts = append(parts, cols[start:i])
				start = i + 1
			}
		}
	}
	parts = append(parts, cols[start:])
	for _, col := range parts {
		col = strings.TrimSpace(col)
		if col == "" {
			continue
		}
		if !validIdentifier.MatchString(col) {
			return fmt.Errorf("invalid column identifier: %s", col)
		}
	}
	return nil
}

func paginatedQuery(selectCols, from, where string, n int) (string, int) {
	if err := validateTableName(from); err != nil {
		panic(err)
	}
	if err := validateColumns(selectCols); err != nil {
		panic(err)
	}
	q := fmt.Sprintf("SELECT %s FROM %s %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", selectCols, from, where, n, n+1)
	return q, n + 2
}

func countQuery(from, where string) string {
	if err := validateTableName(from); err != nil {
		panic(err)
	}
	return fmt.Sprintf("SELECT COUNT(*) FROM %s %s", from, where)
}

func (r *AdminSecurityRepo) ListSuspicious(ctx context.Context, f domain.SuspiciousFilter) ([]domain.SuspiciousActivity, int, error) {
	offset := (f.Page - 1) * f.Limit
	if offset < 0 { offset = 0 }
	w := "WHERE 1=1"; args := []interface{}{}; n := 1
	if f.Category != "" { w += fmt.Sprintf(" AND category=$%d", n); args = append(args, f.Category); n++ }
	if f.Severity != "" { w += fmt.Sprintf(" AND severity=$%d", n); args = append(args, f.Severity); n++ }
	if f.Reviewed != nil { w += fmt.Sprintf(" AND reviewed=$%d", n); args = append(args, *f.Reviewed); n++ }
	var total int
	r.db.QueryRow(ctx, countQuery("suspicious_activities", w), args...).Scan(&total)
	cols := "id,category,severity,COALESCE(user_id,''),COALESCE(api_key_id,''),COALESCE(ip,''),details,auto_blocked,reviewed,resolved,created_at"
	q, _ := paginatedQuery(cols, "suspicious_activities", w, n)
	rows, err := r.db.Query(ctx, q, append(args, f.Limit, offset)...)
	if err != nil { return nil, 0, fmt.Errorf("list suspicious: %w", err) }
	defer rows.Close()
	var acts []domain.SuspiciousActivity
	for rows.Next() {
		var a domain.SuspiciousActivity
		if err := rows.Scan(&a.ID, &a.Category, &a.Severity, &a.UserID, &a.APIKeyID, &a.IP, &a.Details, &a.AutoBlocked, &a.Reviewed, &a.Resolved, &a.CreatedAt); err != nil { return nil, 0, fmt.Errorf("scan: %w", err) }
		acts = append(acts, a)
	}
	return acts, total, nil
}

func (r *AdminSecurityRepo) ReviewSuspicious(ctx context.Context, id int64, action string, _ string) error {
	_, err := r.db.Exec(ctx, `UPDATE suspicious_activities SET reviewed=true,resolved=$2 WHERE id=$1`, id, action == "dismiss")
	if err != nil {
		return fmt.Errorf("review: %w", err)
	}
	return nil
}

func (r *AdminSecurityRepo) StartImpersonation(ctx context.Context, adminID, userID, reason string) (*domain.ImpersonationSession, error) {
	s := &domain.ImpersonationSession{ID: uuid.New().String(), AdminID: adminID, TargetUserID: userID, Reason: reason, StartedAt: time.Now()}
	_, err := r.db.Exec(ctx, `INSERT INTO admin_impersonations(id,admin_id,target_user_id,reason,started_at) VALUES($1,$2,$3,$4,$5)`, s.ID, s.AdminID, s.TargetUserID, s.Reason, s.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("start impersonation: %w", err)
	}
	return s, nil
}

func (r *AdminSecurityRepo) EndImpersonation(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `UPDATE admin_impersonations SET ended_at=NOW() WHERE id=$1 AND ended_at IS NULL`, id)
	if err != nil { return fmt.Errorf("end impersonation: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("impersonation not found: %s", id) }
	return nil
}

func (r *AdminSecurityRepo) ListIPAccessLogs(ctx context.Context, f domain.IPAccessLogFilter) ([]domain.IPAccessLog, int, error) {
	offset := (f.Page - 1) * f.Limit
	if offset < 0 { offset = 0 }
	w := "WHERE 1=1"; args := []interface{}{}; n := 1
	if f.IPAddress != "" { w += fmt.Sprintf(" AND ip_address=$%d", n); args = append(args, f.IPAddress); n++ }
	if f.UserID != "" { w += fmt.Sprintf(" AND user_id=$%d", n); args = append(args, f.UserID); n++ }
	if f.Blocked != nil { w += fmt.Sprintf(" AND blocked=$%d", n); args = append(args, *f.Blocked); n++ }
	var total int
	r.db.QueryRow(ctx, countQuery("ip_access_logs", w), args...).Scan(&total)
	cols := "id,ip_address,COALESCE(user_id,''),COALESCE(api_key_id,''),method,path,COALESCE(user_agent,''),COALESCE(country,''),is_proxy,blocked,rate_limited,created_at"
	q, _ := paginatedQuery(cols, "ip_access_logs", w, n)
	rows, err := r.db.Query(ctx, q, append(args, f.Limit, offset)...)
	if err != nil { return nil, 0, fmt.Errorf("list ip access: %w", err) }
	defer rows.Close()
	var logs []domain.IPAccessLog
	for rows.Next() {
		var l domain.IPAccessLog
		if err := rows.Scan(&l.ID, &l.IPAddress, &l.UserID, &l.APIKeyID, &l.Method, &l.Path, &l.UserAgent, &l.Country, &l.IsProxy, &l.Blocked, &l.RateLimited, &l.CreatedAt); err != nil { return nil, 0, fmt.Errorf("scan: %w", err) }
		logs = append(logs, l)
	}
	return logs, total, nil
}
