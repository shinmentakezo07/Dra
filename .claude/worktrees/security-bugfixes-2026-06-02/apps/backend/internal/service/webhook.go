package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/pkg/webhook"
)

// maxConcurrentWebhooks limits the number of simultaneous outgoing webhook requests.
const maxConcurrentWebhooks = 20

const webhookMaxAttempts = 5

var webhookRetryBackoff = []time.Duration{
	1 * time.Second,
	4 * time.Second,
	16 * time.Second,
	64 * time.Second,
}

type WebhookService struct {
	repo       *repository.WebhookRepo
	dispatcher *webhook.Dispatcher
	sem        chan struct{}
	ctx        context.Context
	cancel     context.CancelFunc
}

func NewWebhookService(repo *repository.WebhookRepo) *WebhookService {
	ctx, cancel := context.WithCancel(context.Background())
	return &WebhookService{
		repo:       repo,
		dispatcher: webhook.NewDispatcher(),
		sem:        make(chan struct{}, maxConcurrentWebhooks),
		ctx:        ctx,
		cancel:     cancel,
	}
}

func (s *WebhookService) Start(ctx context.Context) {
	s.cancel()
	s.ctx, s.cancel = context.WithCancel(ctx)
}

func (s *WebhookService) Stop() {
	s.cancel()
}

func (s *WebhookService) Create(ctx context.Context, userID string, req domain.CreateWebhookRequest) (*domain.Webhook, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := webhook.ValidateWebhookURL(req.URL); err != nil {
		return nil, domain.NewError(domain.ErrBadRequest, 400, err.Error())
	}
	w, err := s.repo.Create(ctx, userID, req.URL, req.Secret, req.Events, req.Headers)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create webhook", err)
	}
	return w, nil
}

func (s *WebhookService) List(ctx context.Context, userID string) ([]domain.Webhook, *domain.AppError) {
	webhooks, err := s.repo.ByUser(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return webhooks, nil
}

func (s *WebhookService) Get(ctx context.Context, userID, id string) (*domain.Webhook, *domain.AppError) {
	w, err := s.repo.ByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if w == nil || w.UserID != userID {
		return nil, domain.ErrWebhookNotFound
	}
	return w, nil
}

func (s *WebhookService) Delete(ctx context.Context, userID, id string) *domain.AppError {
	w, err := s.repo.ByID(ctx, id)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if w == nil || w.UserID != userID {
		return domain.ErrWebhookNotFound
	}
	if err := s.repo.Delete(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete webhook", err)
	}
	return nil
}

func (s *WebhookService) Update(ctx context.Context, userID, id string, req domain.CreateWebhookRequest) (*domain.Webhook, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	w, err := s.repo.ByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if w == nil || w.UserID != userID {
		return nil, domain.ErrWebhookNotFound
	}
	updated, err := s.repo.Update(ctx, userID, id, req.URL, req.Secret, req.Events, req.Headers, w.Active)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to update webhook", err)
	}
	return updated, nil
}

func (s *WebhookService) ToggleActive(ctx context.Context, userID, id string, active bool) *domain.AppError {
	w, err := s.repo.ByID(ctx, id)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if w == nil || w.UserID != userID {
		return domain.ErrWebhookNotFound
	}
	if err := s.repo.ToggleActive(ctx, userID, id, active); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update webhook", err)
	}
	return nil
}

// Dispatch sends an event to all active webhooks for a user.
func (s *WebhookService) Dispatch(ctx context.Context, userID string, event webhook.Event) {
	webhooks, err := s.repo.ByUser(ctx, userID)
	if err != nil {
		logger.Error("webhook_dispatch_list_failed", "user_id", userID, "error", err.Error())
		return
	}
	for _, w := range webhooks {
		if !w.Active {
			continue
		}
		cfg := webhook.Config{
			URL:      w.URL,
			Secret:   w.Secret,
			Events:   w.Events,
			Headers:  w.Headers,
			RetryMax: webhookMaxAttempts,
		}
		go func(webhookID string, c webhook.Config, e webhook.Event) {
			defer func() {
				if r := recover(); r != nil {
					logger.Error("webhook_dispatch_panic", "webhook_id", webhookID, "recover", r)
				}
			}()
			select {
			case s.sem <- struct{}{}:
				s.sendAndTrack(s.ctx, webhookID, c, e)
				<-s.sem
			case <-s.ctx.Done():
				return
			}
		}(w.ID, cfg, event)
	}
}

