-- 007_admin_schema.sql
-- Admin panel tables: rate limiting, provider management, model registry,
-- billing, security, audit, and system configuration.

BEGIN;

-- ============================================================================
-- Rate Limit Tiers
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rpm INT NOT NULL DEFAULT 60,
  tpm INT NOT NULL DEFAULT 100000,
  rpd INT NOT NULL DEFAULT 1000000,
  concurrent INT NOT NULL DEFAULT 10,
  monthly_budget BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tiers_name ON rate_limit_tiers(name);

-- ============================================================================
-- Providers
-- ============================================================================
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'openai',
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority INT NOT NULL DEFAULT 0,
  timeout_ms INT NOT NULL DEFAULT 30000,
  circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT true,
  circuit_breaker_threshold INT NOT NULL DEFAULT 5,
  circuit_breaker_recovery_ms INT NOT NULL DEFAULT 30000,
  circuit_breaker_half_open_max INT NOT NULL DEFAULT 3,
  max_retries INT NOT NULL DEFAULT 3,
  rate_limit_rpm INT NOT NULL DEFAULT 0,
  rate_limit_tpm INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_priority ON providers(priority DESC);

-- ============================================================================
-- Provider Keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  key_prefix TEXT NOT NULL DEFAULT '',
  key_hash TEXT NOT NULL,
  key_last_four TEXT NOT NULL DEFAULT '',
  strategy TEXT NOT NULL DEFAULT 'round-robin',
  weight INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  fill_current INT NOT NULL DEFAULT 0,
  rpm_limit INT NOT NULL DEFAULT 0,
  tpm_limit INT NOT NULL DEFAULT 0,
  monthly_quota BIGINT NOT NULL DEFAULT 0,
  monthly_used BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider_id ON provider_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_keys_active ON provider_keys(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_provider_keys_strategy ON provider_keys(strategy);
CREATE INDEX IF NOT EXISTS idx_provider_keys_sort_order ON provider_keys(provider_id, sort_order);

-- ============================================================================
-- Provider Key Usage Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_key_usage_logs (
  id BIGSERIAL,
  key_id UUID NOT NULL REFERENCES provider_keys(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  tokens INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  status_code INT NOT NULL DEFAULT 0,
  error TEXT DEFAULT '',
  cost INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pk_usage_request_id ON provider_key_usage_logs(request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_pk_usage_key_id ON provider_key_usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_pk_usage_provider_id ON provider_key_usage_logs(provider_id);

-- ============================================================================
-- Provider Health Checks
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_health_checks (
  id BIGSERIAL,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latency_ms INT NOT NULL DEFAULT 0,
  error TEXT DEFAULT '',
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health_checks(provider_id, checked_at DESC);

-- ============================================================================
-- Model Registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  context_window INT NOT NULL DEFAULT 4096,
  max_output INT NOT NULL DEFAULT 4096,
  input_price_per_1k NUMERIC(12,8) NOT NULL DEFAULT 0,
  output_price_per_1k NUMERIC(12,8) NOT NULL DEFAULT 0,
  capabilities TEXT[] DEFAULT '{}',
  supports_vision BOOLEAN NOT NULL DEFAULT false,
  supports_tools BOOLEAN NOT NULL DEFAULT false,
  supports_thinking BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  sunset_date TIMESTAMP,
  replacement_model_id UUID REFERENCES model_registry(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_registry_model_id ON model_registry(model_id);
CREATE INDEX IF NOT EXISTS idx_model_registry_provider ON model_registry(provider_id);
CREATE INDEX IF NOT EXISTS idx_model_registry_status ON model_registry(status);

-- ============================================================================
-- Model Aliases
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  target_model_id UUID NOT NULL REFERENCES model_registry(id) ON DELETE CASCADE,
  preferred_provider_id UUID REFERENCES providers(id),
  preferred_key_id UUID REFERENCES provider_keys(id),
  rpm_override INT NOT NULL DEFAULT 0,
  tpm_override INT NOT NULL DEFAULT 0,
  monthly_budget BIGINT NOT NULL DEFAULT 0,
  allowed_user_ids TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_aliases_alias ON model_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_model_aliases_active ON model_aliases(is_active);

-- ============================================================================
-- Credit Adjustments
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_before INT NOT NULL DEFAULT 0,
  balance_after INT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id),
  reference_id TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user ON credit_adjustments(user_id, created_at DESC);

-- ============================================================================
-- Usage Records
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id BIGSERIAL,
  user_id TEXT NOT NULL,
  api_key_id TEXT DEFAULT '',
  provider_id UUID REFERENCES providers(id),
  request_id TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  tokens INT NOT NULL DEFAULT 0,
  cost INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  status_code INT NOT NULL DEFAULT 0,
  error TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_request_id ON usage_records(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_provider ON usage_records(provider_id, created_at DESC);

-- ============================================================================
-- Usage Daily
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_daily (
  date DATE NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  provider_id UUID,
  model_id TEXT NOT NULL DEFAULT '',
  api_key_id TEXT DEFAULT '',
  request_count INT NOT NULL DEFAULT 0,
  tokens BIGINT NOT NULL DEFAULT 0,
  cost INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  latency_p50_ms INT NOT NULL DEFAULT 0,
  latency_p95_ms INT NOT NULL DEFAULT 0,
  latency_p99_ms INT NOT NULL DEFAULT 0,
  PRIMARY KEY (date, user_id, model_id, api_key_id)
);

-- ============================================================================
-- System Settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  description TEXT DEFAULT '',
  group_name TEXT DEFAULT 'general',
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_group ON system_settings(group_name);

-- ============================================================================
-- Feature Flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  targeted_user_ids TEXT[] DEFAULT '{}',
  targeted_tier_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- ============================================================================
-- Audit Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  changes JSONB DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- ============================================================================
-- Admin Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- ============================================================================
-- Admin Role Permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL DEFAULT '{}'
);

-- ============================================================================
-- IP Lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS ip_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_or_cidr TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  scope_id TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_lists_action ON ip_lists(action);
CREATE INDEX IF NOT EXISTS idx_ip_lists_scope ON ip_lists(scope, scope_id);

-- ============================================================================
-- IP Access Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS ip_access_logs (
  id BIGSERIAL,
  ip_address TEXT NOT NULL,
  user_id TEXT DEFAULT '',
  api_key_id TEXT DEFAULT '',
  method TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  user_agent TEXT DEFAULT '',
  country TEXT DEFAULT '',
  is_proxy BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  rate_limited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_ip_access_ip ON ip_access_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_access_blocked ON ip_access_logs(blocked, created_at DESC);

-- ============================================================================
-- Suspicious Activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id BIGSERIAL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  user_id TEXT DEFAULT '',
  api_key_id TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_category ON suspicious_activities(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_user ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_reviewed ON suspicious_activities(reviewed, resolved);

-- ============================================================================
-- Admin Impersonations
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_impersonations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- ============================================================================
-- Announcements
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  target_type TEXT NOT NULL DEFAULT 'all',
  target_ids TEXT[] DEFAULT '{}',
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP,
  show_in_app BOOLEAN NOT NULL DEFAULT true,
  send_email BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Promo Codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 0,
  current_uses INT NOT NULL DEFAULT 0,
  min_purchase INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, expires_at);

-- ============================================================================
-- Promo Redemptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discount INT NOT NULL DEFAULT 0,
  credits_awarded INT NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_unique ON promo_redemptions(promo_id, user_id);

-- ============================================================================
-- SSO Configs
-- ============================================================================
CREATE TABLE IF NOT EXISTS sso_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL DEFAULT '',
  allowed_domains TEXT[] DEFAULT '{}',
  auto_provision BOOLEAN NOT NULL DEFAULT false,
  default_role TEXT NOT NULL DEFAULT 'user',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- User Groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_group_members (
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Scheduled Reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'json',
  sections TEXT[] NOT NULL DEFAULT '{}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  next_send_at TIMESTAMP,
  last_sent_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- API Changelog
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  published_at TIMESTAMP,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Usage Alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'user',
  metric TEXT NOT NULL,
  threshold FLOAT NOT NULL DEFAULT 0,
  window_minutes INT NOT NULL DEFAULT 60,
  channels TEXT[] NOT NULL DEFAULT '{"email"}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes INT NOT NULL DEFAULT 1440,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Cost Optimizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS cost_optimizations (
  id BIGSERIAL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  estimated_savings INT NOT NULL DEFAULT 0,
  user_id TEXT DEFAULT '',
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Additional tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  predicted_tokens BIGINT NOT NULL DEFAULT 0,
  predicted_cost INT NOT NULL DEFAULT 0,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_a UUID NOT NULL REFERENCES providers(id),
  provider_b UUID NOT NULL REFERENCES providers(id),
  traffic_percent INT NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'running',
  criteria JSONB DEFAULT '{}',
  winner UUID REFERENCES providers(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  uptime FLOAT NOT NULL DEFAULT 100.0,
  latency_avg_ms FLOAT NOT NULL DEFAULT 0,
  error_rate FLOAT NOT NULL DEFAULT 0,
  UNIQUE(provider_id, date)
);

CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  reason TEXT DEFAULT '',
  format TEXT NOT NULL DEFAULT 'json',
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT DEFAULT '',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  trace_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id BIGSERIAL,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INT,
  duration_ms INT NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  attempt INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  sample_payload JSONB DEFAULT '{}',
  target_url TEXT NOT NULL,
  response_status INT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_stats (
  id BIGSERIAL,
  provider_id UUID REFERENCES providers(id),
  model TEXT NOT NULL DEFAULT '',
  hits BIGINT NOT NULL DEFAULT 0,
  misses BIGINT NOT NULL DEFAULT 0,
  hit_rate FLOAT NOT NULL DEFAULT 0.0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ALTER TABLE users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rate_limit_tier_id UUID REFERENCES rate_limit_tiers(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rate_limit_overrides JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_rate_limit_tier ON users(rate_limit_tier_id);
CREATE INDEX IF NOT EXISTS idx_users_tags ON users USING GIN(tags);

-- ============================================================================
-- Monthly partition creation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, partition_date DATE)
RETURNS void AS $$
DECLARE
  partition_start TEXT;
  partition_end TEXT;
  partition_name TEXT;
  is_partitioned BOOLEAN;
BEGIN
  -- Skip if table is not partitioned (e.g., existing dev table)
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = table_name AND c.relkind = 'p'
  ) INTO is_partitioned;

  IF NOT is_partitioned THEN
    RETURN;
  END IF;

  partition_start := to_char(partition_date, 'YYYY-MM-01');
  partition_end := to_char(partition_date + INTERVAL '1 month', 'YYYY-MM-01');
  partition_name := table_name || '_' || to_char(partition_date, 'YYYY_MM');
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, partition_start, partition_end
  );
END;
$$ LANGUAGE plpgsql;

SELECT create_monthly_partition('provider_key_usage_logs', DATE '2026-05-01');
SELECT create_monthly_partition('provider_key_usage_logs', DATE '2026-06-01');
SELECT create_monthly_partition('usage_records', DATE '2026-05-01');
SELECT create_monthly_partition('usage_records', DATE '2026-06-01');
SELECT create_monthly_partition('audit_logs', DATE '2026-05-01');
SELECT create_monthly_partition('audit_logs', DATE '2026-06-01');
SELECT create_monthly_partition('ip_access_logs', DATE '2026-05-01');
SELECT create_monthly_partition('ip_access_logs', DATE '2026-06-01');

-- ============================================================================
-- Seed data
-- ============================================================================
INSERT INTO admin_role_permissions (role, permissions) VALUES
  ('superadmin', ARRAY['*']),
  ('admin', ARRAY['users.read', 'users.write', 'providers.read', 'providers.write',
    'models.read', 'models.write', 'billing.read', 'billing.write',
    'settings.read', 'settings.write', 'logs.read']),
  ('support', ARRAY['users.read', 'logs.read']),
  ('analyst', ARRAY['users.read', 'logs.read', 'analytics.read'])
ON CONFLICT (role) DO NOTHING;

COMMIT;
