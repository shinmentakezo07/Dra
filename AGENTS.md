# DRA Platform / Yapapa — Agent Guide

This is a **Next.js 16 (canary) + Go 1.25** monorepo: a Universal LLM Gateway (OpenRouter-style). It proxies AI requests to NVIDIA NIM, OpenAI, Anthropic, Groq, Gemini and exposes a dashboard for keys/logs/analytics/credits.

## Commands (run from repo root unless noted)

```bash
npm run dev          # Turborepo: runs dev in all apps
npm run build        # Turborepo: builds all apps
npm run lint         # Turborepo: lints all apps
npm run format       # Prettier: writes format

# Frontend (apps/web)
npm run test         # Vitest (jsdom)
npm run test:watch   # Vitest watch mode
npm run db:push      # Drizzle-kit push (schema → DB)
npm run db:seed      # Seed DB (tsx db/seed.ts)
npm run db:setup     # push + seed

# Backend (apps/backend — run from apps/backend/)
make build           # go build -o api ./cmd/api
make dev             # go run ./cmd/api
make test            # go test -race -cover ./...
make test-unit       # go test -v -short ./...
make test-integration  # needs TEST_DATABASE_URL
make test-coverage   # go test -race -coverprofile=coverage.out
make coverage-html   # go tool cover -html=coverage.out
make vet             # go vet ./...
make lint            # vet + staticcheck
make fmt             # go fmt + goimports
make clean           # rm api coverage.out coverage.html

# Smoke test (post-change wiring verification)
bash scripts/smoke-test.sh
```

## Full stack dev

```bash
bash scripts/dev.sh  # installs deps, starts Postgres via Docker, pushes schema,
                     # seeds DB, starts Go backend + Next.js dev server
```

## Monorepo structure

```
apps/
  web/        Next.js 16 (canary) frontend — App Router, Tailwind CSS v4, React 19
  backend/    Go 1.25 backend — chi router, pgx, JWT auth, LLM routing
packages/     (reserved for shared packages — currently empty)
scripts/
  dev.sh            # Full-stack dev launcher
  smoke-test.sh     # Post-change wiring verification
docs/               # Implementation guides and design docs
```

## Architecture

### Frontend (`apps/web/`)
- **Next.js 16 canary** — read `node_modules/next/dist/docs/` before writing code. APIs, conventions, and file structure may differ from training data. Heed deprecation notices.
- **App Router** — `app/api/*` routes proxy to Go backend via `proxyToBackend()` from `lib/api/proxy.ts`. Server-side middleware at `proxy.ts` (NextAuth) protects dashboard routes.
- **Auth**: NextAuth v5 (Auth.js) with credentials + GitHub + Google OAuth. JWT tokens (HS256) shared with Go backend. Auth config in `auth.config.ts`, provider setup in `auth.ts`.
- **DB**: Drizzle ORM with Neon serverless PostgreSQL driver. Schema at `db/schema.ts`, connection at `db/index.ts`.
- **Frontend SDK**: TypeScript SDK at `lib/api/sdk.ts` (`DraSDK` class) — typed client for all backend API endpoints. Dashboard components use `getSDK()` — **no mock data**.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), PostCSS config at `postcss.config.cjs`, Tailwind config at `tailwind.config.ts`, globals in `app/globals.css`. CSS custom properties for theming.
- **Components**: `components/` contains shared UI (`ui/`), dashboard components (`dashboard/`), playground, pricing, models.
- **Data fetching**: `@tanstack/react-query` for server state, `@ai-sdk/react` for AI streaming.
- **Charts**: Recharts (`recharts`) for analytics.

