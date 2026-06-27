package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/pkg/webhook"
)

func skipIfNoDB(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("Skipping: TEST_DATABASE_URL not set")
	}
}

func cleanTables(d *db.DB) error {
	ctx := context.Background()
	_, err := d.Pool.Exec(ctx, `
		TRUNCATE TABLE users, webhooks, webhook_deliveries, webhook_delivery_logs RESTART IDENTITY CASCADE
	`)
	return err
}

func TestWebhookService_retryDelay(t *testing.T) {
	svc := NewWebhookService(nil)
	tests := []struct {
		attempt int
		want    time.Duration
	}{
		{1, 1 * time.Second},
		{2, 4 * time.Second},
		{3, 16 * time.Second},
		{4, 64 * time.Second},
		{5, 64 * time.Second},
		{10, 64 * time.Second},
	}
	for _, tt := range tests {
		got := svc.retryDelay(tt.attempt)
		if got != tt.want {
			t.Errorf("retryDelay(%d) = %v, want %v", tt.attempt, got, tt.want)
		}
	}
}

func TestWebhookService_DispatchAndRetry(t *testing.T) {
	skipIfNoDB(t)
	database, err := db.NewPostgres(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatalf("NewPostgres error: %v", err)
	}
	defer database.Close()

	if err := cleanTables(database); err != nil {
		t.Fatalf("cleanTables error: %v", err)
	}

	ctx := context.Background()
	repo := repository.NewWebhookRepo(database)
	svc := NewWebhookService(repo)

	userRepo := repository.NewUserRepo(database)
	user, _ := userRepo.Create(ctx, "WebhookUser", "webhook@test.com", "hash", "user")

	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	wh, _ := repo.Create(ctx, user.ID, server.URL, "secret", []string{"test.event"}, nil)

	svc.Dispatch(ctx, user.ID, webhook.Event{
		Type:      "test.event",
		Timestamp: time.Now(),
		Payload:   map[string]interface{}{"key": "value"},
	})

	time.Sleep(200 * time.Millisecond)

	deliveries, err := repo.ListDeliveries(ctx, wh.ID, 10)
	if err != nil {
		t.Fatalf("ListDeliveries error: %v", err)
	}
	if len(deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(deliveries))
	}
	d := deliveries[0]
	if d.Attempts != 1 {
		t.Errorf("initial attempts = %d, want 1", d.Attempts)
	}
	if d.Status != "pending" {
		t.Errorf("initial status = %q, want pending", d.Status)
	}
	if d.NextRetryAt == nil {
		t.Error("expected next_retry_at to be set after failure")
	}

	time.Sleep(100 * time.Millisecond)
	if err := svc.ProcessPendingRetries(ctx); err != nil {
		t.Fatalf("ProcessPendingRetries error: %v", err)
	}

	d2, _ := repo.GetDeliveryByID(ctx, d.ID)
	if d2 == nil {
		t.Fatal("delivery not found after retry")
	}
	if d2.Attempts != 2 {
		t.Errorf("after retry attempts = %d, want 2", d2.Attempts)
	}
	if d2.Status != "pending" {
		t.Errorf("after retry status = %q, want pending", d2.Status)
	}

	time.Sleep(100 * time.Millisecond)
	if err := svc.ProcessPendingRetries(ctx); err != nil {
		t.Fatalf("ProcessPendingRetries error: %v", err)
	}

	d3, _ := repo.GetDeliveryByID(ctx, d.ID)
	if d3 == nil {
		t.Fatal("delivery not found after second retry")
	}
	if d3.Attempts != 3 {
		t.Errorf("after second retry attempts = %d, want 3", d3.Attempts)
	}
	if d3.Status != "delivered" {
		t.Errorf("after success status = %q, want delivered", d3.Status)
	}
	if d3.DeliveredAt == nil {
		t.Error("expected delivered_at to be set")
	}

	logs, err := repo.ListDeliveryLogs(ctx, 10)
	if err != nil {
		t.Fatalf("ListDeliveryLogs error: %v", err)
	}
	if len(logs) != 3 {
		t.Errorf("expected 3 logs, got %d", len(logs))
	}
}

func TestWebhookService_Dispatch_Idempotency(t *testing.T) {
	skipIfNoDB(t)
	database, err := db.NewPostgres(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatalf("NewPostgres error: %v", err)
	}
	defer database.Close()

	if err := cleanTables(database); err != nil {
		t.Fatalf("cleanTables error: %v", err)
	}

	ctx := context.Background()
	repo := repository.NewWebhookRepo(database)
	svc := NewWebhookService(repo)

	userRepo := repository.NewUserRepo(database)
	user, _ := userRepo.Create(ctx, "WebhookUser2", "webhook2@test.com", "hash", "user")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	wh, _ := repo.Create(ctx, user.ID, server.URL, "secret", []string{"test.event"}, nil)

	ts := time.Unix(1234567890, 0)
	event := webhook.Event{
		Type:      "test.event",
		Timestamp: ts,
		Payload:   map[string]interface{}{"key": "value"},
	}

	svc.Dispatch(ctx, user.ID, event)
	time.Sleep(200 * time.Millisecond)

	svc.Dispatch(ctx, user.ID, event)
	time.Sleep(200 * time.Millisecond)

	deliveries, _ := repo.ListDeliveries(ctx, wh.ID, 10)
	if len(deliveries) != 1 {
		t.Errorf("expected 1 delivery (deduplicated), got %d", len(deliveries))
	}

	logs, _ := repo.ListDeliveryLogs(ctx, 10)
	if len(logs) != 1 {
		t.Errorf("expected 1 log (deduplicated), got %d", len(logs))
	}
}

func TestWebhookService_RetryDelivery_DLQ(t *testing.T) {
	skipIfNoDB(t)
	database, err := db.NewPostgres(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatalf("NewPostgres error: %v", err)
	}
	defer database.Close()

	if err := cleanTables(database); err != nil {
		t.Fatalf("cleanTables error: %v", err)
	}

	ctx := context.Background()
	repo := repository.NewWebhookRepo(database)
	svc := NewWebhookService(repo)

	userRepo := repository.NewUserRepo(database)
	user, _ := userRepo.Create(ctx, "WebhookUser3", "webhook3@test.com", "hash", "user")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	wh, _ := repo.Create(ctx, user.ID, server.URL, "secret", []string{"test.event"}, nil)

	delivery := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   wh.ID,
		EventType:   "test.event",
		Payload:     []byte(`{"key":"value"}`),
		Attempts:    5,
		MaxAttempts: 5,
		Status:      "failed",
		CreatedAt:   time.Now(),
	}
	if err := repo.CreateDelivery(ctx, delivery); err != nil {
		t.Fatalf("CreateDelivery error: %v", err)
	}

	failed, appErr := svc.ListFailedDeliveries(ctx, 10)
	if appErr != nil {
		t.Fatalf("ListFailedDeliveries error: %v", appErr)
	}
	if len(failed) != 1 {
		t.Errorf("expected 1 failed delivery, got %d", len(failed))
	}

	appErr = svc.RetryDelivery(ctx, delivery.ID)
	if appErr != nil {
		t.Fatalf("RetryDelivery error: %v", appErr)
	}

	d, _ := repo.GetDeliveryByID(ctx, delivery.ID)
	if d.Attempts != 6 {
		t.Errorf("after manual retry attempts = %d, want 6", d.Attempts)
	}
	if d.Status != "failed" {
		t.Errorf("after manual retry status = %q, want failed", d.Status)
	}
}
