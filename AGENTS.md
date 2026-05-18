# DRA Platform / Yapapa — Agent Guide

Universal LLM Gateway (OpenRouter-style). **Next.js 16 canary + Go 1.25** monorepo.

## Commands

```bash
# Root (Turborepo)
npm run dev                  # Dev servers (both apps)
npm run test                 # All tests (turbo)
npm run test:web             # Frontend only
npm run test:backend         # Go test -race -cover ./...
npm run format               # Prettier — write
npm run build                # Full build
bash scripts/smoke-test.sh   # Post-change wiring verification

# Frontend (apps/web/)
npm run dev                  # Next.js on :3000
npm run test                 # Vitest (jsdom)
npm run test:watch           # Vitest watch mode
npm run db:push              # Drizzle push schema
npm run db:seed              # tsx db/seed.ts
npm run db:setup             # push + seed

# Backend (apps/backend/)
make build                   # go build -o api ./cmd/api
make dev                     # go run ./cmd/api
make run                     # build + ./api
make test                    # go test -race -cover ./...
make test-unit               # go test -v -short ./... (skips integration)
make test-integration        # requires TEST_DATABASE_URL
make test-coverage           # text + HTML coverage report
make coverage-html           # go tool cover -html=coverage.out
make vet                     # go vet ./...
make lint                    # vet + staticcheck
make fmt                     # gofmt + goimports
make clean                   # rm api coverage.out coverage.html
make docker                  # docker build -t dra-backend .

# Full-stack scripts
bash scripts/dev.sh          # Full stack: deps → Postgres → schema → seed → servers
bash scripts/dev.sh --check  # Dependency check only (no services started)
bash scripts/dev.sh --logs   # Show saved logs from last run
bash scripts/smoke-test.sh   # Post-change wiring verification
```

## Monorepo

| Dir | Role |
|-----|------|
| `apps/web/` | Next.js 16 canary frontend — App Router, Tailwind v4, React 19 |
| `apps/backend/` | Go 1.25 backend — chi router, pgx v5, JWT auth, LLM pipeline |
| `packages/` | Reserved for shared packages (empty) |
| `scripts/` | `dev.sh` (full stack, supports `--check`/`--logs`), `smoke-test.sh` (wiring) |
| `docs/` | Implementation guides |
| `ops.md` | Operational debt tracking and known issues (P0–P3) |
| `examples/llmtests/` | LLM test examples |

Each app has its own instruction file: `apps/backend/AGENTS.md` (Go layer rules), `apps/web/AGENTS.md` (frontend SDK/convention rules). See also `CLAUDE.md` at root for the complete API endpoint reference.

## Architecture essentials

### Frontend
- **Next.js 16 canary** — read `node_modules/next/dist/docs/` before writing code. Deprecation notices matter. **`"use cache"` replaces old `revalidate`/`dynamic`** — implicit caching is gone.
- **App Router** — `app/api/*/route.ts` proxies to Go backend via `proxyToBackend()` from `lib/api/proxy.ts`. NextAuth middleware at `proxy.ts` protects `/dashboard/*` routes.
- **Auth**: NextAuth v5 in `auth.ts` + `auth.config.ts`. JWT HS256 shared with Go backend. OAuth: GitHub + Google. Backend login via `/auth/login` and OAuth sync via `/auth/oauth`.
- **DB**: Drizzle ORM with `@neondatabase/serverless` driver (even for local Postgres). Schema: `db/schema.ts`. Drizzle config loads `.env.local`.
- **SDK**: `lib/api/sdk.ts` (`DraSDK` class) — typed client for all backend endpoints. **Dashboard components use `getSDK()`, never mock data** (enforced by `tests/wiring-verification.test.ts`). Supporting: `errors.ts`, `types.ts`, `hooks.ts` (React Query wrappers).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) — NOT v3 config. Uses `cva` + `tailwind-merge` for variants.
- **State**: `@tanstack/react-query` for server state, `@ai-sdk/react` for streaming.
- **Charts**: Recharts. Animations: Framer Motion + GSAP (both active — motion in components, GSAP for scroll-triggered).
- **Proxy middleware** (`proxy.ts`): Matches `/((?!api|_next/static|_next/image|.*\\.png$).*)`. Redirects `/dashboard/*` → login if unauthenticated, `/login`/`/signup` → dashboard if authenticated.
- **Validation**: Zod v4 — breaking changes from v3.

