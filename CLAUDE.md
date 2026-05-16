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
- `scripts/dev.sh`: Full-stack launcher that also checks dependencies, starts Postgres, pushes schema, seeds data, and runs both apps.
- `scripts/smoke-test.sh`: Repo-specific wiring audit that checks for dashboard mock data, SDK imports, route coverage, SSE wiring, and test presence.
- `AGENTS.md`, `apps/web/AGENTS.md`, `apps/backend/AGENTS.md`: Additional repo and app-specific guidance.
- `ops.md`: Operational debt and known architecture issues.

### Frontend architecture
- Next.js 16 canary is a hard requirement: consult `node_modules/next/dist/docs/` before relying on old Next.js behavior.
- The frontend is an App Router app. `app/api/*` route handlers proxy requests to the Go backend through `lib/api/proxy.ts`.
- Auth is handled by NextAuth v5 in `auth.ts`/`auth.config.ts`. JWT secrets must match the backend because the Go API validates the same tokens.
- The dashboard is SDK-driven. Components are expected to use `getSDK()` / `DraSDK` from `apps/web/lib/api/sdk.ts`, and `tests/wiring-verification.test.ts` enforces that dashboard code does not rely on mock data.
- `apps/web/lib/api/hooks.ts` wraps the SDK with React Query. Prefer the SDK and hooks layer over direct `fetch()` from UI components.
- Drizzle schema lives in `apps/web/db/schema.ts`. The project uses `@neondatabase/serverless` even against local Postgres.
- Styling uses Tailwind CSS v4 with CSS-first configuration, not the old Tailwind v3 config style.

### Backend architecture
- The backend is layered: `cmd/api/main.go` wires dependencies and routes, `internal/handler/` owns HTTP concerns, `internal/service/` owns business logic, `internal/repository/` owns data access, and `internal/domain/` holds shared models and typed errors.
- Route registration is centralized in `apps/backend/cmd/api/main.go`. Most behavior changes eventually require touching this file.
- Standard API responses go through `internal/pkg/response`, which uses a consistent envelope with `success`, `data`, `error`, and optional `meta`.
- Errors flow through `domain.AppError` rather than ad-hoc HTTP errors.
- Middleware covers JWT/API-key auth, CORS, rate limiting, quota enforcement, request logging, tracing, metrics, body limits, and validation.
- The backend accepts three auth modes: `Authorization: Bearer <jwt>`, `authjs.session-token` cookie, and `x-api-key`.

### LLM gateway architecture
- The OpenAI-compatible proxy endpoints (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) are built on `apps/backend/pkg/llm/`.
- The LLM stack is a pipeline of provider registry, routing, translation, caching, moderation, guardrails, token handling, telemetry, circuit breaking, embeddings, batch processing, and tool support.
- Anthropic compatibility is implemented separately at `/v1/messages` via `internal/handler/anthropic_messages.go` and `pkg/llm/anthropic/`, but it reuses the same auth/quota/billing path as the OpenAI-compatible proxy.
- `X-Sandbox: true` on `/v1/chat/completions` disables quota, cost, and logging for testing.

### Important architecture quirks
- `pkg/llm/provider/` is the canonical provider registry for new LLM work. Check for any additional provider wiring before adding a backend.
- SDK parity matters. Backend API changes often need matching updates in both the Go SDK (`apps/backend/pkg/sdk/`) and the TypeScript SDK (`apps/web/lib/api/sdk.ts`).
- Webhook delivery is a first-class subsystem split across `pkg/webhook/`, `internal/service/webhook.go`, and `internal/repository/webhook.go`.
- Batch jobs, SSE notifications, uploads, telemetry, and embeddings all have dedicated handlers/services; check for an existing subsystem before adding parallel logic.

## Tests and verification

- Frontend tests are Vitest-based and live in `apps/web/tests/` plus some co-located files.
- Backend tests are standard Go tests with `-race` expected for normal verification.
- `scripts/smoke-test.sh` is worth running after significant cross-stack work because it checks repo-specific invariants that type checks do not cover.
- `internal/testutil.NewTestServer()` is the main integration-test harness entry point on the Go side.

## Environment and repo quirks

- `AUTH_SECRET` must be identical in frontend and backend.
- Root `.env` is Docker-oriented and uses `BACKEND_URL=http://backend:8080`; local frontend development usually needs `.env.local` with `BACKEND_URL=http://localhost:8080`.
- `.npmrc` sets `legacy-peer-deps=true`; do not remove it.
- The backend Makefile prepends `$(HOME)/.local/go/bin` to `PATH`.
- `apps/web/tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking.
- `turbo.json` passes some build env vars, but `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, and `GEMINI_API_KEY` are runtime concerns and may need to be set separately.
- `next.config.ts` enables standalone output and sets security headers.
- There are no GitHub Actions workflows in `.github/workflows/` right now.

## Files worth checking before non-trivial changes

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/backend/AGENTS.md`
- `ops.md`
- `apps/backend/cmd/api/main.go`
- `apps/web/lib/api/sdk.ts`
- `apps/web/lib/api/proxy.ts`
- `apps/web/db/schema.ts`
