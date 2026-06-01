<!-- Generated: 2026-05-29 | Files scanned: 21 migrations + 5 Drizzle tables + 40+ admin tables | Token estimate: ~700 -->

# Data Architecture Codemap — Database Schema & Migrations

**Primary Database**: PostgreSQL 16
**Dual Schema Management**:
- **Backend (production)**: Raw SQL migrations in `apps/backend/migrations/` (20 files, hand-applied)
- **Frontend (dev)**: Drizzle ORM in `apps/web/db/schema.ts` (5 core tables, `drizzle-kit push`)

---

## Core Domain Model (Shared)

### `users`
Primary user accounts with RBAC.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | Display name |
| `email` | `text` | NOT NULL, UNIQUE | Login identifier |
| `password` | `text` | nullable | bcrypt hash (null for OAuth-only) |
| `role` | `text` | NOT NULL, default `'user'` | `user` \| `admin` \| `superadmin` |
| `created_at` | `timestamp` | NOT NULL, `now()` | |

**Relations**: 1:* `api_keys`, 1:* `api_logs`, 1:1 `user_credits`, 1:* `credit_transactions`, 1:* `conversations`, 1:* `webhooks`, 1:* `organizations` (owner), 1:* `files`, 1:* `batch_jobs`

---

### `api_keys`
Programmatic access credentials.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | Owner |
| `name` | `text` | NOT NULL | Human-readable label |
| `key` | `text` | NOT NULL, UNIQUE | Format: `dra_<64 hex>`; stored as HMAC-SHA256 hash |
| `last_used` | `timestamp` | nullable | Updated on each use |
| `created_at` | `timestamp` | NOT NULL, `now()` | |
| `revoked_at` | `timestamp` | nullable | Soft delete (null = active) |

**Domain-only fields** (not in DDL, added in Go model):
- `allowed_models`, `allowed_ips`, `max_tokens_per_request`, `daily_request_limit`, `monthly_token_limit`

**Indexes**: `api_keys_user_id_idx`

---

### `api_logs`
Complete audit trail for all AI inference requests.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `api_key_id` | `uuid` | FK → `api_keys.id`, nullable | Null if JWT/session auth |
| `model` | `text` | NOT NULL | e.g., `gpt-4o`, `claude-3-5-sonnet` |
| `provider` | `text` | NOT NULL | `openai`, `anthropic`, `gemini`, etc. |
| `input_tokens` | `integer` | NOT NULL | |
| `output_tokens` | `integer` | NOT NULL | |
| `cost` | `integer` | NOT NULL | Microcents/credits |
| `latency` | `integer` | NOT NULL | Milliseconds |
| `status` | `text` | NOT NULL | `success` \| `error` |
| `error_message` | `text` | nullable | Only if `status=error` |
| `created_at` | `timestamp` | NOT NULL, `now()` | |

**Indexes**: `api_logs_user_id_idx`, `api_logs_api_key_id_idx`, `api_logs_created_at_idx`

---

