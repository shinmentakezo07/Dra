# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yapapa (DRA Platform) is a Universal LLM Gateway — an OpenRouter-style platform that proxies AI requests to NVIDIA NIM, OpenAI, Anthropic, Groq, Gemini, and 100+ other models. Monorepo with two apps: Next.js 16 frontend + Go 1.25 backend.

## Commands

### Root (Turborepo)
```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps
npm run lint         # Lint all apps
npm run format       # Prettier format
```

### Frontend (`apps/web/`)
```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run test         # Vitest run
npm run test:watch   # Vitest watch mode
npm run db:push      # Push Drizzle schema to DB
npm run db:seed      # Seed demo data
npm run db:setup     # push + seed
```

### Backend (`apps/backend/`)
```bash
make build             # go build -o api ./cmd/api
make dev               # go run ./cmd/api
make test              # go test -race -cover ./...
make test-unit         # go test -v -short ./...
make test-integration  # needs TEST_DATABASE_URL
make test-coverage     # coverage report
make vet               # go vet ./...
make lint              # vet + staticcheck
make fmt               # gofmt + goimports
```

### Full-stack dev
```bash
bash scripts/dev.sh    # Install deps, start Postgres, push schema, seed DB, start all servers
bash scripts/smoke-test.sh  # Post-change wiring verification
```

### Running single Go tests
```bash
go test -race -cover ./pkg/llm/provider/...          # Single package
go test -race -cover -run TestName ./pkg/llm/tools/...  # Single test
```

### Running single Vitest test
```bash
npm run test -- --run tests/lib/api/sdk.test.ts       # Single file
```

## Architecture

### Monorepo structure
```
apps/
  web/           Next.js 16 (canary) — App Router, Tailwind CSS v4, React 19
  backend/       Go 1.25 — chi router, pgx, JWT auth, LLM pipeline
scripts/         dev.sh, smoke-test.sh
docs/            Implementation guides and design docs
```

### Test organization
- **Go backend**: Tests co-located with source (`*_test.go`), plus `tests/integration/` for full integration tests. Run with `make test` (all) or `make test-unit` (short mode). `internal/handler/handler_test.go` and `pkg/llm/llm_test.go` are key entry points.
- **Frontend**: Vitest tests in `tests/` directory. SDK tests in `tests/lib/api/`. Wiring verification in `tests/wiring-verification.test.ts`.
- **Coverage**: Run `make test-coverage` in backend, `npm run test -- --coverage` in frontend.

### Frontend (`apps/web/`)
- **Next.js 16 canary** — read `node_modules/next/dist/docs/` before writing code. APIs may differ from training data.
- **App Router** with `app/api/*` routes (25+ route groups) proxying to Go backend via `proxyToBackend()` in `lib/api/proxy.ts`
- **Auth**: NextAuth v5 (credentials + GitHub + Google OAuth). JWT HS256 tokens shared with Go backend. Config: `auth.ts`.
- **DB**: Drizzle ORM with Neon/pg driver. Schema: `db/schema.ts`.
- **SDK**: `lib/api/sdk.ts` — `DraSDK` class with typed endpoints for all backend APIs. Dashboard uses `getSDK()`, no mock data. Supporting modules: `errors.ts`, `types.ts`, `hooks.ts`.
- **State**: `@tanstack/react-query` for server state, `@ai-sdk/react` for streaming.
- **Charts**: Recharts. Animations: Framer Motion + GSAP.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), `cva` for variant components, `tailwind-merge` for class merging.
- **Validation**: Zod v4 schemas.
- **Pages**: Landing (`/`), Playground (`/playground`), Dashboard (`/dashboard`), Gateway (`/gateway`), Pricing (`/pricing`), Docs (`/docs`), Login/Signup, Forgot password.

