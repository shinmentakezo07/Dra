package repository_test

import (
	"context"
	"testing"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/testutil"
)

func TestWebhookRepo_DeliveryLogs(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "LogUser", "loguser@test.com", "hash", "user")

	whRepo := repository.NewWebhookRepo(db)
	wh, _ := whRepo.Create(ctx, user.ID, "http://example.com", "secret", []string{"test.event"}, nil)

	log := &domain.WebhookDeliveryLog{
		WebhookID:      wh.ID,
		EventType:      "test.event",
		Payload:        []byte(`{"key":"value"}`),
		ResponseStatus: intPtr(200),
		DurationMs:     150,
		Success:        true,
		Attempt:        1,
		IdempotencyKey: "key-1",
		CreatedAt:      time.Now(),
	}
	if err := whRepo.CreateDeliveryLog(ctx, log); err != nil {
		t.Fatalf("CreateDeliveryLog error: %v", err)
	}

	logs, err := whRepo.ListDeliveryLogs(ctx, 10)
	if err != nil {
		t.Fatalf("ListDeliveryLogs error: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logs))
	}
	if logs[0].IdempotencyKey != "key-1" {
		t.Errorf("idempotencyKey = %q, want key-1", logs[0].IdempotencyKey)
	}
	if logs[0].Success != true {
		t.Error("expected success = true")
	}
}

func TestWebhookRepo_Idempotency(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "IdempUser", "idempuser@test.com", "hash", "user")

	whRepo := repository.NewWebhookRepo(db)
	wh, _ := whRepo.Create(ctx, user.ID, "http://example.com", "secret", []string{"test.event"}, nil)

	// No successful log yet
	found, err := whRepo.HasSuccessfulIdempotencyKey(ctx, "duplicate-key")
	if err != nil {
		t.Fatalf("HasSuccessfulIdempotencyKey error: %v", err)
	}
	if found {
		t.Error("expected no duplicate for fresh key")
	}

	// Create a successful log
	log := &domain.WebhookDeliveryLog{
		WebhookID:      wh.ID,
		EventType:      "test.event",
		Success:        true,
		Attempt:        1,
		IdempotencyKey: "duplicate-key",
		CreatedAt:      time.Now(),
	}
	if err := whRepo.CreateDeliveryLog(ctx, log); err != nil {
		t.Fatalf("CreateDeliveryLog error: %v", err)
	}

	found, err = whRepo.HasSuccessfulIdempotencyKey(ctx, "duplicate-key")
	if err != nil {
		t.Fatalf("HasSuccessfulIdempotencyKey error: %v", err)
	}
	if !found {
		t.Error("expected duplicate found after successful log")
	}

	// Failed log with same key should not block
	log2 := &domain.WebhookDeliveryLog{
		WebhookID:      wh.ID,
		EventType:      "test.event",
		Success:        false,
		Attempt:        1,
		IdempotencyKey: "failed-key",
		CreatedAt:      time.Now(),
	}
	if err := whRepo.CreateDeliveryLog(ctx, log2); err != nil {
		t.Fatalf("CreateDeliveryLog error: %v", err)
	}
	found, _ = whRepo.HasSuccessfulIdempotencyKey(ctx, "failed-key")
	if found {
		t.Error("expected no duplicate for failed key")
	}
}

func TestWebhookRepo_PendingRetries(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "RetryUser", "retryuser@test.com", "hash", "user")

	whRepo := repository.NewWebhookRepo(db)
	wh, _ := whRepo.Create(ctx, user.ID, "http://example.com", "secret", []string{"test.event"}, nil)

	now := time.Now()
	// Delivery ready for retry
	d1 := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   wh.ID,
		EventType:   "test.event",
		Payload:     []byte(`{}`),
		Attempts:    1,
		MaxAttempts: 5,
		Status:      "pending",
		NextRetryAt: timePtr(now.Add(-time.Minute)),
		CreatedAt:   now,
	}
	if err := whRepo.CreateDelivery(ctx, d1); err != nil {
		t.Fatalf("CreateDelivery error: %v", err)
	}

	// Delivery not ready yet
	d2 := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   wh.ID,
		EventType:   "test.event",
		Payload:     []byte(`{}`),
		Attempts:    1,
		MaxAttempts: 5,
		Status:      "pending",
		NextRetryAt: timePtr(now.Add(time.Hour)),
		CreatedAt:   now,
	}
	if err := whRepo.CreateDelivery(ctx, d2); err != nil {
		t.Fatalf("CreateDelivery error: %v", err)
	}

	pending, err := whRepo.ListPendingRetries(ctx, 10)
	if err != nil {
		t.Fatalf("ListPendingRetries error: %v", err)
	}
	if len(pending) != 1 {
		t.Errorf("expected 1 pending retry, got %d", len(pending))
	}
	if len(pending) > 0 && pending[0].ID != d1.ID {
		t.Errorf("expected pending delivery %s, got %s", d1.ID, pending[0].ID)
	}
}

func TestWebhookRepo_FailedDeliveries(t *testing.T) {
	db, cleanup := newTestDB(t)
	defer cleanup()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(db)
	user, _ := userRepo.Create(ctx, "DLQUser", "dlquser@test.com", "hash", "user")

	whRepo := repository.NewWebhookRepo(db)
	wh, _ := whRepo.Create(ctx, user.ID, "http://example.com", "secret", []string{"test.event"}, nil)

	now := time.Now()
	d := &domain.WebhookDelivery{
		ID:          domain.NewID(),
		WebhookID:   wh.ID,
		EventType:   "test.event",
		Payload:     []byte(`{}`),
		Attempts:    5,
		MaxAttempts: 5,
		Status:      "failed",
		CreatedAt:   now,
	}
	if err := whRepo.CreateDelivery(ctx, d); err != nil {
		t.Fatalf("CreateDelivery error: %v", err)
	}

	failed, err := whRepo.ListFailedDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("ListFailedDeliveries error: %v", err)
	}
	if len(failed) != 1 {
		t.Errorf("expected 1 failed delivery, got %d", len(failed))
	}
	if len(failed) > 0 && failed[0].Status != "failed" {
		t.Errorf("expected status failed, got %q", failed[0].Status)
	}
}

func intPtr(i int) *int {
	return &i
}

func timePtr(t time.Time) *time.Time {
	return &t
}
