# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yapapa (DRA Platform) is a Universal LLM Gateway: an OpenRouter-style platform that proxies AI requests to OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, and other model providers. This is a monorepo with a Next.js 16 frontend and a Go 1.25 backend.

## Common commands

### Root
```bash
npm run dev          # Start both apps via Turborepo
npm run build        # Build all workspaces
npm run lint         # Run workspace lint tasks
npm run format       # Prettier on TS/TSX/MD
npm run test         # Run all tests
npm run test:web     # Frontend tests only
npm run test:backend # Backend tests only
```

### Frontend (`apps/web`)
```bash
npm run dev          # Next.js dev server on :3000
npm run build        # Production build
npm run start        # Production server
npm run lint         # next lint
npm run test         # Vitest run
npm run test:watch   # Vitest watch mode
npm run db:push      # Push Drizzle schema
npm run db:seed      # Seed demo data
npm run db:setup     # Push schema then seed
npm run test -- --run tests/lib/api/sdk.test.ts  # Run one Vitest file
```

### Backend (`apps/backend`)
```bash
make build             # go build -o api ./cmd/api
make dev               # go run ./cmd/api
make run               # Build then run ./api
make test              # go test -race -cover on packages with tests
make test-race         # go test -race -v on packages with tests
make test-unit         # go test -v -short ./...
make test-integration  # Handler + integration tests; requires TEST_DATABASE_URL
make test-coverage     # Write coverage.out and print coverage summary
make coverage-html     # Generate coverage.html
make vet               # go vet ./...
make lint              # go vet + staticcheck if installed
make fmt               # go fmt + goimports if installed
make clean             # Remove api and coverage artifacts
make docker            # Build backend Docker image

go test -race -cover ./pkg/llm/provider/...            # Run one Go package
go test -race -cover -run TestName ./pkg/llm/tools/... # Run one Go test
```

### Full-stack scripts
```bash
bash scripts/dev.sh          # Install deps, start Postgres, push schema, seed DB, start both apps
bash scripts/dev.sh --check  # Dependency and environment check only
bash scripts/dev.sh --logs   # Show logs from the last dev.sh run
bash scripts/smoke-test.sh   # Wiring verification after significant changes
```

### Docker
```bash
docker compose up -d postgres        # Start local Postgres only
docker-compose up -d postgres        # Fallback if Compose V2 is unavailable
docker-compose --profile mongo up -d # Start Postgres + Mongo profile
```

## Architecture

### Monorepo structure
- `apps/web`: Next.js 16 canary frontend using App Router, React 19, Tailwind CSS v4, NextAuth v5, Drizzle, and React Query.
- `apps/backend`: Go 1.25 API using chi, pgx, JWT/API-key auth, and a layered service/repository architecture.
- `packages/`: Reserved for shared packages (currently empty).
- `scripts/dev.sh`: Full-stack launcher that also checks dependencies, starts Postgres, pushes schema, seeds data, and runs both apps.
- `scripts/smoke-test.sh`: Repo-specific wiring audit that checks for dashboard mock data, SDK imports, route coverage, SSE wiring, and test presence.
- `docs/`: Implementation guides and architecture documentation.
- `examples/llmtests/`: LLM test examples.
- `AGENTS.md`, `apps/web/AGENTS.md`, `apps/backend/AGENTS.md`: Additional repo and app-specific guidance.
- `ops.md`: Operational debt and known architecture issues (P0–P3 priority tracking, testing gaps, dependency audits). This is the canonical source for "what's broken or missing."

