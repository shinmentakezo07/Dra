# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans

**Goal:** Build complete admin panel for Yapapa — user management, provider/key management, models/aliases, billing, system settings, security, cost intelligence, and operations

**Architecture:** Backend (Go 1.25 / chi / pgx) → 8 repositories → AdminService + AuditService → 18 handler files → RequireAdmin middleware → Route wiring. Frontend (Next.js 16) → AdminLayout → AdminSDK → React Query → Page components.

**Tech Stack:** Go 1.25, pgx v5, chi router, PostgreSQL (partitioned), Next.js 16, Tailwind CSS v4, Recharts, React Query, Framer Motion

**Total:** ~88 files, ~100 endpoints, ~9,500 lines

---

## Phase 1: Database Migration

**File:** `apps/backend/migrations/007_admin_schema.sql`

### Task 1.1: Create all admin tables

Full SQL migration with 35+ tables. All UUID PKs use `gen_random_uuid()`. Time-series tables use `PARTITION BY RANGE (created_at)` with monthly partitions.

**Providers & Keys:**

```sql
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
    provider_type TEXT NOT NULL, base_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','maintenance','disabled')),
    priority INT NOT NULL DEFAULT 100, max_retries INT NOT NULL DEFAULT 3,
    timeout_ms INT NOT NULL DEFAULT 120000, concurrency_limit INT NOT NULL DEFAULT 0,
    circuit_breaker_threshold INT NOT NULL DEFAULT 5,
    circuit_breaker_timeout_ms INT NOT NULL DEFAULT 30000,
    circuit_breaker_half_open_max INT NOT NULL DEFAULT 3,
    consecutive_failures INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    label TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE,
    key_last_four TEXT NOT NULL,
    strategy TEXT NOT NULL DEFAULT 'round-robin' CHECK (strategy IN ('round-robin','fill-first','weighted','latency-optimized','quota-aware')),
    weight INT NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0,
    fill_current BOOLEAN NOT NULL DEFAULT true, is_active BOOLEAN NOT NULL DEFAULT true,
    rpm_limit INT NOT NULL DEFAULT 0, tpm_limit INT NOT NULL DEFAULT 0,
    monthly_quota BIGINT NOT NULL DEFAULT 0,
    usage_count BIGINT NOT NULL DEFAULT 0, success_count BIGINT NOT NULL DEFAULT 0,
    error_count BIGINT NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0, total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_cents BIGINT NOT NULL DEFAULT 0, avg_latency_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes on provider_keys: (provider_id, is_active, sort_order), (provider_id, strategy) WHERE is_active
```

**Models & Aliases:**

```sql
CREATE TABLE model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL UNIQUE, provider_id UUID NOT NULL REFERENCES providers(id),
    display_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    context_window INT NOT NULL, max_output_tokens INT NOT NULL DEFAULT 4096,
    input_price_per_1k NUMERIC(10,6) NOT NULL DEFAULT 0,
    output_price_per_1k NUMERIC(10,6) NOT NULL DEFAULT 0,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    supports_vision BOOLEAN NOT NULL DEFAULT false,
    supports_tools BOOLEAN NOT NULL DEFAULT false,
    supports_thinking BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','beta','deprecated','sunset','disabled')),
    sunset_date DATE, replacement_model_id UUID REFERENCES model_registry(id),
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE model_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias TEXT NOT NULL UNIQUE, target_model_id UUID NOT NULL REFERENCES model_registry(id) ON DELETE CASCADE,
    preferred_provider_id UUID REFERENCES providers(id), preferred_key_id UUID REFERENCES provider_keys(id),
    input_price_mult NUMERIC(4,2), output_price_mult NUMERIC(4,2),
    rpm_override INT, tpm_override INT, monthly_budget_cents INT,
    allowed_user_ids UUID[], is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Billing & Usage:**

```sql
CREATE TABLE credit_adjustments (id UUID PK, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount NUMERIC(12,4), balance_before NUMERIC(12,4), balance_after NUMERIC(12,4), reason TEXT, admin_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ);

CREATE TABLE usage_records (id BIGSERIAL, user_id UUID, api_key_id UUID, provider_id UUID, request_id TEXT UNIQUE, model_id TEXT, input_tokens INT, output_tokens INT, cost_cents NUMERIC(10,6), duration_ms INT, status_code INT, error TEXT, ip_address INET, created_at TIMESTAMPTZ) PARTITION BY RANGE (created_at);

CREATE TABLE usage_daily (id BIGSERIAL, date DATE NOT NULL, user_id UUID NOT NULL, provider_id UUID, model_id TEXT, request_count INT, input_tokens BIGINT, output_tokens BIGINT, cost_cents NUMERIC(12,4), error_count INT, avg_duration_ms NUMERIC(10,2));

CREATE TABLE rate_limit_tiers (id UUID PK, name TEXT UNIQUE, rpm INT, tpm INT, rpd INT, concurrent_requests INT, monthly_budget_cents INT, is_active BOOLEAN);
```

**Settings & Audit:**

```sql
CREATE TABLE system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, type TEXT DEFAULT 'string', description TEXT, group_name TEXT DEFAULT 'general', is_encrypted BOOLEAN DEFAULT false, updated_by UUID REFERENCES users(id), updated_at TIMESTAMPTZ);

CREATE TABLE feature_flags (id UUID PK, key TEXT UNIQUE, name TEXT, enabled BOOLEAN DEFAULT false, targeted_user_ids UUID[], targeted_tier_ids UUID[], created_at TIMESTAMPTZ);

CREATE TABLE audit_logs (id BIGSERIAL, actor_id UUID, actor_email TEXT, action TEXT, target_type TEXT, target_id TEXT, changes JSONB DEFAULT '{}', severity TEXT DEFAULT 'info', ip_address INET, created_at TIMESTAMPTZ) PARTITION BY RANGE (created_at);

