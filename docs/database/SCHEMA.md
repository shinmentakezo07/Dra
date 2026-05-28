# Database Schema

The platform uses **PostgreSQL 16** as its primary database. The schema is shared between frontend (managed via Drizzle ORM in `apps/web/db/schema.ts`) and backend (accessed via raw SQL through pgx v5 in `apps/backend/internal/repository/`).

---

## Table: `users`

Core user accounts with role-based access control.

| Column       | Type        | Constraints                                  | Description                                        |
| ------------ | ----------- | -------------------------------------------- | -------------------------------------------------- |
| `id`         | `uuid`      | PK, default `gen_random_uuid()`              | Unique user ID                                     |
| `name`       | `text`      | NOT NULL                                     | Display name                                       |
| `email`      | `text`      | NOT NULL, UNIQUE                             | Email address                                      |
| `password`   | `text`      | nullable                                     | bcrypt-hashed password (null for OAuth-only users) |
| `role`       | `text`      | NOT NULL, default `'user'`, enum: user/admin | Access control role                                |
| `created_at` | `timestamp` | NOT NULL, default `now()`                    | Account creation timestamp                         |

**Relations**: Has many `api_keys`, `api_logs`, `user_credits` (one-to-one), `credit_transactions`

---

## Table: `api_keys`

API keys for programmatic access to the platform.

| Column       | Type        | Constraints                     | Description                              |
| ------------ | ----------- | ------------------------------- | ---------------------------------------- |
| `id`         | `uuid`      | PK, default `gen_random_uuid()` | Unique key ID                            |
| `user_id`    | `uuid`      | FK -> users.id, NOT NULL        | Owner user                               |
| `name`       | `text`      | NOT NULL                        | Human-readable name                      |
| `key`        | `text`      | NOT NULL, UNIQUE                | Key value (format: `dra_<64 hex chars>`) |
| `last_used`  | `timestamp` | nullable                        | Last usage timestamp                     |
| `created_at` | `timestamp` | NOT NULL, default `now()`       | Creation timestamp                       |
| `revoked_at` | `timestamp` | nullable                        | Revocation timestamp (null = active)     |

**Indexes**: `api_keys_user_id_idx` on `user_id`

**Domain model includes (not in DDL):** `allowed_models`, `allowed_ips`, `max_tokens_per_request`, `daily_request_limit`, `monthly_token_limit`

---

## Table: `api_logs`

Detailed audit trail for all AI requests.

| Column          | Type        | Constraints                     | Description                     |
| --------------- | ----------- | ------------------------------- | ------------------------------- |
| `id`            | `uuid`      | PK, default `gen_random_uuid()` | Unique log ID                   |
| `user_id`       | `uuid`      | FK -> users.id, NOT NULL        | Requesting user                 |
| `api_key_id`    | `uuid`      | FK -> api_keys.id, nullable     | API key used (if any)           |
| `model`         | `text`      | NOT NULL                        | Model name                      |
| `provider`      | `text`      | NOT NULL                        | Provider name                   |
| `input_tokens`  | `integer`   | NOT NULL                        | Prompt token count              |
| `output_tokens` | `integer`   | NOT NULL                        | Completion token count          |
| `cost`          | `integer`   | NOT NULL                        | Cost in microcents/credits      |
| `latency`       | `integer`   | NOT NULL                        | Response time in milliseconds   |
| `status`        | `text`      | NOT NULL, enum: success/error   | Request outcome                 |
| `error_message` | `text`      | nullable                        | Error details (if status=error) |
| `created_at`    | `timestamp` | NOT NULL, default `now()`       | Request timestamp               |

**Indexes**: `api_logs_user_id_idx` on `user_id`, `api_logs_api_key_id_idx` on `api_key_id`, `api_logs_created_at_idx` on `created_at`

---

## Table: `user_credits`

Credit balance and budget tracking per user.

