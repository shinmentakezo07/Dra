# Admin Panel Design Document

**Date:** 2026-05-13
**Project:** Yapapa / DRA Platform (Universal LLM Gateway)
**Status:** Draft

## Overview

The Admin Panel is a complete administrative sub-application for managing every aspect of the LLM Gateway platform. It provides a dedicated `/admin` route in the Next.js frontend protected by role-based access, backed by new backend admin API endpoints, database schema, middleware, and services.

## Architecture

### Layered Architecture

```
Frontend (Next.js /app/admin/)  <--JWT auth-->  Backend (Go /api/admin/*)
       |                                            |
       v                                            v
   AdminLayout (role guard)                  RequireAdmin middleware
       |                                            |
       v                                            v
   AdminSidebar + Pages                     Admin handlers -> AdminService -> Repos
       |                                            |
       v                                            v
   AdminSDK (lib/api)                        migrations/007_admin_schema.sql
```

### Authentication Flow

1. User visits `/admin/*`
2. `AdminLayout` checks NextAuth session for `role === "admin"`
3. If not admin -> redirect to home (or 403 page)
4. Frontend calls `/api/admin/*` with JWT
5. Backend `RequireAdmin` middleware checks JWT + `user.IsAdmin()`
6. Optional: permission-checking middleware for fine-grained RBAC

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Recharts, Framer Motion
- **Backend:** Go 1.25, chi router, pgx v5
- **Database:** PostgreSQL with partitioning for large tables
- **Auth:** NextAuth v5 + JWT HS256

---

## 1. Database Schema

The admin schema adds eight new domains and enhances existing tables. All time-series tables use PostgreSQL partitioning (by month) to keep query performance predictable as data grows.

### Domain 1: Identity & Access Control

#### Users (enhanced)

```sql
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS rate_limit_tier TEXT NOT NULL DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_ip INET,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_rate_limit_tier ON users(rate_limit_tier);
```

`status` values: `active`, `suspended`, `disabled`. Soft-delete via `deleted_at` to preserve referential integrity.

#### rate_limit_tiers

```sql
CREATE TABLE IF NOT EXISTS rate_limit_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    requests_per_minute INT NOT NULL DEFAULT 60,
    requests_per_hour INT NOT NULL DEFAULT 1000,
    requests_per_day INT NOT NULL DEFAULT 10000,
    concurrent_requests INT NOT NULL DEFAULT 10,
    tokens_per_minute INT NOT NULL DEFAULT 100000,
    burst_multiplier REAL NOT NULL DEFAULT 1.5,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Seed data:

```sql
INSERT INTO rate_limit_tiers (name, requests_per_minute, requests_per_hour, requests_per_day, concurrent_requests, tokens_per_minute, priority) VALUES
    ('default', 60, 1000, 10000, 10, 100000, 0),
    ('power', 300, 5000, 50000, 25, 500000, 10),
    ('enterprise', 1000, 20000, 200000, 100, 2000000, 20),
    ('internal', 5000, 100000, 1000000, 500, 10000000, 100),
    ('admin', 10000, 100000, 1000000, 1000, 50000000, 1000)
ON CONFLICT (name) DO NOTHING;
```

#### api_keys (enhanced for admin)

```sql
ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS rate_limit_override_tier TEXT REFERENCES rate_limit_tiers(name),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_by_ip INET;

CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
```

#### ip_lists

```sql
CREATE TABLE IF NOT EXISTS ip_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    entries TEXT[] NOT NULL DEFAULT '{}',
    is_allowlist BOOLEAN NOT NULL DEFAULT false,
    applies_to TEXT NOT NULL DEFAULT 'api_keys',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_lists_name ON ip_lists(name);
```

Supports CIDR notation entries.
`applies_to` values: `api_keys`, `admin_access`, `webhooks`.

---

### Domain 2: Provider Infrastructure

#### providers

```sql
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_format TEXT NOT NULL DEFAULT 'openai',
    models_url TEXT,
    health_check_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    priority INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    cooldown_period INTERVAL NOT NULL DEFAULT '30 seconds',
    rate_limit_tier TEXT REFERENCES rate_limit_tiers(name),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_priority ON providers(priority);
```

`api_format` values: `openai`, `anthropic`, `google`, `custom`.
`status` values: `active`, `degraded`, `maintenance`, `disabled`.

#### provider_keys

```sql
CREATE TABLE IF NOT EXISTS provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    key_label TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_last_four TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    weight INT NOT NULL DEFAULT 1,
    usage_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    rate_limit_rpm INT,
    max_concurrent INT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_from_id UUID REFERENCES provider_keys(id),
    rotated_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider_id ON provider_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_keys_status ON provider_keys(status);
```

Key hashes are stored, not plaintext. `key_prefix` is the first 8 characters for identification.

#### provider_key_usage_logs (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS provider_key_usage_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    provider_key_id UUID NOT NULL REFERENCES provider_keys(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    latency_ms INT NOT NULL,
    status_code INT,
    error_code TEXT,
    model TEXT,
    tokens_used INT DEFAULT 0
) PARTITION BY RANGE (timestamp);
```

Partitions created monthly via cron or pg_partman.

#### provider_health_checks (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS provider_health_checks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL,
    latency_ms INT,
    error_message TEXT,
    response_code INT,
    is_synthetic BOOLEAN NOT NULL DEFAULT false
) PARTITION BY RANGE (timestamp);
```

#### provider_maintenance_windows

```sql
CREATE TABLE IF NOT EXISTS provider_maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    affects_routing BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Domain 3: Model Management

#### model_registry

```sql
CREATE TABLE IF NOT EXISTS model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider_id UUID REFERENCES providers(id),
    provider_name TEXT NOT NULL,
    version TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    context_window INT NOT NULL DEFAULT 4096,
    max_output_tokens INT NOT NULL DEFAULT 4096,
    input_price_per_1k NUMERIC(12,8) NOT NULL DEFAULT 0,
    output_price_per_1k NUMERIC(12,8) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    pricing_model TEXT NOT NULL DEFAULT 'per_token',
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    supports_streaming BOOLEAN NOT NULL DEFAULT true,
    supports_vision BOOLEAN NOT NULL DEFAULT false,
    supports_tools BOOLEAN NOT NULL DEFAULT false,
    supports_thinking BOOLEAN NOT NULL DEFAULT false,
    supports_json_mode BOOLEAN NOT NULL DEFAULT false,
    supports_function_calling BOOLEAN NOT NULL DEFAULT false,
    deprecation_date TIMESTAMPTZ,
    sunset_date TIMESTAMPTZ,
    release_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_registry_status ON model_registry(status);
CREATE INDEX IF NOT EXISTS idx_model_registry_provider ON model_registry(provider_name);
CREATE INDEX IF NOT EXISTS idx_model_registry_capabilities ON model_registry USING GIN(capabilities);
```

`status` lifecycle: `coming_soon` -> `active` -> `deprecated` -> `sunset`.
`pricing_model` values: `per_token`, `per_request`, `subscription`.

#### model_aliases

```sql
CREATE TABLE IF NOT EXISTS model_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias TEXT NOT NULL UNIQUE,
    target_model_id TEXT NOT NULL REFERENCES model_registry(model_id),
    is_automatic BOOLEAN NOT NULL DEFAULT false,
    pricing_override_input NUMERIC(12,8),
    pricing_override_output NUMERIC(12,8),
    routing_priority INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_aliases_alias ON model_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_model_aliases_target ON model_aliases(target_model_id);
```

Examples: `gpt-4` -> `openai/gpt-4o`, `claude-3` -> `anthropic/claude-3-opus`.