### Backend (`apps/backend/`)
- **Chi router** (`github.com/go-chi/chi/v5`) — lightweight Go HTTP router.
- **pgx v5** — PostgreSQL driver + connection pool.
- **Auth**: JWT validation (HS256) via `golang-jwt/jwt/v5`. Supports `Authorization: Bearer`, session cookies (`authjs.session-token`), or `x-api-key` header. `AUTH_SECRET` must match frontend.
- **Layered architecture**: `cmd/api/main.go` → `internal/handler/` → `internal/service/` → `internal/repository/` + `internal/domain/`
- **LLM pipeline** (`pkg/llm/`): provider registry, model router, caching (Redis + in-memory), semantic cache, dedup cache, circuit breakers, guardrails, moderation, telemetry, token counting, embeddings, batch processing, tools, translator, validator.
- **Provider details** (`pkg/llm/provider/`): OpenAI SDK integration (`sashabaranov/go-openai`), multi-key rotation (primary + secondary API keys), health checking, fallback/balancing.
- **OpenAI-compatible proxy**: Routes `/v1/chat/completions`, `/v1/embeddings`, `/v1/models` — accepts OpenAI SDK format, routes to configured providers.
- **Middleware**: Auth, rate limiting (in-memory sliding window + optional Redis), quota enforcement (daily/monthly limits, IP/model allowlists), CORS, request logging, tracing, body size limits, metrics (Prometheus).
- **Caching**: Multiple layers — LLM response cache (Redis or memory), semantic cache for fuzzy query matching, dedup cache for identical requests.
- **Config**: Env-based via `internal/config/config.go`. See `apps/backend/.env.example` and `apps/web/.env.example` for all options.
- **Migrations**: Raw SQL files in `migrations/` — numbered sequentially.
- **Metrics**: Prometheus on `:9090` (optional, via `ENABLE_METRICS`).
- **Payments**: Stripe integration — checkout sessions, webhook fulfillment (`stripe-go/v76`).
- **Email**: SMTP sender for password reset, notifications.
- **Real-time**: SSE notifications via `NotificationHub`.
- **A/B testing**: `router.ABRouter` for model routing experiments.
- **Sandbox mode**: `/v1/chat/completions` with `X-Sandbox: true` header for safe testing.
- **Helper packages**: `internal/pkg/logger/`, `internal/pkg/response/`, `internal/pkg/token/`.
- **Go client SDK**: `pkg/sdk/` — typed Go client for all backend API endpoints.

## Key API endpoints

Backend serves on `:8080`. Frontend proxies `/api/*` and `/v1/*` → `BACKEND_URL`.

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (DB connectivity) |
| GET | `/health/providers` | LLM provider health summary |
| GET | `/api/models` | List available AI models |

### Auth (rate-limited, no auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register (name, email, password) |
| POST | `/auth/login` | Login (email, password) |
| POST | `/auth/oauth` | OAuth login (GitHub/Google) |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### OpenAI-compatible proxy (auth + quota enforced)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | Chat completion (accepts OpenAI SDK format) |
| POST | `/v1/embeddings` | Embeddings |
| GET | `/v1/models` | List models |

### User profile (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user info |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/password` | Change password |

### API Keys (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Create API key |
| DELETE | `/api/keys/{id}` | Delete API key |
| POST | `/api/keys/{id}/revoke` | Revoke API key |

### Credits & Billing (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/credits` | Get credit balance |
| POST | `/api/credits/purchase` | Purchase credits |
| GET | `/api/credits/budget` | Get budget settings |
| PUT | `/api/credits/budget` | Set budget limits |

### Usage & Analytics (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | Credit transaction history |
| GET | `/api/logs` | API request logs (paginated) |
| GET | `/api/analytics` | Usage analytics (model breakdown, daily usage) |

### Chat & Embeddings (auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | AI chat proxy (SSE stream) |
| POST | `/api/embeddings` | Generate embeddings |

### Conversations (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/{id}` | Get conversation |
| DELETE | `/api/conversations/{id}` | Delete conversation |
| POST | `/api/conversations/{id}/messages` | Add message |

### Prompts (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List prompts |
| POST | `/api/prompts` | Create prompt |
| GET | `/api/prompts/{name}` | Get prompt |
| POST | `/api/prompts/{name}/render` | Render prompt template |
| DELETE | `/api/prompts/{name}` | Delete prompt |

### Batch (auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/batch` | Submit batch chat job |
| GET | `/api/batch/{id}` | Get batch job status |

### Files (auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List files |

### Webhooks (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks/{id}` | Get webhook |
| PUT | `/api/webhooks/{id}` | Update webhook |
| DELETE | `/api/webhooks/{id}` | Delete webhook |

### Organizations (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/organizations` | List orgs |
| POST | `/api/organizations` | Create org |
| GET | `/api/organizations/{id}` | Get org |
| POST | `/api/organizations/{id}/invite` | Invite member |
| DELETE | `/api/organizations/{id}/members/{userId}` | Remove member |
| GET | `/api/organizations/{id}/members` | List members |
| POST | `/api/invites/accept` | Accept invitation |

### Real-time
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications/stream` | SSE notification stream |

### Other
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate` | Validate structured output |
| GET | `/api/providers/health` | Provider health status |
| POST | `/webhooks/stripe` | Stripe webhook (public, signature-verified) |

### Admin (admin role required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/{id}` | Delete user |
| GET | `/api/admin/stats` | Platform stats |
| GET | `/api/admin/circuit-breakers` | Circuit breaker status |
| GET | `/api/admin/provider-health` | Provider health |