CREATE TABLE admin_users (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin','admin','support','analyst','billing_admin')), permissions TEXT[] DEFAULT '{}', is_active BOOLEAN DEFAULT true, created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ);

CREATE TABLE admin_role_permissions (id UUID PK, role TEXT UNIQUE, permissions TEXT[]);
INSERT INTO admin_role_permissions VALUES (gen_random_uuid(), 'super_admin', ARRAY['*']);
INSERT INTO admin_role_permissions VALUES (gen_random_uuid(), 'admin', ARRAY['users.*','keys.*','providers.*','models.*','billing.*','settings.*','logs.*','audit.*']);
INSERT INTO admin_role_permissions VALUES (gen_random_uuid(), 'support', ARRAY['users.view','users.manage','keys.view','billing.view','billing.adjust','logs.view']);
INSERT INTO admin_role_permissions VALUES (gen_random_uuid(), 'analyst', ARRAY['users.view','logs.view','analytics.*','audit.view']);
```

**Security:**

```sql
CREATE TABLE ip_lists (id UUID PK, ip_or_cidr CIDR NOT NULL, action TEXT CHECK (action IN ('allow','block','challenge','rate_limit')), scope TEXT DEFAULT 'global', scope_id TEXT, reason TEXT, auto_blocked BOOLEAN DEFAULT false, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ);

CREATE TABLE ip_access_logs (id BIGSERIAL, ip_address INET, user_id UUID, api_key_id UUID, method TEXT, path TEXT, user_agent TEXT, country TEXT, blocked BOOLEAN, rate_limited BOOLEAN, created_at TIMESTAMPTZ) PARTITION BY RANGE (created_at);

CREATE TABLE suspicious_activities (id BIGSERIAL, category TEXT, severity TEXT, user_id UUID, api_key_id UUID, ip_address INET, details JSONB, auto_blocked BOOLEAN, reviewed_by UUID, resolved BOOLEAN DEFAULT false, created_at TIMESTAMPTZ);

CREATE TABLE admin_impersonations (id UUID PK, admin_id UUID REFERENCES users(id), target_user_id UUID REFERENCES users(id), reason TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ);
```

**Additional features:**

```sql
CREATE TABLE announcements (id UUID PK, title TEXT, body TEXT, priority TEXT, target_type TEXT, target_ids UUID[], starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, show_in_app BOOLEAN, send_email BOOLEAN, created_by UUID, created_at TIMESTAMPTZ);
CREATE TABLE promo_codes (id UUID PK, code TEXT UNIQUE, type TEXT, value NUMERIC, max_uses INT, current_uses INT DEFAULT 0, min_purchase_cents INT, expires_at TIMESTAMPTZ, is_active BOOLEAN, created_by UUID);
CREATE TABLE promo_redemptions (id UUID PK, promo_id UUID REFERENCES promo_codes(id), user_id UUID REFERENCES users(id), discount_cents INT, credits_awarded NUMERIC, redeemed_at TIMESTAMPTZ);
CREATE TABLE sso_configs (id UUID PK, provider TEXT UNIQUE, label TEXT, issuer TEXT, client_id TEXT, allowed_domains TEXT[], auto_provision BOOLEAN, default_role TEXT, is_active BOOLEAN);
CREATE TABLE user_groups (id UUID PK, name TEXT, description TEXT, created_by UUID REFERENCES admin_users(user_id));
CREATE TABLE user_group_members (group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(group_id, user_id));
CREATE TABLE group_policies (id UUID PK, group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE, policy_type TEXT, settings JSONB);
CREATE TABLE scheduled_reports (id UUID PK, name TEXT, frequency TEXT, format TEXT, sections TEXT[], recipients TEXT[], next_send_at TIMESTAMPTZ, is_active BOOLEAN);
CREATE TABLE api_changelog (id UUID PK, title TEXT, body TEXT, version TEXT, type TEXT, published_at TIMESTAMPTZ, is_draft BOOLEAN DEFAULT true, created_by UUID REFERENCES admin_users(user_id));
CREATE TABLE usage_alerts (id UUID PK, name TEXT, scope TEXT, metric TEXT, threshold NUMERIC, window_minutes INT, channels TEXT[], is_active BOOLEAN);
CREATE TABLE cost_optimizations (id BIGSERIAL, type TEXT, title TEXT, estimated_savings_cents NUMERIC, user_id UUID, applied BOOLEAN DEFAULT false, created_at TIMESTAMPTZ);
CREATE TABLE provider_sla (id UUID PK, provider_id UUID REFERENCES providers(id), date DATE, uptime_percent NUMERIC, avg_latency_ms NUMERIC, error_rate NUMERIC, UNIQUE(provider_id, date));
CREATE TABLE data_exports (id UUID PK, user_id UUID, requested_by UUID, reason TEXT, format TEXT, status TEXT, file_path TEXT, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ);
CREATE TABLE request_traces (id UUID PK, request_id TEXT UNIQUE, trace_data JSONB, created_at TIMESTAMPTZ);
CREATE TABLE model_benchmarks (id UUID PK, prompt_hash TEXT, prompt_text TEXT, results JSONB, created_by UUID, created_at TIMESTAMPTZ);
CREATE TABLE provider_maintenance_windows (id UUID PK, provider_id UUID REFERENCES providers(id), title TEXT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, is_active BOOLEAN);
CREATE TABLE webhook_delivery_logs (id BIGSERIAL, webhook_id UUID, event_type TEXT, payload JSONB, response_status INT, duration_ms INT, success BOOLEAN, attempt INT, created_at TIMESTAMPTZ);
CREATE TABLE webhook_tests (id UUID PK, event_type TEXT, sample_payload JSONB, target_url TEXT, response_status INT, duration_ms INT, created_by UUID);
CREATE TABLE cache_stats (id BIGSERIAL, provider_id UUID, model TEXT, hits BIGINT, misses BIGINT, hit_rate NUMERIC(5,4), size_bytes BIGINT, entry_count INT, recorded_at TIMESTAMPTZ);
```

**User enhancements:**

```sql
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN rate_limit_tier_id UUID REFERENCES rate_limit_tiers(id);
ALTER TABLE users ADD COLUMN rate_limit_overrides JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN last_login_ip INET;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN suspended_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN suspension_reason TEXT;
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';
```

- [ ] **Step 1:** Write `migrations/007_admin_schema.sql` with ALL above SQL
- [ ] **Step 2:** Run migration against test DB and verify tables exist
- [ ] **Step 3:** `git add-commit -m "feat: add admin panel DB schema"`

---

## Phase 2: Domain Models

**File:** `apps/backend/internal/domain/admin.go`

### Task 2.1: Write all Go enums and structs (~550 lines)

Enums as typed string constants: `UserStatus`, `ProviderStatus`, `ProviderType`, `KeyStrategy`, `ModelStatus`, `AdminRole`, `AuditAction` (20+ values), `IPAction`, `IPScope`, `AuditSeverity`, `SuspiciousCategory`.

Domain structs with JSON tags: `Provider` (16 fields), `ProviderKey` (20 fields), `ModelRegistry` (18 fields), `ModelAlias` (14 fields), `CreditAdjustment` (8 fields), `UsageRecord` (14 fields), `UsageDaily` (10 fields), `SystemSetting` (8 fields), `FeatureFlag` (9 fields), `AuditLog` (10 fields), `AdminUser` (6 fields + `HasPermission` method), `IPListEntry` (9 fields), `SuspiciousActivity` (10 fields), `DashboardStats` (nested structs).

Filter types: `UserFilter{Query,Status,Page,Limit}`.

- [ ] **Step 1:** Write file, `go build ./internal/domain/...`
- [ ] **Step 2:** `go test -race -cover ./internal/domain/...`
- [ ] **Step 3:** `git commit -m "feat: add admin domain models"`

---

## Phase 3: Repository Layer

**Files under `apps/backend/internal/repository/`:**

### Task 3.1: admin_user_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminUserRepo struct{ db *db.DB }
func NewAdminUserRepo(d *db.DB) *AdminUserRepo { return &AdminUserRepo{db: d} }

func (r *AdminUserRepo) List(ctx context.Context, filter domain.UserFilter) ([]domain.User, int, error) {
	where := "WHERE u.deleted_at IS NULL"
	args := []interface{}{}
	n := 1

	if filter.Query != "" {
		where += fmt.Sprintf(" AND (u.email ILIKE $%d OR u.name ILIKE $%d OR u.id::text ILIKE $%d)", n, n+1, n+2)
		p := "%" + filter.Query + "%"
		args = append(args, p, p, p)
		n += 3
	}
	if filter.Status != "" {
		where += fmt.Sprintf(" AND u.status = $%d", n)
		args = append(args, filter.Status)
		n++
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM users u " + where
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
		       u.last_login_at, u.last_login_ip, u.notes, u.tags
		FROM users u %s ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d
	`, where, n, n+1)
	args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status,
			&u.CreatedAt, &u.LastLoginAt, &u.LastLoginIP, &u.Notes, &u.Tags); err != nil {
			return nil, 0, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (r *AdminUserRepo) Get(ctx context.Context, id string) (*domain.User, error) {
	var u domain.User
	err := r.db.Pool.QueryRow(ctx,
		`SELECT id, name, email, role, status, created_at, last_login_at, last_login_ip, notes, tags
		 FROM users WHERE id = $1 AND deleted_at IS NULL`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt,
			&u.LastLoginAt, &u.LastLoginIP, &u.Notes, &u.Tags)
	if err != nil {
		return nil, fmt.Errorf("get user %s: %w", id, err)
	}
	return &u, nil
}

func (r *AdminUserRepo) UpdateStatus(ctx context.Context, userID, status, reason, actorID string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE users SET status=$2, suspension_reason=$3, suspended_by=$4, suspended_at=NOW()
		 WHERE id=$1 AND deleted_at IS NULL`, userID, status, reason, actorID)
	if err != nil { return fmt.Errorf("update user status: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) UpdateRole(ctx context.Context, userID, role string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE users SET role=$2 WHERE id=$1`, userID, role)
	if err != nil { return fmt.Errorf("update user role: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) SoftDelete(ctx context.Context, userID string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE users SET email=concat('deleted-',id,'@deleted'), name='Deleted User',
		 password='', status='disabled', deleted_at=NOW() WHERE id=$1`, userID)
	if err != nil { return fmt.Errorf("soft delete user: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) UpdateRateLimits(ctx context.Context, userID string, rl domain.RateLimitOverrides) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE users SET rate_limit_overrides=$2, updated_at=NOW() WHERE id=$1`, userID, rl)
	if err != nil { return fmt.Errorf("update rate limits: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("user not found: %s", userID) }
	return nil
}

func (r *AdminUserRepo) SearchByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.db.Pool.QueryRow(ctx,
		`SELECT id, name, email, role, status, created_at FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("search by email: %w", err)
	}
	return &u, nil
}

func (r *AdminUserRepo) BulkUpdateStatus(ctx context.Context, userIDs []string, status string) (int64, error) {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE users SET status=$2, updated_at=NOW() WHERE id = ANY($1)`, userIDs, status)
	if err != nil { return 0, fmt.Errorf("bulk update status: %w", err) }
	return tag.RowsAffected(), nil
}
```

### Task 3.2: admin_provider_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminProviderRepo struct{ db *db.DB }
func NewAdminProviderRepo(d *db.DB) *AdminProviderRepo { return &AdminProviderRepo{db: d} }

func (r *AdminProviderRepo) Create(ctx context.Context, p *domain.Provider) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO providers (id, name, display_name, provider_type, base_url, status, priority,
		 max_retries, timeout_ms, concurrency_limit, circuit_breaker_threshold,
		 circuit_breaker_timeout_ms, circuit_breaker_half_open_max)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		p.ID, p.Name, p.DisplayName, p.ProviderType, p.BaseURL, p.Status, p.Priority,
		p.MaxRetries, p.TimeoutMs, p.ConcurrencyLimit, p.CircuitBreakerThreshold,
		p.CircuitBreakerTimeoutMs, p.CircuitBreakerHalfOpenMax)
	if err != nil { return fmt.Errorf("create provider: %w", err) }
	return nil
}

func (r *AdminProviderRepo) Get(ctx context.Context, id string) (*domain.Provider, error) {
	var p domain.Provider
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, name, display_name, provider_type, base_url, status, priority,
		 max_retries, timeout_ms, concurrency_limit, circuit_breaker_threshold,
		 circuit_breaker_timeout_ms, circuit_breaker_half_open_max, consecutive_failures,
		 created_at, updated_at
		FROM providers WHERE id=$1`, id).
		Scan(&p.ID, &p.Name, &p.DisplayName, &p.ProviderType, &p.BaseURL, &p.Status,
			&p.Priority, &p.MaxRetries, &p.TimeoutMs, &p.ConcurrencyLimit,
			&p.CircuitBreakerThreshold, &p.CircuitBreakerTimeoutMs,
			&p.CircuitBreakerHalfOpenMax, &p.ConsecutiveFailures, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get provider %s: %w", id, err)
	}
	return &p, nil
}

func (r *AdminProviderRepo) List(ctx context.Context) ([]domain.Provider, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, display_name, provider_type, base_url, status, priority,
		 timeout_ms, concurrency_limit, created_at, updated_at
		FROM providers ORDER BY priority, name`)
	if err != nil { return nil, fmt.Errorf("list providers: %w", err) }
	defer rows.Close()
	var providers []domain.Provider
	for rows.Next() {
		var p domain.Provider
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.ProviderType, &p.BaseURL,
			&p.Status, &p.Priority, &p.TimeoutMs, &p.ConcurrencyLimit, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan provider: %w", err)
		}
		providers = append(providers, p)
	}
	return providers, rows.Err()
}

func (r *AdminProviderRepo) Update(ctx context.Context, p *domain.Provider) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE providers SET display_name=$2, base_url=$3, status=$4, priority=$5,
		 max_retries=$6, timeout_ms=$7, concurrency_limit=$8, updated_at=NOW()
		WHERE id=$1`, p.ID, p.DisplayName, p.BaseURL, p.Status, p.Priority,
		p.MaxRetries, p.TimeoutMs, p.ConcurrencyLimit)
	return fmt.Errorf("update provider: %w", err)
}

func (r *AdminProviderRepo) UpdateStatus(ctx context.Context, id string, status domain.ProviderStatus) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE providers SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	if err != nil { return fmt.Errorf("update provider status: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("provider not found: %s", id) }
	return nil
}

// --- Provider Keys ---

func (r *AdminProviderRepo) CreateKey(ctx context.Context, k *domain.ProviderKey) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO provider_keys (id, provider_id, label, key_prefix, key_hash, key_last_four,
		 strategy, weight, sort_order, is_active, rpm_limit, tpm_limit, monthly_quota)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		k.ID, k.ProviderID, k.Label, k.KeyPrefix, k.KeyHash, k.KeyLastFour,
		k.Strategy, k.Weight, k.SortOrder, k.IsActive, k.RpmLimit, k.TpmLimit, k.MonthlyQuota)
	return fmt.Errorf("create provider key: %w", err)
}

func (r *AdminProviderRepo) ListKeys(ctx context.Context, providerID string) ([]domain.ProviderKey, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider_id, label, key_prefix, key_last_four, strategy, weight,
		 sort_order, fill_current, is_active, rpm_limit, tpm_limit, monthly_quota,
		 usage_count, success_count, error_count, total_input_tokens, total_output_tokens,
		 total_cost_cents, avg_latency_ms, last_used_at, expires_at, created_at
		FROM provider_keys WHERE provider_id=$1 ORDER BY sort_order, created_at`, providerID)
	if err != nil { return nil, fmt.Errorf("list provider keys: %w", err) }
	defer rows.Close()
	var keys []domain.ProviderKey
	for rows.Next() {
		var k domain.ProviderKey
		if err := rows.Scan(&k.ID, &k.ProviderID, &k.Label, &k.KeyPrefix, &k.KeyLastFour,
			&k.Strategy, &k.Weight, &k.SortOrder, &k.FillCurrent, &k.IsActive,
			&k.RpmLimit, &k.TpmLimit, &k.MonthlyQuota, &k.UsageCount, &k.SuccessCount,
			&k.ErrorCount, &k.TotalInputTokens, &k.TotalOutputTokens, &k.TotalCostCents,
			&k.AvgLatencyMs, &k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan provider key: %w", err)
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (r *AdminProviderRepo) UpdateKey(ctx context.Context, k *domain.ProviderKey) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE provider_keys SET label=$2, strategy=$3, weight=$4, rpm_limit=$5,
		 tpm_limit=$6, monthly_quota=$7 WHERE id=$1`,
		k.ID, k.Label, k.Strategy, k.Weight, k.RpmLimit, k.TpmLimit, k.MonthlyQuota)
	return fmt.Errorf("update provider key: %w", err)
}