#### model_routing_rules

```sql
CREATE TABLE IF NOT EXISTS model_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    model_id TEXT NOT NULL,
    fallback_model_ids TEXT[] NOT NULL DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    priority INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_model_id ON model_routing_rules(model_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON model_routing_rules(is_active);
```

`conditions` JSONB schema: `{"max_latency_ms": 5000, "max_cost_per_1k": 0.01, "require_capabilities": ["vision"]}`.

---

### Domain 4: Billing & Credits

#### user_credits (enhanced)

```sql
ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS lifetime_value BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_requests BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tokens_input BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tokens_output BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS last_daily_reset TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_monthly_reset TIMESTAMPTZ;
```

#### credit_adjustments

```sql
CREATE TABLE IF NOT EXISTS credit_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount INT NOT NULL,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    reason TEXT NOT NULL,
    admin_id UUID REFERENCES users(id),
    reference_type TEXT,
    reference_id TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user_id ON credit_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_admin_id ON credit_adjustments(admin_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_created_at ON credit_adjustments(created_at DESC);
```

`reason` values: `manual_adjustment`, `refund`, `bonus`, `correction`, `promotion`, `penalty`.
`reference_type` links to `stripe_transactions`, `promo_codes`, etc.

#### usage_records (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'chat',
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    cached_input_tokens INT DEFAULT 0,
    cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    latency_ms INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    error_code TEXT,
    country_code TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_model_id ON usage_records(model_id);
CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_status ON usage_records(status);
```

Monthly partitions: `usage_records_2026_01`, `usage_records_2026_02`, etc.

#### usage_daily

```sql
CREATE TABLE IF NOT EXISTS usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    model_id TEXT,
    provider TEXT,
    request_type TEXT,
    total_requests INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cached_input_tokens BIGINT DEFAULT 0,
    total_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
    total_latency_ms BIGINT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, user_id, model_id, request_type)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON usage_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user_id ON usage_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_model_id ON usage_daily(model_id);
```

#### usage_alerts

```sql
CREATE TABLE IF NOT EXISTS usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    metric TEXT NOT NULL,
    threshold NUMERIC(12,4) NOT NULL,
    comparison TEXT NOT NULL DEFAULT 'greater_than',
    period TEXT NOT NULL DEFAULT 'daily',
    enabled BOOLEAN NOT NULL DEFAULT true,
    notify_channels TEXT[] NOT NULL DEFAULT '{"email"}',
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Domain 5: Request Pipeline & IP Detection

#### ip_access_logs (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS ip_access_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    action TEXT NOT NULL,
    path TEXT,
    method TEXT,
    status_code INT,
    user_agent TEXT,
    country_code TEXT,
    asn INT,
    is_proxy BOOLEAN DEFAULT false,
    risk_score REAL DEFAULT 0,
    blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_ip_access_ip ON ip_access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_access_timestamp ON ip_access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ip_access_blocked ON ip_access_logs(blocked);
```

#### request_errors (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS request_errors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    model TEXT,
    provider TEXT,
    error_type TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT,
    status_code INT,
    request_path TEXT,
    request_method TEXT,
    request_body TEXT,
    response_body TEXT,
    stack_trace TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_request_errors_type ON request_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_request_errors_timestamp ON request_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_errors_provider ON request_errors(provider);
```

---

### Domain 6: System Configuration

#### system_settings

```sql
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_secret BOOLEAN NOT NULL DEFAULT false,
    is_editable BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
```

Categories: `billing`, `rate_limiting`, `routing`, `security`, `notifications`, `cache`, `features`, `integrations`.

#### feature_flags

```sql
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    is_kill_switch BOOLEAN NOT NULL DEFAULT false,
    user_segment TEXT,
    rollout_percentage REAL DEFAULT 100,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Domain 7: Audit & Compliance

#### audit_logs (partitioned by month)

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    actor_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    outcome TEXT NOT NULL DEFAULT 'success',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
```

`action` values: `user.created`, `user.suspended`, `user.deleted`, `user.role_changed`, `api_key.created`, `api_key.revoked`, `provider.created`, `provider.modified`, `provider_key.rotated`, `model.created`, `model.deprecated`, `credits.adjusted`, `settings.updated`, `admin.created`, `admin.role_changed`, `impersonation.started`, `impersonation.ended`.

---

### Domain 8: Admin Users & Roles

#### admin_users

```sql
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_superadmin BOOLEAN NOT NULL DEFAULT false,
    last_active_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_superadmin ON admin_users(is_superadmin);
```

`role` values: `superadmin`, `admin`, `moderator`, `support`, `analyst`.

#### admin_role_permissions

```sql
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_role_permissions (role, description, permissions, is_system_role) VALUES
    ('superadmin', 'Full system access', ARRAY['*'], true),
    ('admin', 'Administrative access', ARRAY['users.read', 'users.write', 'providers.read', 'providers.write', 'models.read', 'models.write', 'billing.read', 'billing.write', 'settings.read', 'settings.write', 'analytics.read', 'audit.read'], true),
    ('moderator', 'Content moderation', ARRAY['users.read', 'logs.read', 'audit.read'], true),
    ('support', 'Customer support', ARRAY['users.read', 'logs.read', 'billing.read', 'tickets.write'], true),
    ('analyst', 'Read-only analytics', ARRAY['users.read', 'analytics.read', 'audit.read', 'logs.read'], true)
ON CONFLICT (role) DO NOTHING;
```

Permission format: `resource.action` (e.g., `users.read`, `users.write`, `providers.delete`). Wildcard `*` grants all.

---

## 2. Admin API Endpoints

All endpoints are under the `/api/admin/` prefix and protected by `RequireAdmin` middleware. The permission column refers to the permission string required (checked via a middleware that validates against `admin_users.permissions` and `admin_role_permissions`).

### Dashboard

