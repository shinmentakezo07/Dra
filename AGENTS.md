# Repository Guidelines

Universal LLM Gateway (Yapapa / DRA Platform) — an OpenRouter-style proxy for OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, and more. **Next.js 16 canary + Go 1.25** monorepo. App-specific guidance: `apps/web/AGENTS.md`, `apps/backend/AGENTS.md`, `apps/backend/pkg/llm/AGENTS.md`. Full API reference: `CLAUDE.md`. Known issues and debt: `ops.md`.

## Project Structure & Module Organization

| Directory                  | Role                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/web/`                | Next.js 16 frontend — App Router, Tailwind v4, React 19, Drizzle ORM                                                   |
| `apps/backend/`            | Go 1.25 API — chi router, pgx v5, JWT auth, LLM pipeline                                                               |
| `apps/backend/pkg/llm/`    | LLM gateway: 35+ subpackages (provider registry, routing, translation, caching, guardrails, circuit breaker, telemetry)|
| `apps/backend/pkg/sdk/`    | Typed Go client mirroring the TypeScript SDK                                                                           |
| `apps/backend/pkg/llmsdk/` | Legacy LLM SDK wrapper — avoid for new code                                                                            |
| `scripts/`                 | `dev.sh` (full-stack launcher), `smoke-test.sh` (wiring verification)                                                  |
| `docs/`                    | Implementation guides                                                                                                  |
| `apps/backend/migrations/` | Raw SQL migrations, numbered sequentially (`001_base_schema.sql`–`022_enterprise_features.sql`)                        |

Frontend tests: `apps/web/tests/` (Vitest + jsdom). Backend tests: co-located `*_test.go` files + `apps/backend/tests/integration/`.

## Build, Test, and Development Commands

```bash
# Root (Turborepo)
npm run dev                # Start both apps
npm run test               # All tests
npm run build              # Full production build
bash scripts/smoke-test.sh # Post-change wiring verification

# Frontend (apps/web/)
npm run dev                # Next.js dev on :3000
npm run test               # Vitest (jsdom)
npm run test:watch         # Vitest watch mode
npm run test -- --run tests/lib/api/sdk.test.ts  # Single test file
npm run db:push            # drizzle-kit push (schema sync)
npm run db:seed            # tsx db/seed.ts
npm run db:setup           # push + seed

# Backend (apps/backend/)
make dev                   # go run ./cmd/api
make test                  # go test -race -cover ./... (skips pkgs with no tests)
make test-unit             # go test -v -short ./... (skips integration)
make test-integration      # needs TEST_DATABASE_URL env var
make vet                   # go vet ./...
make fmt                   # go fmt + goimports
go test -race -cover -run TestName ./pkg/llm/tools/...  # Single test

# Full-stack
bash scripts/dev.sh          # Install deps, start Postgres, push schema, seed, launch both apps
bash scripts/dev.sh --check  # Dependency and environment check only
bash scripts/dev.sh --logs   # Show logs from last run
bash scripts/smoke-test.sh   # Wiring verification after significant changes
```

## Coding Style & Naming Conventions

- **TypeScript**: No `as any` or `@ts-ignore`. Path alias `@/` maps to `apps/web/` root. Use `cva` + `tailwind-merge` for variants. Tailwind CSS v4 — CSS-first config (`@tailwindcss/postcss`), NOT `tailwind.config.ts`. Zod v4 — not v3 patterns.
- **Go**: Module path `dra-platform/backend`. Layered architecture: handler → service → repository → domain. Handlers own HTTP only; services own business logic (never import `net/http`). Run `go vet ./...` and `make fmt` before committing.
- **SDK parity**: Backend API changes require matching updates in Go SDK (`pkg/sdk/`) then TypeScript SDK (`lib/api/sdk.ts`), in that order.
- **Next.js 16 canary**: Breaking changes from v14/15. `fetch()` no longer cached by default. `revalidate` export gone — use `"use cache"` + `cacheLife()`. Read `node_modules/next/dist/docs/` before writing code.
- **next.config.ts has `typescript: { ignoreBuildErrors: true }`** — `next build` will NOT catch type errors. Use `tsc --noEmit` or the LSP for type checking.

## Testing Guidelines

- **Frontend**: Vitest with jsdom. Dashboard components must use `getSDK()`, never mock data — enforced by `tests/wiring-verification.test.ts` and `scripts/smoke-test.sh`.
- **Backend**: Always run with `-race` flag (`make test` does this). The Makefile uses `go list -f` filter to skip packages without test files (Go 1.26+ compat). Integration tests require `TEST_DATABASE_URL`. Use `internal/testutil.NewTestServer()` for integration harness.
- Run `bash scripts/smoke-test.sh` after significant cross-stack changes — it checks Go compilation, mock data audit, SDK imports, API route coverage, chat SSE wiring, and env config.

### Known Testing Gaps

- **Frontend**: No component tests, no SDK error-handling tests, no E2E tests, no accessibility tests.
- **Backend**: No repository tests, no LLM provider failover/circuit-breaker tests. Handler tests exist but don't cover openai_proxy, billing, or admin handlers.
- Integration tests require `TEST_DATABASE_URL` — see `apps/backend/.env.example`.

## Commit & Pull Request Guidelines

- **Commit style**: Conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`. Scope optional: `refactor(docs):`. See `git log --oneline` for examples.
- **PR requirements**: CI passes (`ci.yml`: lint, frontend tests, backend tests, build; `e2e.yml`: Playwright E2E). Both run on push/PR to `main`. Build job depends on lint+test passing first.
- **Before committing**: Run `make vet` and `make fmt` (backend), `npm run format` (frontend), and `bash scripts/smoke-test.sh`.