func (r *AdminProviderRepo) DeleteKey(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM provider_keys WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("delete provider key: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("provider key not found: %s", id) }
	return nil
}

func (r *AdminProviderRepo) ReorderKeys(ctx context.Context, providerID string, keyIDs []string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil { return fmt.Errorf("begin tx: %w", err) }
	defer tx.Rollback(ctx)
	for i, kid := range keyIDs {
		if _, err := tx.Exec(ctx,
			`UPDATE provider_keys SET sort_order=$1 WHERE id=$2 AND provider_id=$3`,
			i, kid, providerID); err != nil {
			return fmt.Errorf("reorder key %s: %w", kid, err)
		}
	}
	return tx.Commit(ctx)
}
```

### Task 3.3: admin_model_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"github.com/jackc/pgx/v5"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminModelRepo struct{ db *db.DB }
func NewAdminModelRepo(d *db.DB) *AdminModelRepo { return &AdminModelRepo{db: d} }

func (r *AdminModelRepo) ListModels(ctx context.Context, status string) ([]domain.ModelRegistry, error) {
	var rows pgx.Rows
	var err error
	if status != "" {
		rows, err = r.db.Pool.Query(ctx, `
			SELECT id, model_id, provider_id, display_name, description, context_window,
			 max_output, input_price_per_1k, output_price_per_1k, capabilities,
			 supports_vision, supports_tools, supports_thinking, status,
			 sunset_date, replacement_model_id, created_at, updated_at
			FROM model_registry WHERE status=$1 ORDER BY display_name`, status)
	} else {
		rows, err = r.db.Pool.Query(ctx, `
			SELECT id, model_id, provider_id, display_name, description, context_window,
			 max_output, input_price_per_1k, output_price_per_1k, capabilities,
			 supports_vision, supports_tools, supports_thinking, status,
			 sunset_date, replacement_model_id, created_at, updated_at
			FROM model_registry ORDER BY display_name`)
	}
	if err != nil { return nil, fmt.Errorf("list models: %w", err) }
	defer rows.Close()
	var models []domain.ModelRegistry
	for rows.Next() {
		var m domain.ModelRegistry
		if err := rows.Scan(&m.ID, &m.ModelID, &m.ProviderID, &m.DisplayName, &m.Description,
			&m.ContextWindow, &m.MaxOutput, &m.InputPricePer1k, &m.OutputPricePer1k,
			&m.Capabilities, &m.SupportsVision, &m.SupportsTools, &m.SupportsThinking,
			&m.Status, &m.SunsetDate, &m.ReplacementModelID, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan model: %w", err)
		}
		models = append(models, m)
	}
	return models, rows.Err()
}

func (r *AdminModelRepo) CreateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO model_registry (id, model_id, provider_id, display_name, description,
		 context_window, max_output, input_price_per_1k, output_price_per_1k,
		 capabilities, supports_vision, supports_tools, supports_thinking, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		m.ID, m.ModelID, m.ProviderID, m.DisplayName, m.Description,
		m.ContextWindow, m.MaxOutput, m.InputPricePer1k, m.OutputPricePer1k,
		m.Capabilities, m.SupportsVision, m.SupportsTools, m.SupportsThinking, m.Status)
	return fmt.Errorf("create model: %w", err)
}

func (r *AdminModelRepo) GetModel(ctx context.Context, id string) (*domain.ModelRegistry, error) {
	var m domain.ModelRegistry
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, model_id, provider_id, display_name, description, context_window,
		 max_output, input_price_per_1k, output_price_per_1k, capabilities,
		 supports_vision, supports_tools, supports_thinking, status,
		 sunset_date, replacement_model_id, created_at, updated_at
		FROM model_registry WHERE id=$1`, id).
		Scan(&m.ID, &m.ModelID, &m.ProviderID, &m.DisplayName, &m.Description,
			&m.ContextWindow, &m.MaxOutput, &m.InputPricePer1k, &m.OutputPricePer1k,
			&m.Capabilities, &m.SupportsVision, &m.SupportsTools, &m.SupportsThinking,
			&m.Status, &m.SunsetDate, &m.ReplacementModelID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get model %s: %w", id, err)
	}
	return &m, nil
}

func (r *AdminModelRepo) UpdateModel(ctx context.Context, m *domain.ModelRegistry) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE model_registry SET display_name=$2, description=$3, context_window=$4,
		 max_output=$5, input_price_per_1k=$6, output_price_per_1k=$7,
		 capabilities=$8, supports_vision=$9, supports_tools=$10, supports_thinking=$11,
		 status=$12, sunset_date=$13, replacement_model_id=$14, updated_at=NOW()
		WHERE id=$1`,
		m.ID, m.DisplayName, m.Description, m.ContextWindow, m.MaxOutput,
		m.InputPricePer1k, m.OutputPricePer1k, m.Capabilities, m.SupportsVision,
		m.SupportsTools, m.SupportsThinking, m.Status, m.SunsetDate, m.ReplacementModelID)
	return fmt.Errorf("update model: %w", err)
}

func (r *AdminModelRepo) UpdateModelStatus(ctx context.Context, id string, status domain.ModelStatus, replacementID *string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE model_registry SET status=$2, replacement_model_id=$3, updated_at=NOW()
		WHERE id=$1`, id, status, replacementID)
	return fmt.Errorf("update model status: %w", err)
}

// --- Aliases ---

func (r *AdminModelRepo) CreateAlias(ctx context.Context, a *domain.ModelAlias) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO model_aliases (id, alias, target_model_id, preferred_provider_id,
		 preferred_key_id, rpm_override, tpm_override, monthly_budget,
		 allowed_user_ids, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		a.ID, a.Alias, a.TargetModelID, a.PreferredProviderID,
		a.PreferredKeyID, a.RpmOverride, a.TpmOverride, a.MonthlyBudget,
		a.AllowedUserIDs, a.IsActive)
	return fmt.Errorf("create alias: %w", err)
}

func (r *AdminModelRepo) ListAliases(ctx context.Context) ([]domain.ModelAlias, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, alias, target_model_id, preferred_provider_id, preferred_key_id,
		 rpm_override, tpm_override, monthly_budget, allowed_user_ids,
		 is_active, created_at, updated_at
		FROM model_aliases ORDER BY alias`)
	if err != nil { return nil, fmt.Errorf("list aliases: %w", err) }
	defer rows.Close()
	var aliases []domain.ModelAlias
	for rows.Next() {
		var a domain.ModelAlias
		if err := rows.Scan(&a.ID, &a.Alias, &a.TargetModelID, &a.PreferredProviderID,
			&a.PreferredKeyID, &a.RpmOverride, &a.TpmOverride, &a.MonthlyBudget,
			&a.AllowedUserIDs, &a.IsActive, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan alias: %w", err)
		}
		aliases = append(aliases, a)
	}
	return aliases, rows.Err()
}

func (r *AdminModelRepo) UpdateAlias(ctx context.Context, a *domain.ModelAlias) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE model_aliases SET target_model_id=$2, preferred_provider_id=$3,
		 preferred_key_id=$4, rpm_override=$5, tpm_override=$6,
		 monthly_budget=$7, allowed_user_ids=$8, is_active=$9, updated_at=NOW()
		WHERE id=$1`,
		a.ID, a.TargetModelID, a.PreferredProviderID, a.PreferredKeyID,
		a.RpmOverride, a.TpmOverride, a.MonthlyBudget, a.AllowedUserIDs, a.IsActive)
	return fmt.Errorf("update alias: %w", err)
}

func (r *AdminModelRepo) DeleteAlias(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM model_aliases WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("delete alias: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("alias not found: %s", id) }
	return nil
}
```

### Task 3.4: admin_billing_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminBillingRepo struct{ db *db.DB }
func NewAdminBillingRepo(d *db.DB) *AdminBillingRepo { return &AdminBillingRepo{db: d} }

func (r *AdminBillingRepo) AdjustCredits(ctx context.Context, adj *domain.CreditAdjustment) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil { return fmt.Errorf("begin tx: %w", err) }
	defer tx.Rollback(ctx)

	var curBalance int64
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(balance, 0) FROM user_credits WHERE user_id=$1 FOR UPDATE`,
		adj.UserID).Scan(&curBalance)
	if err != nil {
		curBalance = 0
	}

	newBalance := curBalance + adj.Amount
	if newBalance < 0 {
		return fmt.Errorf("insufficient credits: balance=%d, adjustment=%d", curBalance, adj.Amount)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_credits (user_id, balance, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id) DO UPDATE SET balance=$2, updated_at=NOW()`,
		adj.UserID, newBalance)
	if err != nil { return fmt.Errorf("upsert credits: %w", err) }

	_, err = tx.Exec(ctx, `
		INSERT INTO credit_adjustments (id, user_id, amount, balance_before, balance_after,
		 reason, admin_id, reference_id, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
		adj.ID, adj.UserID, adj.Amount, curBalance, newBalance,
		adj.Reason, adj.AdminID, adj.ReferenceID)
	if err != nil { return fmt.Errorf("insert adjustment: %w", err) }

	return tx.Commit(ctx)
}

func (r *AdminBillingRepo) ListAdjustments(ctx context.Context, userID string, page, limit int) ([]domain.CreditAdjustment, int, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM credit_adjustments WHERE user_id=$1`, userID).Scan(&total)
	if err != nil { return nil, 0, fmt.Errorf("count adjustments: %w", err) }

	offset := (page - 1) * limit
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, user_id, amount, balance_before, balance_after, reason,
		 admin_id, reference_id, created_at
		FROM credit_adjustments WHERE user_id=$1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil { return nil, 0, fmt.Errorf("list adjustments: %w", err) }
	defer rows.Close()
	var adjustments []domain.CreditAdjustment
	for rows.Next() {
		var a domain.CreditAdjustment
		if err := rows.Scan(&a.ID, &a.UserID, &a.Amount, &a.BalanceBefore, &a.BalanceAfter,
			&a.Reason, &a.AdminID, &a.ReferenceID, &a.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan adjustment: %w", err)
		}
		adjustments = append(adjustments, a)
	}
	return adjustments, total, rows.Err()
}

func (r *AdminBillingRepo) RevenueSummary(ctx context.Context, from, to time.Time) ([]domain.RevenueSummary, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DATE(created_at) as date, SUM(cost_cents), COUNT(*) as request_count
		FROM usage_records WHERE created_at >= $1 AND created_at <= $2
		GROUP BY DATE(created_at) ORDER BY date`, from, to)
	if err != nil { return nil, fmt.Errorf("revenue summary: %w", err) }
	defer rows.Close()
	var summaries []domain.RevenueSummary
	for rows.Next() {
		var s domain.RevenueSummary
		if err := rows.Scan(&s.Date, &s.RevenueCents, &s.RequestCount); err != nil {
			return nil, fmt.Errorf("scan revenue: %w", err)
		}
		summaries = append(summaries, s)
	}
	return summaries, rows.Err()
}