| Method | Path                            | Permission       | Description                                                                           |
| ------ | ------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/admin/dashboard`          | `analytics.read` | Aggregated platform stats (users, requests, revenue, active providers, system health) |
| GET    | `/api/admin/dashboard/realtime` | `analytics.read` | Real-time metrics (active users, requests/min, error rate, avg latency)               |

### Users

| Method | Path                                | Permission    | Description                                              |
| ------ | ----------------------------------- | ------------- | -------------------------------------------------------- |
| GET    | `/api/admin/users`                  | `users.read`  | List users with search, filter, pagination               |
| GET    | `/api/admin/users/{id}`             | `users.read`  | Get user profile + credits + stats                       |
| PUT    | `/api/admin/users/{id}`             | `users.write` | Update user (name, email, status, role, rate limit tier) |
| DELETE | `/api/admin/users/{id}`             | `users.write` | Soft-delete user                                         |
| POST   | `/api/admin/users/{id}/suspend`     | `users.write` | Suspend user with reason                                 |
| POST   | `/api/admin/users/{id}/unsuspend`   | `users.write` | Reactivate suspended user                                |
| PUT    | `/api/admin/users/{id}/role`        | `users.write` | Change user role                                         |
| PUT    | `/api/admin/users/{id}/rate-limit`  | `users.write` | Override rate limit tier                                 |
| POST   | `/api/admin/users/{id}/impersonate` | `users.write` | Generate impersonation token                             |
| GET    | `/api/admin/users/{id}/activity`    | `users.read`  | User activity timeline                                   |
| GET    | `/api/admin/users/{id}/keys`        | `users.read`  | List all keys for user                                   |
| GET    | `/api/admin/users/{id}/usage`       | `users.read`  | Usage breakdown per model                                |
| GET    | `/api/admin/users/export`           | `users.read`  | Export users CSV                                         |

### API Keys Oversight

| Method | Path                              | Permission    | Description                              |
| ------ | --------------------------------- | ------------- | ---------------------------------------- |
| GET    | `/api/admin/keys`                 | `users.read`  | List all keys globally with user context |
| GET    | `/api/admin/keys/{id}`            | `users.read`  | Key details                              |
| DELETE | `/api/admin/keys/{id}`            | `users.write` | Force-delete any key                     |
| POST   | `/api/admin/keys/{id}/revoke`     | `users.write` | Force-revoke any key                     |
| PUT    | `/api/admin/keys/{id}/rate-limit` | `users.write` | Override key rate limit tier             |
| GET    | `/api/admin/keys/expiring`        | `users.read`  | Keys expiring within N days              |

### Providers

| Method | Path                                            | Permission        | Description               |
| ------ | ----------------------------------------------- | ----------------- | ------------------------- |
| GET    | `/api/admin/providers`                          | `providers.read`  | List all providers        |
| POST   | `/api/admin/providers`                          | `providers.write` | Create provider           |
| GET    | `/api/admin/providers/{id}`                     | `providers.read`  | Get provider details      |
| PUT    | `/api/admin/providers/{id}`                     | `providers.write` | Update provider config    |
| DELETE | `/api/admin/providers/{id}`                     | `providers.write` | Disable provider          |
| POST   | `/api/admin/providers/{id}/test`                | `providers.write` | Run health check now      |
| GET    | `/api/admin/providers/{id}/keys`                | `providers.read`  | List provider keys        |
| POST   | `/api/admin/providers/{id}/keys`                | `providers.write` | Add provider key          |
| PUT    | `/api/admin/providers/{id}/keys/{keyId}`        | `providers.write` | Update key status/label   |
| POST   | `/api/admin/providers/{id}/keys/{keyId}/rotate` | `providers.write` | Rotate key                |
| DELETE | `/api/admin/providers/{id}/keys/{keyId}`        | `providers.write` | Remove key                |
| GET    | `/api/admin/providers/{id}/health`              | `providers.read`  | Health check history      |
| POST   | `/api/admin/providers/reorder`                  | `providers.write` | Reorder provider priority |
| GET    | `/api/admin/providers/maintenance`              | `providers.read`  | List maintenance windows  |
| POST   | `/api/admin/providers/maintenance`              | `providers.write` | Schedule maintenance      |

### Models

| Method | Path                                     | Permission     | Description                              |
| ------ | ---------------------------------------- | -------------- | ---------------------------------------- |
| GET    | `/api/admin/models`                      | `models.read`  | List model registry                      |
| POST   | `/api/admin/models`                      | `models.write` | Register new model                       |
| GET    | `/api/admin/models/{modelId}`            | `models.read`  | Get model details                        |
| PUT    | `/api/admin/models/{modelId}`            | `models.write` | Update model pricing/metadata            |
| POST   | `/api/admin/models/{modelId}/deprecate`  | `models.write` | Deprecate model                          |
| POST   | `/api/admin/models/{modelId}/sunset`     | `models.write` | Sunset model                             |
| POST   | `/api/admin/models/{modelId}/reactivate` | `models.write` | Reactivate deprecated model              |
| POST   | `/api/admin/models/bulk-import`          | `models.write` | Import models from provider capabilities |
| GET    | `/api/admin/models/aliases`              | `models.read`  | List aliases                             |
| POST   | `/api/admin/models/aliases`              | `models.write` | Create alias                             |
| PUT    | `/api/admin/models/aliases/{id}`         | `models.write` | Update alias                             |
| DELETE | `/api/admin/models/aliases/{id}`         | `models.write` | Delete alias                             |
| GET    | `/api/admin/models/routing-rules`        | `models.read`  | List routing rules                       |
| POST   | `/api/admin/models/routing-rules`        | `models.write` | Create routing rule                      |
| PUT    | `/api/admin/models/routing-rules/{id}`   | `models.write` | Update routing rule                      |
| DELETE | `/api/admin/models/routing-rules/{id}`   | `models.write` | Delete routing rule                      |

### Billing

| Method | Path                              | Permission      | Description                            |
| ------ | --------------------------------- | --------------- | -------------------------------------- |
| GET    | `/api/admin/billing/summary`      | `billing.read`  | Revenue summary (daily/weekly/monthly) |
| GET    | `/api/admin/billing/revenue`      | `billing.read`  | Revenue with time grouping             |
| GET    | `/api/admin/billing/transactions` | `billing.read`  | All credit transactions (paginated)    |
| POST   | `/api/admin/billing/adjust`       | `billing.write` | Manual credit adjustment               |
| GET    | `/api/admin/billing/adjustments`  | `billing.read`  | Adjustment history                     |
| GET    | `/api/admin/billing/top-spenders` | `billing.read`  | Top spenders by period                 |
| GET    | `/api/admin/billing/dashboard`    | `billing.read`  | MRR, ARPU, churn metrics               |

### Settings

| Method | Path                                | Permission       | Description                           |
| ------ | ----------------------------------- | ---------------- | ------------------------------------- |
| GET    | `/api/admin/settings`               | `settings.read`  | List system settings (secrets masked) |
| GET    | `/api/admin/settings/{category}`    | `settings.read`  | Get settings by category              |
| PUT    | `/api/admin/settings`               | `settings.write` | Update setting value                  |
| GET    | `/api/admin/settings/features`      | `settings.read`  | List feature flags                    |
| POST   | `/api/admin/settings/features`      | `settings.write` | Create feature flag                   |
| PUT    | `/api/admin/settings/features/{id}` | `settings.write` | Toggle/update feature flag            |
| DELETE | `/api/admin/settings/features/{id}` | `settings.write` | Remove feature flag                   |

### Logs

| Method | Path                         | Permission  | Description                                                           |
| ------ | ---------------------------- | ----------- | --------------------------------------------------------------------- |
| GET    | `/api/admin/logs`            | `logs.read` | Request logs with filters (model, status, user, provider, date range) |
| GET    | `/api/admin/logs/{id}`       | `logs.read` | Get log detail with request/response                                  |
| GET    | `/api/admin/logs/errors`     | `logs.read` | Error logs with aggregation                                           |
| GET    | `/api/admin/logs/ip-access`  | `logs.read` | IP access logs                                                        |
| GET    | `/api/admin/logs/suspicious` | `logs.read` | Suspicious activity flagged by rules                                  |

### Analytics

| Method | Path                             | Permission       | Description                   |
| ------ | -------------------------------- | ---------------- | ----------------------------- |
| GET    | `/api/admin/analytics/overview`  | `analytics.read` | Aggregated platform analytics |
| GET    | `/api/admin/analytics/users`     | `analytics.read` | Per-user analytics            |
| GET    | `/api/admin/analytics/models`    | `analytics.read` | Per-model usage breakdown     |
| GET    | `/api/admin/analytics/providers` | `analytics.read` | Per-provider usage and cost   |
| GET    | `/api/admin/analytics/errors`    | `analytics.read` | Error rate breakdown          |
| GET    | `/api/admin/analytics/trends`    | `analytics.read` | Time-series trends            |

### Audit Trail

| Method | Path                      | Permission   | Description                     |
| ------ | ------------------------- | ------------ | ------------------------------- |
| GET    | `/api/admin/audit`        | `audit.read` | List audit log entries          |
| GET    | `/api/admin/audit/export` | `audit.read` | Export audit log as CSV/JSON    |
| GET    | `/api/admin/audit/stats`  | `audit.read` | Audit statistics by action type |

### Admin Management

| Method | Path                             | Permission       | Description                   |
| ------ | -------------------------------- | ---------------- | ----------------------------- |
| GET    | `/api/admin/admins`              | `settings.read`  | List admin users              |
| POST   | `/api/admin/admins`              | `settings.write` | Grant admin role to user      |
| PUT    | `/api/admin/admins/{id}`         | `settings.write` | Modify admin role/permissions |
| DELETE | `/api/admin/admins/{id}`         | `settings.write` | Remove admin access           |
| GET    | `/api/admin/admins/roles`        | `settings.read`  | List role definitions         |
| PUT    | `/api/admin/admins/roles/{role}` | `settings.write` | Update role permissions       |

### Security

| Method | Path                                | Permission       | Description                   |
| ------ | ----------------------------------- | ---------------- | ----------------------------- |
| GET    | `/api/admin/security/suspicious`    | `audit.read`     | Suspicious activity dashboard |
| POST   | `/api/admin/security/impersonate`   | `settings.write` | Start impersonation session   |
| DELETE | `/api/admin/security/impersonate`   | `settings.write` | End impersonation             |
| GET    | `/api/admin/security/dashboard`     | `analytics.read` | Security metrics dashboard    |
| GET    | `/api/admin/security/ip-lists`      | `settings.read`  | List IP allow/block lists     |
| POST   | `/api/admin/security/ip-lists`      | `settings.write` | Create IP list                |
| PUT    | `/api/admin/security/ip-lists/{id}` | `settings.write` | Update IP list                |
| DELETE | `/api/admin/security/ip-lists/{id}` | `settings.write` | Delete IP list                |

### Cost Intelligence

| Method | Path                            | Permission       | Description                           |
| ------ | ------------------------------- | ---------------- | ------------------------------------- |
| GET    | `/api/admin/cost/optimizations` | `analytics.read` | Cost optimization suggestions         |
| GET    | `/api/admin/cost/forecast`      | `analytics.read` | Cost projection for next N days       |
| GET    | `/api/admin/cost/breakdown`     | `analytics.read` | Cost breakdown by user/model/provider |
| GET    | `/api/admin/cost/ab-tests`      | `analytics.read` | A/B test result summaries             |
| POST   | `/api/admin/cost/ab-tests`      | `settings.write` | Create A/B test                       |
| GET    | `/api/admin/cost/benchmarks`    | `analytics.read` | Provider benchmark comparisons        |

### Operations

| Method | Path                                            | Permission       | Description                    |
| ------ | ----------------------------------------------- | ---------------- | ------------------------------ |
| POST   | `/api/admin/operations/cache/flush`             | `settings.write` | Flush LLM response cache       |
| GET    | `/api/admin/operations/webhook-logs`            | `logs.read`      | Webhook delivery logs          |
| POST   | `/api/admin/operations/webhook-logs/{id}/retry` | `settings.write` | Retry webhook delivery         |
| GET    | `/api/admin/operations/traces`                  | `logs.read`      | Request traces (OpenTelemetry) |
| GET    | `/api/admin/operations/conversations`           | `logs.read`      | Browse conversations           |
| GET    | `/api/admin/operations/files`                   | `logs.read`      | Uploaded files overview        |

### Bulk Operations

| Method | Path                          | Permission    | Description                 |
| ------ | ----------------------------- | ------------- | --------------------------- |
| POST   | `/api/admin/bulk/suspend`     | `users.write` | Bulk suspend users          |
| POST   | `/api/admin/bulk/activate`    | `users.write` | Bulk activate users         |
| POST   | `/api/admin/bulk/assign-tier` | `users.write` | Bulk assign rate limit tier |
| POST   | `/api/admin/bulk/import-csv`  | `users.write` | Bulk import users via CSV   |
| GET    | `/api/admin/bulk/jobs/{id}`   | `users.read`  | Check bulk job status       |

### Organizations Oversight

| Method | Path                                    | Permission    | Description                     |
| ------ | --------------------------------------- | ------------- | ------------------------------- |
| GET    | `/api/admin/organizations`              | `users.read`  | List all organizations          |
| GET    | `/api/admin/organizations/{id}`         | `users.read`  | Organization details            |
| PUT    | `/api/admin/organizations/{id}`         | `users.write` | Update organization plan/status |
| GET    | `/api/admin/organizations/{id}/members` | `users.read`  | Organization members            |
| POST   | `/api/admin/organizations/{id}/members` | `users.write` | Add member to org               |

### Announcements

| Method | Path                                    | Permission       | Description          |
| ------ | --------------------------------------- | ---------------- | -------------------- |
| GET    | `/api/admin/announcements`              | `settings.read`  | List announcements   |
| POST   | `/api/admin/announcements`              | `settings.write` | Create announcement  |
| PUT    | `/api/admin/announcements/{id}`         | `settings.write` | Update announcement  |
| DELETE | `/api/admin/announcements/{id}`         | `settings.write` | Delete announcement  |
| POST   | `/api/admin/announcements/{id}/publish` | `settings.write` | Publish announcement |

### Promo Codes

| Method | Path                                      | Permission      | Description        |
| ------ | ----------------------------------------- | --------------- | ------------------ |
| GET    | `/api/admin/promo-codes`                  | `billing.read`  | List promo codes   |
| POST   | `/api/admin/promo-codes`                  | `billing.write` | Create promo code  |
| PUT    | `/api/admin/promo-codes/{id}`             | `billing.write` | Update promo code  |
| DELETE | `/api/admin/promo-codes/{id}`             | `billing.write` | Delete promo code  |
| GET    | `/api/admin/promo-codes/{id}/redemptions` | `billing.read`  | Redemption history |

### SSO Management

| Method | Path                            | Permission       | Description            |
| ------ | ------------------------------- | ---------------- | ---------------------- |
| GET    | `/api/admin/sso/providers`      | `settings.read`  | List SSO providers     |
| POST   | `/api/admin/sso/providers`      | `settings.write` | Configure SSO provider |
| PUT    | `/api/admin/sso/providers/{id}` | `settings.write` | Update SSO config      |
| DELETE | `/api/admin/sso/providers/{id}` | `settings.write` | Remove SSO provider    |

### Scheduled Reports

| Method | Path                               | Permission       | Description             |
| ------ | ---------------------------------- | ---------------- | ----------------------- |
| GET    | `/api/admin/reports`               | `settings.read`  | List scheduled reports  |
| POST   | `/api/admin/reports`               | `settings.write` | Create scheduled report |
| PUT    | `/api/admin/reports/{id}`          | `settings.write` | Update report schedule  |
| DELETE | `/api/admin/reports/{id}`          | `settings.write` | Delete report           |
| POST   | `/api/admin/reports/{id}/send-now` | `settings.write` | Trigger manual send     |

### API Changelog

| Method | Path                                | Permission       | Description             |
| ------ | ----------------------------------- | ---------------- | ----------------------- |
| GET    | `/api/admin/changelog`              | `settings.read`  | List changelog entries  |
| POST   | `/api/admin/changelog`              | `settings.write` | Create changelog entry  |
| PUT    | `/api/admin/changelog/{id}`         | `settings.write` | Update changelog        |
| DELETE | `/api/admin/changelog/{id}`         | `settings.write` | Delete changelog        |
| POST   | `/api/admin/changelog/{id}/publish` | `settings.write` | Publish changelog entry |

---

## 3. Frontend Structure

### Route Tree

The admin panel lives under `/app/admin/` with a dedicated layout that checks admin role and renders the admin sidebar.

```
app/admin/
  layout.tsx                    # AdminLayout - role check + sidebar shell
  page.tsx                      # Admin Dashboard (redirect to /admin/dashboard)
  loading.tsx                   # Admin loading skeleton

  dashboard/
    page.tsx                    # Main admin dashboard - stats overview
    components/
      StatsGrid.tsx             # 6-card stats grid (users, requests, revenue, errors, latency, providers)
      RealtimeMetrics.tsx       # Live metrics pane with auto-refresh
      ProviderHealthCard.tsx    # Provider health overview
      QuickActions.tsx          # Common admin action shortcuts
      SystemHealthBanner.tsx    # Degraded system alerts

  users/
    page.tsx                    # User list with search, filter, pagination
    components/
      UserTable.tsx             # Paginated data table with sortable columns
      UserFilters.tsx           # Search + status/role/date filter bar
      UserDetailSheet.tsx       # Slideover panel for user details
      UserActivityTimeline.tsx  # Activity history feed
      UserUsageChart.tsx        # Usage chart per user
      UserActions.tsx           # Suspend/activate/impersonate buttons
      BulkActions.tsx           # Bulk operation toolbar
    [id]/
      page.tsx                  # Single user detail page
      components/
        UserProfile.tsx         # Profile information card
        UserCreditsCard.tsx     # Credits balance + adjustment form
        UserAPIKeys.tsx         # API keys table for user
        UserUsageBreakdown.tsx  # Per-model usage breakdown
        UserActivityLog.tsx     # Audit log for this user

  providers/
    page.tsx                    # Provider management list
    components/
      ProviderCard.tsx          # Provider status card with health indicator
      ProviderForm.tsx          # Create/edit provider form
      ProviderKeyManager.tsx    # API key management for provider
      KeyRotationDialog.tsx     # Key rotation modal
      ProviderHealthChart.tsx   # Health check history chart
      MaintenanceCalendar.tsx   # Maintenance window schedule
    [id]/
      page.tsx                  # Single provider detail

  models/
    page.tsx                    # Model registry
    components/
      ModelTable.tsx            # Models data table
      ModelForm.tsx             # Create/edit model form
      ModelStatusBadge.tsx      # Status lifecycle badge
      AliasManager.tsx          # Alias CRUD interface
      RoutingRulesEditor.tsx    # Routing rules configuration
      BulkImportDialog.tsx      # Bulk model import modal

  billing/
    page.tsx                    # Billing overview
    components/
      RevenueChart.tsx          # Revenue over time
      TransactionTable.tsx      # Paginated transactions
      TopSpendersTable.tsx      # Top spenders list
      CreditAdjustmentForm.tsx  # Manual adjustment form
      MRRCard.tsx               # Monthly recurring revenue card
      ARPUCard.tsx              # Average revenue per user card

  settings/
    page.tsx                    # System settings
    components/
      SettingsCategory.tsx      # Settings by category accordion
      SettingEditor.tsx         # Inline setting value editor
      FeatureFlagToggle.tsx     # Feature flag switch
      FeatureFlagForm.tsx       # Create/edit feature flag
      SecretsWarning.tsx        # Warning banner for secret fields

  logs/
    page.tsx                    # Request logs explorer
    components/
      LogTable.tsx              # Log entries table
      LogFilters.tsx            # Multi-faceted filter bar
      LogDetail.tsx             # Request/response detail expandable
      ErrorBreakdown.tsx        # Error type pie chart
      LogExport.tsx             # Export controls

  analytics/
    page.tsx                    # Analytics dashboard
    components/
      TimeSeriesChart.tsx       # Configurable time series
      ModelBreakdown.tsx        # Per-model usage bar chart
      ProviderComparison.tsx    # Provider cost/comparison chart
      UserAnalyticsTable.tsx    # Per-user analytics table
      DateRangePicker.tsx       # Date range selector
      ExportButton.tsx          # Export analytics data

  audit/
    page.tsx                    # Audit trail browser
    components/
      AuditTable.tsx            # Audit log entries
      AuditFilters.tsx          # Filter by action/resource/actor/date
      AuditDetail.tsx           # Expanded entry detail
      AuditExport.tsx           # Export controls

  security/
    page.tsx                    # Security dashboard
    components/
      SuspiciousActivityFeed.tsx # Flagged activity
      IPListManager.tsx         # IP allow/block list management
      FailedAuthChart.tsx       # Failed authentication chart
      ImpersonationBanner.tsx   # Active impersonation warning
      RateLimitBreaches.tsx     # Rate limit breach log

  admins/
    page.tsx                    # Admin user management
    components/
      AdminTable.tsx            # Admin list
      AdminForm.tsx             # Grant/modify admin access
      RoleEditor.tsx            # Role permission editor

  cost/
    page.tsx                    # Cost intelligence dashboard
    components/
      CostOptimizationCard.tsx  # Optimization suggestion
      ForecastChart.tsx         # Cost projection
      CostBreakdownChart.tsx    # Breakdown by dimension
      ABTestResults.tsx         # A/B test comparison
      BenchmarkTable.tsx        # Provider benchmarks

  operations/
    page.tsx                    # Operations center
    components/
      CacheControl.tsx          # Cache flush controls
      WebhookLogTable.tsx       # Webhook delivery log
      TraceViewer.tsx           # Trace viewer
      ConversationBrowser.tsx   # Conversation browser
      FileBrowser.tsx           # Uploaded files

  announcements/
    page.tsx                    # Announcement management
    components/
      AnnouncementList.tsx      # Announcement list
      AnnouncementEditor.tsx    # Create/edit announcement

  promo-codes/
    page.tsx                    # Promo code management
    components/
      PromoCodeTable.tsx        # Promo code list
      PromoCodeForm.tsx         # Create/edit form
      RedemptionTable.tsx       # Redemption history

  sso/
    page.tsx                    # SSO configuration
    components/
      SSOProviderList.tsx       # Configured providers
      SSOConfigForm.tsx         # Provider config form

  reports/
    page.tsx                    # Scheduled reports
    components/
      ReportList.tsx            # Scheduled report list
      ReportForm.tsx            # Create/edit form

  changelog/
    page.tsx                    # API changelog
    components/
      ChangelogList.tsx         # Changelog entries
      ChangelogEditor.tsx       # Create/edit entry
