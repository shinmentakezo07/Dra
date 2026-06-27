-- Migration: Files table and user budget caps
-- Created: 2026-05-10

-- File uploads persistence
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- User-level budget caps
ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS monthly_budget INT,
    ADD COLUMN IF NOT EXISTS daily_budget INT,
    ADD COLUMN IF NOT EXISTS daily_spent INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monthly_spent INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS budget_reset_at TIMESTAMPTZ;

-- Stripe billing integration
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);

CREATE TABLE IF NOT EXISTS stripe_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT NOT NULL,
    amount INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_invoices_user_id ON stripe_invoices(user_id);