### Backend (`apps/backend/`)
- **Chi router** (`go-chi/chi/v5`) — lightweight HTTP router with middleware chain.
- **pgx v5** — PostgreSQL connection pool. Raw SQL in repositories.
- **Domain layer** (`internal/domain/`): Shared models, typed errors, and enums used across all backend layers.
- **Layered architecture**: `handler/` → `service/` → `repository/` + `domain/`
- **LLM pipeline** (`pkg/llm/`): provider registry → model router → cache → guardrails → moderation → telemetry. Sub-packages:
  - `provider/` — Provider registry with OpenAI SDK, multi-key rotation, health checking, fallback/balancing
  - `translator/` — Format translation between Anthropic, OpenAI, and generic chat formats
  - `pipeline/` — Request/response middleware chain orchestrating all pipeline stages
  - `cache/` — Response caching (TTL-based, semantic dedup)
  - `router/` — Model-to-provider routing logic
  - `guardrails/` — Input/output guardrail checks
  - `moderation/` — Content moderation filtering
  - `validator/` — Request validation
  - `watcher/` — Error watching and retry logic
  - `tools/` — Tool/function calling definitions
  - `context/` — Context window management
  - `embeddings/` — Embedding generation and search
  - `tokens/` — Token counting and limits
  - `telemetry/` — OpenTelemetry-style spans and structured logging
  - `circuitbreaker/` — Circuit breaker for provider fault isolation
  - `batch/` — Batch request processing
  - `openai/` — OpenAI-compatible request building
- **Redis** (`internal/redis/`): Optional — connection management and key-value operations for caching, rate limiting, and distributed state.
- **Webhook system** (`pkg/webhook/`, `internal/service/webhook.go`, `internal/repository/webhook.go`): Event-driven outbound webhook delivery with retry logic and delivery tracking.
- **Batch processing** (`internal/handler/batch.go`, `internal/service/batch.go`): Async batch job submission and status tracking.
- **SSE notifications** (`internal/handler/sse.go`): Server-sent events via `NotificationHub` for real-time streaming to clients.
- **Telemetry** (`internal/middleware/tracing.go`, `internal/middleware/metrics.go`): Prometheus metrics and distributed tracing middleware.
- **Embeddings** (`internal/handler/embeddings.go`, `pkg/llm/embeddings/`): Generate and query vector embeddings through the LLM pipeline.
- **Files & uploads** (`internal/handler/upload.go`, `internal/repository/file.go`): File upload handling for prompt attachments.
- **Internal SDK** (`internal/pkg/`): Shared packages for logger, HTTP response helpers, and JWT token utilities — distinct from the external `pkg/sdk/` consumer SDK.
- **Migrations**: Raw SQL in `migrations/`, numbered sequentially (001-006).
- **Middleware stack** (`internal/middleware/`): Auth (JWT/API key), CORS, rate limiting (sliding window + Redis), quota enforcement, request logging, body size limit, tracing, Prometheus metrics, response transformation, and input validation.
- **Services** (`internal/service/`): 15+ business logic services covering analytics, API keys, billing/credits, users, organizations, webhooks, batch jobs, prompts, files, and Stripe payment processing.
- **Go SDK** (`pkg/sdk/`): Typed Go client with webhook support — mirrors TypeScript SDK. Includes `client.go`, `types.go`, `utils.go`, `webhook.go`, `errors.go`. See `pkg/sdk/README.md`.

### Key API endpoints
Backend serves on `:8080`. Frontend proxies `/api/*` and `/v1/*` → `BACKEND_URL`.

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/auth/signup` | Register |
| `POST /api/auth/login` | Login |
| `POST /api/chat` | Streaming chat (SSE) |
| `GET /api/keys` | List API keys |
| `GET /api/credits` | Credit balance |
| `GET /api/analytics` | Usage analytics |
| `GET /api/logs` | Request logs |
| `GET /api/admin/users` | Admin: list users |
| `/v1/chat/completions` | OpenAI-compatible proxy |

### SDK duality
Both Go SDK (`pkg/sdk/client.go`) and TypeScript SDK (`lib/api/sdk.ts`) must be kept in sync. They cover the same backend endpoints with matching types. When adding new endpoints, implement in Go backend → Go SDK → TypeScript SDK.

### Docker
```bash
docker-compose up -d    # Full stack: Postgres + frontend + backend
```

## Important notes
- **Go 1.25** — use `slog` for logging, `context` for timeouts.
- **Next.js 16 canary** — check `node_modules/next/dist/docs/` before writing new frontend code.
- **Tailwind CSS v4** — uses `@tailwindcss/postcss`, not v3 config approach.
- **No mock data** — dashboard fetches live data via SDK.
- **Module path**: `dra-platform/backend` in all Go imports.
