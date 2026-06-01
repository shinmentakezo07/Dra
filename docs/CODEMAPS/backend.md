<!-- Generated: 2026-05-31 (INCREMENTAL) | Files scanned: ~240 Go + 21 SQL + enterprise packages | Token estimate: ~1100 | Last full scan: 2026-05-29 -->
<!-- INCREMENTAL UPDATE: Enterprise packages (credentials, virtualkeys, budget, audit, security, usage, loadbalancer, otel, ws), stores layer, migration 022 -->

# Backend Architecture Codemap — Go 1.25 API

**Location**: `apps/backend/`
**Module Path**: `dra-platform/backend`
**Go Version**: 1.25.0

---

## Layered Architecture (Strict Separation)

```
cmd/api/
  ├── main.go          # Entry point, DI wiring, server bootstrap
  ├── routes.go        # All route definitions + middleware chains (~400 lines)
  └── services.go      # initServices() — dependency injection factory (~370 lines)

internal/
  ├── domain/          # Pure types + AppError (NO external deps)
  ├── handler/         # HTTP-only: decode → call service → write response
  │   └── enterprise.go (credential vault endpoints, 11KB)
  ├── service/         # Business logic (NEVER import net/http)
  ├── repository/      # Legacy: user/auth/billing (raw SQL via pgx)
  ├── middleware/      # 14 cross-cutting concerns (auth, quota, rate limit, etc.)
  ├── config/          # Env var loading + validation
  ├── db/              # pgx pool + health checks
  └── pkg/             # Shared utilities (logger, response, token)

pkg/                   # Public packages (reusable across services)
  ├── sdk/             # Official Go SDK client (~1860 lines, 40+ methods)
  ├── llm/             # 10-stage LLM pipeline (28+ subpackages)
  │   ├── {credentials,virtualkeys,budget,audit,security,usage,loadbalancer,otel,ws}
  │   └── stores/      # PostgreSQL implementations of enterprise Store interfaces
  ├── webhook/         # Webhook delivery engine
  ├── email/           # SMTP client
  └── trace/           # Distributed tracing helpers
```

---

## Route Groups & Middleware (from `routes.go`)

| Group | Prefix | Middleware | Handler Count | Notes |
|-------|--------|------------|---------------|-------|
| **Public** | `/health`, `/health/providers` | None | 2 | Liveness + provider health |
| **Auth** | `/auth/*` | Rate limit (10 req/min per-IP) | 5 | signup, login, oauth, forgot/reset |
| **OpenAI Proxy** | `/v1/*` | Auth + Quota | 4 | chat/completions, messages, embeddings, models |
| **Protected** | `/api/*` | Auth + Quota | 40+ | keys, credits, logs, billing, organizations, etc. |
| **Stripe Webhook** | `/webhooks/stripe` | Signature verification only | 1 | Raw body required for sig check |
| **Admin** | `/api/admin/*` | Auth + Admin role | 60+ | users, providers, billing, audit, SSO, etc. |
| **Enterprise Admin** | `/api/admin/credentials` | Permission: providers.write | 4 | Credential vault CRUD + rotate (AES-256) |
| **Metrics** | `/metrics` (separate :9090) | CORS only | 1 | Prometheus exposition |

### Global Middleware Chain (order matters)

```
1. chiMiddleware.Recoverer
2. chiMiddleware.RequestID (X-Request-ID)
3. chiMiddleware.RealIP (X-Forwarded-For)
4. chiMiddleware.Timeout (default 30s)
5. appmiddleware.RequestContext (context values)
6. appmiddleware.TraceMiddleware (distributed tracing spans)
7. appmiddleware.BodyLimit (10 MB)
8. appmiddleware.RequestLogger (structured slog)
9. appmiddleware.Metrics (Prometheus counters/histograms)
10. appmiddleware.TransformMiddleware (prompt injection, header stripping)
11. cors.Handler (configurable origins)
12. appmiddleware.RateLimit (memory or Redis, sliding window)
13. authMW (JWT / Session / API Key → inject User + APIKey)
14. quotaMW (credit deduction, budget checks)
```

