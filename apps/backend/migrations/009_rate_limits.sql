-- User tier assignment (rate_limit_tiers table already created in 007_admin_schema.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) NOT NULL DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Seed default tiers
INSERT INTO rate_limit_tiers (name, rpm, tpm, rpd, concurrent, monthly_budget) VALUES
    ('free', 10, 1000, 1000, 1, 0),
    ('pro', 100, 50000, 50000, 5, 10000),
    ('enterprise', 1000, 500000, 500000, 20, 100000)
ON CONFLICT (name) DO NOTHING;
