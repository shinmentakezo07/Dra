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
	row := r.db.QueryRow(ctx,
		`INSERT INTO webhooks (id, user_id, url, secret, events, headers, active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
		RETURNING id, user_id, url, secret, events, headers, active, created_at`,
		id, userID, url, secret, events, headersBytes)
	return scanWebhook(row)
}

func (r *WebhookRepo) ByUser(ctx context.Context, userID string) ([]domain.Webhook, error) {
	rows, err := r.db.Query(ctx,
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
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, url, secret, events, headers, active, created_at FROM webhooks WHERE id = $1`, id)
	return scanWebhook(row)
}

func (r *WebhookRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *WebhookRepo) Update(ctx context.Context, userID, id, url, secret string, events []string, headers map[string]string, active bool) (*domain.Webhook, error) {
	headersBytes, _ := json.Marshal(headers)
	row := r.db.QueryRow(ctx,
		`UPDATE webhooks SET url = $1, secret = $2, events = $3, headers = $4, active = $5
		WHERE id = $6 AND user_id = $7
		RETURNING id, user_id, url, secret, events, headers, active, created_at`,
		url, secret, events, headersBytes, active, id, userID)
	return scanWebhook(row)
}

func (r *WebhookRepo) ToggleActive(ctx context.Context, userID, id string, active bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhooks SET active = $1 WHERE id = $2 AND user_id = $3`, active, id, userID)
	return err
}

// Delivery CRUD

func (r *WebhookRepo) CreateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, status, delivered_at, next_retry_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		d.ID, d.WebhookID, d.EventType, d.Payload, d.StatusCode, d.Error, d.Attempts, d.MaxAttempts, d.Status, d.DeliveredAt, d.NextRetryAt, d.CreatedAt)
	return err
}

func (r *WebhookRepo) UpdateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhook_deliveries SET status_code = $1, error = $2, attempts = $3, status = $4, delivered_at = $5, next_retry_at = $6 WHERE id = $7`,
		d.StatusCode, d.Error, d.Attempts, d.Status, d.DeliveredAt, d.NextRetryAt, d.ID)
	return err
}

func (r *WebhookRepo) GetDeliveryByID(ctx context.Context, id string) (*domain.WebhookDelivery, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, status, delivered_at, next_retry_at, created_at
		FROM webhook_deliveries WHERE id = $1`, id)
	return scanDelivery(row)
}

func (r *WebhookRepo) ListDeliveries(ctx context.Context, webhookID string, limit int) ([]domain.WebhookDelivery, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, status, delivered_at, next_retry_at, created_at
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

func (r *WebhookRepo) ListPendingRetries(ctx context.Context, batchSize int) ([]domain.WebhookDelivery, error) {
	if batchSize <= 0 {
		batchSize = 10
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, status, delivered_at, next_retry_at, created_at
		FROM webhook_deliveries
		WHERE status = 'pending' AND delivered_at IS NULL AND next_retry_at IS NOT NULL AND next_retry_at <= NOW()
		ORDER BY next_retry_at ASC
		LIMIT $1`, batchSize)
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

func (r *WebhookRepo) ListFailedDeliveries(ctx context.Context, limit int) ([]domain.WebhookDelivery, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, status_code, error, attempts, max_attempts, status, delivered_at, next_retry_at, created_at
		FROM webhook_deliveries
		WHERE status = 'failed'
		ORDER BY created_at DESC LIMIT $1`, limit)
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

// Delivery Logs

func (r *WebhookRepo) CreateDeliveryLog(ctx context.Context, log *domain.WebhookDeliveryLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO webhook_delivery_logs (webhook_id, event_type, payload, response_status, duration_ms, success, attempt, idempotency_key, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		log.WebhookID, log.EventType, log.Payload, log.ResponseStatus, log.DurationMs, log.Success, log.Attempt, log.IdempotencyKey, log.CreatedAt)
	return err
}

func (r *WebhookRepo) ListDeliveryLogs(ctx context.Context, limit int) ([]domain.WebhookDeliveryLog, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, response_status, duration_ms, success, attempt, idempotency_key, created_at
		FROM webhook_delivery_logs ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.WebhookDeliveryLog
	for rows.Next() {
		l, err := scanDeliveryLog(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *l)
	}
	return result, rows.Err()
}

// Idempotency

func (r *WebhookRepo) HasSuccessfulIdempotencyKey(ctx context.Context, key string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM webhook_delivery_logs WHERE idempotency_key = $1 AND success = true`, key).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
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
	if err := row.Scan(&d.ID, &d.WebhookID, &d.EventType, &d.Payload, &d.StatusCode, &d.Error, &d.Attempts, &d.MaxAttempts, &d.Status, &d.DeliveredAt, &d.NextRetryAt, &d.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

func scanDeliveryLog(row scanner) (*domain.WebhookDeliveryLog, error) {
	var l domain.WebhookDeliveryLog
	if err := row.Scan(&l.ID, &l.WebhookID, &l.EventType, &l.Payload, &l.ResponseStatus, &l.DurationMs, &l.Success, &l.Attempt, &l.IdempotencyKey, &l.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &l, nil
}
