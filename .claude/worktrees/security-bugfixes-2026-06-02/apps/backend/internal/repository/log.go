package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type LogRepo struct {
	db *db.DB
}

func NewLogRepo(d *db.DB) *LogRepo { return &LogRepo{db: d} }

func (r *LogRepo) ByUser(ctx context.Context, userID string, page, limit int) ([]domain.APILog, int, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at FROM api_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil { return nil, 0, err }
	defer rows.Close()

	var logs []domain.APILog
	for rows.Next() {
		var l domain.APILog
		if err := rows.Scan(&l.ID, &l.UserID, &l.APIKeyID, &l.Model, &l.Provider, &l.InputTokens, &l.OutputTokens, &l.Cost, &l.Latency, &l.Status, &l.ErrorMessage, &l.CreatedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}

	var total int
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM api_logs WHERE user_id = $1`, userID).Scan(&total)
	return logs, total, rows.Err()
}

func (r *LogRepo) Create(ctx context.Context, log *domain.APILog) (*domain.APILog, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO api_logs (id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at`,
		id, log.UserID, log.APIKeyID, log.Model, log.Provider, log.InputTokens, log.OutputTokens, log.Cost, log.Latency, log.Status, log.ErrorMessage)
	var l domain.APILog
	if err := row.Scan(&l.ID, &l.UserID, &l.APIKeyID, &l.Model, &l.Provider, &l.InputTokens, &l.OutputTokens, &l.Cost, &l.Latency, &l.Status, &l.ErrorMessage, &l.CreatedAt); err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *LogRepo) Count(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM api_logs`).Scan(&n)
	return n, err
}

func (r *LogRepo) CountByStatus(ctx context.Context, status string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM api_logs WHERE status = $1`, status).Scan(&n)
	return n, err
}

func (r *LogRepo) Recent(ctx context.Context, limit int) ([]domain.APILog, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at FROM api_logs ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil { return nil, err }
	defer rows.Close()

	var logs []domain.APILog
	for rows.Next() {
		var l domain.APILog
		if err := rows.Scan(&l.ID, &l.UserID, &l.APIKeyID, &l.Model, &l.Provider, &l.InputTokens, &l.OutputTokens, &l.Cost, &l.Latency, &l.Status, &l.ErrorMessage, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (r *LogRepo) ModelBreakdown(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx,
		`SELECT model, COUNT(*) as count, COALESCE(SUM(cost), 0) as total_cost FROM api_logs WHERE user_id = $1 GROUP BY model`, userID)
	if err != nil { return nil, err }
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var model string
		var count, totalCost int
		if err := rows.Scan(&model, &count, &totalCost); err != nil { return nil, err }
		result = append(result, map[string]interface{}{"model": model, "count": count, "totalCost": totalCost})
	}
	return result, rows.Err()
}

func (r *LogRepo) DailyUsage(ctx context.Context, userID string, since time.Time) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx,
		`SELECT DATE(created_at) as date, COUNT(*) as requests, COALESCE(SUM(cost), 0) as cost, COALESCE(SUM(input_tokens + output_tokens), 0) as tokens
		FROM api_logs WHERE user_id = $1 AND created_at >= $2 GROUP BY DATE(created_at) ORDER BY date DESC`,
		userID, since)
	if err != nil { return nil, err }
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var date string
		var requests, cost, tokens int
		if err := rows.Scan(&date, &requests, &cost, &tokens); err != nil { return nil, err }
		result = append(result, map[string]interface{}{"date": date, "requests": requests, "cost": cost, "tokens": tokens})
	}
	return result, rows.Err()
}