```

### Sidebar Navigation Structure

The admin sidebar is a dedicated component rendered by `AdminLayout`. It replaces the standard dashboard sidebar when the user is in the `/admin` route.

```
Admin Sidebar
  Logo (same as dashboard)

  Overview
    [Dashboard]          /admin/dashboard
    [Analytics]          /admin/analytics
    [Cost Intelligence]  /admin/cost

  Management
    [Users]              /admin/users
    [Providers]          /admin/providers
    [Models]             /admin/models
    [API Keys]           /admin/keys (separate from user section)

  Financial
    [Billing]            /admin/billing
    [Promo Codes]        /admin/promo-codes

  Monitoring
    [Logs]               /admin/logs
    [Operations]         /admin/operations
    [Audit Trail]        /admin/audit

  Configuration
    [Settings]           /admin/settings
    [Security]           /admin/security
    [SSO]                /admin/sso

  Content
    [Announcements]      /admin/announcements
    [Changelog]          /admin/changelog
    [Reports]            /admin/reports

  Admin
    [Admin Users]        /admin/admins
```

### Component Tree

```
AdminLayout (app/admin/layout.tsx)
  |-- auth() session check (server component)
  |-- redirect if not admin
  |-- AdminSidebar (client component)
  |     |-- Logo
  |     |-- SearchInput (global admin search)
  |     |-- NavSection (repeated for each section above)
  |     |     |-- NavItem (href, icon, label, badge)
  |     |-- UserMenu (current admin avatar, sign out)
  |-- AdminBreadcrumb
  |-- children (page content)
