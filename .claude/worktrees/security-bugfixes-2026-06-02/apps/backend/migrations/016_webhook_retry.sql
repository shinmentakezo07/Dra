-- 016_webhook_retry.sql
-- Add retry/DLQ support and idempotency tracking to webhook tables.

BEGIN;

-- Add status column to webhook_deliveries for explicit state tracking
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add idempotency key to webhook_delivery_logs
ALTER TABLE webhook_delivery_logs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Index for fast DLQ / pending lookups
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_webhook_logs_idempotency ON webhook_delivery_logs(idempotency_key, success) WHERE idempotency_key IS NOT NULL;

COMMIT;