## Critical Constraints

- **UPDATE.md is MANDATORY for every code change.** After completing ANY modification to the codebase (fixes, features, refactors, config changes — anything), you MUST append a detailed entry to `UPDATE.md`. The entry must include:
  1. Timestamp and **session name/ID** (e.g. Droid session name, `ses_abc123`, or a descriptive label like `mobile-navbar-fix`)
  2. Conventional-commit style title
  3. **Why** — the problem or motivation, not just what changed
  4. **Files changed table** — every file touched, with line ranges and change type (created/modified/deleted)
  5. **Before code block** — the exact old code with file path and line number
  6. **After code block** — the exact new code with file path and line number
  7. Optional notes for side effects, follow-ups, or migration steps
- **Use the same session name across all entries from the same session** so later agents can group changes and understand what happened in each session.
- **No task is considered complete until the UPDATE.md entry is written.** This is a hard requirement. Skipping UPDATE.md logging is a policy violation. See `UPDATE.md` for the full template and examples.
- `AUTH_SECRET` must be identical between frontend and backend (HS256 JWT).
- `.npmrc` has `legacy-peer-deps=true` — do not remove.
- Root `.env` uses Docker network URLs; local dev needs `.env.local` with `BACKEND_URL=http://localhost:8080`.
- `X-Sandbox: true` header skips quota, cost tracking, and logging — useful for testing but never ship with it.
- Auth supports three methods: `Authorization: Bearer <jwt>`, cookie `authjs.session-token`, header `x-api-key`.
- Frontend uses dual DB driver: `@neondatabase/serverless` for cloud, `pg` for local. Check `DATABASE_URL` for `neon.tech` to determine which.
- Backend Makefile prepends `$(HOME)/.local/go/bin` to `PATH` — Go binaries installed there are available.
- `turbo.json` passes build env vars but **NOT** `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY` — these are runtime-only.
- `apps/web/tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking.
- `DB_TYPE` modes: `postgres` (default), `neon` (cloud, skips local container), `mongodb` (backend auto-setup).
- MongoDB in `docker-compose.yml` is behind a `mongo` profile — NOT started by default.
- `opencode.json` configures this project to use its own Yapapa instance as the LLM provider (localhost:20128).
- Admin routes use separate auth from main login — see `app/admin/login/` for admin auth flow.
- Docker entrypoint is `start.sh` with supervisord — backend binary is `/app/backend/server`, frontend is `apps/web/server.js` in standalone mode.

## Environment Variables

| Variable           | Required | Description                                       |
| ------------------ | :------: | ------------------------------------------------- |
| `DATABASE_URL`     |    ✅    | PostgreSQL connection string                      |
| `AUTH_SECRET`      |    ✅    | JWT signing secret (must match frontend+backend)  |
| `NEXTAUTH_SECRET`  |    ✅    | NextAuth session secret                           |
| `NEXTAUTH_URL`     |    ✅    | Public base URL (e.g. `http://localhost:3000`)    |
| `BACKEND_URL`      |    ✅    | Go backend URL (e.g. `http://localhost:8080`)     |
| `OPENAI_API_KEY`   |    ❌    | OpenAI API key                                    |
| `ANTHROPIC_API_KEY`|    ❌    | Anthropic API key                                 |
| `GROQ_API_KEY`     |    ❌    | Groq API key                                      |
| `GEMINI_API_KEY`   |    ❌    | Google Gemini API key                             |
| `NVIDIA_API_KEY`   |    ❌    | NVIDIA NIM API key                                |
| `REDIS_URL`        |    ❌    | Redis connection URL (optional, for rate limiting)|
| `STRIPE_SECRET_KEY`|    ❌    | Stripe secret key (for billing)                   |
| `DB_TYPE`          |    ❌    | `postgres` (default), `neon`, or `mongodb`        |

