package repository

import (
	"context"
	"encoding/json"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type WebhookRepo struct {
	db *db.DB
}

func NewWebhookRepo(d *db.DB) *WebhookRepo { return &WebhookRepo{db: d} }

func (r *WebhookRepo) Create(ctx context.Context, userID, url, secret string, events []string, headers map[string]string) (*domain.Webhook, error) {
	id := domain.NewID()
	headersBytes, _ := json.Marshal(headers)
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO webhooks (id, user_id, url, secret, events, headers, active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
		RETURNING id, user_id, url, secret, events, headers, active, created_at`,
		id, userID, url, secret, events, headersBytes)
	return scanWebhook(row)
}

func (r *WebhookRepo) ByUser(ctx context.Context, userID string) ([]domain.Webhook, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, user_id, url, secret, events, headers, active, created_at FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Webhook
	for rows.Next() {
		w, err := scanWebhook(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *w)
	}
	return result, rows.Err()
}

func (r *WebhookRepo) ByID(ctx context.Context, id string) (*domain.Webhook, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, url, secret, events, headers, active, created_at FROM webhooks WHERE id = $1`, id)
	return scanWebhook(row)
}

func (r *WebhookRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *WebhookRepo) Update(ctx context.Context, userID, id, url, secret string, events []string, headers map[string]string, active bool) (*domain.Webhook, error) {
	headersBytes, _ := json.Marshal(headers)
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE webhooks SET url = $1, secret = $2, events = $3, headers = $4, active = $5
		WHERE id = $6 AND user_id = $7
		RETURNING id, user_id, url, secret, events, headers, active, created_at`,
		url, secret, events, headersBytes, active, id, userID)
	return scanWebhook(row)
}

func (r *WebhookRepo) ToggleActive(ctx context.Context, userID, id string, active bool) error {
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE webhooks SET active = $1 WHERE id = $2 AND user_id = $3`, active, id, userID)
	return err
}

func (r *WebhookRepo) CreateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	_, err := r.db.Pool.Exec(ctx,
		`INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, delivered_at, next_retry_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		d.ID, d.WebhookID, d.EventType, d.Payload, d.StatusCode, d.Error, d.Attempts, d.MaxAttempts, d.DeliveredAt, d.NextRetryAt, d.CreatedAt)
	return err
}

func (r *WebhookRepo) UpdateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE webhook_deliveries SET status_code = $1, error = $2, attempts = $3, delivered_at = $4, next_retry_at = $5 WHERE id = $6`,
		d.StatusCode, d.Error, d.Attempts, d.DeliveredAt, d.NextRetryAt, d.ID)
	return err
}

func (r *WebhookRepo) ListDeliveries(ctx context.Context, webhookID string, limit int) ([]domain.WebhookDelivery, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, delivered_at, next_retry_at, created_at
		FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`, webhookID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.WebhookDelivery
	for rows.Next() {
		d, err := scanDelivery(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *d)
	}
	return result, rows.Err()
}

type scanner interface {
	Scan(dest ...interface{}) error
}

func scanWebhook(row scanner) (*domain.Webhook, error) {
	var w domain.Webhook
	var headersBytes []byte
	if err := row.Scan(&w.ID, &w.UserID, &w.URL, &w.Secret, &w.Events, &headersBytes, &w.Active, &w.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if len(headersBytes) > 0 {
		_ = json.Unmarshal(headersBytes, &w.Headers)
	}
	return &w, nil
}

func scanDelivery(row scanner) (*domain.WebhookDelivery, error) {
	var d domain.WebhookDelivery
	if err := row.Scan(&d.ID, &d.WebhookID, &d.EventType, &d.Payload, &d.StatusCode, &d.Error, &d.Attempts, &d.MaxAttempts, &d.DeliveredAt, &d.NextRetryAt, &d.CreatedAt); err != nil {
		return nil, err
	}
	return &d, nil
}