---

## Handler Layer (`internal/handler/`)

**Responsibility**: HTTP concerns only — decode JSON, call service, handle `*domain.AppError`, write response via `pkg/response`.

| File | Purpose | Key Endpoints |
|------|---------|---------------|
| `handler.go` | Core chat proxy, health checks | `ChatProxy`, `Health`, `ProviderHealth` |
| `openai_proxy.go` | OpenAI-compatible proxy | `OpenAIChatCompletions`, `OpenAIEmbeddings`, `OpenAIListModels` |
| `anthropic_messages.go` | Anthropic `/v1/messages` compat | `AnthropicMessages` (reuses same auth/quota pipeline) |
| `auth_handlers.go` | User auth | signup, login, oauth, forgot/reset, profile, password |
| `admin_*.go` (10 files) | Admin operations | users, providers, models, billing, audit, security, settings, operations, promos |
| `apikey.go` | API key CRUD | create, list, revoke, delete |
| `billing.go` | Credit purchases | `PurchaseCredits`, Stripe integration |
| `credits.go` | Balance & budget | get balance, set budgets |
| `logs.go` (via `handler.go`) | Request logs | paginated query with filters |
| `organization.go` | Team management | create org, invite, members |
| `webhook.go` | Webhook config | CRUD for outbound webhooks |
| `batch.go` | Batch jobs | submit, status, results |
| `fine_tuning_handlers.go` | Fine-tuning jobs | upload dataset, queue job, poll status |
| `sse.go` | Real-time notifications | per-user SSE hub (`NotificationHub`) |
| `export_handlers.go` | Async exports | request CSV/JSON export, download URL |
| `provider_plugin_handlers.go` | Dynamic providers | register, enable/disable plugins |
| `rbac_handlers.go` | RBAC + SSO | role management, SSO config CRUD |
| `enterprise.go` | **NEW** Credential vault | List/Add/Rotate credentials (admin-only, encrypted) |

**Admin Error Handling** (`admin_errors.go`):
- `adminError()` / `adminErrorWithStatus()` — log full error server-side, return generic message to client
- **Never leak `err.Error()` directly to admin responses**

---

## Service Layer (`internal/service/`)

**Responsibility**: Business logic. Returns `*domain.AppError`. **Never imports `net/http`**.

| File | Purpose | Key Methods |
|------|---------|-------------|
| `user.go` | User lifecycle | `Create`, `GetByEmail`, `UpdateProfile`, `ChangePassword` |
| `apikey.go` | API key management | `Create` (generate + hash), `List`, `Revoke` |
| `credits.go` | Credit operations | `GetBalance`, `Deduct`, `Purchase`, `SetBudget` |
| `billing.go` | Stripe integration | `CreateCheckoutSession`, `HandleWebhook` |
| `log.go` | Request logging | `LogRequest`, `QueryLogs` (with filters + pagination) |
| `audit.go` | Admin audit trail | `LogAction`, `QueryAuditLogs` |
| `router.go` | LLM routing facade | `Route()` → calls ModelRouter + ABRouter + BudgetRouter |
| `provider.go` | Provider registry | `GetProvider`, `ListProviders`, `HealthCheckAll` |
| `webhook.go` | Webhook dispatch | `Dispatch(event, payload)`, retry worker, DLQ |
| `export.go` | Export jobs | `CreateExportJob`, `ProcessExport` (async CSV/JSON) |
| `fine_tuning.go` | Fine-tuning orchestration | `CreateJob`, `PollStatus`, `ProcessJob` |
| `organization.go` | Org management | `Create`, `InviteMember`, `ListMembers` |
| `rbac.go` | Permission checks | `HasPermission(user, perm)`, `RequirePermission` middleware factory |
| `analytics.go` | Usage analytics | `GetUsageStats`, `GetCostBreakdown` |
| `batch.go` | Batch job management | `SubmitBatch`, `GetBatchStatus` |
| `conversation.go` | Chat history | `SaveConversation`, `ListMessages` |
| `prompt.go` | Prompt templates | `RenderPrompt(name, vars)` |
| `comparison.go` | Side-by-side testing | `RunComparison(models, prompt)` |
| `token_blacklist.go` | Token revocation | `Blacklist(token)`, `IsBlacklisted(token)` |
| `stripe.go` | Stripe client wrapper | Checkout, customer portal, subscription sync |

