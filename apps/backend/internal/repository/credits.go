package repository

import (
	"context"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type CreditsRepo struct {
	db *db.DB
}

func NewCreditsRepo(d *db.DB) *CreditsRepo { return &CreditsRepo{db: d} }

func (r *CreditsRepo) ByUser(ctx context.Context, userID string) (*domain.UserCredits, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, balance, total_purchased, total_spent, monthly_budget, daily_budget, daily_spent, monthly_spent, budget_reset_at, updated_at FROM user_credits WHERE user_id = $1`, userID)
	var c domain.UserCredits
	if err := row.Scan(&c.ID, &c.UserID, &c.Balance, &c.TotalPurchased, &c.TotalSpent, &c.MonthlyBudget, &c.DailyBudget, &c.DailySpent, &c.MonthlySpent, &c.BudgetResetAt, &c.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	return &c, nil
}

func (r *CreditsRepo) Upsert(ctx context.Context, userID string, balanceDelta, purchasedDelta int) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO user_credits (id, user_id, balance, total_purchased, total_spent)
		VALUES ($1, $2, $3, $4, 0)
		ON CONFLICT (user_id) DO UPDATE SET
			balance = user_credits.balance + $3,
			total_purchased = user_credits.total_purchased + $4,
			updated_at = NOW()
	`, domain.NewID(), userID, balanceDelta, purchasedDelta)
	return err
}

func (r *CreditsRepo) Deduct(ctx context.Context, userID string, amount int) (bool, error) {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE user_credits
		SET balance = balance - $2,
			total_spent = total_spent + $2,
			updated_at = NOW()
		WHERE user_id = $1 AND balance >= $2
	`, userID, amount)
	if err != nil { return false, err }
	return tag.RowsAffected() > 0, nil
}

func (r *CreditsRepo) Totals(ctx context.Context) (balance, purchased, spent int64, err error) {
	err = r.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(balance), 0), COALESCE(SUM(total_purchased), 0), COALESCE(SUM(total_spent), 0)
		FROM user_credits
	`).Scan(&balance, &purchased, &spent)
	return
}
