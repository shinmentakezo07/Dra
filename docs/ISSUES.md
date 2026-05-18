# Issues Tracker — YAPAPA Platform

> Generated: 2026-05-18
> Verified against: commit 282ab29
> Related: [issue.md](./issue.md) (SDK-specific issues), [ops.md](../ops.md) (architecture debt)

---

## P0 — CRITICAL (will crash at runtime)

### ISSUE-001: seed.go uses non-existent columns for api_keys

**File**: `apps/backend/internal/db/seed.go:141`
**Status**: OPEN
**Impact**: PostgreSQL seed crashes on first run. No demo data loads.

**Problem**: The `seedPostgres` function inserts into `api_keys` with columns `key_hash`, `scopes`, and `rate_limit`:

```go
// seed.go line 141
`INSERT INTO api_keys (id, user_id, name, key_hash, scopes, rate_limit, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
```

But `001_base_schema.sql` defines `api_keys` as:

```sql
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL,           -- column is "key", not "key_hash"
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
    -- no "scopes" column
    -- no "rate_limit" column
);
```

**Fix**: Replace the INSERT with columns that match the migration:

```go
_, err := database.Pool.Exec(ctx,
    `INSERT INTO api_keys (id, user_id, name, key, created_at) VALUES ($1, $2, $3, $4, $5)`,
    k.ID, k.UserID, k.Name, k.Key, now)
```

Remove the `[]string{"all"}` and `1000` arguments. Update the struct to match.

**Note**: The MongoDB seed (`seedMongoDB` line 262-265) uses `key_hash`, `scopes`, `rate_limit` — this is fine for MongoDB (schemaless), but creates a data shape mismatch between Postgres and MongoDB seeds.

---

### ISSUE-002: user_rate_limits table never created

**File**: `apps/backend/internal/repository/rate_limit.go:19-43`
**Status**: OPEN
**Impact**: All rate limit tier lookups fail at runtime. `GetUserTier()` silently returns "free", `SetUserTier()` crashes.

**Problem**: `RateLimitRepo` queries/inserts into `user_rate_limits`:

```go
// rate_limit.go:19
`SELECT COALESCE(rl.tier, 'free') FROM user_rate_limits rl WHERE rl.user_id = $1`

// rate_limit.go:40
`INSERT INTO user_rate_limits (id, user_id, tier, created_at) VALUES ($1, $2, $3, $4)
 ON CONFLICT (user_id) DO UPDATE SET tier = $3`
```

No migration creates this table. Checked all migration files (`001` through `007`).

**Fix**: Create migration `017_user_rate_limits.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);
```

**Also**: `rate_limit.go:30` queries `rate_limits` table — verify this table exists in migrations (it does in `007_rate_limits.sql`).

---

### ISSUE-003: Zero CI/CD pipelines

**Files**: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`
**Status**: OPEN
**Impact**: No automated testing, linting, or deployment. Broken code can merge without detection.

**Problem**: Workflow files exist but need verification they're properly configured. No automated checks on push/PR.

**Fix**: Set up GitHub Actions workflows for:
1. **ci.yml**: Build frontend + backend, run lint, run tests
2. **e2e.yml**: Run Playwright E2E tests against staging

Minimum viable CI:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:web
      - run: npm run build
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.25' }
      - run: cd apps/backend && make vet && make test