| Column            | Type        | Constraints                      | Description                   |
| ----------------- | ----------- | -------------------------------- | ----------------------------- |
| `id`              | `uuid`      | PK, default `gen_random_uuid()`  | Unique ID                     |
| `user_id`         | `uuid`      | FK -> users.id, NOT NULL, UNIQUE | One-to-one with user          |
| `balance`         | `integer`   | NOT NULL, default 0              | Current balance in microcents |
| `total_purchased` | `integer`   | NOT NULL, default 0              | Lifetime credits purchased    |
| `total_spent`     | `integer`   | NOT NULL, default 0              | Lifetime credits spent        |
| `monthly_budget`  | `integer`   | nullable                         | Monthly spending limit        |
| `daily_budget`    | `integer`   | nullable                         | Daily spending limit          |
| `daily_spent`     | `integer`   | default 0                        | Today's spending              |
| `monthly_spent`   | `integer`   | default 0                        | This month's spending         |
| `budget_reset_at` | `timestamp` | nullable                         | Next budget reset time        |
| `updated_at`      | `timestamp` | NOT NULL, default `now()`        | Last update timestamp         |

**Indexes**: `user_credits_user_id_idx` on `user_id`

---

## Table: `credit_transactions`

Audit trail for all credit movements.

| Column              | Type        | Constraints                                 | Description                       |
| ------------------- | ----------- | ------------------------------------------- | --------------------------------- |
| `id`                | `uuid`      | PK, default `gen_random_uuid()`             | Unique transaction ID             |
| `user_id`           | `uuid`      | FK -> users.id, NOT NULL                    | User                              |
| `amount`            | `integer`   | NOT NULL                                    | Positive=purchase, negative=usage |
| `type`              | `text`      | NOT NULL, enum: purchase/usage/refund/bonus | Transaction type                  |
| `description`       | `text`      | NOT NULL                                    | Human-readable description        |
| `related_log_id`    | `uuid`      | FK -> api_logs.id, nullable                 | Links usage to request            |
| `stripe_payment_id` | `text`      | nullable                                    | Stripe payment reference          |
| `created_at`        | `timestamp` | NOT NULL, default `now()`                   | Transaction timestamp             |

**Indexes**: `credit_transactions_user_id_idx` on `user_id`, `credit_transactions_created_at_idx` on `created_at`

---

## Backend-Managed Tables

These tables are managed via raw SQL in the backend repository layer (not in the Drizzle schema):

### `conversations`

| Column       | Type        | Description        |
| ------------ | ----------- | ------------------ |
| `id`         | `uuid`      | PK                 |
| `user_id`    | `uuid`      | FK -> users.id     |
| `title`      | `text`      | Conversation title |
| `model`      | `text`      | Model used         |
| `created_at` | `timestamp` | Creation time      |
| `updated_at` | `timestamp` | Last update        |

### `messages`

| Column            | Type        | Description            |
| ----------------- | ----------- | ---------------------- |
| `id`              | `uuid`      | PK                     |
| `conversation_id` | `uuid`      | FK -> conversations.id |
| `role`            | `text`      | user/assistant/system  |
| `content`         | `text`      | Message content        |
| `tokens`          | `integer`   | Token count            |
| `created_at`      | `timestamp` | Creation time          |

### `prompts`

| Column        | Type        | Description                  |
| ------------- | ----------- | ---------------------------- |
| `name`        | `text`      | PK (unique name)             |
| `content`     | `text`      | Prompt content (Go template) |
| `description` | `text`      | Description                  |
| `template`    | `boolean`   | Is template                  |
| `created_at`  | `timestamp` | Creation time                |
| `updated_at`  | `timestamp` | Last update                  |

### `webhooks`

| Column       | Type        | Description       |
| ------------ | ----------- | ----------------- |
| `id`         | `uuid`      | PK                |
| `user_id`    | `uuid`      | FK -> users.id    |
| `url`        | `text`      | Webhook URL       |
| `secret`     | `text`      | Signing secret    |
| `events`     | `text[]`    | Subscribed events |
| `headers`    | `jsonb`     | Custom headers    |
| `active`     | `boolean`   | Active status     |
| `created_at` | `timestamp` | Creation time     |

### `webhook_deliveries`

| Column          | Type        | Description              |
| --------------- | ----------- | ------------------------ |
| `id`            | `uuid`      | PK                       |
| `webhook_id`    | `uuid`      | FK -> webhooks.id        |
| `event_type`    | `text`      | Event type               |
| `payload`       | `bytea`     | Event payload            |
| `status_code`   | `integer`   | HTTP response code       |
| `error`         | `text`      | Error message            |
| `attempts`      | `integer`   | Delivery attempts        |
| `max_attempts`  | `integer`   | Max retries              |
| `delivered_at`  | `timestamp` | Successful delivery time |
| `next_retry_at` | `timestamp` | Next retry time          |
| `created_at`    | `timestamp` | Creation time            |