### Frontend architecture
- **Next.js 16 canary is NOT your training data.** Read `node_modules/next/dist/docs/` before writing code. Deprecation notices matter. `"use cache"` replaces old `revalidate`/`dynamic` — implicit caching is gone.
- The frontend is an App Router app. Routes: `app/dashboard/` (protected), `app/playground/`, `app/pricing/`, `app/models/`, `app/gateway/`, `app/admin/`, `app/login/`, `app/signup/`, `app/docs/`. API routes in `app/api/*` proxy to the Go backend through `lib/api/proxy.ts`.
- Auth is handled by NextAuth v5 in `auth.ts`/`auth.config.ts`. JWT HS256 secrets must match the backend because the Go API validates the same tokens. OAuth: GitHub + Google. Fallback chain: `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`.
- Proxy middleware (`proxy.ts`) matches `/((?!api|_next/static|_next/image|.*\.png$).*)` — redirects unauthenticated `/dashboard/*` to login, authenticated `/login`/`/signup` to dashboard.
- The dashboard is SDK-driven. Components are expected to use `getSDK()` / `DraSDK` from `apps/web/lib/api/sdk.ts`, and `tests/wiring-verification.test.ts` enforces that dashboard code does not rely on mock data.
- `apps/web/lib/api/hooks.ts` wraps the SDK with React Query. Prefer the SDK and hooks layer over direct `fetch()` from UI components.
- Drizzle schema lives in `apps/web/db/schema.ts`. The project uses `@neondatabase/serverless` even against local Postgres.
- Styling uses Tailwind CSS v4 with CSS-first configuration, not the old Tailwind v3 config style. Uses `cva` + `tailwind-merge` for variants.
- Charts: Recharts. Animations: Framer Motion (components) + GSAP (scroll-triggered).

### Backend architecture
- The backend is layered: `cmd/api/main.go` wires dependencies and routes, `internal/handler/` owns HTTP concerns, `internal/service/` owns business logic, `internal/repository/` owns data access, and `internal/domain/` holds shared models and typed errors.
- Route registration is centralized in `apps/backend/cmd/api/main.go`. Most behavior changes eventually require touching this file.
- Standard API responses go through `internal/pkg/response`, which uses a consistent envelope with `success`, `data`, `error`, and optional `meta`.
- Errors flow through `domain.AppError` rather than ad-hoc HTTP errors.
- Middleware covers JWT/API-key auth, CORS, rate limiting, quota enforcement, request logging, tracing, metrics, body limits, and validation.
- The backend accepts three auth modes: `Authorization: Bearer <jwt>`, `authjs.session-token` cookie, and `x-api-key`.
- Go module path: `dra-platform/backend`.
- Raw SQL migrations in `migrations/`, numbered sequentially (`001_*.sql`…`007_*.sql`). Hand-applied, no auto-migrator.

### LLM gateway architecture
- The OpenAI-compatible proxy endpoints (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) are built on `apps/backend/pkg/llm/`.
- The LLM stack is a pipeline of provider registry, routing, translation, caching, moderation, guardrails, token handling, telemetry, circuit breaking, embeddings, batch processing, and tool support.
- Anthropic compatibility is implemented separately at `/v1/messages` via `internal/handler/anthropic_messages.go` and `pkg/llm/anthropic/`, reusing the same auth/quota/billing pipeline as the OpenAI-compatible proxy.
- Official Go SDKs in `go.mod`: `github.com/openai/openai-go/v3` and `github.com/anthropics/anthropic-sdk-go`. Internal provider wrappers also use `sashabaranov/go-openai`.
- `X-Sandbox: true` on `/v1/chat/completions` disables quota, cost, and logging for testing.

### Important architecture quirks
- `pkg/llm/provider/` is the canonical provider registry. The legacy `internal/provider/` has been eliminated (consolidated 2026-05-15 — see `ops.md`).
- **SDK parity matters.** Backend API changes often need matching updates in both the Go SDK (`apps/backend/pkg/sdk/`) and the TypeScript SDK (`apps/web/lib/api/sdk.ts`). Implement backend → Go SDK → TS SDK in that order.
- Webhook delivery is a first-class subsystem split across `pkg/webhook/`, `internal/service/webhook.go`, and `internal/repository/webhook.go`.
- Batch jobs, SSE notifications, uploads, telemetry, and embeddings all have dedicated handlers/services; check for an existing subsystem before adding parallel logic.
- `internal/pkg/` contains shared backend packages: `logger/` (slog), `response/` (standardized HTTP envelope), `token/` (JWT). Use these instead of rolling your own.

## Hard Constraints