### `user_credits`
Current balance and budget tracking (one-to-one with users).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id`, UNIQUE, NOT NULL | |
| `balance` | `integer` | NOT NULL, default 0 | Microcents |
| `total_purchased` | `integer` | NOT NULL, default 0 | Lifetime |
| `total_spent` | `integer` | NOT NULL, default 0 | Lifetime |
| `monthly_budget` | `integer` | nullable | Soft limit |
| `daily_budget` | `integer` | nullable | Soft limit |
| `daily_spent` | `integer` | default 0 | Reset daily |
| `monthly_spent` | `integer` | default 0 | Reset monthly |
| `budget_reset_at` | `timestamp` | nullable | Next reset |
| `updated_at` | `timestamp` | NOT NULL, `now()` | |

**Indexes**: `user_credits_user_id_idx`

---

### `credit_transactions`
Immutable ledger of all credit movements.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `amount` | `integer` | NOT NULL | Positive = purchase, negative = usage |
| `type` | `text` | NOT NULL | `purchase` \| `usage` \| `refund` \| `bonus` |
| `description` | `text` | NOT NULL | Human-readable |
| `related_log_id` | `uuid` | FK → `api_logs.id`, nullable | Links usage to request |
| `stripe_payment_id` | `text` | nullable | Stripe reference |
| `created_at` | `timestamp` | NOT NULL, `now()` | |

**Indexes**: `credit_transactions_user_id_idx`, `credit_transactions_created_at_idx`

---

## Chat & Conversation Tables

### `conversations`
Thread grouping for chat history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users |
| `title` | `text` | Auto-generated or user-edited |
| `model` | `text` | Primary model used |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

### `messages`
Individual turns within a conversation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `conversation_id` | `uuid` | FK → conversations |
| `role` | `text` | `user` \| `assistant` \| `system` \| `tool` |
| `content` | `text` | Message text |
| `tokens` | `integer` | Token count for this message |
| `created_at` | `timestamp` | |

---

## Prompt & Template System

### `prompts`
Reusable prompt templates (Go `text/template` syntax).

| Column | Type | Description |
|--------|------|-------------|
| `name` | `text` | PK (unique identifier) |
| `content` | `text` | Template body with `{{.Vars}}` |
| `description` | `text` | Human-readable purpose |
| `template` | `boolean` | Is this a template vs. static? |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

**Usage**: `service/prompt.go:RenderPrompt(name, vars)` → interpolated string

---

## Webhook System

### `webhooks`
Outbound event subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users |
| `url` | `text` | Destination endpoint |
| `secret` | `text` | HMAC-SHA256 signing key |
| `events` | `text[]` | Subscribed event types (e.g., `request.completed`, `credit.depleted`) |
| `headers` | `jsonb` | Custom headers to include |
| `active` | `boolean` | Enabled/disabled toggle |
| `created_at` | `timestamp` | |

### `webhook_deliveries`
Delivery attempts and retry tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `webhook_id` | `uuid` | FK → webhooks |
| `event_type` | `text` | e.g., `request.completed` |
| `payload` | `bytea` | Serialized event body |
| `status_code` | `integer` | HTTP response from destination |
| `error` | `text` | Error message on failure |
| `attempts` | `integer` | Current attempt count |
| `max_attempts` | `integer` | Default: 5 |
| `delivered_at` | `timestamp` | Success timestamp |
| `next_retry_at` | `timestamp` | Exponential backoff schedule |
| `created_at` | `timestamp` | |

**Retry Policy**: 10s, 30s, 1m, 5m, 15m (configurable in `service/webhook.go`)

---

## Organization & Collaboration

### `organizations`
Team workspaces.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `name` | `text` | Org display name |
| `owner_id` | `uuid` | FK → users (creator) |
| `plan` | `text` | `free` \| `pro` \| `enterprise` |
| `created_at` | `timestamp` | |

### `organization_members`
Membership junction table.

| Column | Type | Description |
|--------|------|-------------|
| `org_id` | `uuid` | FK → organizations |
| `user_id` | `uuid` | FK → users |
| `role` | `text` | `owner` \| `admin` \| `member` \| `viewer` |
| `joined_at` | `timestamp` | |

### `invites`
Pending membership invitations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `org_id` | `uuid` | FK → organizations |
| `email` | `text` | Invited email |
| `role` | `text` | Role to grant on acceptance |
| `token` | `text` | Unique invite token |
| `expires_at` | `timestamp` | 7-day default |
| `used_at` | `timestamp` | Null until accepted |
| `created_at` | `timestamp` | |

---

## File & Batch Operations

### `files`
Uploaded attachments (for future multi-modal, batch, fine-tuning).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users |
| `name` | `text` | Original filename |
| `mime_type` | `text` | MIME type |
| `size` | `integer` | Bytes |
| `storage_path` | `text` | Object storage path (S3-compatible) |
| `created_at` | `timestamp` | |

### `batch_jobs`
Asynchronous batch inference jobs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users |
| `status` | `text` | `pending` \| `processing` \| `completed` \| `failed` |
| `items` | `jsonb` | Input batch items |
| `results` | `jsonb` | Completed results |
| `error` | `text` | Failure reason |
| `progress` | `integer` | Items completed |
| `total` | `integer` | Total items |
| `created_at` | `timestamp` | |
| `started_at` | `timestamp` | |
| `ended_at` | `timestamp` | |

---

## Fine-Tuning System

### `fine_tuning_jobs`
Model fine-tuning job queue.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users |
| `base_model` | `text` | e.g., `gpt-3.5-turbo` |
| `dataset_id` | `uuid` | FK → files (JSONL) |
| `status` | `text` | `queued` \| `running` \| `completed` \| `failed` |
| `progress` | `integer` | 0-100 |
| `error` | `text` | Failure reason |
| `result_model` | `text` | Fine-tuned model ID on success |
| `created_at` | `timestamp` | |
| `started_at` | `timestamp` | |
| `completed_at` | `timestamp` | |

### `fine_tuning_datasets`
(Extends `files` for fine-tuning-specific metadata)

---

## Admin & Platform Management

### Core Admin Tables (from migration `007_admin_schema.sql`)

| Table | Purpose |
|-------|---------|
| `settings` | Key-value platform configuration |
| `feature_flags` | Toggleable features per environment |
| `audit_logs` | Admin action trail (who, what, when, before/after) |
| `announcements` | Platform-wide user notifications |
| `promo_codes` | Discount/referral codes |
| `promo_redemptions` | Usage tracking for promos |
| `sso_configs` | OIDC provider settings (issuer, client_id, domain_restriction) |
| `scheduled_reports` | Automated report generation jobs |
| `changelog` | Public-facing release notes |
| `groups` / `group_members` | User grouping for RBAC |
| `ip_entries` | IP allowlist/denylist |
| `admin_users` | Admin-only user subset (separate from `users.role=admin`) |
| `provider_keys` | Encrypted LLM provider API keys |
| `model_aliases` | User-friendly → canonical model name mappings |
| `suspicious_activities` | Security event log (failed logins, abuse patterns) |

### RBAC Tables (from `008_rbac.sql`)

| Table | Purpose |
|-------|---------|
| `roles` | Role definitions (e.g., `superadmin`, `moderator`, `viewer`) |
| `role_permissions` | Permission grants per role |
| `user_roles` | User → role assignments |

**Permissions** (examples): `users.read`, `users.write`, `providers.read`, `providers.write`, `billing.read`, `billing.write`, `settings.read`, `settings.write`, `analytics.read`, `*` (wildcard for superadmin)

### Additional Admin Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `admin_sessions` | `008_admin_sessions.sql` | Separate admin session tracking |
| `rate_limit_tiers` / `user_rate_limits` | `009_rate_limits.sql`, `017_user_rate_limits.sql` | Configurable per-user rate limits |
| `budget_alerts` / `budget_caps` | `010_budget_alerts.sql` | Alert thresholds + hard spending blocks |
| `comparisons` / `comparison_results` | `011_ab_comparison.sql` | A/B testing sessions and ratings |
| `provider_plugins` | `013_provider_plugins.sql` | Dynamic provider registration |
| `export_jobs` | `014_exports.sql` | Async export job tracking |
| `admin_messages` | `015_admin_messages.sql` | Admin → user broadcast messages |
| `token_blacklist` | `018_token_blacklist.sql` | Revoked JWT storage (for logout enforcement) |

---

## Password & Security

### `password_resets`
One-time password reset tokens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `email` | `text` | Target user email |
| `token` | `text` | Unique reset token |
| `expires_at` | `timestamp` | 1-hour expiry |
| `used_at` | `timestamp` | Null until used |
| `created_at` | `timestamp` | |

---

## ERD (Simplified)

```
users
├── 1:* api_keys (hashed at rest)
├── 1:* api_logs
├── 1:1 user_credits
├── 1:* credit_transactions
├── 1:* conversations → 1:* messages
├── 1:* webhooks → 1:* webhook_deliveries
├── 1:* organizations (as owner) → *:* users (via organization_members)
├── 1:* files
├── 1:* batch_jobs
└── 1:* fine_tuning_jobs

