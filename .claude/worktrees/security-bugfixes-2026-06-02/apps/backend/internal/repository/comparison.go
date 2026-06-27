package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type ComparisonRepo struct {
	db *db.DB
}

func NewComparisonRepo(d *db.DB) *ComparisonRepo { return &ComparisonRepo{db: d} }

func (r *ComparisonRepo) Create(ctx context.Context, userID string, req domain.CreateABComparisonRequest) (*domain.ABComparison, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO ab_comparisons (id, user_id, model_a, model_b, prompt, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, model_a, model_b, prompt, status, created_at`,
		id, userID, req.ModelA, req.ModelB, req.Prompt, "pending", now)
	var c domain.ABComparison
	if err := row.Scan(&c.ID, &c.UserID, &c.ModelA, &c.ModelB, &c.Prompt, &c.Status, &c.CreatedAt); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ComparisonRepo) UpdateResult(ctx context.Context, id, model string, result string, latency, cost, tokens int) error {
	// Whitelist valid column suffixes to prevent SQL injection
	var query string
	switch model {
	case "a":
		query = `UPDATE ab_comparisons SET result_a = $1, latency_a = $2, cost_a = $3, tokens_a = $4 WHERE id = $5`
	case "b":
		query = `UPDATE ab_comparisons SET result_b = $1, latency_b = $2, cost_b = $3, tokens_b = $4 WHERE id = $5`
	default:
		return fmt.Errorf("invalid model suffix: %s", model)
	}
	_, err := r.db.Exec(ctx, query, result, latency, cost, tokens, id)
	return err
}

func (r *ComparisonRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE ab_comparisons SET status = $1 WHERE id = $2`, status, id)
	return err
}

func (r *ComparisonRepo) GetByID(ctx context.Context, id string) (*domain.ABComparison, error) {
	var c domain.ABComparison
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, model_a, model_b, prompt, result_a, result_b, latency_a, latency_b, cost_a, cost_b, tokens_a, tokens_b, status, created_at FROM ab_comparisons WHERE id = $1`, id).
		Scan(&c.ID, &c.UserID, &c.ModelA, &c.ModelB, &c.Prompt, &c.ResultA, &c.ResultB, &c.LatencyA, &c.LatencyB, &c.CostA, &c.CostB, &c.TokensA, &c.TokensB, &c.Status, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ComparisonRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]domain.ABComparison, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, model_a, model_b, prompt, result_a, result_b, latency_a, latency_b, cost_a, cost_b, tokens_a, tokens_b, status, created_at FROM ab_comparisons WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.ABComparison
	for rows.Next() {
		var c domain.ABComparison
		if err := rows.Scan(&c.ID, &c.UserID, &c.ModelA, &c.ModelB, &c.Prompt, &c.ResultA, &c.ResultB, &c.LatencyA, &c.LatencyB, &c.CostA, &c.CostB, &c.TokensA, &c.TokensB, &c.Status, &c.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

func (r *ComparisonRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM ab_comparisons WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}