---

## Repository Layer (`internal/repository/`)

**Responsibility**: Raw SQL via `pgxpool`. All queries parameterized. Returns Go errors (convert `pgx.ErrNoRows` → `nil, nil` at caller).

| File | Table(s) | Key Queries |
|------|----------|-------------|
| `user.go` | `users` | `GetByID`, `GetByEmail`, `Create`, `Update` |
| `apikey.go` | `api_keys` | `Create` (insert hash), `GetByHash`, `ListByUser`, `Revoke` |
| `cached_apikey.go` | `api_keys` + cache | 5-min TTL cache wrapper around `apikey.go` |
| `credits.go` | `user_credits` | `GetBalance`, `DeductAtomic`, `AddCredits` |
| `cached_credits.go` | `user_credits` + cache | Cache wrapper (balance lookups are hot path) |
| `transaction.go` | `credit_transactions` | `Create`, `ListByUser` (paginated) |
| `log.go` | `api_logs` | `Insert`, `Query` (filters: user, model, date range, status) |
| `admin_user_repo.go` | `users` + joins | Admin user list with stats (credits, request counts) |
| `admin_provider_repo.go` | `providers` | Admin CRUD for LLM providers |
| `admin_model_repo.go` | `models` | Admin model catalog management |
| `admin_billing_repo.go` | billing tables | Revenue, refunds, disputes |
| `admin_audit_repo.go` | `audit_logs` | Admin action audit trail |
| `admin_security_repo.go` | security events | Failed logins, IP blocks, rate limit hits |
| `rbac.go` | `roles`, `permissions`, `user_roles` | Permission lookup, role assignment |
| `webhook.go` | `webhooks`, `webhook_deliveries` | Webhook config + delivery log + DLQ |
| `stripe.go` | `stripe_customers`, `subscriptions` | Stripe customer sync |
| `organization.go` | `organizations`, `org_members` | Org CRUD + membership |
| `batch.go` | `batch_jobs` | Batch job persistence |
| `fine_tuning.go` | `fine_tuning_jobs` | Job queue + status |
| `export.go` | `export_jobs` | Export job tracking |
| `provider_plugin.go` | `provider_plugins` | Dynamic provider plugins |
| `prompt.go` | `prompts` | Template storage |
| `conversation.go` | `conversations`, `messages` | Chat history |
| `token_blacklist.go` | `token_blacklist` | Revoked JWT storage (Redis or DB) |
| `cache.go` | Generic cache | Redis-backed cache helper |

**Caching Pattern**: Hot-path repos (apikey, credits, user) have `cached_*.go` wrappers with 5-min TTL using `internal/redis/`.

---

## Middleware (`internal/middleware/` — 14 files)

| File | Purpose | Behavior on Failure |
|------|---------|---------------------|
| `auth.go` | JWT / Session / API Key | 401, injects User + APIKey to context |
| `quota.go` | Credit check + deduct | 402 if insufficient, tracks usage |
| `ratelimit.go` | Sliding window (memory or Redis) | 429, per-IP or per-user key |
| `require_auth.go` | Enforce authentication | 401 if no User in context |
| `admin.go` | Enforce admin role | 403 if `!user.IsAdmin()` |
| `rbac.go` | Permission-based access | 403 if missing required perm |
| `cors.go` | CORS headers | Preflight handling |
| `body_limit.go` | Request size cap (default 10 MB) | 413 |
| `request_logger.go` | Structured access logs | Always passes (logs only) |
| `metrics.go` | Prometheus instrumentation | Always passes |
| `trace.go` | Distributed tracing spans | Always passes |
| `transform.go` | Prompt injection, header stripping | Configurable |
| `token_blacklist.go` | Check revoked tokens | 401 if blacklisted |
| `validation.go` | Request body schema validation | 400 on invalid JSON/schema |

