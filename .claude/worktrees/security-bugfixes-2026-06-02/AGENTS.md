# Repository Guidelines

Universal LLM Gateway (Yapapa / DRA Platform) — an OpenRouter-style proxy for OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, and more. **Next.js 16 canary + Go 1.25** monorepo. App-specific guidance: `apps/web/AGENTS.md`, `apps/backend/AGENTS.md`. Full API reference: `CLAUDE.md`. Known issues and debt: `ops.md`.

## Project Structure & Module Organization

| Directory                  | Role                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/web/`                | Next.js 16 frontend — App Router, Tailwind v4, React 19, Drizzle ORM                                                   |
| `apps/backend/`            | Go 1.25 API — chi router, pgx v5, JWT auth, LLM pipeline                                                               |
| `apps/backend/pkg/llm/`    | LLM gateway: 18 subpackages (provider registry, routing, translation, caching, guardrails, circuit breaker, telemetry) |
| `apps/backend/pkg/sdk/`    | Typed Go client mirroring the TypeScript SDK                                                                           |
| `apps/backend/pkg/llmsdk/` | Legacy LLM SDK wrapper — avoid for new code                                                                            |
| `scripts/`                 | `dev.sh` (full-stack launcher), `smoke-test.sh` (wiring verification)                                                  |
| `docs/`                    | Implementation guides                                                                                                  |
| `apps/backend/migrations/` | Raw SQL migrations, numbered sequentially (`001_base_schema.sql`–`019_docs_base_url.sql`)                              |

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
make test                  # go test -race -cover ./...
make test-unit             # go test -v -short ./... (skips integration)
make test-integration      # needs TEST_DATABASE_URL env var
make vet                   # go vet ./...
make fmt                   # go fmt + goimports
go test -race -cover -run TestName ./pkg/llm/tools/...  # Single test
```

## Coding Style & Naming Conventions

- **TypeScript**: No `as any` or `@ts-ignore`. Path alias `@/` maps to `apps/web/` root. Use `cva` + `tailwind-merge` for variants. Tailwind CSS v4 — CSS-first config (`@tailwindcss/postcss`), NOT `tailwind.config.ts`. Zod v4 — not v3 patterns.
- **Go**: Module path `dra-platform/backend`. Layered architecture: handler → service → repository → domain. Handlers own HTTP only; services own business logic (never import `net/http`). Run `go vet ./...` and `make fmt` before committing.
- **SDK parity**: Backend API changes require matching updates in Go SDK (`pkg/sdk/`) then TypeScript SDK (`lib/api/sdk.ts`), in that order.
- **Next.js 16 canary**: Breaking changes from v14/15. `fetch()` no longer cached by default. `revalidate` export gone — use `"use cache"` + `cacheLife()`. Read `node_modules/next/dist/docs/` before writing code.

## Testing Guidelines

- **Frontend**: Vitest with jsdom. Dashboard components must use `getSDK()`, never mock data — enforced by `tests/wiring-verification.test.ts` and `scripts/smoke-test.sh`.
- **Backend**: Always run with `-race` flag (`make test` does this). Integration tests require `TEST_DATABASE_URL`. Use `internal/testutil.NewTestServer()` for integration harness.
- Run `bash scripts/smoke-test.sh` after significant cross-stack changes.

## Commit & Pull Request Guidelines

- **Commit style**: Conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`. Scope optional: `refactor(docs):`. See `git log --oneline` for examples.
- **PR requirements**: CI passes (`ci.yml`: lint, frontend tests, backend tests, build; `e2e.yml`: Playwright E2E). Both run on push/PR to `main`.
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
- `opencode.json` configures this project to use its own Yapapa instance as the LLM provider.
