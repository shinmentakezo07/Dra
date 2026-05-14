# DRA Platform / Yapapa — Agent Guide

Universal LLM Gateway (OpenRouter-style). **Next.js 16 canary + Go 1.25** monorepo.

## Commands

```bash
# Root (Turborepo)
npm run dev                  # Dev servers (both apps)
npm run test                 # All tests
npm run test:web             # Frontend only
npm run test:backend         # Go test -race -cover ./...
npm run format               # Prettier — write
npm run build                # Full build

# Frontend (apps/web/)
npm run dev                  # Next.js on :3000
npm run test                 # Vitest (jsdom)
npm run db:push              # Drizzle push schema
npm run db:seed              # tsx db/seed.ts
npm run db:setup             # push + seed

# Backend (apps/backend/)
make build                   # go build -o api ./cmd/api
make dev                     # go run ./cmd/api
make test                    # go test -race -cover ./...
make test-unit               # go test -v -short ./... (skips integration)
make vet                     # go vet ./...
make lint                    # vet + staticcheck
bash scripts/dev.sh          # Full stack: Postgres → schema → seed → servers
bash scripts/smoke-test.sh   # Post-change wiring verification
```

## Monorepo

| Dir | Role |
|-----|------|
| `apps/web/` | Next.js 16 canary frontend — App Router, Tailwind v4, React 19 |
| `apps/backend/` | Go 1.25 backend — chi router, pgx v5, JWT auth, LLM pipeline |
| `packages/` | Reserved for shared packages (empty) |
| `scripts/` | `dev.sh` (full stack), `smoke-test.sh` (wiring) |
| `docs/` | Implementation guides |

## Architecture essentials

### Frontend
- **Next.js 16 canary** — read `node_modules/next/dist/docs/` before writing code. Deprecation notices matter.
- **App Router** — `app/api/*/route.ts` proxies to Go backend via `proxyToBackend()` from `lib/api/proxy.ts`. NextAuth middleware at `proxy.ts` protects `/dashboard/*` routes.
- **Auth**: NextAuth v5 in `auth.ts` + `auth.config.ts`. JWT HS256 shared with Go backend. OAuth: GitHub + Google.
- **DB**: Drizzle ORM with `@neondatabase/serverless` driver (even for local Postgres). Schema: `db/schema.ts`.
- **SDK**: `lib/api/sdk.ts` (`DraSDK` class) — typed client for all backend endpoints. **Dashboard components use `getSDK()`, never mock data** (enforced by `tests/wiring-verification.test.ts`).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) — NOT v3 config. Uses `cva` + `tailwind-merge` for variants.
- **State**: `@tanstack/react-query` for server state, `@ai-sdk/react` for streaming.
- **Charts**: Recharts. Animations: Framer Motion + GSAP.

### Backend
- **Layered**: `cmd/api/main.go` → `internal/handler/` → `internal/service/` → `internal/repository/` + `internal/domain/`
- **LLM pipeline** (`pkg/llm/`): 19 subpackages — validator → router → cache → guardrails → moderation → translator → provider → telemetry → circuitbreaker → watcher + batch, context, embeddings, tokens, tools, openai, anthropic, translate.
- **Anthropic `/v1/messages`** (`internal/handler/anthropic_messages.go`, `pkg/llm/anthropic/`): Drop-in Anthropic SDK compatible endpoint. Accepts Anthropic-format requests, translates to internal `llm.ChatRequest`, reuses same auth/quota/billing pipeline as OpenAI proxy. Streaming uses Anthropic SSE format.
- **Provider registry**: `pkg/llm/provider/` — single canonical registry using `sashabaranov/go-openai`. `internal/service/provider.go` is a service wrapper, not a separate registry. No dual registry exists.
- **Official SDKs** as `go.mod` dependencies: `github.com/openai/openai-go/v3` and `github.com/anthropics/anthropic-sdk-go`. Wrapper packages at `pkg/sdk/openai/` and `pkg/sdk/anthropic/` provide simplified Go-native APIs using the official SDKs internally. Build with default `go build` (no vendor).
- **Sandbox mode**: Pass `X-Sandbox: true` header to `/v1/chat/completions` to skip quota/cost/logging (for testing).
- **Auth**: Accepts `Authorization: Bearer <jwt>`, cookie `authjs.session-token`, or `x-api-key` header.
- **Middleware**: Auth, CORS, rate limiting (sliding window + optional Redis), quota enforcement, request logging, tracing, body size limit, Prometheus metrics.
- **Migrations**: Raw SQL in `migrations/`, numbered sequentially (`001_*.sql`…`007_*.sql`). Hand-applied, no auto-migrator.
- **Config**: Env-based via `internal/config/config.go`. See `.env.example` in each app.
- **Go SDK**: `pkg/sdk/` — typed client mirroring TypeScript SDK. Keep both in sync.

## Testing specifics

### Frontend (Vitest)
- Config: `vitest.config.ts` — jsdom, path alias `@/` → `apps/web/` root
- **All test files are in `tests/`** directory (not co-located)
- `tests/wiring-verification.test.ts` — enforces no mock data in dashboard, route files proxy to backend
- `tests/lib/api/sdk.test.ts` — SDK unit tests
- `tests/lib/api/errors.test.ts` — error handling tests
- Run single: `npm run test -- --run tests/lib/api/sdk.test.ts`

### Backend (Go)
- **Always run with `-race`** — `make test` does this automatically
- `make test-unit` (`-short` flag) skips integration tests
- `make test-integration` requires `TEST_DATABASE_URL` env var
- Integration test server: `internal/testutil.NewTestServer()`
- Key test files: `internal/handler/handler_test.go` (full auth, CRUD), `internal/middleware/auth_test.go`, `internal/middleware/quota_test.go`, `internal/domain/domain_test.go`, `pkg/llm/` (multiple), `pkg/sdk/client_test.go`, `tests/integration/integration_test.go`
- Run single package: `go test -race -cover ./pkg/llm/provider/...`
- Run single test: `go test -race -cover -run TestName ./pkg/llm/tools/...`

## Environment quirks (will bite you)

- **`.npmrc` has `legacy-peer-deps=true`** — do not remove
- **`AUTH_SECRET` must be identical** between frontend and backend for HS256 JWT validation
- **Drizzle uses `@neondatabase/serverless`** driver — even against local Postgres
- **`tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*`** from type checking (top-level await)
- **Go binary path**: use `$(HOME)/.local/go/bin/go` or let Makefile handle it (Makefile prepends `PATH`)
- **Backend `ENV=development`** enables `slog.LevelDebug` logging
- **`turbo.json` passes build env**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `BACKEND_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`
- **Module path**: `dra-platform/backend` in all Go imports
- **Frontend `@/`** path alias → `apps/web/` root
- **Next.js standalone output** — Docker build uses `output: 'standalone'`; server entry is `apps/web/server.js`

## Constraints

- **No `as any` or `@ts-ignore`** in TypeScript — enforced at review
- **No mock data** in dashboard components — must use real SDK. Wiring test enforces
- **Go 1.25** — features may differ from training data. Run `go vet ./...` before committing
- **Tailwind CSS v4** — PostCSS plugin `@tailwindcss/postcss`, not v3 CLI
- **No CI workflows** currently configured (`.github/workflows/` absent)