```

### Shared Components

Located in `components/admin/` for reuse across admin pages:

| File                  | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `DataTable.tsx`       | Generic paginated, sortable, filterable table with column config |
| `StatCard.tsx`        | Metric display card with icon, label, value, trend indicator     |
| `SearchBar.tsx`       | Debounced search input with submit hotkey                        |
| `FilterBar.tsx`       | Horizontal filter pill bar compatible with URL state             |
| `ConfirmDialog.tsx`   | Reusable confirmation modal                                      |
| `EmptyState.tsx`      | Empty state placeholder with illustration and CTA                |
| `ErrorBoundary.tsx`   | Client error boundary with retry                                 |
| `PageHeader.tsx`      | Page title + breadcrumb + action buttons                         |
| `Tabs.tsx`            | Tab navigation with URL-synced active state                      |
| `SidePanel.tsx`       | Slideover panel for detail views                                 |
| `DateRangePicker.tsx` | Date range selector                                              |
| `ExportMenu.tsx`      | CSV/JSON export dropdown                                         |
| `ActivityFeed.tsx`    | Timeline-style activity feed component                           |
| `StatusBadge.tsx`     | Colored status indicator (success, warning, error, info)         |

### AdminSDK

A dedicated `AdminSDK` class in `lib/api/admin-sdk.ts` wraps all admin API endpoints with typed methods. It extends the pattern established by `DraSDK` in `lib/api/sdk.ts`.

```typescript
// lib/api/admin-sdk.ts
class AdminSDK {
  private baseUrl = "/api/admin";

