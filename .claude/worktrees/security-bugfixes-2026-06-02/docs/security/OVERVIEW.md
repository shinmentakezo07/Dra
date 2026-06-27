# Security Overview

> **Source files:** `apps/backend/internal/middleware/`, `internal/handler/admin_security.go`, `internal/repository/`, `internal/pkg/token/`, `internal/pkg/password/`, `pkg/llm/guardrails/`

## Authentication System

The platform supports three authentication methods, checked in order of priority:

1. **API Key** (`x-api-key` header)
2. **JWT Bearer Token** (`Authorization: Bearer <token>`)
3. **Session Cookie** (`authjs.session-token` and variants)

```
Request
  |
  v
Has x-api-key header? ──Yes──> API key lookup in DB ──> User + APIKey in context
  |
  No
  v
Has Authorization: Bearer? ──Yes──> Parse JWT (HS256) ──> User lookup in DB ──> User in context
  |
  No
  v
Has session cookie? ──Yes──> Parse JWT (HS256) ──> User lookup in DB ──> User in context
  |
  No
  v
Return 401 Unauthorized
```

**Source:** `apps/backend/internal/middleware/auth.go`

### API Key Authentication

API keys are stored in the database with HMAC-SHA256 hashing plus a configurable pepper. The lookup function receives the raw key from the header, hashes it with the pepper, and queries the database. Successful lookup populates both `User` and `APIKey` in the request context.

**Supported scoping (per API key):**

- Allowed model list (string match with prefix fallback)
- Allowed IPs/CIDRs
- Max tokens per request
- Daily request limit
- Monthly token limit

**Source:** `apps/backend/internal/repository/apikey.go`, `apps/backend/internal/middleware/quota.go`

### JWT Token Authentication

JWT tokens use **HS256** signing (HMAC-SHA256). Tokens include `sub` (user ID), `email`, `role`, `exp`, and `iat` claims. Default expiry is 7 days.

On each authenticated request, the middleware:

1. Parses the JWT (rejects non-HS256 algorithms)
2. Validates expiry
3. Extracts the `sub` claim as user ID
4. Queries the database for the user (rejects deleted/missing users)
5. Populates context with the database-fresh user object (role comes from DB, not the token)

This means **role changes take effect immediately** — the token is merely an identity proof, not an authorization document.

**Source:** `apps/backend/internal/pkg/token/token.go`, `apps/backend/internal/middleware/auth.go`

### Session Cookie Fallback

If no `Authorization` header is present, the middleware checks these cookies in order:

- `authjs.session-token`
- `__Secure-authjs.session-token`
- `next-auth.session-token`
- `__Secure-next-auth.session-token`

The cookie value is parsed as a JWT using the same HS256 validation pipeline.

**Source:** `apps/backend/internal/middleware/auth.go` (lines 49-55)

### Auth Middleware Chain

```go
r.Use(middleware.Auth(cfg, apiKeyLookup, userLookup))
r.Use(middleware.TokenBlacklist(blacklistRepo))
```

- **Auth** (populates user context or rejects)
- **TokenBlacklist** (rejects logged-out tokens, chained after Auth)

### Common Middleware Registration Order

```
Logging → CORS → BodyLimit → Auth → TokenBlacklist → RateLimit → QuotaCheck → Handler
```

## Authorization & RBAC

### Role System

| Role    | Access                        |
| ------- | ----------------------------- |
| `user`  | Standard API access           |
| `admin` | All user access + admin panel |

Roles are stored in the database and fetched on every authenticated request (never trusted from the JWT alone).

### Guard Middleware Functions

| Function                  | Status | Behavior                                  |
| ------------------------- | ------ | ----------------------------------------- |
| `RequireAuth`             | 401    | Rejects if no user in context             |
| `RequireAdmin`            | 403    | Rejects if user is not admin              |
| `RequirePermission(perm)` | 403    | Rejects if user lacks specific permission |

**Source:** `apps/backend/internal/middleware/auth.go` (lines 131-175)

### Admin Auto-Provisioning

On first admin login, if no admin user exists, the first user with an approved email domain or matching a configured admin email is auto-promoted to the `admin` role.

### Available Permissions

Permissions are checked via `domain.User.HasPermission()`. The standard permissions include:

| Permission            | Description                        |
| --------------------- | ---------------------------------- |
| `users:read`          | View user list and details         |
| `users:write`         | Create, update, delete users       |
| `keys:read`           | View API keys                      |
| `keys:write`          | Create, revoke API keys            |
| `providers:read`      | View provider configurations       |
| `providers:write`     | Configure providers                |
| `models:manage`       | Enable/disable models              |
| `audit:read`          | View audit logs                    |
| `audit:export`        | Export audit data                  |
| `security:manage`     | Manage IP lists, security settings |
| `billing:read`        | View billing data                  |
| `billing:write`       | Manage billing/pricing             |
| `announcements:write` | Create announcements               |
| `promo:write`         | Create promo codes                 |
| `impersonate`         | Impersonate users                  |

