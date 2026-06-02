# Development Scripts Reference

> Full command reference for development, testing, build, and deployment operations.
> Last updated: 2026-05-22

---

## Root Workspace (npm)

Run from the project root (`/teamspace/studios/this_studio/shinway/`):

| Command                | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start both frontend and backend in dev mode (via Turborepo) |
| `npm run build`        | Build all apps for production                               |
| `npm run lint`         | Lint all packages                                           |
| `npm run format`       | Prettier format all TypeScript and Markdown files           |
| `npm run test`         | Run all tests (frontend + backend) via Turborepo            |
| `npm run test:web`     | Run frontend tests only                                     |
| `npm run test:backend` | Run backend tests only                                      |

**Turbo Pipeline:**

```json
{
  "dev": { "cache": false, "persistent": true },
  "build": {
    "dependsOn": ["^build"],
    "outputs": [".next/**", "!node_modules/**"]
  },
  "lint": {},
  "test": {},
  "test:web": {},
  "test:backend": {}
}
```

---

## Frontend (apps/web)

Run from `apps/web/`:

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start Next.js dev server on port 3000     |
| `npm run build`      | Production build (`output: 'standalone'`) |
| `npm run start`      | Start production server                   |
| `npm run lint`       | `next lint`                               |
| `npm run test`       | Run all Vitest tests                      |
| `npm run test:watch` | Run Vitest in watch mode                  |
| `npm run db:push`    | Push Drizzle schema to database           |
| `npm run db:seed`    | Seed demo data                            |
| `npm run db:setup`   | Push schema + seed data (combined)        |

### Running Single Tests

```bash
# SDK unit tests
npm run test -- --run tests/lib/api/sdk.test.ts

# Admin SDK tests
npm run test -- --run tests/lib/api/admin-sdk.test.ts

# API error handling tests
npm run test -- --run tests/lib/api/errors.test.ts

# React Query hooks tests
npm run test -- --run tests/lib/api/hooks.test.ts

# Rate limit tests
npm run test -- --run tests/lib/api/rate-limit.test.ts

# Wiring verification (enforces no mock data in dashboard)
npm run test -- --run tests/wiring-verification.test.ts

# Component tests
npm run test -- --run tests/components/ui/button.test.tsx
npm run test -- --run tests/components/dashboard/MetricCard.test.tsx

# Integration tests
npm run test -- --run tests/integration/api-routes.test.ts
npm run test -- --run tests/integration/auth-flow.test.ts
```

### Frontend Test Files

| Test File                                             | Type           | What It Tests                                      |
| ----------------------------------------------------- | -------------- | -------------------------------------------------- |
| `tests/wiring-verification.test.ts`                   | Infrastructure | No mock data in dashboard, routes proxy to backend |
| `tests/lib/api/sdk.test.ts`                           | Unit           | DraSDK client methods (~40+ methods)               |
| `tests/lib/api/admin-sdk.test.ts`                     | Unit           | Admin SDK endpoints                                |
| `tests/lib/api/errors.test.ts`                        | Unit           | Typed API error classes (7 error types)            |
| `tests/lib/api/hooks.test.ts`                         | Unit           | React Query hook wiring                            |
| `tests/lib/api/rate-limit.test.ts`                    | Unit           | Rate limit logic                                   |
| `tests/lib/api/types.test.ts`                         | Unit           | TypeScript type definitions                        |
| `tests/lib/utils.test.ts`                             | Unit           | General utilities                                  |
| `tests/lib/model-utils.test.ts`                       | Unit           | Model utility functions                            |
| `tests/lib/docs-config.test.ts`                       | Unit           | Docs configuration helpers                         |
| `tests/lib/pricing-data.test.ts`                      | Unit           | Pricing data structures                            |
| `tests/lib/playground-storage.test.ts`                | Unit           | Playground localStorage persistence                |
| `tests/components/ui/button.test.tsx`                 | Component      | Button component rendering                         |
| `tests/components/ui/toast.test.tsx`                  | Component      | Toast notification component                       |
| `tests/components/ui/glass-card.test.tsx`             | Component      | GlassCard component                                |
| `tests/components/dashboard/MetricCard.test.tsx`      | Component      | MetricCard rendering                               |
| `tests/components/dashboard/AnimatedCounter.test.tsx` | Component      | AnimatedCounter behavior                           |
| `tests/components/dashboard/DataTable.test.tsx`       | Component      | DataTable sorting/pagination                       |
| `tests/components/dashboard/StatusBadge.test.tsx`     | Component      | StatusBadge variants                               |
| `tests/components/pricing/CostCalculator.test.tsx`    | Component      | Cost calculator logic                              |
| `tests/components/playground/ModelSelector.test.tsx`  | Component      | Model selector behavior                            |
| `tests/components/playground/CodeSnippets.test.tsx`   | Component      | Code snippet display                               |
| `tests/integration/api-routes.test.ts`                | Integration    | Proxy route existence                              |
| `tests/integration/auth-flow.test.ts`                 | Integration    | Auth redirect flows                                |