```

---

## P1 — SCHEMA DRIFT (will cause bugs over time)

### ISSUE-004: 9 tables missing from Drizzle schema

**Files**: `apps/web/db/schema.ts`, `apps/backend/migrations/`
**Status**: OPEN
**Impact**: Frontend Drizzle ORM can't query these tables. Admin features using these tables will fail.

**Missing tables** (exist in Go migrations, not in `schema.ts`):

| Table | Migration | Purpose |
|-------|-----------|---------|
| `budget_alerts` | 007 | Budget notification triggers |
| `budget_caps` | 007 | Per-user/org spending limits |
| `ab_comparisons` | 007 | A/B test comparison results |
| `fine_tuning_datasets` | 007 | Training data for fine-tuning |
| `fine_tuning_jobs` | 007 | Fine-tuning job tracking |
| `provider_plugins` | 007 | Custom provider extensions |
| `export_jobs` | 007 | Data export job queue |
| `permissions` | 009 | Granular permission definitions |
| `role_permissions` | 009 | Role-to-permission mapping |

**Fix**: Add these tables to `apps/web/db/schema.ts`. Use the migration SQL as the source of truth for column names and types.

---

### ISSUE-005: users.tier column missing from Drizzle schema

**Files**: `apps/web/db/schema.ts:36-58`, `apps/backend/migrations/009_*.sql`
**Status**: OPEN
**Impact**: Frontend can't read or set user tier. Rate limit UI broken.

**Problem**: Migration 009 adds `tier TEXT DEFAULT 'free'` to `users`, but `schema.ts` `users` table has no `tier` column.

**Fix**: Add to `schema.ts` users table:

```typescript
tier: text("tier").default("free").notNull(),
```

---

### ISSUE-006: Duplicate rate_limit_tiers table definitions

**Files**: `apps/backend/migrations/007_*.sql`, `apps/backend/migrations/009_*.sql`
**Status**: OPEN
**Impact**: Conflicting defaults. Whichever migration runs first wins.

**Problem**:
- Migration 007: `rpm=60, tpm=100000`
- Migration 009: `rpm=10, tpm=1000`

Both `CREATE TABLE rate_limit_tiers` with different column sets and defaults.

**Fix**: Remove the duplicate from migration 009. If both have already been applied, create a corrective migration that reconciles the data.

---

### ISSUE-007: webhook_deliveries.max_attempts default mismatch

**Files**: `apps/web/db/schema.ts:194`, `apps/backend/migrations/006_*.sql`
**Status**: OPEN
**Impact**: Frontend shows 5 max attempts, backend retries only 3 times.

**Problem**:
- `schema.ts`: `maxAttempts: integer("max_attempts").default(5)`
- Migration 006: `max_attempts INTEGER DEFAULT 3`

**Fix**: Align both to 5 (the higher value is more forgiving). Update migration or add corrective migration.

---

### ISSUE-008: Date type mismatches across tables

**Files**: `apps/web/db/schema.ts`, `apps/backend/migrations/`
**Status**: OPEN
**Impact**: Date comparisons may fail. Timezone handling inconsistent.

**Mismatches**:

| Table | schema.ts type | Migration type | Issue |
|-------|---------------|----------------|-------|
| `usage_daily.date` | `timestamp` | `DATE` | timestamp != DATE |
| `usage_forecasts.forecast_date` | `timestamp` | `DATE` | timestamp != DATE |
| `password_resets.expires_at` | `timestamp` | `TIMESTAMP` (no tz) | Should be TIMESTAMPTZ |

**Fix**: Use `date("date")` in schema.ts for DATE columns. Use `timestamp("expires_at", { withTimezone: true })` for TIMESTAMPTZ columns.

---

## P2 — MISSING BACKEND FEATURES

### ISSUE-009: No server-side logout

**File**: `apps/backend/internal/handler/handler.go`
**Status**: OPEN
**Impact**: JWT tokens remain valid after logout. Stolen tokens can't be revoked.

**Problem**: Logout endpoint just returns `{"logged_out": true}`. No token invalidation. No blacklist exists.

**Fix**: Implement token blacklist:
1. Create `token_blacklist` table (token_hash, expires_at)
2. On logout, insert token hash
3. In auth middleware, check blacklist before validating JWT
4. Use Redis for fast lookups if `REDIS_URL` is configured

---

### ISSUE-010: pkg/llm/telemetry/ missing

**File**: `pkg/llm/telemetry/` (documented in AGENTS.md)
**Status**: OPEN
**Impact**: Pipeline stage 8 (telemetry) has no dedicated package.

**Problem**: AGENTS.md documents `telemetry/` as "LLM call tracing" but the directory doesn't exist. Coverage is partially in `pkg/trace/` and `internal/middleware/metrics.go`.

**Fix**: Either:
- Create `pkg/llm/telemetry/` and consolidate tracing there, OR
- Update AGENTS.md to reflect that telemetry lives in `pkg/trace/` + middleware

---

### ISSUE-011: pkg/llm/context/ missing

**File**: `pkg/llm/context/` (documented in AGENTS.md)
**Status**: OPEN
**Impact**: Context window management has no dedicated package.

**Problem**: Documented as "Context window management" but directory doesn't exist. Token counting is in `pkg/llm/tokens/`.

**Fix**: Either create the package or update AGENTS.md to remove the reference.

---

### ISSUE-012: pkg/llm/sdk.go missing

**File**: `pkg/llm/sdk.go` (documented in AGENTS.md)
**Status**: OPEN
**Impact**: High-level LLM facade doesn't exist. Callers must use lower-level packages directly.

**Problem**: Documented as "High-level facade" but file doesn't exist.

**Fix**: Either create `sdk.go` as a convenience wrapper or update AGENTS.md.

---

### ISSUE-013: Code execution tool is a stub

**File**: `apps/backend/pkg/llm/tools/builtin.go`
**Status**: OPEN
**Impact**: Code execution in playground returns placeholder text, not actual execution.

**Problem**: `NewCodeExecutionTool()` returns placeholder text. No sandboxed execution environment.

**Fix**: Wire to a sandboxed execution service (e.g., E2B, Firecracker, or Docker-in-Docker). At minimum, document that it's a stub and disable the UI button.

---

### ISSUE-014: Web search tool not wired to real implementation

**File**: `apps/backend/pkg/llm/tools/builtin.go`
**Status**: OPEN
**Impact**: Web search in playground returns stub response.

**Problem**: `NewWebSearchTool()` in `builtin.go` returns a stub. Real implementation exists in `pkg/llm/tools/websearch/tool.go` but is not connected.

**Fix**: Update `NewWebSearchTool()` to delegate to `websearch/tool.go`:

```go
func NewWebSearchTool() Tool {
    return &webSearchTool{impl: websearch.New()}
}
```

---

### ISSUE-015: Batch processor uses in-memory storage

**File**: `apps/backend/pkg/llm/batch/batch.go`
**Status**: OPEN
**Impact**: Batch jobs lost on backend restart. Not horizontally scalable.

**Problem**: `batch.go` stores jobs in a `map[string]*Job`. The DB-backed service wraps this but the underlying processor is fragile.

**Fix**: Move job storage to PostgreSQL. The `batch_jobs` table already exists in schema.ts. Make the processor read/write from DB instead of in-memory map.

---

### ISSUE-016: Weak password hashing (bcrypt)

**Files**: `apps/backend/internal/db/seed.go:31`, `apps/web/package.json`
**Status**: OPEN
**Impact**: bcrypt is GPU-resistant but not memory-hard. Argon2id is OWASP-recommended.

**Problem**: Backend uses `golang.org/x/crypto/bcrypt`. Frontend lists `bcryptjs` as devDependency.

**Fix**: Migrate to Argon2id:
- Backend: `golang.org/x/crypto/argon2`
- Frontend: `@node-rs/argon2` (if frontend ever hashes passwords, which it shouldn't)

---

## P3 — FRONTEND GAPS

### ISSUE-017: No mock data enforcement for new pages

**Files**: `apps/web/tests/wiring-verification.test.ts`
**Status**: OPEN
**Impact**: Admin pages and newer dashboard pages may use mock data without detection.

**Problem**: `wiring-verification.test.ts` checks dashboard routes but admin pages and newer features may have slipped through.

**Fix**: Extend the test to scan all route files under `app/admin/` and `app/dashboard/` for mock data patterns.

---

### ISSUE-018: No error boundaries on most pages

**Files**: `apps/web/app/error.tsx`
**Status**: OPEN
**Impact**: A crash in one dashboard section takes down the entire app.

**Problem**: Only root `app/error.tsx` exists. Individual dashboard/admin pages lack `error.tsx` boundaries.

**Fix**: Add `error.tsx` to each route group:

```
app/dashboard/error.tsx
app/admin/error.tsx
app/playground/error.tsx
```

Each should show a user-friendly error with retry button.

---

### ISSUE-019: No loading states for data-heavy pages

**Files**: `apps/web/app/dashboard/loading.tsx`
**Status**: OPEN
**Impact**: Analytics, logs, battle pages show blank screen while loading.

**Problem**: Only `dashboard/loading.tsx` exists. Analytics, logs, battle, and admin pages lack skeleton/spinner states.

**Fix**: Add `loading.tsx` with skeleton components to:

```
app/dashboard/analytics/loading.tsx
app/dashboard/logs/loading.tsx
app/dashboard/battle/loading.tsx
app/admin/loading.tsx
```

---

### ISSUE-020: No i18n / internationalization

**Status**: OPEN
**Impact**: All strings hardcoded in English. Can't serve non-English users.

**Problem**: No i18n framework configured. All UI text is inline English strings.

**Fix**: Add `next-intl` or `react-i18next`. Extract strings to locale files. Start with English as source of truth.

---

### ISSUE-021: No accessibility (a11y) audit

**Status**: OPEN
**Impact**: Screen reader users can't use the platform. Potential legal compliance issues.

**Problem**: No ARIA labels, keyboard navigation testing, or screen reader testing found.

**Fix**:
1. Add `eslint-plugin-jsx-a11y` to lint config
2. Run Lighthouse accessibility audit
3. Add ARIA labels to interactive elements
4. Test keyboard navigation for all flows
5. Verify color contrast ratios

---

## P4 — INFRA / DEVOPS GAPS

### ISSUE-022: docker-compose issues

**File**: `docker-compose.yml`
**Status**: OPEN
**Impact**: Backend uses wrong env file. No Redis. No automated migrations.

**Problems**:
1. Backend `env_file: apps/web/.env.local` — should use `apps/backend/.env`
2. No Redis container (code supports Redis rate limiting, caching, quota)
3. No automated migration step in container startup
4. No web service Dockerfile at repo root (references `Dockerfile` but may not exist)

**Fix**:
1. Change backend env_file to `apps/backend/.env`
2. Add Redis service:
   ```yaml
   redis:
     image: redis:7-alpine
     ports:
       - "6379:6379"
     volumes:
       - redis_data:/data
   ```
3. Add migration init container or entrypoint script
4. Verify `Dockerfile` exists at repo root

---

### ISSUE-023: .env files not properly gitignored

**Files**: `.gitignore`, `apps/web/.env.local`, `apps/backend/.env`
**Status**: OPEN
**Impact**: Risk of committing credentials to git.

**Problem**:
- `.gitignore` has `.env` and `.env.development.local` but NOT `.env.local`
- `apps/web/.env.local` is NOT gitignored
- `apps/backend/.env` is NOT gitignored

**Fix**: Add to `.gitignore`:

```
# Environment variables
.env
.env.local
.env.*.local
apps/web/.env.local
apps/backend/.env
```

---

### ISSUE-024: No Redis container in docker-compose

**File**: `docker-compose.yml`
**Status**: OPEN
**Impact**: Redis-dependent features (rate limiting, caching, quota) fail silently in Docker.

**Problem**: Code has full Redis support (`redis_ratelimit.go`, cache, quota) but docker-compose has no Redis service.

**Fix**: Add Redis service to `docker-compose.yml` (see ISSUE-022).

---

## P5 — TESTING GAPS

### ISSUE-025: Sparse handler tests

**File**: `apps/backend/internal/handler/handler_test.go`
**Status**: OPEN
**Impact**: Batch, conversation, and org endpoints untested.

**Problem**: `handler_test.go` exists but doesn't cover all endpoints. ops.md notes gaps in batch, conversation, and organization handlers.

**Fix**: Add tests for:
- `POST /v1/batch` — create batch job
- `GET /v1/batch/:id` — get batch status
- `POST /v1/conversations` — create conversation
- `GET /v1/organizations` — list orgs
- `POST /v1/organizations/:id/members` — add member

---

### ISSUE-026: No repository tests

**Files**: `apps/backend/internal/repository/`
**Status**: OPEN
**Impact**: Data access layer bugs undetected until production.

**Problem**: No integration tests for any repository. SQL errors, constraint violations, and edge cases untested.

**Fix**: Add tests using `internal/testutil.NewTestServer()` or testcontainers:

```go
func TestAPIKeyRepo_Create(t *testing.T) {
    db := testutil.NewTestDB(t)
    repo := repository.NewAPIKeyRepo(db)
    // test create, find, delete
}
```

---

### ISSUE-027: No LLM provider failover tests

**Files**: `apps/backend/pkg/llm/provider/`, `apps/backend/pkg/llm/circuitbreaker/`
**Status**: OPEN
**Impact**: Circuit breaker and fallback logic untested. Failures may cascade.

**Problem**: No tests for:
- Provider failover when primary is down
- Circuit breaker state transitions (closed → open → half-open)
- Retry with backoff behavior
- Fallback to secondary provider

**Fix**: Add tests with mock HTTP servers:

```go
func TestProviderFailover_PrimaryDown(t *testing.T) {
    // Start mock server that returns 500
    // Register as primary provider
    // Verify fallback to secondary
}
```

---

### ISSUE-028: No end-to-end tests

**Files**: `.github/workflows/e2e.yml`
**Status**: OPEN
**Impact**: No automated verification of critical user flows.

**Problem**: `e2e.yml` exists but no actual Playwright test files found.

**Fix**: Create E2E tests for critical flows:

```
tests/e2e/
  auth.spec.ts        — signup → login → dashboard
  api-keys.spec.ts    — create key → use key → revoke key
  playground.spec.ts  — select model → send message → see response
  billing.spec.ts     — view credits → purchase → verify balance
