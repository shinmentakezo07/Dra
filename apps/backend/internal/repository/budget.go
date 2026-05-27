package repository

import (
	"context"
	"errors"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type BudgetRepo struct {
	db *db.DB
}

func NewBudgetRepo(d *db.DB) *BudgetRepo { return &BudgetRepo{db: d} }

func (r *BudgetRepo) CreateAlert(ctx context.Context, userID string, req domain.CreateBudgetAlertRequest) (*domain.BudgetAlert, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO budget_alerts (id, user_id, threshold_percent, alert_type, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, threshold_percent, alert_type, is_active, created_at`,
		id, userID, req.ThresholdPercent, req.AlertType, true, now)
	var a domain.BudgetAlert
	if err := row.Scan(&a.ID, &a.UserID, &a.ThresholdPercent, &a.AlertType, &a.IsActive, &a.CreatedAt); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *BudgetRepo) GetUserAlerts(ctx context.Context, userID string) ([]domain.BudgetAlert, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, threshold_percent, alert_type, is_active, created_at FROM budget_alerts WHERE user_id = $1 ORDER BY threshold_percent`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []domain.BudgetAlert
	for rows.Next() {
		var a domain.BudgetAlert
		if err := rows.Scan(&a.ID, &a.UserID, &a.ThresholdPercent, &a.AlertType, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

func (r *BudgetRepo) DeleteAlert(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM budget_alerts WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *BudgetRepo) CreateCap(ctx context.Context, userID string, req domain.CreateBudgetCapRequest) (*domain.BudgetCap, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO budget_caps (id, user_id, hard_limit, soft_limit, action_on_exceed, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, hard_limit, soft_limit, action_on_exceed, is_active, created_at`,
		id, userID, req.HardLimit, req.SoftLimit, req.ActionOnExceed, true, now)
	var c domain.BudgetCap
	if err := row.Scan(&c.ID, &c.UserID, &c.HardLimit, &c.SoftLimit, &c.ActionOnExceed, &c.IsActive, &c.CreatedAt); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *BudgetRepo) GetUserCap(ctx context.Context, userID string) (*domain.BudgetCap, error) {
	var c domain.BudgetCap
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, hard_limit, soft_limit, action_on_exceed, is_active, created_at FROM budget_caps WHERE user_id = $1`, userID).
		Scan(&c.ID, &c.UserID, &c.HardLimit, &c.SoftLimit, &c.ActionOnExceed, &c.IsActive, &c.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *BudgetRepo) UpdateCap(ctx context.Context, userID string, req domain.CreateBudgetCapRequest) error {
	_, err := r.db.Exec(ctx,
		`UPDATE budget_caps SET hard_limit = $1, soft_limit = $2, action_on_exceed = $3 WHERE user_id = $4`,
		req.HardLimit, req.SoftLimit, req.ActionOnExceed, userID)
	return err
}

func (r *BudgetRepo) DeleteCap(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM budget_caps WHERE user_id = $1`, userID)
	return err
}

func (r *BudgetRepo) CheckCapExceeded(ctx context.Context, userID string, cost int) (bool, string, error) {
	var action string
	var hardLimit int
	err := r.db.QueryRow(ctx,
		`SELECT bc.hard_limit, bc.action_on_exceed FROM budget_caps bc WHERE bc.user_id = $1 AND bc.is_active = true`, userID).
		Scan(&hardLimit, &action)
	if err != nil {
		return false, "", nil // no cap set
	}

	var spent int
	_ = r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(cost), 0) FROM credit_transactions WHERE user_id = $1 AND type = 'debit' AND created_at > NOW() - INTERVAL '30 days'`, userID).
		Scan(&spent)

	if spent+cost > hardLimit {
		return true, action, nil
	}
	return false, "", nil
}
