package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type RateLimitRepo struct {
	db *db.DB
}

func NewRateLimitRepo(d *db.DB) *RateLimitRepo { return &RateLimitRepo{db: d} }

func (r *RateLimitRepo) GetUserTier(ctx context.Context, userID string) (string, error) {
	var tier string
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(rl.tier, 'free') FROM user_rate_limits rl WHERE rl.user_id = $1`, userID).Scan(&tier)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "free", nil
		}
		return "", err
	}
	return tier, nil
}

func (r *RateLimitRepo) GetTierLimits(ctx context.Context, tier string) (*domain.RateLimit, error) {
	var rl domain.RateLimit
	err := r.db.QueryRow(ctx,
		`SELECT id, tier, rpm, daily_requests, monthly_requests, max_tokens_per_request, created_at FROM rate_limits WHERE tier = $1`,
		tier).Scan(&rl.ID, &rl.Tier, &rl.RPM, &rl.DailyRequests, &rl.MonthlyRequests, &rl.MaxTokensPerRequest, &rl.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rl, nil
}

func (r *RateLimitRepo) SetUserTier(ctx context.Context, userID, tier string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO user_rate_limits (id, user_id, tier, created_at) VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id) DO UPDATE SET tier = $3`,
		domain.NewID(), userID, tier, time.Now())
	return err
}

func (r *RateLimitRepo) ListTiers(ctx context.Context) ([]domain.RateLimit, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tier, rpm, daily_requests, monthly_requests, max_tokens_per_request, created_at FROM rate_limits ORDER BY rpm`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.RateLimit
	for rows.Next() {
		var rl domain.RateLimit
		if err := rows.Scan(&rl.ID, &rl.Tier, &rl.RPM, &rl.DailyRequests, &rl.MonthlyRequests, &rl.MaxTokensPerRequest, &rl.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, rl)
	}
	return result, rows.Err()
}

func (r *RateLimitRepo) UpdateTierLimits(ctx context.Context, tier string, rpm, daily, monthly, maxTokens int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE rate_limits SET rpm = $1, daily_requests = $2, monthly_requests = $3, max_tokens_per_request = $4 WHERE tier = $5`,
		rpm, daily, monthly, maxTokens, tier)
	return err
}
