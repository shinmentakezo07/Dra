-- Rate limit tiers with per-tier limits
CREATE TABLE IF NOT EXISTS rate_limit_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    rpm INT NOT NULL DEFAULT 10,
    tpm INT NOT NULL DEFAULT 1000,
    rpd INT NOT NULL DEFAULT 1000,
    concurrent INT NOT NULL DEFAULT 1,
    monthly_budget BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User tier assignment
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) NOT NULL DEFAULT 'free';
CREATE INDEX idx_users_tier ON users(tier);

-- Seed default tiers
INSERT INTO rate_limit_tiers (name, rpm, tpm, rpd, concurrent, monthly_budget) VALUES
    ('free', 10, 1000, 1000, 1, 0),
    ('pro', 100, 50000, 50000, 5, 10000),
    ('enterprise', 1000, 500000, 500000, 20, 100000);