## Testing

### Frontend (Vitest)
- Config: `vitest.config.ts` — jsdom env, path alias `@/` → root
- Tests in `tests/` or co-located `*.test.ts`/`*.spec.ts`
- `npm run test` to run all
- Wiring verification test: `tests/wiring-verification.test.ts` — checks dashboard components import SDK (no mock data), verifies route files proxy to backend

### Backend (Go)
- Standard `go test` with table-driven tests — **always run with `-race`**
- Unit tests: `make test-unit` (`-short` flag skips integration)
- Integration tests: `make test-integration` — requires `TEST_DATABASE_URL` env var
- Integration test server: `internal/testutil.NewTestServer()` — creates in-memory config + DB connection
- Coverage: `make test-coverage` → `coverage.out`, HTML at `make coverage-html`
- Backend test files:
  - `internal/handler/handler_test.go` (integration — full auth flow, CRUD)
  - `internal/middleware/auth_test.go`, `quota_test.go` (unit)
  - `internal/domain/domain_test.go` (unit — validation)
  - `pkg/llm/` (multiple)
  - `pkg/sdk/client_test.go`
  - `tests/integration/integration_test.go`

### Smoke test
- `bash scripts/smoke-test.sh` — verifies compilation, no mock data in dashboard, SDK imports, API route wiring, no hardcoded backend URLs

## Environment quirks

- `.npmrc` has `legacy-peer-deps=true` — do not remove
- `AUTH_SECRET` **must be identical** between frontend and backend for JWT validation (HS256)
- Frontend API routes proxy to Go backend via `BACKEND_URL` env (default `localhost:8080`)
- Local PostgreSQL via docker-compose: `dra:dra_secret@localhost:5432/dra_platform`
- Go binary path (this env): use `$(HOME)/.local/go/bin/go` or add to `$PATH` — the Makefile handles this
- `tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking — these use top-level await
- Backend `ENV=development` enables `slog.LevelDebug` logging
- Drizzle uses `@neondatabase/serverless` driver — even for local Postgres
- `turbo.json` passes build env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `BACKEND_URL`
- `.claude/rules/` has TypeScript/JS patterns, testing, hooks, and coding-style rules

## Important constraints

- **Next.js 16 canary** — not the version you trained on. Check `node_modules/next/dist/docs/` for current API.
- **Tailwind CSS v4** — uses PostCSS plugin (`@tailwindcss/postcss`), not v3 CLI. Config via `tailwind.config.ts` + `@config` directive in CSS.
- **Go 1.25** — syntax and toolchain may include features newer than training data. Run `go vet ./...` before committing.
- **No mock data** in dashboard components. All dashboard clients import real SDK (`@/lib/api/sdk`). The `tests/wiring-verification.test.ts` enforces this.
- **Path aliases**: Frontend `@/` → `apps/web/` root (tsconfig.json + vitest.config.ts). Go module path: `dra-platform/backend`.
- **Type safety**: No `as any` or `@ts-ignore` — enforced at review.
- **Dual provider systems**: There are two provider registries (`internal/provider/` and `pkg/llm/provider/`) — adding a new LLM backend requires registering in both. The `pkg/llm/` registry handles `/v1/*` OpenAI-compatible proxy routes.

## Behavioral rules for AI agents

These rules govern *how* agents operate in this repo, not *what* the code does. ALL rules apply to EVERY task — no mode switching.

- **Execute immediately**. Do not deviate from the request.
- **Zero fluff**. No philosophical lectures, no unsolicited advice.
- **Stay focused**. Concise answers directly addressing the ask. No wandering.
- **Output first**. Prioritize code and visual solutions over explanation.
- **Maximum depth**. Every response includes:
  1. **Deep Reasoning Chain** — detailed breakdown of architectural and design decisions, alternatives considered, tradeoffs.
  2. **Edge Case Analysis** — what could go wrong and how it's prevented.
  3. **The Code** — optimized, bespoke, production-ready implementation.
- **Use all relevant tools**. Before acting, load every applicable skill, reference, and rule the repo provides. Do not skip available context — cost of loading irrelevant resources ≈ 0, cost of missing a critical rule = rework or bugs.

## Existing instruction files

- `apps/web/AGENTS.md` — minimal Next.js canary warning (referenced by `CLAUDE.md`)
- `apps/web/CLAUDE.md` — just `@AGENTS.md` include
- `.claude/settings.local.json` — env-specific permissions