func (r *AdminBillingRepo) UsageRecords(ctx context.Context, f domain.UsageFilter) ([]domain.UsageRecord, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1
	if f.UserID != "" {
		where += fmt.Sprintf(" AND user_id=$%d", n); args = append(args, f.UserID); n++
	}
	if f.ModelID != "" {
		where += fmt.Sprintf(" AND model=$%d", n); args = append(args, f.ModelID); n++
	}
	if f.ProviderID != "" {
		where += fmt.Sprintf(" AND provider_id=$%d", n); args = append(args, f.ProviderID); n++
	}
	if f.StatusCode != 0 {
		where += fmt.Sprintf(" AND status_code=$%d", n); args = append(args, f.StatusCode); n++
	}
	if !f.From.IsZero() {
		where += fmt.Sprintf(" AND created_at >= $%d", n); args = append(args, f.From); n++
	}
	if !f.To.IsZero() {
		where += fmt.Sprintf(" AND created_at <= $%d", n); args = append(args, f.To); n++
	}
	var total int
	err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records "+where, args...).Scan(&total)
	if err != nil { return nil, 0, fmt.Errorf("count usage: %w", err) }
	rows, err := r.db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT id, user_id, api_key_id, provider_id, request_id, model, tokens, cost_cents,
		 duration_ms, status_code, error, ip_address, created_at
		FROM usage_records %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, n, n+1),
		append(args, f.Limit, (f.Page-1)*f.Limit)...)
	if err != nil { return nil, 0, fmt.Errorf("list usage: %w", err) }
	defer rows.Close()
	var records []domain.UsageRecord
	for rows.Next() {
		var r domain.UsageRecord
		if err := rows.Scan(&r.ID, &r.UserID, &r.APIKeyID, &r.ProviderID, &r.RequestID,
			&r.Model, &r.Tokens, &r.CostCents, &r.DurationMs, &r.StatusCode,
			&r.Error, &r.IPAddress, &r.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan usage: %w", err)
		}
		records = append(records, r)
	}
	return records, total, rows.Err()
}

func (r *AdminBillingRepo) UsageDaily(ctx context.Context, from, to time.Time, groupBy string) ([]domain.UsageDaily, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT date, user_id, model_id, api_key_id,
		 SUM(request_count)::BIGINT, SUM(tokens)::BIGINT, SUM(cost_cents)::BIGINT,
		 SUM(errors)::BIGINT, AVG(latency_p50), AVG(latency_p95), AVG(latency_p99)
		FROM usage_daily WHERE date >= $1 AND date <= $2
		GROUP BY date, user_id, model_id, api_key_id ORDER BY date`, from, to)
	if err != nil { return nil, fmt.Errorf("usage daily: %w", err) }
	defer rows.Close()
	var dailies []domain.UsageDaily
	for rows.Next() {
		var d domain.UsageDaily
		if err := rows.Scan(&d.Date, &d.UserID, &d.ModelID, &d.APIKeyID,
			&d.RequestCount, &d.Tokens, &d.CostCents, &d.Errors,
			&d.LatencyP50, &d.LatencyP95, &d.LatencyP99); err != nil {
			return nil, fmt.Errorf("scan daily: %w", err)
		}
		dailies = append(dailies, d)
	}
	return dailies, rows.Err()
}
```

### Task 3.5: admin_settings_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminSettingsRepo struct{ db *db.DB }
func NewAdminSettingsRepo(d *db.DB) *AdminSettingsRepo { return &AdminSettingsRepo{db: d} }

func (r *AdminSettingsRepo) List(ctx context.Context, group string) ([]domain.SystemSetting, error) {
	var rows interface{ Close(); Next() bool; Scan(...interface{}) error }
	var err error
	if group !=  {
		rows, err = r.db.Pool.Query(ctx,
			`SELECT key, value, type, description, group_name, is_encrypted, updated_at
			 FROM system_settings WHERE group_name=$1 ORDER BY key`, group)
	} else {
		rows, err = r.db.Pool.Query(ctx,
			`SELECT key, value, type, description, group_name, is_encrypted, updated_at
			 FROM system_settings ORDER BY key`)
	}
	if err != nil { return nil, fmt.Errorf("list settings: %w", err) }
	defer rows.Close()
	var settings []domain.SystemSetting
	for rows.Next() {
		var s domain.SystemSetting
		if err := rows.Scan(&s.Key, &s.Value, &s.Type, &s.Description,
			&s.GroupName, &s.IsEncrypted, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan setting: %w", err)
		}
		settings = append(settings, s)
	}
	return settings, rows.Err()
}

func (r *AdminSettingsRepo) Get(ctx context.Context, key string) (*domain.SystemSetting, error) {
	var s domain.SystemSetting
	err := r.db.Pool.QueryRow(ctx,
		`SELECT key, value, type, description, group_name, is_encrypted, updated_at
		 FROM system_settings WHERE key=$1`, key).
		Scan(&s.Key, &s.Value, &s.Type, &s.Description,
			&s.GroupName, &s.IsEncrypted, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get setting %s: %w", key, err)
	}
	return &s, nil
}

func (r *AdminSettingsRepo) Set(ctx context.Context, s *domain.SystemSetting) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO system_settings (key, value, type, description, group_name, is_encrypted)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (key) DO UPDATE SET value=$2, type=$3, description=$4,
		 group_name=$5, is_encrypted=$6, updated_at=NOW()`,
		s.Key, s.Value, s.Type, s.Description, s.GroupName, s.IsEncrypted)
	if err != nil { return fmt.Errorf("set setting: %w", err) }
	return nil
}

// --- Feature Flags ---

func (r *AdminSettingsRepo) ListFeatureFlags(ctx context.Context) ([]domain.FeatureFlag, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, key, name, description, enabled, targeted_user_ids,
		 targeted_tier_ids, created_at, updated_at
		 FROM feature_flags ORDER BY name`)
	if err != nil { return nil, fmt.Errorf("list feature flags: %w", err) }
	defer rows.Close()
	var flags []domain.FeatureFlag
	for rows.Next() {
		var f domain.FeatureFlag
		if err := rows.Scan(&f.ID, &f.Key, &f.Name, &f.Description, &f.Enabled,
			&f.TargetedUserIDs, &f.TargetedTierIDs, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan feature flag: %w", err)
		}
		flags = append(flags, f)
	}
	return flags, rows.Err()
}

func (r *AdminSettingsRepo) CreateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO feature_flags (id, key, name, description, enabled,
		 targeted_user_ids, targeted_tier_ids)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		f.ID, f.Key, f.Name, f.Description, f.Enabled,
		f.TargetedUserIDs, f.TargetedTierIDs)
	if err != nil { return fmt.Errorf("create feature flag: %w", err) }
	return nil
}

func (r *AdminSettingsRepo) UpdateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE feature_flags SET name=$2, description=$3, enabled=$4,
		 targeted_user_ids=$5, targeted_tier_ids=$6, updated_at=NOW()
		WHERE id=$1`,
		f.ID, f.Name, f.Description, f.Enabled,
		f.TargetedUserIDs, f.TargetedTierIDs)
	if err != nil { return fmt.Errorf("update feature flag: %w", err) }
	return nil
}
```

### Task 3.6: admin_audit_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminAuditRepo struct{ db *db.DB }
func NewAdminAuditRepo(d *db.DB) *AdminAuditRepo { return &AdminAuditRepo{db: d} }

func (r *AdminAuditRepo) Insert(ctx context.Context, log *domain.AuditLog) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type,
		 target_id, changes, ip_address, severity, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
		log.ID, log.ActorID, log.ActorEmail, log.Action, log.TargetType,
		log.TargetID, log.Changes, log.IPAddress, log.Severity)
	if err != nil { return fmt.Errorf("insert audit log: %w", err) }
	return nil
}

type AuditFilter struct {
	ActorID    string
	Action     string
	TargetType string
	Severity   string
	From       time.Time
	To         time.Time
	Page       int
	Limit      int
}

func (r *AdminAuditRepo) List(ctx context.Context, f AuditFilter) ([]domain.AuditLog, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1
	if f.ActorID != "" {
		where += fmt.Sprintf(" AND actor_id=$%d", n); args = append(args, f.ActorID); n++
	}
	if f.Action != "" {
		where += fmt.Sprintf(" AND action=$%d", n); args = append(args, f.Action); n++
	}
	if f.TargetType != "" {
		where += fmt.Sprintf(" AND target_type=$%d", n); args = append(args, f.TargetType); n++
	}
	if f.Severity != "" {
		where += fmt.Sprintf(" AND severity=$%d", n); args = append(args, f.Severity); n++
	}
	if !f.From.IsZero() {
		where += fmt.Sprintf(" AND created_at >= $%d", n); args = append(args, f.From); n++
	}
	if !f.To.IsZero() {
		where += fmt.Sprintf(" AND created_at <= $%d", n); args = append(args, f.To); n++
	}
	var total int
	err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM audit_logs "+where, args...).Scan(&total)
	if err != nil { return nil, 0, fmt.Errorf("count audit logs: %w", err) }
	rows, err := r.db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT id, actor_id, actor_email, action, target_type, target_id,
		 changes, ip_address, severity, created_at
		FROM audit_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, n, n+1),
		append(args, f.Limit, (f.Page-1)*f.Limit)...)
	if err != nil { return nil, 0, fmt.Errorf("list audit logs: %w", err) }
	defer rows.Close()
	var logs []domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		if err := rows.Scan(&l.ID, &l.ActorID, &l.ActorEmail, &l.Action,
			&l.TargetType, &l.TargetID, &l.Changes, &l.IPAddress,
			&l.Severity, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan audit log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}
