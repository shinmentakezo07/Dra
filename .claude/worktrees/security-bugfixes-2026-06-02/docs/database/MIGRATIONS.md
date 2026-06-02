# Database Migrations

> Complete migration history for the DRA Platform (Yapapa).
> Backend: `apps/backend/migrations/` (raw SQL)
> Frontend: `apps/web/db/schema.ts` (Drizzle ORM)

---

## Migration Strategy

The platform uses a **dual migration approach**:

| System                 | Tool                                 | Purpose                                  |
| ---------------------- | ------------------------------------ | ---------------------------------------- |
| Frontend (development) | Drizzle ORM `drizzle-kit push`       | Fast schema iteration during development |
| Backend (production)   | Hand-applied raw SQL                 | Controlled, versioned migrations         |
| Seeding                | `db/seed.ts` + `internal/db/seed.go` | Demo data and initial setup              |

---

## Backend Migrations

Raw SQL migration files in `apps/backend/migrations/` — numbered sequentially, applied once in order. No auto-rollback; migrations are forward-only.

### Migration List

| #   | File                         | Tables Added                                                                                                                                                                                            | Description                                                                                                                                                   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | `001_base_schema.sql`        | `users`, `api_keys`, `api_logs`, `user_credits`, `credit_transactions`                                                                                                                                  | Initial schema: user accounts, API keys with HMAC hashing, request logs, credit system with transactions                                                      |
| 002 | `002_new_features.sql`       | `conversations`, `messages`, `prompts`                                                                                                                                                                  | Chat conversations with message history, Go-template prompt system                                                                                            |
| 003 | `003_org_support.sql`        | `organizations`, `organization_members`, `invites`                                                                                                                                                      | Team workspaces with member roles and email-based invitations                                                                                                 |
| 004 | `004_files_and_budget.sql`   | `files`, `password_resets`                                                                                                                                                                              | File uploads for attachments, password reset tokens with 1-hour expiry                                                                                        |
| 005 | `005_password_resets.sql`    | (extends password_resets)                                                                                                                                                                               | Additional password reset infrastructure                                                                                                                      |
| 006 | `006_webhook_deliveries.sql` | `webhooks`, `webhook_deliveries`                                                                                                                                                                        | Outbound webhook system with delivery tracking, retry, and DLQ                                                                                                |
| 007 | `007_admin_schema.sql`       | `settings`, `feature_flags`, `audit_logs`, `announcements`, `promo_codes`, `promo_redemptions`, `sso_configs`, `scheduled_reports`, `changelog`, `groups`, `group_members`, `ip_entries`, `admin_users` | Complete admin infrastructure: platform settings, audit logging, promotional codes, SSO config, scheduled reports, changelog, IP management, admin user roles |
| 008 | `008_admin_sessions.sql`     | `admin_sessions`                                                                                                                                                                                        | Admin session tracking and management                                                                                                                         |
| 008 | `008_rbac.sql`               | `roles`, `role_permissions`, `user_roles`                                                                                                                                                               | RBAC system: role definitions, permission assignments, user-to-role mapping                                                                                   |
| 009 | `009_rate_limits.sql`        | `rate_limit_tiers`, `user_rate_limits`                                                                                                                                                                  | Configurable rate limit tiers with per-user overrides                                                                                                         |
| 010 | `010_budget_alerts.sql`      | `budget_alerts`, `budget_caps`                                                                                                                                                                          | Budget threshold alerts (percentage-based) and hard spending caps (block/warn/notify actions)                                                                 |
| 011 | `011_ab_comparison.sql`      | `comparisons`, `comparison_results`                                                                                                                                                                     | Model A/B testing: comparison sessions with per-model ratings and results                                                                                     |
| 012 | `012_fine_tuning.sql`        | `fine_tuning_jobs`, `fine_tuning_datasets`                                                                                                                                                              | Model fine-tuning: job management, dataset uploads with JSONL format                                                                                          |
| 013 | `013_provider_plugins.sql`   | `provider_plugins`                                                                                                                                                                                      | Custom provider plugin system for extensible LLM integrations                                                                                                 |
| 014 | `014_exports.sql`            | `export_jobs`                                                                                                                                                                                           | Async data export jobs (logs, usage, audit) with CSV/JSON format options                                                                                      |
| 015 | `015_admin_messages.sql`     | `admin_messages`                                                                                                                                                                                        | System messaging: admin-to-user message broadcasting with read tracking                                                                                       |
| 016 | `016_webhook_retry.sql`      | (extends webhook_deliveries)                                                                                                                                                                            | Webhook retry improvements: max attempts tracking, next retry scheduling                                                                                      |
| 017 | `017_user_rate_limits.sql`   | (extends rate_limits)                                                                                                                                                                                   | Per-user rate limit customization                                                                                                                             |
| 018 | `018_token_blacklist.sql`    | `token_blacklist`                                                                                                                                                                                       | JWT token blacklist for logout enforcement                                                                                                                    |
| 019 | `019_docs_base_url.sql`      | (extends settings)                                                                                                                                                                                      | Documentation base URL configuration                                                                                                                          |