## Rate Limiting

The platform supports two rate limiter implementations that implement the same interface.

### In-Memory Rate Limiter

- Thread-safe with `sync.RWMutex`
- Per-key sliding window tracking
- Background cleanup every 5 minutes
- Storage: process-local `map[string]*rateEntry`

**Source:** `apps/backend/internal/middleware/ratelimit.go`

### Redis Rate Limiter

- Distributed sliding window using Redis sorted sets
- Pipeline-based for atomicity
- 2-second context timeout
- Key prefix: `ratelimit:`

**Source:** `apps/backend/internal/middleware/redis_ratelimit.go`

### Rate Limit Configuration

| Endpoint                       | Default Window | Default Max  |
| ------------------------------ | -------------- | ------------ |
| General API                    | 1 minute       | 60 requests  |
| Auth endpoints (login, signup) | 1 minute       | 10 requests  |
| Admin endpoints                | 1 minute       | 120 requests |

### Rate Limit Headers

When rate-limited, the API returns `429 Too Many Requests` with the body: `Rate limit exceeded. Please slow down.`

### Key Strategy

Rate limit keys are either:

- **Authenticated requests**: User ID
- **Unauthenticated requests**: Client IP (extracted from `X-Real-IP`, `X-Forwarded-For`, or `RemoteAddr`)

## Quota Management

### Scoped API Key Quotas

Each API key supports these quotas, checked at the `QuotaCheck` middleware layer:

| Quota                  | Source                            | Behavior                                 |
| ---------------------- | --------------------------------- | ---------------------------------------- |
| Daily request limit    | `api_keys.daily_request_limit`    | Hard limit per calendar day              |
| Monthly token limit    | `api_keys.monthly_token_limit`    | Hard limit per calendar month            |
| Max tokens per request | `api_keys.max_tokens_per_request` | Rejects if estimated tokens exceed limit |
| Allowed models         | `api_keys.allowed_models`         | String array, supports prefix matching   |
| Allowed IPs            | `api_keys.allowed_ips`            | String array, supports CIDR notation     |

### In-Memory Quota Tracker

- Per-process counters with hourly cleanup
- Daily counter resets at midnight
- Monthly counter resets on the 1st

**Source:** `apps/backend/internal/middleware/quota.go`

### Redis Quota Tracker

- Distributed counters using Redis INCR/INCRBY with TTL
- Daily key TTL: 48 hours
- Monthly key TTL: 40 days
- Uses pipeline for atomic operations
- **Fails open** on Redis errors (logged but not blocking)

**Source:** `apps/backend/internal/middleware/redis_quota.go`

## Input Security

### Body Size Limits

- Default: 1 MB (`defaultMaxBodyBytes`)
- Configurable via middleware constructor
- Uses `http.MaxBytesReader`

**Source:** `apps/backend/internal/middleware/bodylimit.go`
**Applied in:** `cmd/api/main.go` — 10 MB limit for LLM proxy endpoints

### Guardrails System

The guardrails package (`pkg/llm/guardrails/`) provides request and response validation for the LLM proxy.

**Request Guardrails (CheckRequest):**

- Maximum prompt length (default: 100,000 characters)
- Blocked content pattern matching (regex-based)
- Prompt injection detection (keyword-based risk scoring)

**Response Guardrails (CheckResponse):**

- PII detection in model outputs (SSN, credit cards, emails)

**Default Blocked Patterns:**

```regex
(?i)\b(attack|kill|murder|bomb|terrorist)\b
```

**Default PII Detection:**

```regex
\b\d{3}-\d{2}-\d{4}\b       # SSN
\b(?:\d[ -]*?){13,16}\b     # Credit card numbers
[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}  # Email addresses
```

**Default Prompt Injection Phrases:**

```
ignore previous instructions
ignore all prior instructions
disregard previous
you are now
new instructions:
system override
DAN mode
jailbreak
ignore the above
do not follow
```

Injection risk scoring: each matched phrase contributes to a 0-1 risk score. Risk > 0.5 flags a violation; risk > 0.8 blocks the request.

**Source:** `apps/backend/pkg/llm/guardrails/guardrails.go`

### Sandbox Mode

Setting `X-Sandbox: true` on `/v1/chat/completions` bypasses all guardrails, quota checks, and cost tracking. The `SandboxProvider` returns mock responses without calling any real LLM provider.

## Token Security

### Token Blacklist

When a user logs out, their JWT is hashed (SHA-256) and stored in the `token_blacklist` table. The `TokenBlacklist` middleware checks each request against this table (chained after the Auth middleware).

