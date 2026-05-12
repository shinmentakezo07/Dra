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
make vet             # go vet ./...
make lint            # vet + staticcheck
make fmt             # go fmt + goimports
make clean           # rm api coverage.out coverage.html
```

## Full stack dev

```bash
bash scripts/dev.sh  # installs deps, starts Postgres via Docker, pushes schema,
                     # seeds DB, starts Go backend + Next.js dev server
```

## Monorepo structure

```
apps/
  web/        Next.js 16 (canary) frontend — App Router, Tailwind CSS v4
  backend/    Go 1.25 backend — chi router, pgx, JWT auth, LLM routing
packages/     (reserved for shared packages — currently empty)
```

## Architecture

### Frontend (`apps/web/`)
- **Next.js 16 canary** — read `node_modules/next/dist/docs/` before writing code. APIs, conventions, and file structure may differ from your training data. Heed deprecation notices.
- **App Router** — `app/api/*` routes proxy to Go backend via `proxyToBackend()` from `lib/api/proxy.ts`
- **Auth**: NextAuth v5 (Auth.js) with credentials + GitHub + Google OAuth. JWT tokens shared with Go backend. Auth config in `auth.config.ts`, provider setup in `auth.ts`.
- **DB**: Drizzle ORM with Neon serverless PostgreSQL driver. Schema at `db/schema.ts`, connection at `db/index.ts`.
- **Frontend SDK**: TypeScript SDK at `lib/api/sdk.ts` (`DraSDK` class) — typed client for all backend API endpoints. Use `getSDK()` in client components.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), PostCSS config at `postcss.config.cjs`, Tailwind config at `tailwind.config.ts`, globals in `app/globals.css`. Uses CSS custom properties for theming.
- **Components**: `components/` contains shared UI (`ui/`), dashboard components (`dashboard/`), playground, pricing, models.

### Backend (`apps/backend/`)
- **Chi router** (`github.com/go-chi/chi/v5`) — lightweight, idiomatic Go HTTP router.
- **pgx v5** — PostgreSQL driver + connection pool.
- **Auth**: JWT validation (HS256) via `golang-jwt/jwt/v5`. Supports `Authorization: Bearer`, session cookies, or `x-api-key` header. AUTH_SECRET must match frontend.
- **Layered architecture**: `cmd/api/main.go` → `internal/handler/` → `internal/service/` → `internal/repository/` + `internal/domain/`
- **LLM pipeline**: `pkg/llm/` — provider registry (`pkg/llm/provider/`), model router (`pkg/llm/router/`), caching, circuit breakers, guardrails, moderation, telemetry, token counting, embeddings, batch processing.
- **Middleware**: Auth, rate limiting (in-memory sliding window + optional Redis), quota enforcement, CORS, request logging, tracing, body size limits, metrics (Prometheus).
- **Config**: Env-based via `internal/config/config.go` — reads from env vars with defaults. See `apps/backend/.env.example` for all options.
- **Migrations**: Raw SQL files in `migrations/` directory.
- **Metrics**: Prometheus on `:9090` (optional, via `ENABLE_METRICS`).

## Key API endpoints

Backend serves on `:8080`. Frontend proxies `/api/*` → `BACKEND_URL`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/login`, `/auth/signup` | No | Auth |
| GET | `/api/models` | No | List models |
| GET | `/api/keys` | JWT/API key | List API keys |
| POST | `/api/keys` | JWT/API key | Create API key |
| DELETE | `/api/keys` | JWT/API key | Delete API key |
| GET | `/api/logs` | JWT/API key | Request logs |
| GET | `/api/analytics` | JWT/API key | Usage analytics |
| GET | `/api/credits` | JWT/API key | Credit balance |
| POST | `/api/credits/purchase` | JWT/API key | Purchase credits |
| GET | `/api/transactions` | JWT/API key | Transactions |
| POST | `/api/chat` | JWT/API key | AI chat proxy (SSE stream) |
| GET | `/api/admin/users` | Admin | List users |
| GET | `/api/admin/stats` | Admin | Platform stats |

## Testing

### Frontend (Vitest)
- Config: `vitest.config.ts` — jsdom env, path alias `@/` → root
- Tests in `tests/` or co-located `*.test.ts`/`*.spec.ts`
- `npm run test` to run all
- Wiring verification test: `tests/wiring-verification.test.ts` — checks dashboard components import SDK (no mock data)

### Backend (Go)
- Standard `go test` with table-driven tests
- **Always run with `-race`**: `go test -race ./...`
- Unit tests: `make test-unit` (+ `-short` flag skips integration)
- Integration tests: `make test-integration` — requires `TEST_DATABASE_URL` env var
- Integration test server: `internal/testutil.NewTestServer()` — sets up in-memory config + DB connection
- Coverage: `make test-coverage` → `coverage.out`, HTML at `make coverage-html`
- Backend test files found in:
  - `internal/handler/handler_test.go`
  - `internal/middleware/auth_test.go`, `quota_test.go`
  - `internal/domain/domain_test.go`
  - `pkg/llm/` (multiple)
  - `pkg/sdk/client_test.go`
  - `tests/integration/integration_test.go`

## Environment quirks

- `.npmrc` has `legacy-peer-deps=true` — do not remove
- `AUTH_SECRET` **must be identical** between frontend and backend for JWT validation
- Frontend API routes proxy to Go backend via `BACKEND_URL` env (default `localhost:8080`)
- Local PostgreSQL via docker-compose: `dra:dra_secret@localhost:5432/dra_platform`
- Go binary must be at a non-standard path for this environment: `/teamspace/studios/this_studio/.local/go/bin/go`
- `tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking — these use top-level await
- Backend `ENV=development` sets debug logging level
- Drizzle uses `@neondatabase/serverless` driver — even for local Postgres

## Important constraints

- **Next.js 16 canary** — not the version you trained on. Check `node_modules/next/dist/docs/` for current API.
- **Tailwind CSS v4** — uses PostCSS plugin (`@tailwindcss/postcss`), not v3 CLI. Config via `tailwind.config.ts` + `@config` directive in CSS.
- **Go 1.25** — syntax and toolchain may include features newer than your training data. Run `go vet ./...` before committing.
- **Do not write mock data** in dashboard components. All dashboard clients import real SDK (`@/lib/api/sdk`).
- **Path aliases**: Frontend uses `@/` → `apps/web/` root (configured in tsconfig.json and vitest.config.ts). Go module path: `dra-platform/backend`.

## Existing instruction files

- `apps/web/AGENTS.md` — minimal Next.js canary warning (referenced by CLAUDE.md)
- `apps/web/CLAUDE.md` — just `@AGENTS.md` include
- `.claude/settings.local.json` — env-specific permissions
