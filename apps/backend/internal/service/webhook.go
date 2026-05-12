package service

import (
	"context"
	"encoding/json"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/pkg/webhook"
)

// maxConcurrentWebhooks limits the number of simultaneous outgoing webhook requests.
const maxConcurrentWebhooks = 20

type WebhookService struct {
	repo       *repository.WebhookRepo
	dispatcher *webhook.Dispatcher
	sem        chan struct{}
}

func NewWebhookService(repo *repository.WebhookRepo) *WebhookService {
	return &WebhookService{
		repo:       repo,
		dispatcher: webhook.NewDispatcher(),
		sem:        make(chan struct{}, maxConcurrentWebhooks),
	}
}

func (s *WebhookService) Create(ctx context.Context, userID string, req domain.CreateWebhookRequest) (*domain.Webhook, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
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
			RetryMax: 3,
		}
		go func(webhookID string, c webhook.Config, e webhook.Event) {
			defer func() {
				if r := recover(); r != nil {
					// silently drop panics in webhook goroutines
				}
			}()
			select {
			case s.sem <- struct{}{}:
				s.sendAndTrack(ctx, webhookID, c, e)
				<-s.sem
			case <-ctx.Done():
				return
			}
		}(w.ID, cfg, event)
	}
}

func (s *WebhookService) sendAndTrack(ctx context.Context, webhookID string, cfg webhook.Config, event webhook.Event) {
	payload, _ := json.Marshal(event)
	delivery := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   webhookID,
		EventType:   event.Type,
		Payload:     payload,
		Attempts:    0,
		MaxAttempts: cfg.RetryMax,
		CreatedAt:   time.Now(),
	}

	_ = s.repo.CreateDelivery(ctx, delivery)

	result, err := s.dispatcher.SendWithRetry(ctx, cfg, event)

	now := time.Now()
	if result != nil {
		delivery.Attempts = result.Attempts
		delivery.StatusCode = &result.Status
		if result.Status >= 200 && result.Status < 300 {
			delivery.DeliveredAt = &now
		}
	}
	if err != nil {
		delivery.Error = err.Error()
		if result != nil && result.Status >= 400 && result.Status < 500 {
			// Client error: no retry
		} else {
			nextRetry := now.Add(time.Duration(delivery.Attempts+1) * time.Minute)
			delivery.NextRetryAt = &nextRetry
		}
	}

	_ = s.repo.UpdateDelivery(ctx, delivery)
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