```

### Task 3.7: admin_security_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminSecurityRepo struct{ db *db.DB }
func NewAdminSecurityRepo(d *db.DB) *AdminSecurityRepo { return &AdminSecurityRepo{db: d} }

// --- IP Lists ---

func (r *AdminSecurityRepo) AddIPEntry(ctx context.Context, e *domain.IPListEntry) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO ip_lists (id, ip_or_cidr, action, scope, scope_id,
		 reason, expires_at, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		e.ID, e.IPOrCIDR, e.Action, e.Scope, e.ScopeID,
		e.Reason, e.ExpiresAt, e.CreatedBy)
	if err != nil { return fmt.Errorf("add ip entry: %w", err) }
	return nil
}

func (r *AdminSecurityRepo) ListIPEntries(ctx context.Context, scope string) ([]domain.IPListEntry, error) {
	var rows interface{ Close(); Next() bool; Scan(...interface{}) error }
	var err error
	if scope != "" {
		rows, err = r.db.Pool.Query(ctx,
			`SELECT id, ip_or_cidr, action, scope, scope_id, reason,
			 expires_at, created_by, created_at
			 FROM ip_lists WHERE scope=$1 ORDER BY created_at DESC`, scope)
	} else {
		rows, err = r.db.Pool.Query(ctx,
			`SELECT id, ip_or_cidr, action, scope, scope_id, reason,
			 expires_at, created_by, created_at
			 FROM ip_lists ORDER BY created_at DESC`)
	}
	if err != nil { return nil, fmt.Errorf("list ip entries: %w", err) }
	defer rows.Close()
	var entries []domain.IPListEntry
	for rows.Next() {
		var e domain.IPListEntry
		if err := rows.Scan(&e.ID, &e.IPOrCIDR, &e.Action, &e.Scope, &e.ScopeID,
			&e.Reason, &e.ExpiresAt, &e.CreatedBy, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan ip entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *AdminSecurityRepo) RemoveIPEntry(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM ip_lists WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("remove ip entry: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("ip entry not found: %s", id) }
	return nil
}

// --- IP Access Logs ---

type IPAccessFilter struct {
	IP         string
	UserID     string
	Blocked    *bool
	RateLimited *bool
	From       time.Time
	To         time.Time
	Page       int
	Limit      int
}

func (r *AdminSecurityRepo) ListIPAccessLogs(ctx context.Context, f IPAccessFilter) ([]domain.IPAccessLog, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1
	if f.IP != "" {
		where += fmt.Sprintf(" AND ip_address=$%d", n); args = append(args, f.IP); n++
	}
	if f.UserID != "" {
		where += fmt.Sprintf(" AND user_id=$%d", n); args = append(args, f.UserID); n++
	}
	if f.Blocked != nil {
		where += fmt.Sprintf(" AND blocked=$%d", n); args = append(args, *f.Blocked); n++
	}
	if f.RateLimited != nil {
		where += fmt.Sprintf(" AND rate_limited=$%d", n); args = append(args, *f.RateLimited); n++
	}
	if !f.From.IsZero() {
		where += fmt.Sprintf(" AND created_at >= $%d", n); args = append(args, f.From); n++
	}
	if !f.To.IsZero() {
		where += fmt.Sprintf(" AND created_at <= $%d", n); args = append(args, f.To); n++
	}
	var total int
	err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM ip_access_logs "+where, args...).Scan(&total)
	if err != nil { return nil, 0, fmt.Errorf("count ip access logs: %w", err) }
	rows, err := r.db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT id, ip_address, user_id, api_key_id, method, path, user_agent,
		 country, is_proxy, blocked, rate_limited, created_at
		FROM ip_access_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, n, n+1),
		append(args, f.Limit, (f.Page-1)*f.Limit)...)
	if err != nil { return nil, 0, fmt.Errorf("list ip access logs: %w", err) }
	defer rows.Close()
	var logs []domain.IPAccessLog
	for rows.Next() {
		var l domain.IPAccessLog
		if err := rows.Scan(&l.ID, &l.IPAddress, &l.UserID, &l.APIKeyID,
			&l.Method, &l.Path, &l.UserAgent, &l.Country, &l.IsProxy,
			&l.Blocked, &l.RateLimited, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan ip access log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}

// --- Suspicious Activities ---

type SuspiciousFilter struct {
	Category string
	Severity string
	Reviewed *bool
	Resolved *bool
	From     time.Time
	To       time.Time
	Page     int
	Limit    int
}

func (r *AdminSecurityRepo) ListSuspicious(ctx context.Context, f SuspiciousFilter) ([]domain.SuspiciousActivity, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1
	if f.Category != "" {
		where += fmt.Sprintf(" AND category=$%d", n); args = append(args, f.Category); n++
	}
	if f.Severity != "" {
		where += fmt.Sprintf(" AND severity=$%d", n); args = append(args, f.Severity); n++
	}
	if f.Reviewed != nil {
		where += fmt.Sprintf(" AND reviewed=$%d", n); args = append(args, *f.Reviewed); n++
	}
	if f.Resolved != nil {
		where += fmt.Sprintf(" AND resolved=$%d", n); args = append(args, *f.Resolved); n++
	}
	if !f.From.IsZero() {
		where += fmt.Sprintf(" AND created_at >= $%d", n); args = append(args, f.From); n++
	}
	if !f.To.IsZero() {
		where += fmt.Sprintf(" AND created_at <= $%d", n); args = append(args, f.To); n++
	}
	var total int
	err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM suspicious_activities "+where, args...).Scan(&total)
	if err != nil { return nil, 0, fmt.Errorf("count suspicious: %w", err) }
	rows, err := r.db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT id, category, severity, user_id, api_key_id, ip, details,
		 auto_blocked, reviewed, reviewed_by, reviewed_at, resolved, created_at
		FROM suspicious_activities %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, n, n+1),
		append(args, f.Limit, (f.Page-1)*f.Limit)...)
	if err != nil { return nil, 0, fmt.Errorf("list suspicious: %w", err) }
	defer rows.Close()
	var activities []domain.SuspiciousActivity
	for rows.Next() {
		var a domain.SuspiciousActivity
		if err := rows.Scan(&a.ID, &a.Category, &a.Severity, &a.UserID,
			&a.APIKeyID, &a.IP, &a.Details, &a.AutoBlocked, &a.Reviewed,
			&a.ReviewedBy, &a.ReviewedAt, &a.Resolved, &a.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan suspicious: %w", err)
		}
		activities = append(activities, a)
	}
	return activities, total, rows.Err()
}

func (r *AdminSecurityRepo) ReviewSuspicious(ctx context.Context, id, reviewerID string, reviewed bool, notes string) error {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE suspicious_activities SET reviewed=$2, reviewed_by=$3,
		 reviewed_at=NOW(), resolution_notes=$4 WHERE id=$1`,
		id, reviewed, reviewerID, notes)
	if err != nil { return fmt.Errorf("review suspicious: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("suspicious activity not found: %s", id) }
	return nil
}

// --- Impersonation ---

func (r *AdminSecurityRepo) StartImpersonation(ctx context.Context, adminID, targetUserID, reason string) (*domain.ImpersonationSession, error) {
	var s domain.ImpersonationSession
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO admin_impersonations (admin_id, target_user_id, reason)
		VALUES ($1,$2,$3) RETURNING id, admin_id, target_user_id, reason, started_at`,
		adminID, targetUserID, reason).
		Scan(&s.ID, &s.AdminID, &s.TargetUserID, &s.Reason, &s.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("start impersonation: %w", err)
	}
	return &s, nil
}

func (r *AdminSecurityRepo) EndImpersonation(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE admin_impersonations SET ended_at=NOW(), active=false WHERE id=$1 AND active=true`, id)
	if err != nil { return fmt.Errorf("end impersonation: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("impersonation not found or already ended: %s", id) }
	return nil
}
```

### Task 3.8: admin_features_repo.go

```go
package repository

import (
	"context"
	"fmt"
	"time"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type AdminFeaturesRepo struct{ db *db.DB }
func NewAdminFeaturesRepo(d *db.DB) *AdminFeaturesRepo { return &AdminFeaturesRepo{db: d} }

// --- Announcements ---

func (r *AdminFeaturesRepo) ListAnnouncements(ctx context.Context) ([]domain.Announcement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, title, body, priority, target_type, target_ids,
		 starts_at, ends_at, show_in_app, send_email, created_by, created_at, updated_at
		 FROM announcements ORDER BY created_at DESC`)
	if err != nil { return nil, fmt.Errorf("list announcements: %w", err) }
	defer rows.Close()
	var announcements []domain.Announcement
	for rows.Next() {
		var a domain.Announcement
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &a.Priority, &a.TargetType,
			&a.TargetIDs, &a.StartsAt, &a.EndsAt, &a.ShowInApp, &a.SendEmail,
			&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan announcement: %w", err)
		}
		announcements = append(announcements, a)
	}
	return announcements, rows.Err()
}

func (r *AdminFeaturesRepo) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO announcements (id, title, body, priority, target_type,
		 target_ids, starts_at, ends_at, show_in_app, send_email, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		a.ID, a.Title, a.Body, a.Priority, a.TargetType,
		a.TargetIDs, a.StartsAt, a.EndsAt, a.ShowInApp, a.SendEmail, a.CreatedBy)
	if err != nil { return fmt.Errorf("create announcement: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) UpdateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE announcements SET title=$2, body=$3, priority=$4, target_type=$5,
		 target_ids=$6, starts_at=$7, ends_at=$8, show_in_app=$9,
		 send_email=$10, updated_at=NOW()
		WHERE id=$1`,
		a.ID, a.Title, a.Body, a.Priority, a.TargetType,
		a.TargetIDs, a.StartsAt, a.EndsAt, a.ShowInApp, a.SendEmail)
	if err != nil { return fmt.Errorf("update announcement: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) DeleteAnnouncement(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM announcements WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("delete announcement: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("announcement not found: %s", id) }
	return nil
}

// --- Promo Codes ---

func (r *AdminFeaturesRepo) ListPromos(ctx context.Context) ([]domain.PromoCode, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, code, type, value, max_uses, current_uses, min_purchase,
		 expires_at, is_active, created_by, created_at
		 FROM promo_codes ORDER BY created_at DESC`)
	if err != nil { return nil, fmt.Errorf("list promos: %w", err) }
	defer rows.Close()
	var promos []domain.PromoCode
	for rows.Next() {
		var p domain.PromoCode
		if err := rows.Scan(&p.ID, &p.Code, &p.Type, &p.Value, &p.MaxUses,
			&p.CurrentUses, &p.MinPurchase, &p.ExpiresAt, &p.IsActive,
			&p.CreatedBy, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan promo: %w", err)
		}
		promos = append(promos, p)
	}
	return promos, rows.Err()
}

func (r *AdminFeaturesRepo) CreatePromo(ctx context.Context, p *domain.PromoCode) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO promo_codes (id, code, type, value, max_uses, min_purchase,
		 expires_at, is_active, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		p.ID, p.Code, p.Type, p.Value, p.MaxUses, p.MinPurchase,
		p.ExpiresAt, p.IsActive, p.CreatedBy)
	if err != nil { return fmt.Errorf("create promo: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) UpdatePromoStatus(ctx context.Context, id string, isActive bool) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE promo_codes SET is_active=$2 WHERE id=$1`, id, isActive)
	if err != nil { return fmt.Errorf("update promo status: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("promo not found: %s", id) }
	return nil
}

func (r *AdminFeaturesRepo) RedeemPromo(ctx context.Context, promoID, userID string) (*domain.PromoRedemption, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil { return nil, fmt.Errorf("begin tx: %w", err) }
	defer tx.Rollback(ctx)

	var p domain.PromoCode
	err = tx.QueryRow(ctx, `
		SELECT id, code, type, value, max_uses, current_uses, expires_at, is_active
		 FROM promo_codes WHERE id=$1 FOR UPDATE`, promoID).
		Scan(&p.ID, &p.Code, &p.Type, &p.Value, &p.MaxUses, &p.CurrentUses, &p.ExpiresAt, &p.IsActive)
	if err != nil { return nil, fmt.Errorf("get promo: %w", err) }

	if !p.IsActive { return nil, fmt.Errorf("promo not active: %s", promoID) }
	if p.ExpiresAt != nil && p.ExpiresAt.Before(time.Now()) { return nil, fmt.Errorf("promo expired: %s", promoID) }
	if p.MaxUses > 0 && p.CurrentUses >= p.MaxUses { return nil, fmt.Errorf("promo max uses reached: %s", promoID) }

	_, err = tx.Exec(ctx, `UPDATE promo_codes SET current_uses=current_uses+1 WHERE id=$1`, promoID)
	if err != nil { return nil, fmt.Errorf("increment promo uses: %w", err) }

	var redemption domain.PromoRedemption
	err = tx.QueryRow(ctx, `
		INSERT INTO promo_redemptions (promo_id, user_id, discount, credits_awarded)
		VALUES ($1,$2,$3,$4) RETURNING id, promo_id, user_id, discount, credits_awarded, created_at`,
		promoID, userID, p.Value, p.Value).
		Scan(&redemption.ID, &redemption.PromoID, &redemption.UserID,
			&redemption.Discount, &redemption.CreditsAwarded, &redemption.CreatedAt)
	if err != nil { return nil, fmt.Errorf("create redemption: %w", err) }

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit redemption: %w", err)
	}
	return &redemption, nil
}

// --- Reports ---

func (r *AdminFeaturesRepo) ListReports(ctx context.Context) ([]domain.ScheduledReport, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, frequency, format, sections, recipients,
		 next_send_at, last_sent_at, is_active, created_by, created_at
		 FROM scheduled_reports ORDER BY name`)
	if err != nil { return nil, fmt.Errorf("list reports: %w", err) }
	defer rows.Close()
	var reports []domain.ScheduledReport
	for rows.Next() {
		var r domain.ScheduledReport
		if err := rows.Scan(&r.ID, &r.Name, &r.Frequency, &r.Format, &r.Sections,
			&r.Recipients, &r.NextSendAt, &r.LastSentAt, &r.IsActive,
			&r.CreatedBy, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan report: %w", err)
		}
		reports = append(reports, r)
	}
	return reports, rows.Err()
}

func (r *AdminFeaturesRepo) CreateReport(ctx context.Context, report *domain.ScheduledReport) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO scheduled_reports (id, name, frequency, format, sections,
		 recipients, next_send_at, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		report.ID, report.Name, report.Frequency, report.Format, report.Sections,
		report.Recipients, report.NextSendAt, report.CreatedBy)
	if err != nil { return fmt.Errorf("create report: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) UpdateReport(ctx context.Context, report *domain.ScheduledReport) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE scheduled_reports SET name=$2, frequency=$3, format=$4,
		 sections=$5, recipients=$6, next_send_at=$7, is_active=$8, updated_at=NOW()
		WHERE id=$1`,
		report.ID, report.Name, report.Frequency, report.Format, report.Sections,
		report.Recipients, report.NextSendAt, report.IsActive)
	if err != nil { return fmt.Errorf("update report: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) DeleteReport(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM scheduled_reports WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("delete report: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("report not found: %s", id) }
	return nil
}

// --- Changelog ---

func (r *AdminFeaturesRepo) ListChangelog(ctx context.Context, includeDrafts bool) ([]domain.ChangelogEntry, error) {
	var query string
	if includeDrafts {
		query = `SELECT id, title, body, version, type, published_at, is_draft, created_at
		 FROM api_changelog ORDER BY created_at DESC`
	} else {
		query = `SELECT id, title, body, version, type, published_at, is_draft, created_at
		 FROM api_changelog WHERE is_draft=false ORDER BY created_at DESC`
	}
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil { return nil, fmt.Errorf("list changelog: %w", err) }
	defer rows.Close()
	var entries []domain.ChangelogEntry
	for rows.Next() {
		var e domain.ChangelogEntry
		if err := rows.Scan(&e.ID, &e.Title, &e.Body, &e.Version, &e.Type,
			&e.PublishedAt, &e.IsDraft, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan changelog: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *AdminFeaturesRepo) CreateChangelog(ctx context.Context, e *domain.ChangelogEntry) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO api_changelog (id, title, body, version, type, is_draft)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		e.ID, e.Title, e.Body, e.Version, e.Type, e.IsDraft)
	if err != nil { return fmt.Errorf("create changelog: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) PublishChangelog(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE api_changelog SET is_draft=false, published_at=NOW() WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("publish changelog: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("changelog not found: %s", id) }
	return nil
}

// --- User Groups ---

func (r *AdminFeaturesRepo) ListGroups(ctx context.Context) ([]domain.UserGroup, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, description, created_by, created_at, updated_at
		 FROM user_groups ORDER BY name`)
	if err != nil { return nil, fmt.Errorf("list groups: %w", err) }
	defer rows.Close()
	var groups []domain.UserGroup
	for rows.Next() {
		var g domain.UserGroup
		if err := rows.Scan(&g.ID, &g.Name, &g.Description,
			&g.CreatedBy, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}
		groups = append(groups, g)
	}
	return groups, rows.Err()
}

func (r *AdminFeaturesRepo) CreateGroup(ctx context.Context, g *domain.UserGroup) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO user_groups (id, name, description, created_by)
		VALUES ($1,$2,$3,$4)`,
		g.ID, g.Name, g.Description, g.CreatedBy)
	if err != nil { return fmt.Errorf("create group: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) UpdateGroup(ctx context.Context, g *domain.UserGroup) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE user_groups SET name=$2, description=$3, updated_at=NOW()
		WHERE id=$1`, g.ID, g.Name, g.Description)
	if err != nil { return fmt.Errorf("update group: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) DeleteGroup(ctx context.Context, id string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil { return fmt.Errorf("begin tx: %w", err) }
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM group_policies WHERE group_id=$1`, id)
	if err != nil { return fmt.Errorf("delete group policies: %w", err) }
	_, err = tx.Exec(ctx, `DELETE FROM user_group_members WHERE group_id=$1`, id)
	if err != nil { return fmt.Errorf("delete group members: %w", err) }
	tag, err := tx.Exec(ctx, `DELETE FROM user_groups WHERE id=$1`, id)
	if err != nil { return fmt.Errorf("delete group: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("group not found: %s", id) }

	return tx.Commit(ctx)
}

func (r *AdminFeaturesRepo) AddGroupMember(ctx context.Context, groupID, userID string) error {
	_, err := r.db.Pool.Exec(ctx,
		`INSERT INTO user_group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
		groupID, userID)
	if err != nil { return fmt.Errorf("add group member: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) RemoveGroupMember(ctx context.Context, groupID, userID string) error {
	tag, err := r.db.Pool.Exec(ctx,
		`DELETE FROM user_group_members WHERE group_id=$1 AND user_id=$2`, groupID, userID)
	if err != nil { return fmt.Errorf("remove group member: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("member not found in group") }
	return nil
}

func (r *AdminFeaturesRepo) SetGroupPolicy(ctx context.Context, p *domain.GroupPolicy) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO group_policies (id, group_id, policy_type, settings)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (group_id, policy_type) DO UPDATE SET settings=$4`,
		p.ID, p.GroupID, p.PolicyType, p.Settings)
	if err != nil { return fmt.Errorf("set group policy: %w", err) }
	return nil
}

// --- SSO ---

func (r *AdminFeaturesRepo) ListSSOConfigs(ctx context.Context) ([]domain.SSOConfig, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider, label, issuer, client_id, allowed_domains,
		 auto_provision, default_role, is_active, created_at, updated_at
		 FROM sso_configs ORDER BY provider`)
	if err != nil { return nil, fmt.Errorf("list sso configs: %w", err) }
	defer rows.Close()
	var configs []domain.SSOConfig
	for rows.Next() {
		var c domain.SSOConfig
		if err := rows.Scan(&c.ID, &c.Provider, &c.Label, &c.Issuer, &c.ClientID,
			&c.AllowedDomains, &c.AutoProvision, &c.DefaultRole,
			&c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan sso config: %w", err)
		}
		configs = append(configs, c)
	}
	return configs, rows.Err()
}

func (r *AdminFeaturesRepo) UpdateSSOConfig(ctx context.Context, c *domain.SSOConfig) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE sso_configs SET label=$2, issuer=$3, client_id=$4,
		 allowed_domains=$5, auto_provision=$6, default_role=$7, updated_at=NOW()
		WHERE id=$1`,
		c.ID, c.Label, c.Issuer, c.ClientID, c.AllowedDomains,
		c.AutoProvision, c.DefaultRole)
	if err != nil { return fmt.Errorf("update sso config: %w", err) }
	return nil
}

func (r *AdminFeaturesRepo) ToggleSSO(ctx context.Context, id string, isActive bool) error {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE sso_configs SET is_active=$2 WHERE id=$1`, id, isActive)
	if err != nil { return fmt.Errorf("toggle sso: %w", err) }
	if tag.RowsAffected() == 0 { return fmt.Errorf("sso config not found: %s", id) }
	return nil
}
```

- [ ] Write all 8 repository files (~1,350 lines total)
- [ ] Go test: `go test -race -count=1 -run "TestAdmin" ./internal/repository/...`
- [ ] Commit

## Phase 4: Service Layer

**Files:** `apps/backend/internal/service/{admin,audit}.go`

### Task 4.1: AdminService — admin.go

Struct: repos injected via constructor + `*AuditService` + `*db.DB`.
Methods (all follow: validate → exec → audit log):

**Users**: `ListUsers(ctx, filter)`, `GetUser(id)`, `UpdateUserStatus(id, status, reason, actorID, actorEmail)` (get old → UpdateStatus → auditLog), `UpdateUserRole`, `DeleteUser` (SoftDelete → auditLog), `BulkSuspendUsers`.

**Providers**: `CreateProvider(p, actor)` (return err), `GetProvider`, `ListProviders`, `ToggleProviderStatus`, `AddProviderKey`, `ListProviderKeys`, `DeleteProviderKey`.

**Models**: `ListModels(status)`, `UpdateModelStatus(id, status, replacement, actor)`, `CreateAlias`, `DeleteAlias`.

**Billing**: `AdjustCredits(uid, amount, reason, admin)` (return adj + auditLog), `RevenueSummary(from, to)`.

**Settings**: `ListSettings(group)`, `UpdateSetting(key, value, actor)` (old → Set → auditLog), `ToggleFeatureFlag(id, enabled, actor)`.

**Security**: `StartImpersonation(adminID, userID, reason)` (return session + auditLog), `StopImpersonation`.

**Dashboard**: `DashboardStats(ctx)` — inline SQL: 9 aggregation queries for total/active/suspended users, todays requests/tokens/revenue, providers count.

### Task 4.2: AuditService — audit.go

Buffered channel (capacity 1000) + background goroutine. `Log(action, targetType, targetID, changes, actorID, actorEmail)` — non-blocking send. Background: accumulate 100 entries OR 5-second ticker → batch insert. `Shutdown()` — graceful drain.

- [ ] **Step 1:** Write service files (~300 lines Go)
- [ ] **Step 2:** `go test -race -cover ./internal/service/...`
- [ ] **Step 3:** `git commit -m "feat: add admin service layer with audit"`

---

## Phase 5: Middleware

**File:** `apps/backend/internal/middleware/auth.go` (modified)

### Task 5.1: Add RequirePermission

```go
func RequirePermission(permission string) func(http.HandlerFunc) http.HandlerFunc {
    return func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            u := GetUser(r)
            if u == nil { response.Error(w, 401, "Auth required"); return }
            if !u.IsAdmin() { response.Error(w, 403, "Admin required"); return }
            admin := r.Context().Value(adminCtxKey).(*domain.AdminUser)
            if admin == nil { response.Error(w, 403, "Admin profile not found"); return }
            if !admin.HasPermission(permission) {
                response.Error(w, 403, "Insufficient permissions"); return
            }
            next(w, r)
        }
    }
}
```

Add `adminCtxKey` and `AdminContext` middleware that loads AdminUser from DB and injects into request context.

- [ ] **Step 1:** Modify auth.go, `go test -race ./internal/middleware/...`
- [ ] **Step 2:** `git commit -m "feat: add RequirePermission middleware"`

---

## Phase 6: Handlers

**18 files under `apps/backend/internal/handler/admin_*.go`**

### Task 6.1: admin_dashboard.go (1 handler)

`AdminDashboardStats` — call adminSvc.DashboardStats → response.OK

### Task 6.2: admin_users.go (9 handlers)

`AdminListUsers` — parse pagination + query params → ListUsers → Paginated
`AdminGetUser` — chi.URLParam → GetUser → OK
`AdminUpdateUserStatus` — chi.URLParam + JSON decode → UpdateUserStatus → OK
`AdminUpdateUserRole` — chi.URLParam + JSON decode → UpdateUserRole → OK
`AdminDeleteUser` — chi.URLParam → DeleteUser → OK
`AdminSearchUsers` — query param → SearchUserByEmail → OK
`AdminBulkSuspendUsers` — JSON decode userIDs + reason → BulkSuspendUsers → OK
`AdminStartImpersonation` — chi.URLParam + JSON reason → StartImpersonation → OK
`AdminStopImpersonation` — chi.URLParam → StopImpersonation → OK

### Task 6.3: admin_providers.go (12 handlers)

`AdminListProviders`, `AdminCreateProvider`, `AdminGetProvider`, `AdminUpdateProvider`, `AdminUpdateProviderStatus`, `AdminListProviderKeys`, `AdminCreateProviderKey`, `AdminUpdateProviderKey`, `AdminDeleteProviderKey`, `AdminReorderProviderKeys`, `AdminProviderHealth`.

### Task 6.4-6.18: Remaining handlers

**admin_models.go** (8): ListModels, CreateModel, UpdateModel, UpdateModelStatus, ListAliases, CreateAlias, UpdateAlias, DeleteAlias.
**admin_billing.go** (4): RevenueSummary, ListTransactions, AdjustCredits, ListAdjustments.
**admin_settings.go** (5): ListSettings, UpdateSetting, ListFeatureFlags, CreateFeatureFlag, UpdateFeatureFlag.
**admin_logs.go** (4): ListAuditLogs, ListErrors, ListIPAccessLogs, GetRequestTrace.
**admin_security.go** (4): SecurityDashboard, ListSuspicious, ReviewSuspicious, ListImpersonations.
**admin_ip.go** (3): ListIPEntries, AddIPEntry, RemoveIPEntry.
**admin_announcements.go** (3): List, Create, Update.
**admin_promos.go** (4): List, Create, UpdateStatus, GetRedemptions.
**admin_admins.go** (4): List, Create, UpdateRole, Remove.
**admin_groups.go** (7): List, Create, Update, Delete, AddMember, RemoveMember, SetPolicy.
**admin_reports.go** (8): Reports CRUD + SendNow, Changelog CRUD + Publish.
**admin_sso.go** (2): List, Update.
**admin_cost.go** (7): Optimizations List/Apply, Forecast, Breakdown, ABTests CRUD/Stop.
**admin_operations.go** (6): Cache Stats/Clear, Webhook Logs/Retry, Conversations List/Get.

Each follows: `chi.URLParam` / `r.URL.Query()` / `json.NewDecoder(r.Body)` → `adminSvc.Method()` → `response.OK/Error/Paginated`.

- [ ] **Step 1-18:** Write all handler files
- [ ] **Step 19:** `go test -race -cover ./internal/handler/...`
- [ ] **Step 20:** `git commit -m "feat: add admin HTTP handlers"`

---

## Phase 7: Route Wiring

**File:** `apps/backend/cmd/api/main.go` (modified)

### Task 7.1: Initialize dependencies

```go
// After db init:
adminUR := repository.NewAdminUserRepo(db)
adminPR := repository.NewAdminProviderRepo(db)
adminMR := repository.NewAdminModelRepo(db)
adminBR := repository.NewAdminBillingRepo(db)
adminSR := repository.NewAdminSettingsRepo(db)
adminAR := repository.NewAdminAuditRepo(db)
adminSecR := repository.NewAdminSecurityRepo(db)
adminFR := repository.NewAdminFeaturesRepo(db)
auditSvc := service.NewAuditService(adminAR, 1000)
adminSvc := service.NewAdminService(adminUR, adminPR, adminMR, adminBR, adminSR, adminAR, adminSecR, adminFR, auditSvc, db)
h.SetAdminService(adminSvc)
```

### Task 7.2: Register all routes (~100 endpoints)

```go
r.Group(func(r chi.Router) {
    r.Use(authMW); r.Use(appmiddleware.RequireAdmin)

    r.Get("/api/admin/dashboard", h.AdminDashboardStats)
    r.Get("/api/admin/users", h.AdminListUsers)
    r.Get("/api/admin/users/{id}", h.AdminGetUser)
    r.Put("/api/admin/users/{id}/status", h.AdminUpdateUserStatus)
    r.Put("/api/admin/users/{id}/role", h.AdminUpdateUserRole)
    r.Delete("/api/admin/users/{id}", h.AdminDeleteUser)
    r.Post("/api/admin/users/{id}/impersonate", h.AdminStartImpersonation)
    r.Post("/api/admin/impersonations/{id}/stop", h.AdminStopImpersonation)
    r.Post("/api/admin/users/bulk/suspend", h.AdminBulkSuspendUsers)
    // ... all remaining routes from the design
    r.Get("/api/admin/providers", h.AdminListProviders)
    r.Post("/api/admin/providers", h.AdminCreateProvider)
    r.Get("/api/admin/providers/{id}/keys", h.AdminListProviderKeys)
    r.Post("/api/admin/providers/{id}/keys", h.AdminCreateProviderKey)
    r.Put("/api/admin/providers/{id}/keys/reorder", h.AdminReorderProviderKeys)
    r.Get("/api/admin/models", h.AdminListModels)
    r.Put("/api/admin/models/{id}/status", h.AdminUpdateModelStatus)
    r.Get("/api/admin/aliases", h.AdminListAliases)
    r.Post("/api/admin/aliases", h.AdminCreateAlias)
    r.Get("/api/admin/billing/summary", h.AdminRevenueSummary)
    r.Post("/api/admin/billing/credits/adjust", h.AdminAdjustCredits)
    r.Get("/api/admin/settings", h.AdminListSettings)
    r.Put("/api/admin/settings/{key}", h.AdminUpdateSetting)
    r.Get("/api/admin/feature-flags", h.AdminListFeatureFlags)
    r.Put("/api/admin/feature-flags/{id}", h.AdminUpdateFeatureFlag)
    r.Get("/api/admin/logs/audit", h.AdminListAuditLogs)
    r.Get("/api/admin/security/suspicious", h.AdminListSuspicious)
    r.Put("/api/admin/security/suspicious/{id}", h.AdminReviewSuspicious)
    r.Get("/api/admin/ip", h.AdminListIPEntries)
    r.Post("/api/admin/ip", h.AdminAddIPEntry)
    r.Get("/api/admin/admins", h.AdminListAdminUsers)
    r.Post("/api/admin/admins", h.AdminCreateAdminUser)
    r.Get("/api/admin/announcements", h.AdminListAnnouncements)
    r.Post("/api/admin/announcements", h.AdminCreateAnnouncement)
    r.Get("/api/admin/promos", h.AdminListPromos)
    r.Post("/api/admin/promos", h.AdminCreatePromo)
    r.Get("/api/admin/groups", h.AdminListGroups)
    r.Post("/api/admin/groups", h.AdminCreateGroup)
    r.Post("/api/admin/groups/{id}/members", h.AdminAddGroupMember)
    r.Get("/api/admin/reports", h.AdminListReports)
    r.Post("/api/admin/reports", h.AdminCreateReport)
    r.Get("/api/admin/changelog", h.AdminListChangelog)
    r.Post("/api/admin/changelog/{id}/publish", h.AdminPublishChangelog)
    r.Get("/api/admin/sso", h.AdminListSSOConfigs)
    r.Put("/api/admin/sso/{id}", h.AdminUpdateSSOConfig)
    r.Get("/api/admin/cost/optimizations", h.AdminListOptimizations)
    r.Get("/api/admin/cost/forecast", h.AdminGetForecast)
    r.Get("/api/admin/cache/stats", h.AdminCacheStats)
    r.Post("/api/admin/cache/clear", h.AdminClearCache)
    r.Get("/api/admin/webhooks/logs", h.AdminListWebhookLogs)
    r.Post("/api/admin/webhooks/{id}/retry", h.AdminRetryWebhook)
})
```

- [ ] **Step 1:** Wire deps + routes, `go build ./cmd/api`
- [ ] **Step 2:** `git commit -m "feat: wire admin routes"`

---

## Phase 8: Frontend Types & SDK

**Files:** `types/admin.ts`, `lib/api/admin-sdk.ts`

### Task 8.1: TypeScript interfaces

All types matching Go DTOs: `UserStatus`, `ProviderStatus`, `KeyStrategy`, `ModelStatus`, `AdminRole`, `AdminUser`, `Provider`, `ProviderKey`, `ModelRegistry`, `ModelAlias`, `CreditAdjustment`, `UsageRecord`, `UsageDaily`, `SystemSetting`, `FeatureFlag`, `AuditLog`, `AdminUserProfile`, `IPListEntry`, `SuspiciousActivity`, `ImpersonationSession`, `Announcement`, `PromoCode`, `PromoRedemption`, `UserGroup`, `GroupPolicy`, `ScheduledReport`, `ChangelogEntry`, `SSOConfig`, `DashboardStats`, `PaginatedResponse<T>`, `RateLimitOverrides`.

### Task 8.2: AdminSDK class

80+ typed methods wrapping `getSDK()` calls. One method per endpoint:

```typescript
export class AdminSDK {
  private api = getSDK();
  getDashboard(): Promise<DashboardStats> {
    return this.api.get("/api/admin/dashboard");
  }
  listUsers(params?): Promise<PaginatedResponse<AdminUser>> {
    return this.api.get("/api/admin/users", { params });
  }
  getUser(id): Promise<AdminUser> {
    return this.api.get(`/api/admin/users/${id}`);
  }
  updateUserStatus(id, status, reason?): Promise<void> {
    return this.api.put(`/api/admin/users/${id}/status`, { status, reason });
  }
  deleteUser(id): Promise<void> {
    return this.api.delete(`/api/admin/users/${id}`);
  }
  searchUsers(email): Promise<AdminUser> {
    return this.api.get(
      `/api/admin/users/search?email=${encodeURIComponent(email)}`,
    );
  }
  impersonateUser(id, reason): Promise<ImpersonationSession> {
    return this.api.post(`/api/admin/users/${id}/impersonate`, { reason });
  }
  listProviders(): Promise<Provider[]> {
    return this.api.get("/api/admin/providers");
  }
  createProvider(data): Promise<Provider> {
    return this.api.post("/api/admin/providers", data);
  }
  listProviderKeys(pid): Promise<ProviderKey[]> {
    return this.api.get(`/api/admin/providers/${pid}/keys`);
  }
  createProviderKey(pid, data): Promise<ProviderKey> {
    return this.api.post(`/api/admin/providers/${pid}/keys`, data);
  }
  deleteProviderKey(pid, kid): Promise<void> {
    return this.api.delete(`/api/admin/providers/${pid}/keys/${kid}`);
  }
  listModels(status?): Promise<ModelRegistry[]> {
    return this.api.get("/api/admin/models", { params: { status } });
  }
  listAliases(): Promise<ModelAlias[]> {
    return this.api.get("/api/admin/aliases");
  }
  createAlias(data): Promise<ModelAlias> {
    return this.api.post("/api/admin/aliases", data);
  }
  adjustCredits(userId, amount, reason): Promise<CreditAdjustment> {
    return this.api.post("/api/admin/billing/credits/adjust", {
      userId,
      amount,
      reason,
    });
  }
  listSettings(group?): Promise<SystemSetting[]> {
    return this.api.get("/api/admin/settings", { params: { group } });
  }
  updateSetting(key, value): Promise<void> {
    return this.api.put(`/api/admin/settings/${key}`, { value });
  }
  listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.api.get("/api/admin/feature-flags");
  }
  toggleFeatureFlag(id, enabled): Promise<void> {
    return this.api.put(`/api/admin/feature-flags/${id}`, { enabled });
  }
  // ... repeat for all 80+ endpoints
}
```

- [ ] **Step 1:** Write types/admin.ts
- [ ] **Step 2:** Write lib/api/admin-sdk.ts
- [ ] **Step 3:** `git commit -m "feat: add admin types and SDK"`

---

## Phase 9: Frontend Layout & Shared Components

**Files:** `app/admin/layout.tsx`, `components/admin/*.tsx` (8 files)

### Task 9.1: AdminLayout (`app/admin/layout.tsx`)

Server component: `auth()` → check role === "admin" → redirect or render AdminSidebar + children. Wrap with React Query providers.

### Task 9.2: AdminSidebar (`components/admin/AdminSidebar.tsx`)

Client component. 8 nav sections with icons (lucide-react):

| Section    | Items                                                   |
| ---------- | ------------------------------------------------------- |
| Overview   | Dashboard                                               |
| Management | Users, API Keys, Providers, Models, Aliases, Rate Tiers |
| Financial  | Billing, Cost Intelligence, Promo Codes                 |
| Security   | Security Dashboard, IP Lists, Audit Trail               |
| Monitoring | Logs, Errors, Traces, Webhooks                          |
| Operations | Cache, Conversations, Files                             |
| Content    | Announcements, Changelog, Scheduled Reports             |
| Admin      | Admins, Settings, Feature Flags, SSO, Groups            |

Active route highlighting via `usePathname()`. Collapsible on mobile.

### Task 9.3: AdminDataTable (`components/admin/AdminDataTable.tsx`)

Generic: `columns: ColumnDef[]`, `data: T[]`, `loading`, `error`, `sortable`, `searchable`, `filterable`, `paginated`, `selectable`, `exportable` (CSV).

### Task 9.4: Small components

`StatusBadge.tsx` (color-coded by status value), `StatCard.tsx` (icon + value + label + trend arrow), `ConfirmDialog.tsx` (modal with confirm/cancel), `FilterBar.tsx` (date range + status + search), `PageHeader.tsx` (title + description + actions).

- [ ] **Step 1-8:** Write layout + all components
- [ ] **Step 9:** `cd apps/web && npm run build` (verify no errors)
- [ ] **Step 10:** `git commit -m "feat: add admin layout and shared components"`

---

## Phase 10: Frontend Pages (Core)

**Files under `apps/web/app/admin/`**

### Task 10.1: Dashboard (`page.tsx`)

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { AdminSDK, StatCard } from "@/components/admin";
const sdk = new AdminSDK();
export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => sdk.getDashboard(),
    refetchInterval: 60000,
  });
  if (isLoading)
    return <div className="animate-pulse grid grid-cols-4 gap-4 h-24" />;
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Platform overview" />
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Users" value={data?.users.total ?? 0} />
        <StatCard title="Active Today" value={data?.users.activeToday ?? 0} />
        <StatCard
          title="Requests Today"
          value={data?.requests.totalToday?.toLocaleString() ?? 0}
        />
        <StatCard
          title="Revenue Today"
          value={`$${((data?.revenue.todayCents ?? 0) / 100).toFixed(2)}`}
        />
      </div>
    </div>
  );
}
```

### Task 10.2-10.8: Other core pages

**Users List** (`users/page.tsx`): AdminDataTable with name/email/role/status/keys/lastActive. Search, status filter, bulk suspend, row actions.

**User Detail** (`users/[id]/page.tsx`): Profile card + activity timeline + usage chart + keys list + credits history + action buttons.

**Keys** (`keys/page.tsx`): All keys table, revoke action.

**Providers** (`providers/page.tsx`): Health card grid + add button.

**Provider Detail** (`providers/[id]/page.tsx`): Config panel + key manager (add/edit/delete/reorder + strategy progress bars) + health history chart.

**Models** (`models/page.tsx`): Table with status management.

**Aliases** (`models/aliases/page.tsx`): Table + create/edit form.

- [ ] **Step 1-8:** Write all core pages
- [ ] **Step 9:** `npm run build`
- [ ] **Step 10:** `git commit -m "feat: add core admin pages"`

---

## Phase 11: Frontend Pages (Extended)

### Task 11.1-11.12: Extended pages

**Billing** (`billing/page.tsx`): Revenue stat cards + chart + recent transactions + adjust button.

**Credit Adjustments** (`billing/adjustments/page.tsx`): Table + form.

**Settings** (`settings/page.tsx`): Grouped settings, per-type editors.

**Feature Flags** (`settings/feature-flags/page.tsx`): Toggle table.

**Logs** (`logs/page.tsx`): Filtered AdminDataTable.

**Security** (`security/page.tsx`): Dashboard stats + suspicious queue + impersonations list.

**Audit Trail** (`audit/page.tsx`): Timeline + filtered table + export.

**IP Lists** (`ip/page.tsx`): Tabs (allow/block) + table + add form.

**Admin Users** (`admins/page.tsx`): Table + grant/revoke forms.

**Cost Intelligence** (`cost/page.tsx`): Optimizations + forecast + AB tests.

**Announcements** (`announcements/page.tsx`): CRUD with preview.

**Promos** (`promos/page.tsx`): CRUD + redemptions.

- [ ] **Step 1-12:** Write all extended pages
- [ ] **Step 13:** `npm run build && npm run test`
- [ ] **Step 14:** `git commit -m "feat: add extended admin pages"`

---

## Phase 12: Testing & Documentation

### Task 12.1: Backend integration tests

`testutil.NewTestServer()` + seed admin user → test admin auth guard (401/403), test user CRUD flow, test provider key management, test credit adjustment + audit log, test impersonation lifecycle.

### Task 12.2: Frontend tests

Vitest: mock fetch for AdminSDK methods, test error handling, test pagination helpers. React Query test utils for hook tests.

### Task 12.3: E2E (Playwright)

Login as admin → navigate all sidebar sections → verify each page loads → perform status change → verify audit log.

### Task 12.4: Documentation

Update `AGENTS.md`: add admin endpoint table (group by domain, show method/path/permission). Update `README.md`: admin setup instructions, first admin creation.

- [ ] **Step 1:** Write backend tests
- [ ] **Step 2:** Write frontend tests
- [ ] **Step 3:** Write E2E tests
- [ ] **Step 4:** Update docs
- [ ] **Step 5:** Full verification: `make test && npm run test && bash scripts/smoke-test.sh`
- [ ] **Step 6:** `git commit -m "docs: add admin tests and documentation"`

---

## Summary: Complete File Inventory

| Phase              | Files                      | Est. Lines | Description                         |
| ------------------ | -------------------------- | ---------- | ----------------------------------- |
| 1. Migration       | `007_admin_schema.sql`     | 880        | 35+ tables, indexes, partitions     |
| 2. Domain          | `internal/domain/admin.go` | 550        | Types, enums, structs, filters      |
| 3. Repositories    | 8 repo files               | 1,800      | SQL data access with error wrapping |
| 4. Services        | 2 service files            | 600        | Business logic + audit worker       |
| 5. Middleware      | auth.go (mod)              | 60         | RequirePermission                   |
| 6. Handlers        | 18 handler files           | 2,500      | 100+ HTTP handlers                  |
| 7. Routes          | main.go (mod)              | 200        | Route registration                  |
| 8. Types/SDK       | 2 TS files                 | 500        | TypeScript + AdminSDK               |
| 9. Components      | 8 TSX files                | 450        | Layout, table, badges               |
| 10. Core Pages     | 8 TSX files                | 800        | Dashboard, users, providers, models |
| 11. Extended Pages | 12 TSX files               | 700        | Billing, security, settings, logs   |
| 12. Tests/Docs     | ~10 files                  | 600        | Backend + frontend + E2E            |
| **Total**          | **~70 files**              | **~9,500** | **Complete admin panel**            |

### Verification

```bash
cd apps/backend && go build ./cmd/api && go test -race -cover ./...
cd apps/web && npm run build && npm run test
bash scripts/smoke-test.sh
```
