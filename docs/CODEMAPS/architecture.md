<!-- Generated: 2026-05-29 | Files scanned: ~630 total (~240 Go, ~273 TS/TSX, ~21 SQL, ~40 docs) | Token estimate: ~850 -->

# Architecture Codemap — Yapapa (DRA Platform)

**Project Type**: Turborepo monorepo (Next.js 16 + Go 1.25)
**Primary Purpose**: Universal LLM Gateway (OpenRouter-style proxy for OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, and custom providers)

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  (Web UI, OpenAI SDK, Anthropic SDK, Custom Apps, curl)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NGINX / LOAD BALANCER (optional)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
┌──────────────────────────┐           ┌──────────────────────────────────┐
│   Next.js 16 Frontend    │           │     Go 1.25 Backend API          │
│   apps/web/              │           │     apps/backend/                │
│                          │           │                                  │
│  • App Router (React 19) │◄──────────┤  • Chi Router v5                 │
│  • NextAuth v5 (OAuth)   │  Proxy    │  • JWT + API Key + Session Auth  │
│  • Drizzle ORM           │  Layer    │  • Quota / Rate Limiting         │
│  • TanStack Query        │  (65 API  │  • Billing & Credit System       │
│  • Tailwind v4 + Framer  │  routes)  │  • 10-stage LLM Pipeline         │
└──────────────────────────┘           └──────────────────────────────────┘
                    │                                   │
                    │                                   ▼
                    │                    ┌───────────────────────────────┐
                    │                    │      LLM PROVIDERS            │
                    │                    │  (via pkg/llm/provider/)      │
                    │                    │                               │
                    │                    │  OpenAI │ Anthropic │ Gemini  │
                    │                    │  Groq   │ NVIDIA NIM│ Custom  │
                    │                    └───────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARED INFRASTRUCTURE                              │
│  PostgreSQL 16 (Drizzle + raw pgx)  │  Redis (optional, caching/ratelimit) │
│  Stripe (billing webhooks)          │  SMTP (email notifications)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Boundaries

| Boundary | Responsibility | Technology |
|----------|---------------|------------|
| **Frontend** (`apps/web/`) | User-facing UI, auth, dashboard, playground, docs | Next.js 16, React 19, TypeScript |
| **Backend API** (`apps/backend/`) | Auth, quota, billing, LLM proxy, admin, webhooks | Go 1.25, chi, pgx |
| **LLM Pipeline** (`pkg/llm/`) | 10-stage request processing, provider abstraction, routing | Go packages (19 subpackages) |
| **Database** | User data, API keys, logs, credits, billing | PostgreSQL 16 |
| **External Providers** | Actual AI inference | OpenAI, Anthropic, Gemini, Groq, etc. |

---

## Data Flow (Typical Chat Request)

```
Client (SDK or UI)
  → POST /v1/chat/completions (or /v1/messages for Anthropic)
  → Backend: Auth middleware (JWT / API key / session)
  → Backend: Quota middleware (check credits, rate limits)
  → Backend: OpenAIProxy handler (or AnthropicMessages)
  → LLM Pipeline:
      1. Validator (schema, required fields)
      2. Router (ModelRouter → ABRouter → BudgetRouter)
      3. Cache (semantic dedup + TTL)
      4. Guardrails (prompt injection, PII)
      5. Moderation (content safety)
      6. Translator (OpenAI ↔ Anthropic format)
      7. Provider (SDK call with key rotation + circuit breaker)
      8. Telemetry (token counting, latency)
      9. Circuit Breaker (failure tracking)
      10. Watcher (global error observer)
  → Async: Log to api_logs + deduct credits + dispatch webhooks
  → SSE stream or JSON response back to client
```

---

## Key Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| **Backend HTTP Server** | `apps/backend/cmd/api/main.go` | Config → DB → Redis → Repos → LLM Providers → Services → Handlers → Chi Router |
| **Backend Routes** | `apps/backend/cmd/api/routes.go` (~400 lines) | All 100+ route definitions + middleware chains |
| **Frontend Root** | `apps/web/app/layout.tsx` | Root layout, providers, theme |
| **Frontend Auth** | `apps/web/auth.ts` + `auth.config.ts` | NextAuth v5 config (GitHub + Google OAuth) |
| **Frontend Proxy** | `apps/web/lib/api/proxy.ts` | Server-side proxy to backend (all `app/api/*` routes) |
| **SDK (TypeScript)** | `apps/web/lib/api/sdk.ts` (~1700 lines) | Typed client for all backend endpoints |
| **SDK (Go)** | `apps/backend/pkg/sdk/client.go` (~1860 lines) | Official Go SDK (parity with TS SDK) |