---

## Backend (apps/backend)

Run from `apps/backend/`:

| Command                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `make build`            | `go build -o api ./cmd/api`                                 |
| `make dev`              | `go run ./cmd/api`                                          |
| `make run`              | Build then run the binary                                   |
| `make test`             | `go test -race -cover ./...` (all tests with race detector) |
| `make test-race`        | `go test -race -v ./...` (verbose with race)                |
| `make test-unit`        | `go test -v -short ./...` (skips integration tests)         |
| `make test-integration` | Full integration tests (requires `TEST_DATABASE_URL`)       |
| `make test-coverage`    | Coverage profile + function report                          |
| `make coverage-html`    | Generate HTML coverage report                               |
| `make vet`              | `go vet ./...`                                              |
| `make lint`             | `go vet` + `staticcheck`                                    |
| `make fmt`              | `gofmt` + `goimports` formatting                            |
| `make clean`            | Remove `api` binary, `coverage.out`, `coverage.html`        |
| `make docker`           | Build Docker image (`dra-backend`)                          |

### Running Single Backend Tests

```bash
# Single package
go test -race -cover ./pkg/llm/provider/...
go test -race -cover ./internal/handler/...
go test -race -cover ./internal/service/...

# Single test function
go test -race -cover -run TestAdminFetchModels ./internal/handler/...
go test -race -cover -run TestCredits ./internal/service/...

# With verbose output
go test -v -race -run TestName ./internal/handler/...

# Integration tests (requires database)
make test-integration
```

### Backend Test Files

| Test File                                       | Type        | What It Tests                             |
| ----------------------------------------------- | ----------- | ----------------------------------------- |
| `internal/handler/handler_test.go`              | Unit        | Auth, CRUD handler tests                  |
| `internal/handler/admin_providers_test.go`      | Unit        | AdminFetchModels handler                  |
| `internal/handler/openai_proxy_test.go`         | Unit        | OpenAI proxy endpoint                     |
| `internal/handler/billing_test.go`              | Unit        | Billing/credits handler                   |
| `internal/middleware/auth_test.go`              | Unit        | Auth middleware                           |
| `internal/middleware/quota_test.go`             | Unit        | Quota middleware                          |
| `internal/service/service_test.go`              | Unit        | Service tests                             |
| `internal/service/stripe_test.go`               | Unit        | Stripe service                            |
| `internal/service/credits_test.go`              | Unit        | Credit service                            |
| `internal/service/webhook_test.go`              | Unit        | Webhook service                           |
| `internal/service/service_integration_test.go`  | Integration | Full service integration                  |
| `internal/domain/domain_test.go`                | Unit        | Domain model tests                        |
| `internal/config/config_test.go`                | Unit        | Configuration loading                     |
| `internal/pkg/response/response_test.go`        | Unit        | Response helpers                          |
| `internal/pkg/token/token_test.go`              | Unit        | JWT token generation/validation           |
| `internal/repository/repository_test.go`        | Unit        | Repository tests                          |
| `internal/repository/user_cache_test.go`        | Unit        | User cache behavior                       |
| `pkg/llm/llm_test.go`                           | Unit        | Core LLM types                            |
| `pkg/llm/provider/provider_test.go`             | Unit        | Provider registry                         |
| `pkg/llm/provider/health_test.go`               | Unit        | Provider health checks                    |
| `pkg/llm/router/router_test.go`                 | Unit        | Router strategies                         |
| `pkg/llm/router/budget_test.go`                 | Unit        | Budget router                             |
| `pkg/llm/circuitbreaker/circuitbreaker_test.go` | Unit        | Circuit breaker state machine             |
| `pkg/llm/tokens/tokens_test.go`                 | Unit        | Token counting                            |
| `pkg/llm/embeddings/embeddings_test.go`         | Unit        | Embedding generation                      |
| `pkg/llm/anthropic/formatter_test.go`           | Unit        | Anthropic format translation              |
| `pkg/llm/openai/formatter_test.go`              | Unit        | OpenAI format translation                 |
| `pkg/llm/translator/handler/handler_test.go`    | Unit        | Translation handler                       |
| `pkg/llm/translator/handler/direction_test.go`  | Unit        | Translation direction                     |
| `pkg/llm/translator/handler/batch_test.go`      | Unit        | Batch translation                         |
| `pkg/llm/translator/handler/middleware_test.go` | Unit        | Translation middleware                    |
| `pkg/llm/tools/websearch/tool_test.go`          | Unit        | Web search tool                           |
| `pkg/llm/tools/websearch/serpapi_test.go`       | Unit        | SERP API integration                      |
| `pkg/sdk/client_test.go`                        | Unit        | Go SDK client                             |
| `tests/integration/integration_test.go`         | Integration | Full stack (requires `TEST_DATABASE_URL`) |