---

## LLM Pipeline (`pkg/llm/` — 10 Stages, 19 Subpackages)

```
Request Flow (orchestrated by pipeline/pipeline.go):
  Validator → Router → Cache → Guardrails → Moderation →
  Translator → Provider → Telemetry → CircuitBreaker → Watcher
```

| Stage | Package | Responsibility |
|-------|---------|----------------|
| 1. **Validator** | `validator/` | Schema validation, required fields, model allowlist |
| 2. **Router** | `router/` | ModelRouter (alias resolution), ABRouter (A/B testing), BudgetRouter (cost-aware fallback) |
| 3. **Cache** | `cache/` | TTL cache + semantic dedup (Redis or memory) |
| 4. **Guardrails** | `guardrails/` | Prompt injection detection, PII redaction |
| 5. **Moderation** | `moderation/` | Content safety (local classifier or external API) |
| 6. **Translator** | `translator/`, `translator/handler/` | OpenAI ↔ Anthropic ↔ Generic format conversion |
| 7. **Provider** | `provider/` | SDK integration, multi-key rotation, health checks, circuit breaker wrapper |
| 8. **Telemetry** | `tokens/`, `embeddings/` | Token counting, cost estimation, embedding generation |
| 9. **CircuitBreaker** | `circuitbreaker/` | Per-provider failure tracking (5 failures → 30s open) |
| 10. **Watcher** | `watcher/` | Global error observer, metrics aggregation, alerting hooks |

### Provider Implementations (`pkg/llm/provider/`)

| Provider | SDK | Auth | Base URL |
|----------|-----|------|----------|
| `OpenAIProvider` | `sashabaranov/go-openai` (legacy), `openai-go` (official v3) | Bearer token | `https://api.openai.com/v1` |
| `AnthropicProvider` | Direct HTTP (no SDK for streaming flexibility) | `x-api-key` header | `https://api.anthropic.com/v1` |
| `GenericProvider` | `sashabaranov/go-openai` | Bearer token | Per-instance config |
| `SandboxProvider` | Mock (no external calls) | None | N/A |

**MultiKey Rotation**: Round-robin across primary + secondary keys per provider.
**CircuitBreaker**: Wrapped at provider level; 5 failures → open (30s) → 2 successes → half-open → closed.

### Key Types (`pkg/llm/types.go`)

- `ChatRequest` / `ChatResponse` / `StreamChunk` — canonical internal format
- `Message`, `ContentBlock`, `ToolCall`, `ToolDefinition` — multi-modal + tool calling support
- `Provider` interface — `Chat`, `ChatStream`, `ListModels`, `SupportsThinking`

---

## Enterprise Packages (`pkg/llm/{credentials,virtualkeys,budget,...}` — SONAOP)

**Added**: 2026-05-31 (migration 022 + 9 packages). Dual-layer architecture: legacy `internal/repository/` + new `pkg/llm/stores/` for enterprise concerns.

### The 9 Enterprise Packages

| Package | Core Type | Store Interface | Purpose |
|---------|-----------|-----------------|---------|
| **credentials** | `Credential` (AES-256-GCM encrypted) | `Store` (Save, GetByProvider, UpdateHealth) | Encrypted provider key vault with rotation + health tracking |
| **virtualkeys** | `VirtualKey` (`sk-` prefix) | `Store` (GetByHash, UpdateUsage) | Team-scoped keys with per-key budgets, rate limits, model access |
| **budget** | `Budget` (hierarchical) | `Store` (team/user/key scopes) | Soft/hard limits, reset periods, alert callbacks |
| **audit** | `Action` constants (40+ types) | `Store` (immutable) | Compliance trail: key lifecycle, budget events, security blocks, admin actions |
| **security** | `Guard` (injection, PII, secrets) | — (stateless) | Prompt injection, jailbreak, PII redaction, secret detection |
| **usage** | `Tracker` + `PricingStore` | `UsageStore`, `PricingStore` | Per-request microcent cost tracking, model pricing overrides |
| **loadbalancer** | `Balancer` (6 strategies) | — | RoundRobin, LeastLatency, Weighted, HealthAware, CostOptimal, Capability |
| **otel** | `Provider` + `LoggingExporter` | — | OpenTelemetry spans for distributed tracing |
| **ws** | `Gateway` (1000 conn limit) | — | WebSocket hub for real-time notifications / live dashboards |