### Backend
- **Layered**: `cmd/api/main.go` → `internal/handler/` → `internal/service/` → `internal/repository/` + `internal/domain/`. Plus `internal/middleware/`, `internal/config/`, `internal/db/`, `internal/redis/`, `internal/testutil/`.
- **Internal shared packages** (`internal/pkg/`): `logger/` (slog), `response/` (standardized HTTP), `token/` (JWT).
- **LLM pipeline** (`pkg/llm/`): 16 subpackages — anthropic, batch, cache, circuitbreaker, embeddings, guardrails, moderation, openai, pipeline, provider, router, tokens, tools, translator, validator, watcher. Plus `types.go` (shared types) and `helper.go` (utilities).
- **Anthropic `/v1/messages`** (`internal/handler/anthropic_messages.go`, `pkg/llm/anthropic/`): Drop-in Anthropic SDK compatible endpoint. Accepts Anthropic-format requests, translates to internal `llm.ChatRequest`, reuses same auth/quota/billing pipeline as OpenAI proxy. Streaming uses Anthropic SSE format.
- **Dual provider registries** (P0 debt — see `ops.md`): `pkg/llm/provider/` is the canonical registry (used by `/v1/*` OpenAI-compatible proxy). There is ALSO `internal/provider/provider.go` (legacy handler endpoints) and `internal/service/provider.go` (service wrapper). Adding a provider may require registering in multiple places. **`pkg/llm/provider/` is the canonical one for new work.**
- **Official Go SDKs** in `go.mod`: `github.com/openai/openai-go/v3` and `github.com/anthropics/anthropic-sdk-go` are direct deps. Internal provider wrappers ALSO use `sashabaranov/go-openai`. Build with default `go build` (no vendor).
- **External packages** (`pkg/`): `sdk/` (typed Go client mirroring TS SDK), `llmsdk/` (legacy), `email/` (SMTP), `webhook/` (outbound delivery + retry), `trace/` (distributed tracing).
- **Webhook system** (`pkg/webhook/`): Event-driven outbound delivery with retry logic and tracking.
- **Batch processing** (`internal/handler/batch.go`): Async job submission and status tracking.
- **SSE notifications** (`internal/handler/sse.go`): Real-time streaming via `NotificationHub`.
- **Sandbox mode**: Pass `X-Sandbox: true` header to `/v1/chat/completions` to skip quota/cost/logging (for testing).
- **Auth**: Accepts `Authorization: Bearer <jwt>`, cookie `authjs.session-token`, or `x-api-key` header.
- **Middleware**: Auth (JWT/API key), CORS, rate limiting (in-memory sliding window by default, Redis when configured), quota enforcement, request logging, tracing (request ID), Prometheus metrics, body size limit, response transformation, input validation.
- **Migrations**: Raw SQL in `migrations/`, numbered sequentially (`001_*.sql`…`007_*.sql`). Hand-applied, no auto-migrator.
- **Config**: Env-based via `internal/config/config.go`. See `.env.example` per app.
- **Docker**: Backend `Dockerfile` uses `golang:1.25-alpine` → `alpine:latest` multi-stage (static binary).

## Testing specifics

### Frontend (Vitest)
- Config: `vitest.config.ts` — jsdom, path alias `@/` → `apps/web/` root, globals enabled
- **All test files** in `tests/` directory (not co-located), plus co-located `*.test.ts`/`*.spec.ts`
- `tests/wiring-verification.test.ts` — enforces no mock data in dashboard, route files proxy to backend
- `tests/lib/api/sdk.test.ts` — SDK unit tests
- `tests/lib/api/errors.test.ts` — error handling tests
- Run single: `npm run test -- --run tests/lib/api/sdk.test.ts`