func (s *WebhookService) sendAndTrack(ctx context.Context, webhookID string, cfg webhook.Config, event webhook.Event) {
	payload, _ := json.Marshal(event)

	idempotencyKey := fmt.Sprintf("%s:%s:%d", webhookID, event.Type, event.Timestamp.Unix())
	isDup, err := s.repo.HasSuccessfulIdempotencyKey(ctx, idempotencyKey)
	if err != nil {
		logger.Error("webhook_idempotency_check_failed", "error", err.Error())
	}
	if isDup {
		logger.Info("webhook_deduplicated", "webhook_id", webhookID, "idempotency_key", idempotencyKey)
		return
	}

	delivery := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   webhookID,
		EventType:   event.Type,
		Payload:     payload,
		Attempts:    0,
		MaxAttempts: webhookMaxAttempts,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}
	if err := s.repo.CreateDelivery(ctx, delivery); err != nil {
		logger.Error("webhook_create_delivery_failed", "error", err.Error())
		return
	}

	s.attemptDelivery(ctx, delivery, cfg, event, idempotencyKey)
}

func (s *WebhookService) attemptDelivery(ctx context.Context, delivery *domain.WebhookDelivery, cfg webhook.Config, event webhook.Event, idempotencyKey string) {
	start := time.Now()
	result, err := s.dispatcher.SendWithIdempotency(ctx, cfg, event, idempotencyKey)
	duration := int(time.Since(start).Milliseconds())

	delivery.Attempts++
	now := time.Now()

	log := &domain.WebhookDeliveryLog{
		WebhookID:      delivery.WebhookID,
		EventType:      delivery.EventType,
		Payload:        delivery.Payload,
		DurationMs:     duration,
		Attempt:        delivery.Attempts,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      now,
	}
	if result != nil {
		log.ResponseStatus = &result.Status
		log.Success = result.Status >= 200 && result.Status < 300
		delivery.StatusCode = &result.Status
	}
	if err != nil {
		log.Success = false
		delivery.Error = err.Error()
	}
	if logErr := s.repo.CreateDeliveryLog(ctx, log); logErr != nil {
		logger.Error("webhook_create_log_failed", "error", logErr.Error())
	}

	if log.Success {
		delivery.Status = "delivered"
		delivery.DeliveredAt = &now
		delivery.NextRetryAt = nil
	} else {
		if delivery.StatusCode != nil && *delivery.StatusCode >= 400 && *delivery.StatusCode < 500 {
			// Client errors: don't retry
			delivery.Status = "failed"
			delivery.NextRetryAt = nil
		} else if delivery.Attempts >= delivery.MaxAttempts {
			delivery.Status = "failed"
			delivery.NextRetryAt = nil
		} else {
			delay := s.retryDelay(delivery.Attempts)
			next := now.Add(delay)
			delivery.NextRetryAt = &next
		}
	}

	if updErr := s.repo.UpdateDelivery(ctx, delivery); updErr != nil {
		logger.Error("webhook_update_delivery_failed", "error", updErr.Error())
	}
}

func (s *WebhookService) retryDelay(attempt int) time.Duration {
	idx := attempt - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(webhookRetryBackoff) {
		idx = len(webhookRetryBackoff) - 1
	}
	return webhookRetryBackoff[idx]
}

// StartRetryWorker starts a background goroutine that polls for pending retries.
func (s *WebhookService) StartRetryWorker(ctx context.Context, interval time.Duration) {
	go s.retryWorker(ctx, interval)
}

func (s *WebhookService) retryWorker(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if err := s.ProcessPendingRetries(ctx); err != nil {
				logger.Error("webhook_retry_worker_error", "error", err.Error())
			}
		case <-ctx.Done():
			logger.Info("webhook_retry_worker_stopped")
			return
		}
	}
}

