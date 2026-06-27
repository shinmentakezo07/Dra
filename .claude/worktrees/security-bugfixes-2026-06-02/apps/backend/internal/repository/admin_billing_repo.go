package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminBillingRepo struct {
	db *db.DB
}

func NewAdminBillingRepo(d *db.DB) *AdminBillingRepo {
	return &AdminBillingRepo{db: d}
}

func (r *AdminBillingRepo) AdjustCredits(ctx context.Context, adj *domain.CreditAdjustment) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var balance int
	err = tx.QueryRow(ctx, `SELECT COALESCE(balance, 0) FROM user_credits WHERE user_id=$1 FOR UPDATE`, adj.UserID).Scan(&balance)
	if err != nil {
		return fmt.Errorf("get balance: %w", err)
	}

	adj.BalanceBefore = balance
	adj.BalanceAfter = balance + adj.Amount

	_, err = tx.Exec(ctx, `UPDATE user_credits SET balance = balance + $2, total_purchased = total_purchased + GREATEST($2, 0), total_spent = total_spent + GREATEST(-$2, 0), updated_at = NOW() WHERE user_id = $1`,
		adj.UserID, adj.Amount)
	if err != nil {
		return fmt.Errorf("update credits: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO credit_adjustments (id, user_id, amount, balance_before, balance_after, reason, admin_id, reference_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		adj.ID, adj.UserID, adj.Amount, adj.BalanceBefore, adj.BalanceAfter, adj.Reason, adj.AdminID, adj.ReferenceID)
	if err != nil {
		return fmt.Errorf("insert adjustment: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *AdminBillingRepo) ListAdjustments(ctx context.Context, userID string, page, limit int) ([]domain.CreditAdjustment, int, error) {
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	var total int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM credit_adjustments WHERE user_id=$1`, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count adjustments: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, amount, balance_before, balance_after, reason, admin_id, reference_id, created_at
		FROM credit_adjustments WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list adjustments: %w", err)
	}
	defer rows.Close()

	var adjs []domain.CreditAdjustment
	for rows.Next() {
		var a domain.CreditAdjustment
		if err := rows.Scan(&a.ID, &a.UserID, &a.Amount, &a.BalanceBefore, &a.BalanceAfter,
			&a.Reason, &a.AdminID, &a.ReferenceID, &a.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan adjustment: %w", err)
		}
		adjs = append(adjs, a)
	}
	return adjs, total, nil
}

func (r *AdminBillingRepo) RevenueSummary(ctx context.Context, from, to time.Time) ([]domain.RevenueSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DATE(created_at) as date, COALESCE(SUM(cost), 0) as cost, COUNT(*) as count
		FROM usage_records
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY DATE(created_at) ORDER BY date ASC`, from, to)
	if err != nil {
		return nil, fmt.Errorf("revenue summary: %w", err)
	}
	defer rows.Close()

	var summaries []domain.RevenueSummary
	for rows.Next() {
		var s domain.RevenueSummary
		if err := rows.Scan(&s.Date, &s.Cost, &s.Count); err != nil {
			return nil, fmt.Errorf("scan revenue: %w", err)
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}

func (r *AdminBillingRepo) UsageRecords(ctx context.Context, f domain.UsageFilter) ([]domain.UsageRecord, int, error) {
	offset := (f.Page - 1) * f.Limit
	if offset < 0 {
		offset = 0
	}

	where := "WHERE 1=1"
	args := []interface{}{}
	argN := 1

	if f.UserID != "" {
		where += fmt.Sprintf(" AND user_id = $%d", argN)
		args = append(args, f.UserID)
		argN++
	}
	if f.ProviderID != "" {
		where += fmt.Sprintf(" AND provider_id = $%d", argN)
		args = append(args, f.ProviderID)
		argN++
	}
	if f.Model != "" {
		where += fmt.Sprintf(" AND model = $%d", argN)
		args = append(args, f.Model)
		argN++
	}

	var total int
	cq := "SELECT COUNT(*) FROM usage_records " + where
	if err := r.db.QueryRow(ctx, cq, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count usage: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, user_id, COALESCE(api_key_id,''), provider_id, request_id, model,
			tokens, cost, duration_ms, status_code, COALESCE(error,''), COALESCE(ip_address,''), created_at
		FROM usage_records %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argN, argN+1)
	args = append(args, f.Limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list usage: %w", err)
	}
	defer rows.Close()

	var records []domain.UsageRecord
	for rows.Next() {
		var rec domain.UsageRecord
		if err := rows.Scan(&rec.ID, &rec.UserID, &rec.APIKeyID, &rec.ProviderID,
			&rec.RequestID, &rec.Model, &rec.Tokens, &rec.Cost, &rec.DurationMs,
			&rec.StatusCode, &rec.Error, &rec.IPAddress, &rec.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan usage: %w", err)
		}
		records = append(records, rec)
	}
	return records, total, nil
}

func (r *AdminBillingRepo) UsageDaily(ctx context.Context, from, to time.Time, groupBy string) ([]domain.UsageDaily, error) {
	rows, err := r.db.Query(ctx, `
		SELECT date, user_id, provider_id, model_id, COALESCE(api_key_id,''),
			request_count, tokens, cost, errors,
			latency_p50_ms, latency_p95_ms, latency_p99_ms
		FROM usage_daily WHERE date >= $1 AND date <= $2
		ORDER BY date ASC`, from, to)
	if err != nil {
		return nil, fmt.Errorf("usage daily: %w", err)
	}
	defer rows.Close()

	var dailies []domain.UsageDaily
	for rows.Next() {
		var d domain.UsageDaily
		if err := rows.Scan(&d.Date, &d.UserID, &d.ProviderID, &d.ModelID, &d.APIKeyID,
			&d.RequestCount, &d.Tokens, &d.Cost, &d.Errors,
			&d.LatencyP50Ms, &d.LatencyP95Ms, &d.LatencyP99Ms); err != nil {
			return nil, fmt.Errorf("scan daily: %w", err)
		}
		dailies = append(dailies, d)
	}
	return dailies, nil
}