---

## Authentication Modes (3 supported)

1. **JWT Bearer Token**: `Authorization: Bearer <jwt>` (HS256, 7-day expiry, shared `AUTH_SECRET`)
2. **Session Cookie**: NextAuth cookies (`authjs.session-token`, `__Secure-*` variants)
3. **API Key**: `x-api-key: dra_<64 hex>` (HMAC-SHA256 hashed at rest with pepper)

All three paths converge in `internal/middleware/auth.go` → inject `*domain.User` + optional `*domain.APIKey` into request context.

---

## Admin vs User Separation

- **User routes**: `/api/*`, `/v1/*` — authenticated users + quota enforcement
- **Admin routes**: `/api/admin/*` — require `role=admin` + `RequireAdmin` middleware
- **60+ admin endpoints**: user management, provider config, billing, audit logs, SSO, promos, etc.

---

## Critical Shared State

| State | Location | Notes |
|-------|----------|-------|
| `AUTH_SECRET` | Env var | **MUST be identical** in frontend and backend (HS256 JWT) |
| API Key hashes | `api_keys.key` (hashed) | Never return raw key after creation |
| Credit balances | `user_credits.balance` | Deducted async after successful LLM call |
| Provider keys | `providers` table + `pkg/llm/provider/` | Multi-key rotation + circuit breaker per provider |
| Rate limits | In-memory map OR Redis | Sliding window, configurable per-endpoint |

---

## Operational Subsystems

| Subsystem | Key Files | Purpose |
|-----------|-----------|---------|
| **RBAC** | `internal/service/rbac.go`, `008_rbac.sql` | Role + permission model (`users.read`, `billing.write`, etc.) |
| **SSO** | `internal/handler/rbac_handlers.go` | OIDC config storage, domain-restricted sign-in |
| **Fine-Tuning** | `internal/service/fine_tuning.go` | Async job queue for model fine-tuning (JSONL datasets) |
| **Webhooks** | `internal/service/webhook.go` | 10 event types, exponential backoff, DLQ |
| **Exports** | `internal/service/export.go` | Async CSV/JSON exports (logs, usage, audit) |
| **Provider Plugins** | `internal/service/provider_plugin.go` | Dynamic provider registration via admin API |
| **Notifications** | `internal/handler/sse.go` | Per-user SSE hub for real-time alerts |

---

## File Count by Layer (approximate)

| Layer | Files | Notes |
|-------|-------|-------|
| Frontend pages | ~60 | `app/**/page.tsx` + layouts |
| Frontend components | ~80 | `components/ui/`, `components/dashboard/`, etc. |
| Frontend API layer | ~10 | SDK, hooks, proxy, errors, types |
| Backend handlers | ~25 | `internal/handler/*.go` |
| Backend services | ~20 | `internal/service/*.go` |
| Backend repos | ~15 | `internal/repository/*.go` |
| LLM pipeline | 19 packages | `pkg/llm/*/` (validator → watcher) |
| Database migrations | 20 | `migrations/001_*.sql` through `020_*.sql` (hand-applied) |

---

## Key Constraints & Quirks

- **No mock data in dashboard** — enforced by `tests/wiring-verification.test.ts` + `scripts/smoke-test.sh`
- **No `as any` / `@ts-ignore`** in TypeScript (review blocker)
- **Zod v4** — breaking changes from v3; do not use v3 patterns
- **Tailwind v4** — CSS-first config in `globals.css @theme`, NOT `tailwind.config.ts`
- **Go 1.25** — run `go vet ./...` before commit
- **UPDATE.md is MANDATORY** — append entry after EVERY code change (see template in file)
- **SDK parity required** — backend changes → Go SDK → TypeScript SDK (in that order)
