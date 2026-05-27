package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type CreditsRepo struct {
	db    *db.DB
	cache RepoCache
	ttl   time.Duration
}

func NewCreditsRepo(d *db.DB) *CreditsRepo { return &CreditsRepo{db: d} }

func (r *CreditsRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func (r *CreditsRepo) ByUser(ctx context.Context, userID string) (*domain.UserCredits, error) {
	key := creditsCacheKey(userID)
	var c domain.UserCredits
	if r.cache != nil && r.cache.Get(ctx, key, &c) {
		return &c, nil
	}
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, balance, total_purchased, total_spent, monthly_budget, daily_budget, daily_spent, monthly_spent, budget_reset_at, updated_at FROM user_credits WHERE user_id = $1`, userID)
	if err := row.Scan(&c.ID, &c.UserID, &c.Balance, &c.TotalPurchased, &c.TotalSpent, &c.MonthlyBudget, &c.DailyBudget, &c.DailySpent, &c.MonthlySpent, &c.BudgetResetAt, &c.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, &c, r.ttl)
	}
	return &c, nil
}

func (r *CreditsRepo) Upsert(ctx context.Context, userID string, balanceDelta, purchasedDelta int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_credits (id, user_id, balance, total_purchased, total_spent)
		VALUES ($1, $2, $3, $4, 0)
		ON CONFLICT (user_id) DO UPDATE SET
			balance = user_credits.balance + $3,
			total_purchased = user_credits.total_purchased + $4,
			updated_at = NOW()
	`, domain.NewID(), userID, balanceDelta, purchasedDelta)
	if err == nil && r.cache != nil {
		_ = r.cache.Delete(ctx, creditsCacheKey(userID))
	}
	return err
}

func (r *CreditsRepo) Deduct(ctx context.Context, userID string, amount int) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE user_credits
		SET balance = balance - $2,
			total_spent = total_spent + $2,
			updated_at = NOW()
		WHERE user_id = $1 AND balance >= $2
	`, userID, amount)
	if err != nil { return false, err }
	if r.cache != nil {
		_ = r.cache.Delete(ctx, creditsCacheKey(userID))
	}
	return tag.RowsAffected() > 0, nil
}

// DeductTx runs Deduct within an existing transaction.
func (r *CreditsRepo) DeductTx(ctx context.Context, tx db.Querier, userID string, amount int) (bool, error) {
	tag, err := tx.Exec(ctx, `
		UPDATE user_credits
		SET balance = balance - $2,
			total_spent = total_spent + $2,
			updated_at = NOW()
		WHERE user_id = $1 AND balance >= $2
	`, userID, amount)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// UpsertTx runs Upsert within an existing transaction.
func (r *CreditsRepo) UpsertTx(ctx context.Context, tx db.Querier, userID string, balanceDelta, purchasedDelta int) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO user_credits (id, user_id, balance, total_purchased, total_spent)
		VALUES ($1, $2, $3, $4, 0)
		ON CONFLICT (user_id) DO UPDATE SET
			balance = user_credits.balance + $3,
			total_purchased = user_credits.total_purchased + $4,
			updated_at = NOW()
	`, domain.NewID(), userID, balanceDelta, purchasedDelta)
	return err
}

func (r *CreditsRepo) Totals(ctx context.Context) (balance, purchased, spent int64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(balance), 0), COALESCE(SUM(total_purchased), 0), COALESCE(SUM(total_spent), 0)
		FROM user_credits
	`).Scan(&balance, &purchased, &spent)
	return
}
