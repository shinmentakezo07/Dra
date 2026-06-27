-- Migration 022: Enterprise Features — Virtual Keys, Teams, Credential Vault, Usage Tracking, Audit Logs, Security
-- Run manually: psql $DATABASE_URL -f migrations/022_enterprise_features.sql

BEGIN;

-- ============================================================
-- 1. Teams
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    budget_limit_cents BIGINT DEFAULT 0,           -- 0 = unlimited
    budget_reset_period VARCHAR(20) DEFAULT 'monthly',
    budget_used_cents BIGINT DEFAULT 0,
    model_access TEXT[],                            -- NULL = all models
    max_members INT DEFAULT 0,                      -- 0 = unlimited
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Team Members
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',     -- admin, member, viewer
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================================
-- 3. Virtual API Keys
-- ============================================================
CREATE TABLE IF NOT EXISTS virtual_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 of sk-xxx
    key_prefix VARCHAR(12) NOT NULL,                -- First 8 chars for display
    name VARCHAR(255) DEFAULT '',
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_access TEXT[],                            -- NULL = all models
    rate_limit_rpm INT DEFAULT 60,
    rate_limit_rpd INT DEFAULT 10000,
    rate_limit_tpm INT DEFAULT 0,                   -- 0 = unlimited
    budget_limit_cents BIGINT DEFAULT 0,            -- 0 = unlimited
    budget_used_cents BIGINT DEFAULT 0,
    budget_reset_period VARCHAR(20) DEFAULT 'monthly',
    max_tokens_per_request INT DEFAULT 0,           -- 0 = unlimited
    allowed_ips TEXT[],                             -- NULL = all IPs
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    request_count BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_virtual_keys_hash ON virtual_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_user ON virtual_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_team ON virtual_keys(team_id);

-- ============================================================
-- 4. Credential Vault (encrypted provider API keys)
-- ============================================================
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,             -- openai, anthropic, gemini, etc.
    encrypted_key TEXT NOT NULL,                    -- AES-256-GCM encrypted
    key_hash VARCHAR(64) NOT NULL,                  -- For dedup
    key_last_four VARCHAR(4) NOT NULL DEFAULT '',
    api_base TEXT DEFAULT '',
    extra_config JSONB DEFAULT '{}',
    priority INT DEFAULT 0,                         -- Higher = preferred
    is_active BOOLEAN DEFAULT true,
    health_status VARCHAR(20) DEFAULT 'unknown',    -- healthy, degraded, unhealthy, unknown
    last_health_check TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    failure_count INT DEFAULT 0,
    success_count BIGINT DEFAULT 0,
    total_requests BIGINT DEFAULT 0,
    last_error TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credentials_provider ON credentials(provider_type, is_active);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON credentials(key_hash);

-- ============================================================
-- 5. Usage Records (per-request tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(64) NOT NULL,
    virtual_key_id UUID REFERENCES virtual_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    thinking_tokens INT NOT NULL DEFAULT 0,
    cost_microcents BIGINT NOT NULL DEFAULT 0,      -- Cost in microcents (1/1000000 of a dollar)
    latency_ms INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, error, timeout, rate_limited
    error_message TEXT DEFAULT '',
    ip_address INET,
    user_agent TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_key ON usage_records(virtual_key_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_team ON usage_records(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_model ON usage_records(model, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_created ON usage_records(created_at);

-- ============================================================
-- 6. Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user', -- user, api_key, system, admin
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) DEFAULT '',
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT DEFAULT '',
    severity VARCHAR(20) DEFAULT 'info',            -- info, warning, error, critical
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- 7. Model Access Groups
-- ============================================================
CREATE TABLE IF NOT EXISTS model_access_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    models TEXT[] NOT NULL DEFAULT '{}',
    max_requests_per_minute INT DEFAULT 0,          -- 0 = use key default
    max_tokens_per_minute INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. Model Pricing Overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS model_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT '',
    input_cost_per_million_cents BIGINT DEFAULT 0,  -- Cost per 1M input tokens in cents
    output_cost_per_million_cents BIGINT DEFAULT 0,
    thinking_cost_per_million_cents BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model, provider)
);

-- ============================================================
-- 9. Fallback Configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS fallback_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT '',
    model VARCHAR(255) NOT NULL,
    fallback_chain TEXT[] NOT NULL DEFAULT '{}',
    max_retries INT DEFAULT 3,
    retry_delay_ms INT DEFAULT 1000,
    backoff_multiplier FLOAT DEFAULT 2.0,
    max_retry_delay_ms INT DEFAULT 30000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. Security Events (prompt injection, jailbreak, PII)
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,                -- prompt_injection, jailbreak, pii_detected, secret_detected
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    virtual_key_id UUID REFERENCES virtual_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    model VARCHAR(255) DEFAULT '',
    provider VARCHAR(50) DEFAULT '',
    details JSONB DEFAULT '{}',
    action_taken VARCHAR(50) DEFAULT 'blocked',     -- blocked, redacted, warned, logged
    request_id VARCHAR(64) DEFAULT '',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_key ON security_events(virtual_key_id, created_at);

-- ============================================================
-- 11. Budget Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(20) NOT NULL,               -- team, user, key
    target_id UUID NOT NULL,
    threshold_percent INT NOT NULL,                 -- 50, 80, 95, 100
    current_usage_cents BIGINT NOT NULL,
    budget_limit_cents BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL DEFAULT 'webhook', -- webhook, email, slack
    sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_target ON budget_alerts(target_type, target_id, threshold_percent);

-- ============================================================
-- 12. A/B Test Configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    model_a VARCHAR(255) NOT NULL,
    model_b VARCHAR(255) NOT NULL,
    provider_a VARCHAR(50) DEFAULT '',
    provider_b VARCHAR(50) DEFAULT '',
    traffic_percent_a FLOAT DEFAULT 50.0,
    is_active BOOLEAN DEFAULT true,
    start_at TIMESTAMPTZ DEFAULT now(),
    end_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. Provider Health History
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,                    -- healthy, degraded, unhealthy
    latency_ms INT DEFAULT 0,
    error_rate FLOAT DEFAULT 0,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health_history(provider, checked_at);

COMMIT;