### Backend (Go)
- **Always run with `-race`** — `make test` does this automatically
- `make test-unit` (`-short` flag) skips integration
- `make test-integration` requires `TEST_DATABASE_URL` env var
- Integration test server: `internal/testutil.NewTestServer()`
- Key test files: `internal/handler/handler_test.go` (auth, CRUD), `internal/middleware/auth_test.go`, `internal/middleware/quota_test.go`, `internal/domain/domain_test.go`, `pkg/llm/llm_test.go`, `pkg/sdk/client_test.go`, `tests/integration/integration_test.go`
- Run single package: `go test -race -cover ./pkg/llm/provider/...`
- Run single test: `go test -race -cover -run TestName ./pkg/llm/tools/...`

## Environment quirks (will bite you)

- **`.npmrc` has `legacy-peer-deps=true`** — do not remove. Must be present for npm install to succeed
- **`AUTH_SECRET` must be identical** between frontend and backend for HS256 JWT validation. Root `.env` has placeholders — generate with `openssl rand -base64 32`
- **Drizzle uses `@neondatabase/serverless`** driver against ALL Postgres instances (including local). The `pg` package is also a dep but for Drizzle's use, the Neon driver is what runs
- **`tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*`** from type checking (top-level await)
- **Go binary path**: Makefile prepends `$(HOME)/.local/go/bin` to `PATH`. If `go` not found, check this path
- **Backend `ENV=development`** enables `slog.LevelDebug` logging. `ENV=production` in Docker
- **`turbo.json` passes build env** (env vars for build only, not runtime): `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `BACKEND_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`. Missing from turbo: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` — these need to be set in the runtime env
- **Module path**: `dra-platform/backend` in all Go imports
- **Frontend `@/`** path alias → `apps/web/` root. Example: `@/lib/api/sdk` → `apps/web/lib/api/sdk.ts`
- **Next.js standalone output** — `next.config.ts` sets `output: 'standalone'`. Production Docker server entry is `apps/web/server.js` (inside `.next/standalone/`)
- **Root `.env`**: used by docker-compose, has `BACKEND_URL=http://backend:8080` (Docker network). Local dev needs `.env.local` with `BACKEND_URL=http://localhost:8080`
- **MongoDB** in `docker-compose.yml` is behind a `mongo` profile — NOT started by default. Only `postgres` starts with `docker-compose up -d`. Start with: `docker-compose --profile mongo up -d`
- **DB_TYPE modes**: `dev.sh` detects `DB_TYPE` from `.env.local` — supports `postgres` (default), `neon` (cloud, skips local container), and `mongodb` (backend auto-setup)
- **`opencode.json`** configures the project to use its own Yapapa instance (`https://yapa.up.railway.app/v1`) as the LLM provider via `@ai-sdk/openai-compatible`
- **ECC rules** active for this repo: `.claude/rules/golang/` (patterns, testing, hooks, coding-style, security) and `.claude/rules/typescript/` (patterns, testing, hooks, coding-style, security) — these load automatically for matching file types
- **Security headers**: `next.config.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

## Constraints

- **No `as any` or `@ts-ignore`** in TypeScript — enforced at review
- **No mock data** in dashboard components — must use real SDK. Smoke test (`scripts/smoke-test.sh`) enforces with grep
- **Go 1.25** — features differ from training data (iter.Seq, unique, slog improvements). Run `go vet ./...` before committing
- **Tailwind CSS v4** — PostCSS plugin `@tailwindcss/postcss`, not v3 CLI. Config is CSS-first (globals.css @theme), NOT `tailwind.config.ts`
- **Zod v4** — breaking changes from v3. Do not use v3 patterns
- **No CI workflows** currently configured (`.github/workflows/` absent)
- **Dual SDK sync**: Go SDK (`pkg/sdk/`) and TypeScript SDK (`lib/api/sdk.ts`) must be kept in sync — implement backend → Go SDK → TS SDK
- **Keys validation**: `AUTH_SECRET` fallback chain in `auth.ts`: `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`