  // Dashboard
  async getDashboard(): Promise<AdminDashboardData> { ... }
  async getRealtimeMetrics(): Promise<RealtimeMetrics> { ... }

  // Users
  async listUsers(params: AdminUserQuery): Promise<PaginatedResult<AdminUser>> { ... }
  async getUser(id: string): Promise<AdminUserDetail> { ... }
  async updateUser(id: string, data: UpdateUserPayload): Promise<void> { ... }
  async suspendUser(id: string, reason: string): Promise<void> { ... }
  async activateUser(id: string): Promise<void> { ... }
  async impersonateUser(id: string): Promise<string> { ... }
  async exportUsers(): Promise<Blob> { ... }

  // Providers
  async listProviders(): Promise<Provider[]> { ... }
  async createProvider(data: CreateProviderPayload): Promise<Provider> { ... }
  async testProvider(id: string): Promise<HealthCheckResult> { ... }
  async rotateKey(providerId: string, keyId: string): Promise<void> { ... }

  // ... all other admin API methods
}
```

Admin pages use `useQuery`/`useMutation` from `@tanstack/react-query` wrapping `AdminSDK` methods, following the hook pattern in `lib/api/hooks.ts`.

---

## 4. Backend Implementation

### File Structure

```
apps/backend/
  internal/
    admin/
      handler/             # HTTP handlers for admin endpoints
        dashboard.go       # Dashboard endpoints
        users.go           # User management endpoints
        providers.go       # Provider management endpoints
        models.go          # Model registry endpoints
        billing.go         # Billing/adjustment endpoints
        settings.go        # System settings + feature flags
        logs.go            # Log exploration endpoints
        analytics.go       # Analytics endpoints
        audit.go           # Audit trail endpoints
        admins.go          # Admin user management
        security.go        # Security endpoints
        cost.go            # Cost intelligence endpoints
        operations.go      # Operations endpoints
        bulk.go            # Bulk operation endpoints
        announcements.go   # Announcement endpoints
        promo.go           # Promo code endpoints
        sso.go             # SSO management
        reports.go         # Scheduled reports
        changelog.go       # Changelog endpoints

      service/             # Business logic layer
        admin_dashboard.go
        admin_users.go
        admin_providers.go
        admin_models.go
        admin_billing.go
        admin_settings.go
        admin_logs.go
        admin_analytics.go
        admin_audit.go
        admin_admins.go
        admin_security.go
        admin_cost.go
        admin_operations.go
        admin_bulk.go
        admin_announcements.go
        admin_promo.go
        admin_sso.go
        admin_reports.go
        admin_changelog.go

      repository/          # Data access layer
        admin_user_repo.go
        admin_provider_repo.go
        admin_model_repo.go
        admin_billing_repo.go
        admin_settings_repo.go
        admin_log_repo.go
        admin_analytics_repo.go
        admin_audit_repo.go
        admin_security_repo.go
        admin_operations_repo.go
        admin_promo_repo.go
        admin_announcements_repo.go
        admin_reports_repo.go
        admin_changelog_repo.go

      domain/              # Admin-specific domain models
        admin_models.go
    middleware/
      admin.go             # Permission-checking middleware
```

### Wiring in main.go

The admin handler group is registered as follows, using the existing `authMW`, `RequireAdmin`, and a new `RequirePermission` middleware:

```go
// Admin handler setup
adminHandlers := adminhandler.New(
    cfg, database, adminUserSvc, adminProviderSvc,
    adminModelSvc, adminBillingSvc, adminSettingsSvc,
    adminLogSvc, adminAnalyticsSvc, adminAuditSvc,
    adminSecuritySvc, adminCostSvc, adminOperationsSvc,
)

// Admin routes group
r.Group(func(r chi.Router) {
    r.Use(authMW)
    r.Use(appmiddleware.RequireAdmin)
    r.Use(adminmiddleware.RequirePermission(adminHandlers.PermissionRepo()))

    // Dashboard
    r.Get("/api/admin/dashboard", adminHandlers.GetDashboard)
    r.Get("/api/admin/dashboard/realtime", adminHandlers.GetRealtimeMetrics)

    // Users
    r.Get("/api/admin/users", adminHandlers.ListUsers)
    r.Get("/api/admin/users/{id}", adminHandlers.GetUser)
    r.Put("/api/admin/users/{id}", adminHandlers.UpdateUser)
    r.Delete("/api/admin/users/{id}", adminHandlers.DeleteUser)
    r.Post("/api/admin/users/{id}/suspend", adminHandlers.SuspendUser)
    r.Post("/api/admin/users/{id}/unsuspend", adminHandlers.ActivateUser)
    r.Put("/api/admin/users/{id}/role", adminHandlers.ChangeUserRole)
    r.Put("/api/admin/users/{id}/rate-limit", adminHandlers.OverrideRateLimit)
    r.Post("/api/admin/users/{id}/impersonate", adminHandlers.ImpersonateUser)
    r.Get("/api/admin/users/{id}/activity", adminHandlers.UserActivity)
    r.Get("/api/admin/users/{id}/keys", adminHandlers.UserKeys)
    r.Get("/api/admin/users/{id}/usage", adminHandlers.UserUsage)
    r.Get("/api/admin/users/export", adminHandlers.ExportUsers)

    // Remaining admin routes...
})
```

### Permission Middleware

```go
package adminmiddleware