### Store Pattern (`pkg/llm/stores/postgres.go`)

All enterprise packages define `Store` interfaces. PostgreSQL implementations live in `stores/`:

```go
credStore := stores.NewPostgresCredentialStore(pool)
credVault := credentials.NewVault(credStore, encryptionKey)

vkeyStore := stores.NewPostgresVirtualKeyStore(pool)
vkeyMgr := virtualkeys.NewManager(vkeyStore)

budgetStore := stores.NewPostgresBudgetStore(pool)
budgetMgr := budget.NewManager(budgetStore)
```

**Why dual layer?** Legacy `internal/repository/` handles user/auth/billing. New `stores/` handles fine-grained enterprise concerns (per-virtual-key budgets, encrypted credential health, immutable audit).

### Wiring (cmd/api/services.go:141-234)

```go
// Enterprise initialization (SONAOP)
credStore := stores.NewPostgresCredentialStore(database.Pool)
credVault, _ := credentials.NewVault(credStore, cfg.AuthSecret)

vkeyStore := stores.NewPostgresVirtualKeyStore(database.Pool)
vkeyManager := virtualkeys.NewManager(vkeyStore)

budgetStore := stores.NewPostgresBudgetStore(database.Pool)
budgetMgr := budget.NewManager(budgetStore)
budgetMgr.SetAlertFunc(...)

securityGuard := security.NewGuard(security.Config{EnablePromptInjection: true, ...})

usageStore := stores.NewPostgresUsageStore(database.Pool)
pricingStore := stores.NewPostgresPricingStore(database.Pool)
usageTracker := usage.NewTracker(usageStore, pricingStore)

auditStore := stores.NewPostgresAuditStore(database.Pool)
auditLogger := audit.NewLogger(auditStore)

loadBalancer := loadbalancer.New(...)
otelProvider := otel.NewProvider(...)
wsGateway := ws.NewGateway(1000)

h.SetCredentialVault(credVault)
h.SetVirtualKeyManager(vkeyManager)
// ... all enterprise deps injected into handler
```

### Enterprise Routes (cmd/api/routes.go)

| Endpoint | Handler | Middleware | Purpose |
|----------|---------|------------|---------|
| `GET /api/admin/credentials` | `ListCredentials` | `RequirePermission("providers.write")` | List vault (keys redacted) |
| `POST /api/admin/credentials` | `AddCredential` | `RequirePermission("providers.write")` | Add + encrypt new key |
| `POST /api/admin/credentials/{id}/rotate` | `RotateCredential` | `RequirePermission("providers.write")` | Rotate key (re-encrypt) |
| `GET /api/credits/budget` | `GetBudget` | Auth + Quota | Hierarchical budget view |
| `GET /api/budget/alerts` | `ListBudgetAlerts` | Auth | Budget threshold alerts |
| `GET /ws` | `WebSocketHandler` | Auth | Real-time gateway |

**Audit integration**: Credential mutations automatically call `auditLogger.LogCredentialEvent()`.

### New Tables (migration 022_enterprise_features.sql)

- `credentials` — encrypted provider keys + health metrics
- `virtual_keys` — `sk-` keys with scoping, budgets, rate limits
- `teams` / `team_members` — team workspace hierarchy
- `usage_records` — per-request microcent tracking (virtual_key_id, team_id)
- `audit_logs` — immutable action trail (40+ action types)
- `budget_alerts`, `security_events`, `model_pricing`, `fallback_configs`, `ab_test_configs`, `provider_health_history`

