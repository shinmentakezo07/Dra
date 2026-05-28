# Ops — YAPAPA (Universal LLM Gateway)

> Audit generated: 2026-05-12
> Codebase: Next.js 16 (canary) + Go 1.25 monorepo — OpenRouter-style LLM proxy

---

## Table of Contents

1. [Critical Replacements](#1-critical-replacements)
2. [Recommended Additions](#2-recommended-additions)
3. [Architecture Debt](#3-architecture-debt)
4. [Dependency Audit](#4-dependency-audit)
5. [Security Posture](#5-security-posture)
6. [Performance & Scalability](#6-performance--scalability)
7. [Testing Gaps](#7-testing-gaps)

---

## 1. Critical Replacements

### 1.1 Consolidate Dual Provider Systems

**Status**: ✅ COMPLETED — `internal/provider/` eliminated, `llmRegistry` removed from `Handler`

**Completed**: 2026-05-15

- Deleted `internal/provider/` (already removed)
- Migrated `AdminCircuitBreakers` to use `providerSvc.CircuitBreakerStatuses()`
- Removed redundant `llmRegistry` field and `SetLLMRegistry` from `Handler`
- Removed unused `circuitbreaker` import from `handler.go`

There are **two independent provider registries** that don't talk to each other:

| Location                        | Interface                                              | Used By                              |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `internal/provider/provider.go` | `Provider` (Chat, ChatStream, ListModels) + `Registry` | `handler.go` line 50 (`providerSvc`) |
| `pkg/llm/provider/provider.go`  | `BaseProvider` + options pattern                       | `handler.go` line 69 (`llmRegistry`) |

The `Handler` struct holds **both**. This means:

- Adding a new LLM backend = register in two places
- Provider metrics/logging duplicated or diverged
- `internal/provider/circuitbreaker.go` vs `pkg/llm/circuitbreaker/` — two circuit breaker systems

**Fix**: Eliminate `internal/provider/provider.go`. Migrate `internal/handler/openai_proxy.go` to use `pkg/llm/provider` exclusively. Move the `ChatRequest`/`ChatResponse` types into `pkg/llm` or merge with existing `llm.Message` / `llm.types.go`.

**Files affected**:

- `internal/provider/provider.go` — DELETE
- `internal/provider/circuitbreaker.go` — MERGE into `pkg/llm/circuitbreaker/`
- `internal/handler/openai_proxy.go` — REFACTOR imports
- `internal/handler/handler.go` — REMOVE `providerSvc`, keep `llmRegistry`
- `internal/service/provider.go` — EVALUATE if still needed

---

### 1.2 Raw HTTP Client → `sashabaranov/go-openai` SDK

**Status**: ✅ COMPLETED — SDK already integrated in `pkg/llm/provider/`

**Completed**: 2026-05-15 (verified existing)

- `BaseProvider` already uses `*openai.Client` from `sashabaranov/go-openai`
- `OpenAIProvider` and `GenericProvider` delegate to `chatWithSDK` / `chatStreamWithSDK` in `openai_sdk.go`
- Streaming, context cancellation, and retry logic handled by SDK

`pkg/llm/provider/provider.go` (`BaseProvider.doRequest()`) builds raw HTTP requests, parses streaming SSE manually, and hand-rolls error handling. This is fragile:

- No built-in retry with backoff
- Manual SSE stream parsing is error-prone
- No built-in context cancellation propagation
- Missing proxy/timeout/transport configuration

**Fix**: Replace `doRequest()` internals with `github.com/sashabaranov/go-openai`. The SDK:

- Handles OpenAI-compatible streaming natively
- Supports `context.Context` cancellation
- Has built-in retry logic
- Is used by ~20K+ projects

The `BaseProvider` wrapper stays (for your custom middleware, caching, watcher), but delegates HTTP to the SDK:

```go
type BaseProvider struct {
    client     *openai.Client  // SDK client instead of raw http.Client
    // ... rest stays
}
```

---

### 1.3 `use cache` Directive (Next.js 16)

**Status**: 🟡 P1 — Silent performance regression risk

Next.js 16 **removed implicit caching**. Pages that worked in Next.js 14/15 may now render fully dynamically. Key changes:

- `fetch()` is no longer cached by default
- `revalidate` export is gone → use `cacheLife()` inside `"use cache"` scope
- `dynamic = 'force-static'` is deprecated → use `"use cache"` with `cacheLife('max')`

**Check all pages in**: `app/dashboard/`, `app/pricing/`, `app/models/`, `app/gateway/`

**Fix**: Audit each page route. Add `"use cache"` directive + `cacheLife()` to pages that should be cached (pricing, models list, static content). Leave dynamic pages (dashboard with live data) as-is since they're already request-time.

---

### 1.4 `tailwind.config.ts` → CSS-First Config (Tailwind v4)

**Status**: 🟢 P2 — Migration debt

You're on `@tailwindcss/postcss` v4 but still using the v3-style `tailwind.config.ts` with `theme.extend`. Tailwind v4 uses CSS-first configuration via `@theme` blocks in `app/globals.css`. While v3 compat works via `@config`, it adds complexity.

**Fix**: Migrate theme tokens into CSS:

```css
/* globals.css */
@import "tailwindcss";
@theme {
  --font-sans: var(--font-inter), sans-serif;
  --font-mono: var(--font-space), monospace;
  --color-neon-blue: #00f3ff;
  --color-neon-pink: #ff00ff;
  --color-neon-green: #00ff00;
}
```

Then delete `tailwind.config.ts`.

---

### 1.5 `@neondatabase/serverless` → Dual DB Driver

**Status**: 🟢 P2 — Dev friction

```
db/index.ts → @neondatabase/serverless for ALL environments
```

The Neon serverless driver has different connection semantics than `pg`. For local dev, use the standard `pg` driver or configure Neon's local mode.

**Fix**: Switch driver based on `DATABASE_URL`:

```typescript
// db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL!;
const isNeon = connectionString.includes("neon.tech");

export const db = isNeon
  ? drizzle(neon(connectionString))
  : drizzle(new Pool({ connectionString }));
```

---

### 1.6 bcryptjs → argon2id

**Status**: 🟢 P2 — Security

Root `package.json` lists `bcryptjs` as a devDependency. If used for any password hashing in the frontend:

- bcrypt is GPU-resistant but not memory-hard
- Argon2id is OWASP-recommended, memory-hard, ASIC-resistant

The Go backend already imports `golang.org/x/crypto` — use `argon2` from it instead of bcrypt.

---

## 2. Recommended Additions

### 2.1 TanStack React Query for Dashboard

**Status**: ✅ COMPLETED — Full hooks coverage

**Completed**: 2026-05-15

- `lib/api/hooks.ts` expanded with 25+ hooks covering all SDK methods
- Added: keys, credits, budget, analytics, logs, transactions, conversations, prompts, webhooks, organizations, batch, files, embeddings, notifications, provider health, circuit breakers
- Features: auto-refetch, optimistic updates, polling for active batch jobs, placeholder data for pagination

Current state: `lib/api/sdk.ts` is a raw class with `fetch()` calls. Dashboard components call `getSDK().getAnalytics()` directly with no caching, dedup, or loading state management.

**Add**: `@tanstack/react-query` and wrap SDK methods:

```typescript
// lib/api/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { getSDK } from "./sdk";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => getSDK().getAnalytics(),
    refetchInterval: 30_000, // poll every 30s for dashboard
  });
}
```

Benefits:

- Automatic cache invalidation
- Background refetching
- Optimistic updates for credit purchases
- Request deduplication (multiple components can call same hook)

---

### 2.2 Request ID / Trace Propagation

**Status**: ✅ COMPLETED — Full chain propagation implemented

**Completed**: 2026-05-15

- Frontend proxy (`lib/api/proxy.ts`): generates `X-Request-ID` via `crypto.randomUUID()` if not present
- Frontend SDK (`lib/api/sdk.ts`): sends `X-Request-ID` header on every request
- Backend (`TraceMiddleware`): uses incoming `X-Request-ID` or generates one
- Backend→Provider (`pkg/llm/provider/provider.go`): forwards `X-Request-ID` to LLM providers via `trace.GetRequestID(ctx)`
- Backend logs (`middleware/logger.go`): includes `request_id` in structured logs
- Response headers: backend returns `X-Request-ID`, SDK extracts it via `extractResponseHeaders()`

Add `X-Request-ID` through the entire chain:

```
Browser → Next.js API Route → Go Backend → LLM Provider
         ↑                     ↑              ↑
    X-Request-ID          X-Request-ID    X-Request-ID
```

**Go middleware** (`internal/middleware/tracing.go` already exists, extend it):

- Generate UUID if not present
- Propagate to downstream providers via HTTP header
- Include in structured logs
- Return in response header

This is essential for debugging production issues across the distributed system.

---

### 2.3 Webhook Retry with Backoff

**Status**: ✅ COMPLETED — Retry + DLQ + idempotency

**Completed**: 2026-05-15

- Exponential backoff retry: 1s → 4s → 16s → 64s, max 5 retries
- Dead letter queue after max retries
- Delivery logs stored in `webhook_delivery_logs` table
- Admin endpoints: `GET /api/admin/webhooks/logs`, `POST /api/admin/webhooks/{id}/retry`
- Background retry worker polls every 10 seconds
- Coverage: 91.3% (`pkg/webhook`)

Current: webhooks fire once, if delivery fails the event is lost.

**Add** to `internal/service/webhook.go`:

1. **Retry queue** — on failure, schedule retry with exponential backoff: 1s, 4s, 16s, 64s, max 5 retries
2. **Dead letter** — after N failures, move to DLQ table for manual inspection
3. **Idempotency** — require `X-Idempotency-Key` header, deduplicate in `repository/webhook.go`
4. **Storage** — add `webhook_deliveries` table tracking each attempt

---

### 2.4 Budget-Aware Model Routing

**Status**: 🔵 P3 — Feature differentiation

Your `pkg/llm/router/router.go` has cost/latency/reliability strategies. Extend it with **budget-aware routing**:

```
User has 100 credits remaining
User requests "gpt-4"
Router checks: gpt-4 costs 30 credits → exceeds remaining budget?
  → Yes: route to gpt-3.5-turbo (3 credits) with user notification
  → No: proceed with gpt-4
```

This is a premium feature that differentiates from OpenRouter. Implementation:

1. Pass user credit balance to `router.Router`
2. Add `StrategyBudget` strategy
3. Return `model_override` in response so the UI can display it

---

### 2.5 Provider Health Dashboard (Admin)

**Status**: 🟢 P2 — Transparency

You already have `pkg/llm/provider/health.go`. Surface it:

1. Add `GET /api/admin/provider-health` endpoint that pings all providers
2. Add admin dashboard card showing: green (healthy), yellow (degraded), red (down), plus last-check timestamp
3. Add Prometheus alert if any provider has been down >5 minutes

---

## 3. Architecture Debt

### 3.1 Service Layer vs Handler Layer

`internal/handler/handler.go` has 16 service/repository fields. Some handlers bypass services and call repositories directly. Standardize:

- **Handler** → parses request, calls service, writes response
- **Service** → business logic, validation, cross-cutting concerns
- **Repository** → raw data access

Audit `internal/handler/*.go` for direct repository calls.

### 3.2 Overlapping LLM Package Structure

```
pkg/llm/
  batch/        ← parallel request batching
  cache/        ← response caching (dedup + semantic)
  circuitbreaker/ ← circuit breaker per provider
  context/      ← context window management
  embeddings/   ← embedding generation
  guardrails/   ← content filtering
  moderation/   ← content moderation
  openai/       ← OpenAI schema types
  pipeline/     ← multi-step LLM pipeline
  provider/     ← provider registry + base provider
  router/       ← intelligent model routing
  telemetry/    ← LLM call tracing
  tokens/       ← token counting
  translator/   ← request/response translation
  types.go      ← core types
  validator/    ← request validation
  watcher/      ← provider watch loop
```

This is comprehensive but has unclear ownership. Some packages are 50-line stubs. Run a complexity audit:

- `pkg/llm/context/` — may overlap with token counting
- `pkg/llm/translator/` — may overlap with `pkg/llm/openai/formatter.go`
- `pkg/llm/pipeline/` — may overlap with `internal/service/router.go`

### 3.3 Go 1.25 Features Not Utilized

Go 1.25 introduces `iter.Seq` and `unique` packages:

```go
// Current pattern (callback-based pagination):
func (r *Repo) ListLogs(ctx context.Context, userID string, cb func(Log) error) error

// Go 1.25 pattern (iter.Seq):
func (r *Repo) ListLogs(ctx context.Context, userID string) iter.Seq2[Log, error]
```

The `iter.Seq2` pattern is cleaner for callers and composes with `for range`. Consider for high-traffic repository methods.

---

## 4. Dependency Audit

### 4.1 Frontend (`apps/web/package.json`)

| Package                                             | Status           | Notes                                                          |
| --------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| `next@^16.3.0-canary.16`                            | ⚠️ Canary        | Pin to a specific canary release; expect breaking changes      |
| `@ai-sdk/react`, `ai`                               | ✅ Current       | Vercel AI SDK — keep                                           |
| `framer-motion@^12.38.0`                            | ⚠️ Major version | Check if v12 has breaking changes from v11                     |
| `gsap`, `@gsap/react`                               | ❓ Overlap       | Both GSAP and Framer Motion for animations? Consolidate to one |
| `recharts@^3.8.1`                                   | ⚠️ Major version | v3 may have breaking API from v2                               |
| `react-hook-form@^7.74.0`                           | ✅ Current       | Keep                                                           |
| `zod@^4.4.3`                                        | ⚠️ Major version | Zod 4 has breaking changes from v3                             |
| `react-syntax-highlighter` + `prism-react-renderer` | ❓ Overlap       | Two syntax highlighters — consolidate                          |
| `@xterm/xterm`                                      | ✅ OK            | Terminal emulator for playground                               |

### 4.2 Backend (`go.mod`)

| Package                           | Status         | Notes                         |
| --------------------------------- | -------------- | ----------------------------- |
| `chi/v5`                          | ✅ Good        | Idiomatic, lightweight — keep |
| `pgx/v5`                          | ✅ Good        | Best Postgres driver for Go   |
| `golang-jwt/jwt/v5`               | ✅ Current     | Keep                          |
| `prometheus/client_golang`        | ✅ Good        | Standard for metrics          |
| `redis/go-redis/v9`               | ✅ Good        | Keep                          |
| `stripe/stripe-go/v76`            | ⚠️ Old version | Latest is v82+ — update       |
| Missing: `sashabaranov/go-openai` | ❌ Needed      | For OpenAI-compatible SDK     |

---

## 5. Security Posture

### 5.1 AUTH_SECRET Must Match Frontend + Backend

Already noted in AGENTS.md. Verify in CI that both `apps/web/.env` and `apps/backend/.env` have the same `AUTH_SECRET` value.

### 5.2 API Key Generation

**Check**: `repository/apikey.go` — verify API keys are generated using `crypto/rand` (not `math/rand`). The frontend `db/schema.ts` shows `key: text("key").notNull().unique()` — ensure keys are prefixed (e.g., `sk-ya-...`) for easy identification.

### 5.3 Rate Limiting Default

Current default: `RATE_LIMIT_RPM = 60` (1 request/second). This is very permissive for a credit-based billing system. Consider:

- Authenticated users: 60 RPM (current)
- Unauthenticated: 10 RPM
- Admin: 300 RPM

### 5.4 SQL Injection Surface

Check `internal/repository/*.go` for raw SQL string concatenation. pgx supports parameterized queries (`$1`, `$2`). All queries MUST use parameterized bindings, not `fmt.Sprintf`.

---

## 6. Performance & Scalability

### 6.1 In-Memory Rate Limiting (Default)

The default rate limiter is in-memory (`internal/middleware/ratelimit.go`). This means:

- **Does not scale horizontally** — each backend instance has its own counter
- **Lost on restart** — counters reset

You have `redis_ratelimit.go` but it's secondary. **Make Redis the default** when `REDIS_URL` is configured, with in-memory as fallback.

### 6.2 Semantic Cache

`pkg/llm/cache/semantic_cache.go` with `SemanticCacheThreshold` float64 exists. This is a powerful feature (cache similar prompts via embedding similarity) but:

- Can return stale results for rapidly-changing contexts
- Embedding calls add latency overhead
- Tune the threshold — too low = cache misses, too high = wrong answers

Consider caching only for GET-model endpoints, not chat completions.

### 6.3 SSE Streaming Architecture

`internal/handler/sse.go` handles streaming responses. Verify:

- Flush is called after each event: `flusher.Flush()`
- Context cancellation properly terminates upstream LLM calls
- Client disconnect triggers `req.Context().Done()` cleanup
- No unbounded buffer grows for slow consumers

---

## 7. Testing Gaps

### 7.1 Frontend

| Area            | Current | Target                                                   |
| --------------- | ------- | -------------------------------------------------------- |
| Component tests | ❌ None | Add vitest tests for billing, keys, analytics components |
| SDK tests       | ❌ None | Test error handling, retries, edge cases                 |
| E2E tests       | ❌ None | Critical flow: signup → purchase → create key → use API  |
| Accessibility   | ❌ None | Add `vitest-axe` or `@testing-library/jest-dom`          |

### 7.2 Backend

| Area               | Current                 | Target                                                |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Handler tests      | ✅ `handler_test.go`    | Add tests for openai_proxy, billing, admin handlers   |
| Repository tests   | ❌ None                 | Add tests with testcontainers or `internal/testutil`  |
| LLM provider tests | ❌ None                 | Test provider failover, circuit breaker, retry        |
| Integration tests  | ⚠️ `tests/integration/` | Requires `TEST_DATABASE_URL` — document setup clearly |

### 7.3 Key Testing Gaps Found

- `internal/handler/handler_test.go` — verify it actually tests the new endpoints (batch, conversation, organization)
- `internal/domain/domain_test.go` — domain model tests exist, but no test for credit math (purchase, spending, refund rounding)
- `internal/middleware/auth_test.go`, `quota_test.go` — middleware tested, good
- `pkg/llm/llm_test.go` — LLM package tests, verify coverage
- `pkg/sdk/client_test.go` — SDK client tests, verify coverage
- `tests/integration/integration_test.go` — full integration, verify it works without external dependencies

---

## Action Plan (Priority Order)

### This Week

- [x] **P0** — Consolidate dual provider systems (1.1)
- [x] **P0** — Migrate to go-openai SDK (1.2)
- [x] **P1** — Add TanStack React Query (2.1)
- [x] **P1** — Add request ID propagation (2.2)
- [x] **P1** — Webhook retry with backoff (2.3)
- [x] **P0** — Complete Go SDK (missing.md)
- [x] **P0** — Complete TypeScript SDK (missing.md)

### Next Week

- [ ] **P1** — Migrate to go-openai SDK (1.2)
- [ ] **P1** — Webhook retry with backoff (2.3)
- [ ] **P2** — Audit `use cache` directives across pages (1.3)
- [ ] **P2** — Argon2id password hashing (1.6)
- [ ] **P2** — Redis-default rate limiting (6.1)

### Backlog

- [ ] **P2** — Provider health dashboard (2.5)
- [ ] **P3** — Budget-aware model routing (2.4)
- [ ] **P3** — Dual DB driver setup (1.5)
- [ ] **P3** — Tailwind v4 CSS config (1.4)
- [ ] **P3** — Go 1.25 iter.Seq migration (3.3)
- [ ] **P3** — Frontend test coverage (7.1)

---

## How to Verify Each Fix

| Fix                    | Verification                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| Provider consolidation | `make build && make test` — all existing tests pass                          |
| go-openai SDK          | `make test-unit` + manual streaming chat in playground                       |
| `use cache`            | Run `npm run build` — check build output for static vs dynamic pages         |
| TanStack Query         | `npm run test` + open dashboard, verify loading/error/empty states           |
| Request ID             | `curl -v http://localhost:8080/api/models` — check `X-Request-ID` header     |
| Webhook retry          | `make test-integration` with webhook test + check `webhook_deliveries` table |
| Rate limiting          | `ab -c 20 -n 100 http://localhost:8080/api/models` — verify 429 after limit  |