func RequirePermission(permRepo *adminrepository.PermissionRepo) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            adminUser := GetAdminUser(r)
            if adminUser == nil {
                response.Error(w, 403, "Admin access required")
                return
            }
            if adminUser.IsSuperadmin {
                next.ServeHTTP(w, r)
                return
            }
            requiredPerm := RoutePermission(r.Method, r.URL.Path)
            if !hasPermission(adminUser.Permissions, requiredPerm) {
                response.Error(w, 403, "Insufficient permissions")
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

---

## 5. Audit Trail Strategy

Every write operation in the admin panel generates an audit log entry via a centralized `AuditService`. The service captures actor identity, action type, resource references, changed fields, IP address, and outcome.

```go
type AuditEntry struct {
    ActorID      string
    ActorEmail   string
    Action       string   // "user.suspended", "provider.created"
    ResourceType string   // "users", "providers", "api_keys"
    ResourceID   string
    Changes      map[string]Change // field-level diff
    IPAddress    string
    Severity     string   // "info", "warning", "critical"
    Outcome      string   // "success", "failure"
}
```

All admin service methods call `auditSvc.Log(ctx, entry)` before returning. This is a fire-and-forget operation using a buffered channel to avoid adding latency to admin operations.

Field-level change tracking uses a `diff` utility:

```go
type Change struct {
    Old interface{} `json:"old,omitempty"`
    New interface{} `json:"new"`
}
```

---

## 6. Key Design Decisions

1. **Dedicated admin handler package** vs extending the existing Handler struct: A separate `internal/admin/handler/` package avoids bloating the existing 800+ line handler.go and keeps admin concerns isolated. Admin handlers receive their own service and repository dependencies rather than sharing the entire Handler struct.

2. **Partitioned time-series tables**: Tables like `usage_records`, `audit_logs`, and `request_errors` use PostgreSQL partitioning by month. This keeps query performance predictable as these tables grow to hundreds of millions of rows. Queries against recent data scan only the relevant partition.

3. **Permission model separate from role**: The `admin_users` table stores a `permissions` array per user, while `admin_role_permissions` defines defaults per role. Users can have additional permissions beyond their role (additive model). Superadmins bypass all permission checks.

4. **Audit service as a cross-cutting concern**: Rather than embedding audit logic in each handler, a dedicated `AuditService` is injected into admin service constructors. Write operations call `auditSvc.Log()` as a side effect. This keeps audit logic centralized and testable.

5. **AdminSDK as a separate class**: Rather than extending `DraSDK`, admin endpoints get their own `AdminSDK` class. This keeps the user-facing SDK lean and avoids exposing admin operations to non-admin frontend code.

6. **URL-driven filter state**: All list pages use URL search params for filter/pagination state, following the existing pattern in the dashboard. This makes filter states shareable via URL and supports browser back/forward navigation.

7. **Impersonation via dedicated JWT**: When an admin impersonates a user, the backend issues a short-lived (15-minute) JWT with an `impersonating` claim. The frontend stores this and includes it in API calls. The existing auth middleware checks for this claim and substitutes the admin's identity with the impersonated user's identity for the duration of the session. All impersonated actions are logged to the audit trail with both actor and target identities.

8. **Cost intelligence as a separate domain**: Rather than burying cost analytics in the general analytics module, a dedicated cost intelligence section provides optimization suggestions, forecasts, and breakdowns. This keeps the analytics module focused on operational metrics while cost-specific queries (which are more complex and join-heavy) are isolated.

9. **Bulk operations via async jobs**: Bulk suspend/activate/tier-assignment operations create a background job record and return immediately. A worker processes the job asynchronously. The frontend polls for job completion status. This prevents timeouts when operating on thousands of users simultaneously.

10. **Changelog and announcements as managed content**: Rather than hardcoding platform announcements, the admin panel stores them in the database. Announcements can be targeted to user segments. Changelog entries are version-tracked and published on specific dates, allowing admins to prepare changelog entries in advance and schedule their publication.

---

## 7. Build Sequence

The implementation is ordered by dependency, with each phase producing testable output before the next begins.

### Phase 1: Database

1. Write complete migration SQL with all 20+ tables, enhanced columns, indexes, partitions, and seed data
2. Write migration rollback SQL
3. Test migration locally against Postgres

### Phase 2: Domain Models

4. Define Go structs for all admin-specific domain models
5. Define request/response DTOs
6. Define admin-specific error types

### Phase 3: Repository Layer

7. Implement all admin repository files (one per domain area)
8. Write unit tests for each repository method

### Phase 4: Service Layer

9. Implement admin service files
10. Wire audit service into every write operation
11. Write service unit tests with mocked repositories

### Phase 5: Handler Layer

12. Implement admin HTTP handlers
13. Wire response helpers
14. Write handler integration tests

### Phase 6: Middleware

15. Implement permission-checking middleware
16. Wire into router group in main.go

### Phase 7: Main Wiring

17. Register all admin routes in main.go
18. Register permission mapping for each route

### Phase 8: Frontend Types

19. Define TypeScript interfaces matching Go response DTOs

### Phase 9: AdminSDK

20. Implement AdminSDK class wrapping all admin endpoints

### Phase 10: Hooks

21. Implement React Query hooks for each admin domain
22. Include query key factories and mutation invalidations

### Phase 11: Shared Components

23. Implement DataTable with sort, filter, pagination, column customization
24. Implement StatCard, SearchBar, FilterBar, ConfirmDialog, EmptyState
25. Implement PageHeader, SidePanel, DateRangePicker, ExportMenu
26. Implement ActivityFeed, StatusBadge, ErrorBoundary

### Phase 12: Layout

27. Implement AdminLayout with server-side role check
28. Implement AdminSidebar with all navigation sections
29. Implement AdminBreadcrumb

### Phase 13: Page Components

30. Implement dashboard overview page and components
31. Implement users list, detail, and action pages
32. Implement providers management pages
33. Implement models registry pages
34. Implement billing and analytics pages
35. Implement settings, logs, audit pages
36. Implement security, admin management pages
37. Implement cost intelligence page
38. Implement operations center
39. Implement announcements, promo codes, SSO, reports, changelog pages

### Phase 14: Testing

40. Backend: full test coverage for admin repository, service, and handler layers
41. Frontend: Vitest tests for AdminSDK, hooks, and utility functions
42. Integration: end-to-end admin flow tests

### Phase 15: Documentation

43. Update AGENTS.md with admin endpoint reference
44. Add admin setup instructions to README
45. Document permission model for admin user roles

---

## 8. Security & Compliance

### 8.1 Impersonation System

Admins can log in as any user for debugging/support:

1. Admin clicks "Login as User" → POST `/api/admin/users/{id}/impersonate`
2. Backend creates `admin_impersonations` record with admin_id, target_user_id, reason
3. Returns a short-lived JWT (15 min) scoped to the target user with `impersonating: true` claim
4. Frontend sets this JWT as session → page reloads as target user
5. Persistent yellow banner: "Viewing as John Doe — [Stop Impersonation]"
6. Every action during impersonation logs to audit trail with both admin + target IDs
7. `POST /api/admin/impersonations/{id}/stop` ends the session

**Audit trail entries:**

```json
{
  "action": "impersonation.action",
  "actor_id": "admin-uuid",
  "target_id": "user-uuid",
  "changes": {
    "impersonation_id": "uuid",
    "endpoint": "/api/chat",
    "method": "POST"
  }
}
```

### 8.2 Suspicious Activity Detection

Background worker (runs every 5 min) detects patterns:

| Pattern           | Detection Logic                           | Severity |
| ----------------- | ----------------------------------------- | -------- |
| Geo Anomaly       | Same key from 3+ countries in 60 min      | high     |
| Impossible Travel | Requests from >1000km apart within 30 min | high     |
| Brute Force       | 10+ failed auth attempts in 1 min         | medium   |
| Unusual Volume    | 10x normal request count in 1 hour        | medium   |
| API Key Leak      | Key used from unexpected datacenter IP    | critical |

Admin view: `/admin/security/suspicious` — queue with severity badges, review/block/dismiss actions.

### 8.3 IP Management

IP lists with CIDR support, per-scope (global/user/key/provider):

- `POST /api/admin/ip` — Add IP with action (allow/block/challenge/rate_limit)
- Auto-blocking: repeat offenders get auto-added to block list
- GeoIP enrichment: country, city, ISP, proxy/VPN/Tor detection
- Risk scoring: 0.00–1.00 based on IP reputation

### 8.4 GDPR/Compliance

- `POST /api/admin/users/{id}/export-data` — Gather all user data (profile, keys, usage, billing, logs)
- Returns download link to JSON export
- `DELETE /api/admin/users/{id}` — Soft delete (anonymize email, clear PII, preserve referential integrity)

---

## 9. Provider Key Strategy

### 9.1 Round-Robin (Existing)

`MultiKeyProvider` at `pkg/llm/provider/multikey.go` uses weighted round-robin across keys.

### 9.2 Fill-First (New)

Strategy: key1 (active) → exhaust quota → key2 (active) → exhaust → key3

```go
type FillFirstProvider struct {
    name      string
    instances []KeyInstance
    current   int32  // atomic index of current active key
}

func (f *FillFirstProvider) nextInstance() *KeyInstance {
    idx := atomic.LoadInt32(&f.current)
    if idx >= int32(len(f.instances)) {
        return nil
    }
    return &f.instances[idx]
}

func (f *FillFirstProvider) advanceToNext() {
    atomic.AddInt32(&f.current, 1)
}
```

Admin UI shows progress bars per key: `Key 1: ████████░░ 80%`

### 9.3 Weighted (Existing)

`WeightedRoundRobinBalancer` at `pkg/llm/provider/balancer.go`.

### 9.4 Latency-Optimized (New)

Track `avg_latency_ms` per key (EMA). Select key with lowest latency. Re-evaluate every 5 min.

### 9.5 Quota-Aware (New)

Track `monthly_token_quota` and `total_tokens` per key. Select key with highest remaining quota %.

---

## 10. Cost Intelligence

### 10.1 Cost Optimization Engine

Scheduled worker analyzes usage and generates suggestions:

| Type            | Example                                                             | Avg Savings |
| --------------- | ------------------------------------------------------------------- | ----------- |
| Model Downgrade | "User X spent $50 on GPT-4o, 80% of requests work with GPT-4o-mini" | ~75%        |
| Provider Switch | "Provider B offers same model at 60% lower cost"                    | ~40%        |
| Cache Enable    | "40% of requests repeated — enabling cache saves $X/month"          | ~30%        |
| Batch Eligible  | "10K+ requests/day — batch API is 50% cheaper"                      | ~50%        |

### 10.2 Usage Forecasting

Linear regression on `usage_daily` aggregates. Predicts next month's cost with 80% CI.

### 10.3 A/B Testing

Route X% traffic to provider A, Y% to B. Compare latency/cost/error rate. Auto-declare winner.

### 10.4 Model Benchmarking

UI at `/admin/benchmarks`: enter prompt, select models, compare latency/cost/output side-by-side.

---

## 11. Operations & Debugging

### 11.1 Request Trace Tool

Search by request ID → waterfall visualization:

```
Client IP → Auth (JWT) → Rate Limit → Model Resolve →
Provider Route → Key Select → API Call → Billing
```

Each hop shows duration_ms and result.

### 11.2 Cache Management

View hit rates per provider/model. Selective clear. Stats: entry count, size, 7-day trend.

### 11.3 Webhook Inspector

Delivery history with payload viewer. Retry failed. Test endpoint.

### 11.4 Conversation Inspector

Read-only view of any user's conversations. Audit-logged.

---

## 12. Additional Features

### 12.1 Announcement System

- In-app banners + optional email blast
- Priority levels: info/warning/critical
- Targeting: all users, tier, specific users, orgs
- Schedule publish + auto-expire

### 12.2 Promo Codes

Three types: percentage discount, fixed credits, free trial. Track redemptions, usage limits, expiration.

### 12.3 SSO Management

Configure SAML/OIDC/Google Workspace/Azure AD/Okta. Domain auto-provisioning with default role + tier.

### 12.4 User Groups

Groups with policy controls (independent of orgs):

```
Group "Internal Beta" → rpm=500, tpm=500000
Group "Partners" → model_access = ["gpt-4", "claude-3"]
```

### 12.5 Scheduled Reports

Daily/weekly/monthly CSV/JSON/PDF. Auto-emailed. Sections: user_summary, cost_breakdown, provider_health, error_rates.

### 12.6 API Changelog

Draft → review → publish workflow. Types: new/change/deprecation/fix/breaking. Public at `/changelog`.

---

## 13. Performance & Scalability

### 13.1 Partition Strategy

| Table                   | Partition Key | Retention   |
| ----------------------- | ------------- | ----------- |
| usage_records           | monthly       | 90 days raw |
| audit_logs              | monthly       | 1 year      |
| ip_access_logs          | monthly       | 30 days     |
| provider_key_usage_logs | monthly       | 90 days     |

### 13.2 Daily Aggregates

`usage_daily` pre-computes counts, tokens, cost, latency percentiles. Dashboard queries < 50ms.

### 13.3 Caching Strategy

Dashboard stats: 60s TTL. Provider health: 30s. Models/settings/tiers: 5 min.

### 13.4 Data Retention

Raw logs: 90 days. Aggregates: 2 years. Audit: 1 year. Auto-cleanup via pg_cron.

---

## 14. Admin UI Component Tree (Detailed)

```
AdminLayout
├── AdminAuthGuard (server-side role check)
├── AdminSidebar
│   ├── NavSection "Overview" → Dashboard, Analytics
│   ├── NavSection "Management" → Users, API Keys, Providers, Models, Rate Tiers
│   ├── NavSection "Financial" → Billing, Cost Intelligence, Promo Codes
│   ├── NavSection "Security" → Security Dashboard, IP Lists, Audit Trail
│   ├── NavSection "Monitoring" → Logs, Errors, Traces, Webhooks
│   ├── NavSection "Operations" → Cache, Conversations, Files, Batch Jobs
│   ├── NavSection "Content" → Announcements, Changelog, Scheduled Reports
│   └── NavSection "Admin" → Admins, Settings, Feature Flags, SSO, Groups
├── AdminTopBar → Breadcrumbs, Search (Cmd+K), Quick Actions, Profile
├── ImpersonationBanner (conditional yellow bar)
└── Page content → PageHeader + FilterBar + Content (DataTable/Charts/DetailPanels)
```

---

## 15. Error Handling Strategy

### Backend

- Standard `response.Body{Success, Error}` envelope
- `RequireAdmin` → 401 (no auth) / 403 (not admin)
- `RequirePermission` → 403 (insufficient permissions)
- All errors logged with request_id, actor_id, action via slog

### Frontend

- `AdminSDK` throws typed errors: AdminAuthError, AdminPermissionError, AdminValidationError
- React Query onError → toast notifications
- Error boundaries per page group
- 403 page with "Request admin access" button

---

## 16. Testing Strategy

| Layer      | Type               | Approach                 |
| ---------- | ------------------ | ------------------------ |
| Repository | Unit + Integration | Real PG test container   |
| Service    | Unit               | Mock repositories        |
| Handler    | Integration        | testutil.NewTestServer() |
| AdminSDK   | Unit               | Mock fetch               |
| Pages      | E2E                | Playwright as admin      |

**Coverage target:** 80%+ on all new admin code. Critical paths: impersonation, permission checks, credit adjustments.

---

## 17. Deployment & Rollout

**Week 1:** Migration 007 + backend admin endpoints. Verify with curl.
**Week 2:** Frontend admin routes + seed admin user. Verify full admin flow.
**Week 3:** Advanced features — cost engine, security monitoring, reports, promos.

**Rollback:** Migrations are additive only. Frontend returns 403 for non-admins — safe anytime. Feature flags disable background workers.