- **No `as any` or `@ts-ignore`** in TypeScript — enforced at review
- **No mock data** in dashboard components — must use real `getSDK()`. Enforced by `tests/wiring-verification.test.ts` and `scripts/smoke-test.sh`
- **Zod v4** — breaking changes from v3. Do not use v3 patterns
- **Tailwind CSS v4** — PostCSS plugin `@tailwindcss/postcss`, not v3 CLI. Config is CSS-first (`globals.css @theme`), NOT `tailwind.config.ts`
- **Go 1.25** — features may differ from training data (`iter.Seq`, `unique`, `slog` improvements). Run `go vet ./...` before committing
- CI workflows exist in `.github/workflows/`: `ci.yml` (lint, frontend tests, backend tests, build) and `e2e.yml` (Playwright E2E). Both run on push/PR to `main`.

## Tests and verification

- Frontend tests are Vitest-based and live in `apps/web/tests/` plus some co-located files.
- Backend tests are standard Go tests with `-race` expected for normal verification.
- `scripts/smoke-test.sh` is worth running after significant cross-stack work because it checks repo-specific invariants that type checks do not cover.
- `internal/testutil.NewTestServer()` is the main integration-test harness entry point on the Go side.

### Key test files

**Frontend:**
- `tests/wiring-verification.test.ts` — enforces no mock data in dashboard, route files proxy to backend
- `tests/lib/api/sdk.test.ts` — SDK unit tests
- `tests/lib/api/errors.test.ts` — error handling tests

**Backend:**
- `internal/handler/handler_test.go` — auth, CRUD handler tests
- `internal/middleware/auth_test.go`, `quota_test.go` — middleware tests
- `internal/domain/domain_test.go` — domain model tests
- `pkg/llm/llm_test.go` — LLM package tests
- `pkg/sdk/client_test.go` — Go SDK client tests
- `tests/integration/integration_test.go` — full integration (requires `TEST_DATABASE_URL`)

## Environment and repo quirks

- `AUTH_SECRET` must be identical in frontend and backend. Fallback chain in `auth.ts`: `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`.
- Root `.env` is Docker-oriented and uses `BACKEND_URL=http://backend:8080`; local frontend development usually needs `.env.local` with `BACKEND_URL=http://localhost:8080`.
- The backend Makefile prepends `$(HOME)/.local/go/bin` to `PATH`.
- `apps/web/tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking.
- `turbo.json` passes build env vars (`DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `BACKEND_URL`, etc.) but **NOT** `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY` — these are runtime-only and must be set separately in the environment.
- `next.config.ts` enables `output: 'standalone'` and sets security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`). Production Docker server entry is `apps/web/server.js` inside `.next/standalone/`.
- The backend `Makefile` uses a `go list -f` filter to only test packages that have test files (required for Go 1.26+ compatibility since `covdata` was removed).
- `.npmrc` sets `legacy-peer-deps=true`; do not remove it — npm install will fail without it.
- **`opencode.json`** configures the project to use its own Yapapa instance (`https://yapa.up.railway.app/v1`) as the LLM provider via `@ai-sdk/openai-compatible`.
- **ECC rules** are active for this repo: `.claude/rules/golang/` and `.claude/rules/typescript/` — these load automatically for matching file types.
- **Frontend `@/` path alias** maps to `apps/web/` root. Example: `@/lib/api/sdk` → `apps/web/lib/api/sdk.ts`.
- **Backend `ENV=development`** enables `slog.LevelDebug` logging. `ENV=production` in Docker.
- **`DB_TYPE` modes**: `dev.sh` detects `DB_TYPE` from `.env.local` — supports `postgres` (default), `neon` (cloud, skips local container), and `mongodb` (backend auto-setup).
- **MongoDB** in `docker-compose.yml` is behind a `mongo` profile — NOT started by default. Start with: `docker-compose --profile mongo up -d`.

## Files worth checking before non-trivial changes

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/backend/AGENTS.md`
- `ops.md`
- `apps/backend/cmd/api/main.go`
- `apps/web/lib/api/sdk.ts`
- `apps/web/lib/api/proxy.ts`
- `apps/web/db/schema.ts`