api_logs → credit_transactions (via related_log_id)

users → roles (via user_roles) → permissions (via role_permissions)
```

---

## Migration History (20 files, sequential)

| # | File | Key Tables Added |
|---|------|------------------|
| 001 | `001_base_schema.sql` | `users`, `api_keys`, `api_logs`, `user_credits`, `credit_transactions` |
| 002 | `002_new_features.sql` | `conversations`, `messages`, `prompts` |
| 003 | `003_org_support.sql` | `organizations`, `organization_members`, `invites` |
| 004 | `004_files_and_budget.sql` | `files`, `password_resets` |
| 005 | `005_password_resets.sql` | (extends password_resets) |
| 006 | `006_webhook_deliveries.sql` | `webhooks`, `webhook_deliveries` |
| 007 | `007_admin_schema.sql` | 13 admin tables (settings, audit, SSO, promos, etc.) |
| 008 | `008_admin_sessions.sql` + `008_rbac.sql` | `admin_sessions`, `roles`, `role_permissions`, `user_roles` |
| 009 | `009_rate_limits.sql` | `rate_limit_tiers`, `user_rate_limits` |
| 010 | `010_budget_alerts.sql` | `budget_alerts`, `budget_caps` |
| 011 | `011_ab_comparison.sql` | `comparisons`, `comparison_results` |
| 012 | `012_fine_tuning.sql` | `fine_tuning_jobs`, `fine_tuning_datasets` |
| 013 | `013_provider_plugins.sql` | `provider_plugins` |
| 014 | `014_exports.sql` | `export_jobs` |
| 015 | `015_admin_messages.sql` | `admin_messages` |
| 016 | `016_webhook_retry.sql` | (extends webhook_deliveries) |
| 017 | `017_user_rate_limits.sql` | (extends rate_limits) |
| 018 | `018_token_blacklist.sql` | `token_blacklist` |
| 019 | `019_docs_base_url.sql` | (extends settings) |

**Application**: Hand-applied via `psql $DATABASE_URL -f <file>`. Forward-only, no auto-rollback.

---

## Indexes (Performance-Critical)

| Index | Table | Purpose |
|-------|-------|---------|
| `api_keys_user_id_idx` | `api_keys` | User's key list |
| `api_logs_user_id_idx` | `api_logs` | User's request history |
| `api_logs_api_key_id_idx` | `api_logs` | Key-scoped logs |
| `api_logs_created_at_idx` | `api_logs` | Time-range queries (analytics) |
| `user_credits_user_id_idx` | `user_credits` | Balance lookup (hot path) |
| `credit_transactions_user_id_idx` | `credit_transactions` | Transaction history |
| `credit_transactions_created_at_idx` | `credit_transactions` | Time-range financial reports |

---

## Data Access Patterns

| Pattern | Location | Notes |
|---------|----------|-------|
| **Hot-path caching** | `repository/cached_*.go` | 5-min TTL for `api_keys`, `user_credits`, `users` |
| **Atomic deduction** | `credits.go:DeductAtomic` | Prevents race conditions on balance updates |
| **Soft deletes** | `revoked_at`, `active` flags | Never hard-delete audit-sensitive records |
| **Immutable ledgers** | `api_logs`, `credit_transactions` | Append-only, no updates |
| **Async side effects** | Webhooks, exports, fine-tuning | Queue-based, retry with backoff |

---

## Critical Invariants

1. **API keys are never stored in plaintext** — only HMAC-SHA256 hash returned on read
2. **Credit deductions are async** — log written + credits deducted in goroutine after response sent
3. **Audit tables are append-only** — `audit_logs`, `api_logs`, `webhook_deliveries` never updated
4. **Budget enforcement** — `quota.go` middleware checks `user_credits` before allowing request
5. **Token blacklist** — revoked JWTs checked on every authenticated request (Redis or DB)