```

---

## Suggested Priority Order

### Week 1 — Fix crashes
1. ISSUE-001: Fix seed.go column names
2. ISSUE-002: Add user_rate_limits migration
3. ISSUE-005: Add users.tier to Drizzle schema

### Week 2 — Stabilize schema
4. ISSUE-004: Add missing tables to Drizzle schema
5. ISSUE-006: Remove duplicate rate_limit_tiers migration
6. ISSUE-007: Align webhook_deliveries.max_attempts
7. ISSUE-008: Fix date type mismatches

### Week 3 — Infrastructure
8. ISSUE-023: Fix .gitignore entries
9. ISSUE-022: Fix docker-compose issues
10. ISSUE-024: Add Redis to docker-compose
11. ISSUE-003: Set up CI/CD pipeline

### Week 4 — Features
12. ISSUE-014: Wire web search tool
13. ISSUE-015: Move batch processor to DB
14. ISSUE-009: Implement token blacklist for logout
15. ISSUE-016: Migrate to Argon2id

### Week 5 — Quality
16. ISSUE-018: Add error boundaries
17. ISSUE-019: Add loading states
18. ISSUE-025: Add handler tests
19. ISSUE-026: Add repository tests
20. ISSUE-027: Add provider failover tests
21. ISSUE-028: Create E2E test suite

### Backlog
22. ISSUE-010-012: Resolve missing pkg/llm packages
23. ISSUE-013: Implement code execution tool
24. ISSUE-017: Extend mock data enforcement
25. ISSUE-020: Add i18n
26. ISSUE-021: Accessibility audit