| Operation | Behavior                                          |
| --------- | ------------------------------------------------- |
| Blacklist | Stores SHA-256 hash + user ID + expiry            |
| Check     | Hash lookup; rejects if found                     |
| Cleanup   | Deletes expired entries (called periodically)     |
| On error  | **Fails open** — allows request if DB check fails |

Blacklisted tokens get: `401 Token has been revoked. Please sign in again.`

**Source:** `apps/backend/internal/repository/token_blacklist.go`, `apps/backend/internal/middleware/token_blacklist.go`

### Password Hashing

Passwords are hashed using **Argon2id** (memory-hard KDF) with bcrypt backward compatibility:

| Algorithm              | Parameters                                             |
| ---------------------- | ------------------------------------------------------ |
| **Argon2id** (primary) | Time=1, Memory=64MB, Threads=4, KeyLen=32              |
| **Bcrypt** (legacy)    | Compatible — detected by `$2a$`, `$2b$`, `$2y$` prefix |

Format: `$argon2id$v=19$m=65536,t=1,p=4$<salt>$<hash>`

**Source:** `apps/backend/internal/pkg/password/password.go`

### Password Reset Tokens

Reset tokens are JWT-based with a 1-hour expiry. They contain the user ID and a purpose claim (`password_reset`).

## Admin Security

### Suspicious Activity Monitoring

The `suspicious_activities` table tracks anomalous behavior:

| Field          | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `category`     | Type: `auth_failure`, `rate_limit`, `ip_mismatch`, `suspicious_prompt` |
| `severity`     | `low`, `medium`, `high`, `critical`                                    |
| `auto_blocked` | Whether the system auto-blocked the IP                                 |
| `reviewed`     | Whether an admin reviewed this event                                   |
| `resolved`     | Whether the event was dismissed or acted upon                          |

The admin panel (`AdminListSuspicious`) supports filtering by category, severity, review status, and resolution status. Events are listed with pagination.

**Source:** `apps/backend/internal/handler/admin_security.go`, `apps/backend/internal/repository/admin_security_repo.go`

### IP Allow/Block Lists

The `ip_lists` table manages named IP entries:

| Field        | Description                    |
| ------------ | ------------------------------ |
| `ip_or_cidr` | Single IP or CIDR notation     |
| `action`     | `allow` or `block`             |
| `scope`      | `global`, `user`, or `api_key` |
| `scope_id`   | Optional ID for scoped rules   |
| `reason`     | Admin-provided reason          |
| `expires_at` | Optional expiry                |

IP lists are checked in the `QuotaCheck` middleware and during authentication. Blocked IPs receive a 403 before reaching any handler.

**Source:** `apps/backend/internal/handler/admin_security.go`, `apps/backend/internal/repository/admin_security_repo.go`

### Audit Logging

The `audit_logs` table is an append-only log of all admin actions:

| Field         | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `actor_id`    | Admin user who performed the action                            |
| `action`      | Verb describing the action (e.g., `user.delete`, `key.revoke`) |
| `target_type` | Resource type affected                                         |
| `target_id`   | Resource ID affected                                           |
| `details`     | JSON payload with action-specific context                      |
| `severity`    | `info`, `warning`, `critical`                                  |

The admin panel provides filtered, paginated access to audit logs with date range filtering.

### Admin Session Management

The system tracks active admin sessions with start/end timestamps. No automatic timeout is enforced beyond the JWT expiry.

### Impersonation System

Admins with the `impersonate` permission can temporarily act as another user:

1. Admin calls `POST /admin/users/{id}/impersonate` with a reason
2. System creates an `ImpersonationSession` record (admin_id, target_user_id, reason, started_at)
3. Admin receives an impersonation session token
4. Admin impersonation is logged in audit logs
5. Admin calls `POST /admin/impersonations/{id}/stop` to end impersonation

All impersonation actions are logged with both the admin ID and target user ID.

**Source:** `apps/backend/internal/handler/admin_security.go` (lines 82-95)

## Security Headers

The Go API does not set security headers directly at the middleware level. Security headers are configured at the infrastructure/ingress layer (reverse proxy, load balancer). The standard headers to configure:

| Header                      | Recommended Value                     |
| --------------------------- | ------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options`    | `nosniff`                             |
| `X-Frame-Options`           | `DENY`                                |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`     |
| `Permissions-Policy`        | Minimal set per deployment            |
| `Content-Security-Policy`   | Per-application policy                |

For the web frontend, Next.js provides security headers through `next.config.ts`. See `apps/web/next.config.ts` for the current configuration.

## Request Transformation Middleware

The transform middleware applies request-level modifications to chat completion requests:

- **System prompt injection**: Replaces or injects system prompts based on model prefix matching
- **Header stripping**: Removes sensitive headers before forwarding to upstream providers

This is not a security middleware per se, but can be used for governance (e.g., enforcing system prompts across all requests to a given model).

**Source:** `apps/backend/internal/middleware/transform.go`