### Applying Migrations

Migrations are hand-applied (no auto-migrator):

```bash
# Apply a single migration
psql $DATABASE_URL -f apps/backend/migrations/016_webhook_retry.sql

# Apply all pending migrations (sequential order)
for f in $(ls apps/backend/migrations/*.sql | sort); do
  echo "Applying $f..."
  psql $DATABASE_URL -f "$f"
done
```

The backend also runs `db.AutoMigrate()` on startup (in `internal/db/migrate.go`), which handles the admin schema auto-setup.

---

## Frontend Schema (Drizzle ORM)

The Drizzle schema at `apps/web/db/schema.ts` manages 5 core tables:

| Table                 | Columns                                                                                                                                   | Relations                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `users`               | id, name, email, password, role, created_at                                                                                               | Has many api_keys, api_logs; has one user_credits |
| `api_keys`            | id, user_id, name, key, last_used, created_at, revoked_at                                                                                 | Belongs to users                                  |
| `api_logs`            | id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at                   | Belongs to users, api_keys                        |
| `user_credits`        | id, user_id, balance, total_purchased, total_spent, monthly_budget, daily_budget, daily_spent, monthly_spent, budget_reset_at, updated_at | Belongs to users (one-to-one)                     |
| `credit_transactions` | id, user_id, amount, type, description, related_log_id, stripe_payment_id, created_at                                                     | Belongs to users, api_logs                        |

### Drizzle Schema Pattern

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Commands

```bash
cd apps/web
npm run db:push      # Push current schema (drizzle-kit push)
npm run db:seed      # Seed demo data
npm run db:setup     # Push + seed (combined)
```

**Note:** Drizzle uses `@neondatabase/serverless` driver even against local PostgreSQL.

---

## Seed Data

### Frontend Seed (`apps/web/db/seed.ts`)

Populates:

- Demo user accounts (test users with known credentials)
- Sample API keys (pre-generated for demo users)
- Initial credit balances for testing
- Sample transaction history

### Backend Auto-Seed (`internal/db/seed.go`)

The backend runs `db.AutoSeed()` on startup if tables are empty. This ensures:

- Default admin user is provisioned (if no admin exists)
- Initial platform settings are configured
- System feature flags are initialized

---

## Complete Table Inventory

The platform uses approximately **30+ database tables** across the entire schema:

| Group         | Tables                                                           | Source        |
| ------------- | ---------------------------------------------------------------- | ------------- |
| Core          | users, api_keys, api_logs                                        | Drizzle + 001 |
| Billing       | user_credits, credit_transactions                                | Drizzle + 001 |
| Chat          | conversations, messages                                          | 002           |
| Prompts       | prompts                                                          | 002           |
| Organizations | organizations, organization_members, invites                     | 003           |
| Files         | files                                                            | 004           |
| Auth          | password_resets, token_blacklist                                 | 005, 018      |
| Webhooks      | webhooks, webhook_deliveries                                     | 006, 016      |
| Admin         | admin_users, admin_sessions, settings, feature_flags, audit_logs | 007, 008      |
| Promotions    | promo_codes, promo_redemptions                                   | 007           |
| SSO           | sso_configs                                                      | 007           |
| Reports       | scheduled_reports                                                | 007           |
| Content       | announcements, changelog, groups, group_members                  | 007           |
| Security      | ip_entries, suspicious_activities                                | 007           |
| RBAC          | roles, role_permissions, user_roles                              | 008           |
| Rate Limits   | rate_limit_tiers, user_rate_limits                               | 009, 017      |
| Budget        | budget_alerts, budget_caps                                       | 010           |
| Comparison    | comparisons, comparison_results                                  | 011           |
| Fine-tuning   | fine_tuning_jobs, fine_tuning_datasets                           | 012           |
| Plugins       | provider_plugins                                                 | 013           |
| Exports       | export_jobs                                                      | 014           |
| Messages      | admin_messages                                                   | 015           |

---

## Production Workflow

1. Create new numbered SQL file in `apps/backend/migrations/`
2. Apply manually to production database
3. Update Drizzle schema if frontend needs to read new tables
4. Add backend repository methods for the new table
5. Document the migration

### Important Notes

- `tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking (top-level await)
- No auto-rollback — migrations are forward-only
- Schema changes requiring downtime should be communicated before deployment
- Backend auto-migrate handles admin schema idempotently
- See `docs/database/SCHEMA.md` for the complete ERD and relationships