// ProcessPendingRetries fetches and attempts deliveries whose next_retry_at has passed.
func (s *WebhookService) ProcessPendingRetries(ctx context.Context) error {
	deliveries, err := s.repo.ListPendingRetries(ctx, 20)
	if err != nil {
		return fmt.Errorf("list pending retries: %w", err)
	}
	if len(deliveries) == 0 {
		return nil
	}

	for _, d := range deliveries {
		w, err := s.repo.ByID(ctx, d.WebhookID)
		if err != nil || w == nil || !w.Active {
			continue
		}
		cfg := webhook.Config{
			URL:      w.URL,
			Secret:   w.Secret,
			Events:   w.Events,
			Headers:  w.Headers,
			RetryMax: webhookMaxAttempts,
		}
		var payload map[string]interface{}
		_ = json.Unmarshal(d.Payload, &payload)
		event := webhook.Event{
			Type:      d.EventType,
			Timestamp: d.CreatedAt,
			Payload:   payload,
		}
		idempotencyKey := fmt.Sprintf("%s:%s:%d", d.WebhookID, d.EventType, d.CreatedAt.Unix())

		select {
		case s.sem <- struct{}{}:
			s.attemptDelivery(ctx, &d, cfg, event, idempotencyKey)
			<-s.sem
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return nil
}

// RetryDelivery manually retries a failed or pending delivery by ID.
func (s *WebhookService) RetryDelivery(ctx context.Context, deliveryID string) *domain.AppError {
	d, err := s.repo.GetDeliveryByID(ctx, deliveryID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if d == nil {
		return domain.ErrWebhookNotFound
	}
	if d.Status == "delivered" {
		return domain.NewError(domain.ErrBadRequest, 400, "Delivery already succeeded")
	}

	w, err := s.repo.ByID(ctx, d.WebhookID)
	if err != nil || w == nil || !w.Active {
		return domain.ErrWebhookNotFound
	}

	cfg := webhook.Config{
		URL:      w.URL,
		Secret:   w.Secret,
		Events:   w.Events,
		Headers:  w.Headers,
		RetryMax: webhookMaxAttempts,
	}
	var payload map[string]interface{}
	_ = json.Unmarshal(d.Payload, &payload)
	event := webhook.Event{
		Type:      d.EventType,
		Timestamp: d.CreatedAt,
		Payload:   payload,
	}
	idempotencyKey := fmt.Sprintf("%s:%s:%d", d.WebhookID, d.EventType, d.CreatedAt.Unix())

	select {
	case s.sem <- struct{}{}:
		s.attemptDelivery(ctx, d, cfg, event, idempotencyKey)
		<-s.sem
	case <-ctx.Done():
		return domain.NewError(domain.ErrServiceUnavailable, 503, "Context cancelled")
	}
	return nil
}

// ListFailedDeliveries returns deliveries in the dead-letter queue.
func (s *WebhookService) ListFailedDeliveries(ctx context.Context, limit int) ([]domain.WebhookDelivery, *domain.AppError) {
	deliveries, err := s.repo.ListFailedDeliveries(ctx, limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list failed deliveries", err)
	}
	return deliveries, nil
}

// ListDeliveryLogs returns recent delivery attempt logs.
func (s *WebhookService) ListDeliveryLogs(ctx context.Context, limit int) ([]domain.WebhookDeliveryLog, *domain.AppError) {
	logs, err := s.repo.ListDeliveryLogs(ctx, limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list delivery logs", err)
	}
	return logs, nil
}

// ListDeliveries returns delivery history for a webhook.
func (s *WebhookService) ListDeliveries(ctx context.Context, userID, webhookID string) ([]domain.WebhookDelivery, *domain.AppError) {
	w, err := s.repo.ByID(ctx, webhookID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if w == nil || w.UserID != userID {
		return nil, domain.ErrWebhookNotFound
	}
	deliveries, err := s.repo.ListDeliveries(ctx, webhookID, 50)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list deliveries", err)
	}
	return deliveries, nil
}