## Architecture Notes

### Frontend (Next.js 16)

- **App Router** — all routes in `app/`. API routes in `app/api/` proxy to Go backend via `proxyToBackend()`.
- **Dashboard is SDK-driven** — components use `getSDK()` / `DraSDK` from `lib/api/sdk.ts`. No mock data allowed.
- **Data fetching** — `lib/api/hooks.ts` wraps SDK with React Query. Prefer SDK/hooks over direct `fetch()`.
- **Auth** — NextAuth v5 in `auth.ts`/`auth.config.ts`. JWT HS256 secrets must match backend.
- **Styling** — Tailwind CSS v4 CSS-first config (`globals.css @theme`), NOT `tailwind.config.ts`.

### Backend (Go 1.25)

- **Layered architecture** — `cmd/api/main.go` → `internal/handler/` → `internal/service/` → `internal/repository/` → `internal/domain/`
- **Handlers** — HTTP concerns only (parse request, call service, write response)
- **Services** — Business logic, orchestration. Never import `net/http`
- **Repositories** — Data access (raw SQL via pgx, all parameterized). Never import `net/http`
- **Domain** — Shared models, typed errors, enums. Zero dependencies on other layers
- **Route registration** — `cmd/api/routes.go` (~410 lines, all route definitions with middleware)
- **Dependency injection** — `cmd/api/services.go` (~370 lines, `initServices()`)

### LLM Gateway (`pkg/llm/`)

- **10-stage pipeline** — validator → router → cache → guardrails → moderation → translator → provider → telemetry → circuit breaker → watcher
- **18+ subpackages** — See `apps/backend/pkg/llm/AGENTS.md` for full map
- **Provider pattern** — Each provider implements common interface with key rotation, health check, fallback
- **Anthropic compatibility** — `/v1/messages` via `internal/handler/anthropic_messages.go` + `pkg/llm/anthropic/`

### Key Files to Check Before Non-Trivial Changes

| File                                                     | Purpose                                    |
| -------------------------------------------------------- | ------------------------------------------ |
| `apps/web/AGENTS.md`                                     | Frontend-specific rules                    |
| `apps/backend/AGENTS.md`                                 | Backend-specific rules                     |
| `apps/backend/pkg/llm/AGENTS.md`                         | LLM pipeline stages and subpackage map     |
| `ops.md`                                                 | Operational debt and known issues          |
| `UPDATE.md`                                              | Records of completed cleanup and features  |
| `apps/backend/cmd/api/routes.go`                         | All route definitions (100+ endpoints)     |
| `apps/backend/cmd/api/services.go`                       | Dependency injection factory               |
| `apps/web/lib/api/sdk.ts`                                | TypeScript SDK (~1700 lines)               |
| `apps/web/lib/api/hooks.ts`                              | React Query hooks (~800 lines)             |
| `apps/web/db/schema.ts`                                  | Drizzle ORM schema                         |

## Quick Reference

### Services After Launch

| Service            | URL                          | Description                    |
| ------------------ | ---------------------------- | ------------------------------ |
| Frontend           | `http://localhost:3000`      | Next.js 16 App Router          |
| Backend API        | `http://localhost:8080`      | Go chi router API server       |
| API Docs           | `http://localhost:3000/docs` | Interactive OpenAPI docs       |
| Playground         | `http://localhost:3000/playground` | Multi-model AI chat     |

### Docker Compose

```bash
docker-compose up -d postgres        # Start local Postgres only
docker-compose up -d                 # Start all services
docker-compose --profile mongo up -d # Start with MongoDB
```

### CI Workflows

- `ci.yml` — lint, frontend tests, backend tests, build (runs on push/PR to `main`)
- `e2e.yml` — Playwright E2E tests (runs on push/PR to `main`)