### `organizations`

| Column       | Type        | Description       |
| ------------ | ----------- | ----------------- |
| `id`         | `uuid`      | PK                |
| `name`       | `text`      | Organization name |
| `owner_id`   | `uuid`      | FK -> users.id    |
| `plan`       | `text`      | Plan type         |
| `created_at` | `timestamp` | Creation time     |

### `organization_members`

| Column      | Type        | Description            |
| ----------- | ----------- | ---------------------- |
| `org_id`    | `uuid`      | FK -> organizations.id |
| `user_id`   | `uuid`      | FK -> users.id         |
| `role`      | `text`      | Member role            |
| `joined_at` | `timestamp` | Join time              |

### `invites`

| Column       | Type        | Description            |
| ------------ | ----------- | ---------------------- |
| `id`         | `uuid`      | PK                     |
| `org_id`     | `uuid`      | FK -> organizations.id |
| `email`      | `text`      | Invited email          |
| `role`       | `text`      | Invited role           |
| `token`      | `text`      | Invite token           |
| `expires_at` | `timestamp` | Expiration             |
| `used_at`    | `timestamp` | Acceptance time        |
| `created_at` | `timestamp` | Invite time            |

### `batch_jobs`

| Column       | Type        | Description                         |
| ------------ | ----------- | ----------------------------------- |
| `id`         | `uuid`      | PK                                  |
| `user_id`    | `uuid`      | FK -> users.id                      |
| `status`     | `text`      | pending/processing/completed/failed |
| `items`      | `jsonb`     | Batch items                         |
| `results`    | `jsonb`     | Batch results                       |
| `error`      | `text`      | Error message                       |
| `progress`   | `integer`   | Items completed                     |
| `total`      | `integer`   | Total items                         |
| `created_at` | `timestamp` | Creation time                       |
| `started_at` | `timestamp` | Processing start                    |
| `ended_at`   | `timestamp` | Completion time                     |

### `files`

| Column         | Type        | Description        |
| -------------- | ----------- | ------------------ |
| `id`           | `uuid`      | PK                 |
| `user_id`      | `uuid`      | FK -> users.id     |
| `name`         | `text`      | Original filename  |
| `mime_type`    | `text`      | MIME type          |
| `size`         | `integer`   | File size in bytes |
| `storage_path` | `text`      | Storage path       |
| `created_at`   | `timestamp` | Upload time        |

### `password_resets`

| Column       | Type        | Description      |
| ------------ | ----------- | ---------------- |
| `id`         | `uuid`      | PK               |
| `email`      | `text`      | User email       |
| `token`      | `text`      | Reset token      |
| `expires_at` | `timestamp` | Token expiration |
| `used_at`    | `timestamp` | Token usage time |
| `created_at` | `timestamp` | Token creation   |

### Admin Tables

Various admin tables for platform management: `settings`, `feature_flags`, `audit_logs`, `announcements`, `promo_codes`, `promo_redemptions`, `sso_configs`, `scheduled_reports`, `changelog`, `groups`, `group_members`, `ip_entries`, `admin_users`, `provider_keys`, `model_aliases`, `suspicious_activities`.

---

## ERD Relationships

```
users 1---* api_keys
users 1---* api_logs
users 1---1 user_credits
users 1---* credit_transactions
api_keys 1---* api_logs
api_logs 1---* credit_transactions (via related_log_id)
users 1---* conversations
conversations 1---* messages
users 1---* webhooks
webhooks 1---* webhook_deliveries
users 1---* organizations (as owner)
organizations *---* users (via organization_members)
users 1---* files
users 1---* batch_jobs
```

---

## Indexes Summary

| Index                                | Table               | Column(s)  | Purpose               |
| ------------------------------------ | ------------------- | ---------- | --------------------- |
| `api_keys_user_id_idx`               | api_keys            | user_id    | Fast user key lookup  |
| `api_logs_user_id_idx`               | api_logs            | user_id    | User log queries      |
| `api_logs_api_key_id_idx`            | api_logs            | api_key_id | Key-based log queries |
| `api_logs_created_at_idx`            | api_logs            | created_at | Time-range queries    |
| `user_credits_user_id_idx`           | user_credits        | user_id    | Balance lookup        |
| `credit_transactions_user_id_idx`    | credit_transactions | user_id    | User transactions     |
| `credit_transactions_created_at_idx` | credit_transactions | created_at | Transaction history   |