---

## Database Connection (`internal/db/db.go`)

```go
type DB struct { Pool *pgxpool.Pool }

Config:
  MaxConns: 20, MinConns: 2, MaxConnLifetime: 1h, MaxConnIdleTime: 30m
  HealthCheckPeriod: 5m, ConnectTimeout: 5s

Methods: Health(ctx) (2s timeout ping), Close()
```

**Migrations**: 22 hand-applied SQL files in `migrations/001_*.sql` — `022_enterprise_features.sql`. No auto-migrator.

---

## Startup & Shutdown (`cmd/api/main.go`)

```
1. config.Load() — validate required env vars
2. db.New(databaseURL) — pgx pool
3. Redis init (optional, via REDIS_URL)
4. Repository creation (user, apikey, credits, logs, admin_*)
5. LLM provider init:
     - Load from DB (providers table)
     - Instantiate SDK clients
     - Wrap with MultiKey + CircuitBreaker
     - Register with global Watcher
6. Service wiring (15+ services with DI)
7. Handler construction (New() with all deps)
8. Chi router setup (global middleware + route groups)
9. Metrics server (goroutine on :9090, CORS-enabled)
10. HTTP server (:8080, ReadTimeout=15s, WriteTimeout=120s for SSE)
11. Signal handling (SIGINT/SIGTERM) → graceful shutdown (default 10s)
```

---

## Error Model (`internal/domain/errors.go`)

```go
type ErrorCode string  // UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, NOT_FOUND, ...
type AppError struct {
    Code    ErrorCode
    Message string
    Status  int
    Cause   error  // wrapped, not serialized
}
```

**Pre-defined**: `ErrAuthRequired`, `ErrInvalidToken`, `ErrInvalidAPIKey`, `ErrAdminOnly`, `ErrBadInput`, `ErrUserNotFound`, `ErrNoCredits`, `ErrAIUnavailable`, etc.

**Flow**: Repository returns Go errors → Service wraps as `AppError` → Handler checks `AppError` → `response.Error(w, status, msg)`

---

## Key Environment Variables

| Var | Required | Purpose |
|-----|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | HS256 JWT secret (MUST match frontend) |
| `REDIS_URL` | No | Enables Redis-backed cache + rate limiting |
| `STRIPE_SECRET_KEY` | No | Billing (checkout, webhooks, customer portal) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe signature verification |
| `SMTP_*` | No | Email (forgot password, notifications) |
| `ENV` | No | `development` → `slog.LevelDebug`; `production` → `LevelInfo` |

---

## Testing Patterns

- **Unit**: `*_test.go` alongside source (standard Go table-driven tests)
- **Integration**: `internal/testutil.NewTestServer()` harness + `TEST_DATABASE_URL`
- **Handler tests**: `handler_test.go`, `admin_providers_test.go`, `openai_proxy_test.go`
- **Service tests**: `service_test.go`, `service_integration_test.go`
- **Middleware tests**: `auth_test.go`, `quota_test.go`
- **LLM tests**: `pkg/llm/llm_test.go`, `pkg/llm/router/router_test.go`

**Run**: `make test` (all), `make test-unit` (skip integration), `make test-integration` (requires `TEST_DATABASE_URL`)

---

## Critical Invariants

1. **SDK Parity**: Backend API change → update `pkg/sdk/client.go` → update `apps/web/lib/api/sdk.ts` (in order)
2. **No Raw Keys Returned**: `api_keys.key` is always hashed on read; only returned in plaintext on initial creation
3. **Async Billing**: Credit deduction + webhook dispatch happens in goroutine after response sent (fire-and-forget with error logging)
4. **Admin Errors**: Never return `err.Error()` to clients; use `adminError()` helpers
5. **X-Sandbox Header**: Disables quota, cost, and logging for testing (only on `/v1/chat/completions`)