---

## Full-Stack Scripts

### `bash scripts/dev.sh`

Full development environment launcher with dependency checking:

1. **Prerequisite Check**: Node.js, npm, Go, Docker
2. **Dependency Installation**: Root + frontend + backend
3. **Database Startup**: PostgreSQL via Docker Compose
4. **Environment Setup**: Ensures `.env.local` exists, generates secrets if missing
5. **Schema Migration**: `db:push` (Drizzle schema)
6. **Data Seeding**: `db:seed` if database is empty
7. **Backend Launch**: Go backend (color-coded log output, `ENV=development`)
8. **Frontend Launch**: Next.js dev server (color-coded log output)

**Flags:**

```bash
bash scripts/dev.sh              # Full launch
bash scripts/dev.sh --check      # Dependency check only
bash scripts/dev.sh --logs       # Show logs from last run
```

Press `Ctrl+C` to stop all services gracefully.

### `bash scripts/smoke-test.sh`

Post-change wiring verification that checks 8 invariants:

| #   | Check                     | Description                                           |
| --- | ------------------------- | ----------------------------------------------------- |
| 1   | Go Backend Compiles       | `go build ./...` succeeds                             |
| 2   | No Mock Data              | Dashboard components don't contain mock data patterns |
| 3   | SDK Import Audit          | Dashboard components import from `@/lib/api/sdk`      |
| 4   | API Route Coverage        | Expected proxy routes exist in route tests            |
| 5   | Chat SSE Wiring           | Chat route has SSE conversion logic                   |
| 6   | Test Infrastructure       | Backend and frontend test files exist                 |
| 7   | Environment Configuration | `.env.example` defines required variables             |
| 8   | No Console Log            | No `console.log` in production code                   |

Outputs: `PASS`/`FAIL`/`WARN` counts. Exits non-zero if any FAIL.

---

## Go-Specific Commands

```bash
# Format all Go code
gofmt -w ./
goimports -w ./

# Run static analysis
go vet ./...
staticcheck ./...

# Build without cache
go clean -cache && go build ./cmd/api

# Download dependencies
go mod download
go mod tidy

# Run security scan
gosec ./...

# Check for outdated dependencies
go list -u -m all
```

## Docker Commands

```bash
# Start local PostgreSQL
docker compose up -d postgres

# Start PostgreSQL + Mongo (mongo profile)
docker-compose --profile mongo up -d

# Build backend Docker image
make docker

# View logs
docker compose logs -f postgres
docker compose logs -f backend
docker compose logs -f web
```

## Environment Variables for Build

See `docs/backend/CONFIG.md` for the complete environment variable reference.

Key turbo.json build env note: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, and `GEMINI_API_KEY` are NOT passed through by turbo.json — they are runtime-only and must be set separately.
