# Go Backend — DRA Platform

**Stack**: Go 1.25, chi router v5, pgx v5, golang-jwt v5

## Layered architecture

```
cmd/api/main.go → internal/handler/ → internal/service/ → internal/repository/ + internal/domain/
```

- **Handler** — HTTP concerns only: parse request, call service, write response
- **Service** — Business logic, orchestration. Never import `net/http`
- **Repository** — Data access (raw SQL via pgx, all parameterized). Never import `net/http`
- **Domain** — Shared models, typed errors, enums. Zero dependencies on other layers

## Build & test

| Command | Purpose |
|---------|---------|
| `make build` | `go build -o api ./cmd/api` |
| `make dev` | `go run ./cmd/api` |
| `make test` | `go test -race -cover ./...` |
| `make test-unit` | `go test -v -short ./...` |
| `make test-integration` | needs `TEST_DATABASE_URL` |
| `make vet` | `go vet ./...` |
| `make lint` | `vet + staticcheck` |
| `make fmt` | `gofmt + goimports` |

Run from `apps/backend/` — Makefile handles Go binary path.

## Migration conventions

- Raw SQL files in `migrations/`, numbered sequentially: `001_*.sql`, `002_*.sql`, etc.
- Hand-applied (no auto-migrator). Apply in order, one-time.

## Key internal packages

| Package | Purpose |
|---------|---------|
| `internal/config/` | Env-based config loader |
| `internal/db/` | pgx connection pool setup |
| `internal/domain/` | Domain models, typed errors |
| `internal/handler/` | HTTP handlers (chi) |
| `internal/middleware/` | Auth, rate limit, CORS, logging, tracing, metrics |
| `internal/repository/` | Raw SQL data access layer |
| `internal/service/` | Business logic (15+ services) |
| `internal/redis/` | Optional Redis client |
| `internal/pkg/logger/` | Structured logging (slog) |
| `internal/pkg/response/` | Standardized HTTP response helpers |
| `internal/pkg/token/` | JWT generation & validation |

## Auth methods (all supported)

- `Authorization: Bearer <jwt>` (HS256, shared secret with frontend)
- Cookie: `authjs.session-token`
- Header: `x-api-key`

`AUTH_SECRET` must match frontend. Module path: `dra-platform/backend`.

## Dual provider systems

**Important**: Two provider registries exist — `internal/provider/` (legacy handler endpoints) and `pkg/llm/provider/` (OpenAI-compatible `/v1/*` proxy). New LLM backends must register in BOTH. The `pkg/llm/provider/` is canonical.

## External packages

| Package | Purpose |
|---------|---------|
| `pkg/llm/` | LLM SDK (provider registry, router, cache, pipeline, translator, tools) |
| `pkg/sdk/` | Typed Go client — mirrors TypeScript SDK |
| `pkg/email/` | SMTP email sender |
| `pkg/webhook/` | Outbound webhook delivery with retry |
| `pkg/trace/` | Distributed tracing |
| `pkg/llmsdk/` | (legacy) LLM SDK wrapper |
| `examples/llmtests/` | LLM test examples |
