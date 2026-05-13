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
npm run test         # Run all tests via turbo
npm run test:web     # Frontend tests only
npm run test:backend # Backend tests only
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
make test-coverage     # coverage report (text + HTML)
make coverage-html     # go tool cover -html=coverage.out
make vet               # go vet ./...
make lint              # vet + staticcheck
make fmt               # gofmt + goimports
make clean             # rm api coverage.out coverage.html
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
- **Go backend**: Tests co-located with source (`*_test.go`), plus `tests/integration/` for full integration tests. Run with `make test` (all) or `make test-unit` (short mode). Integration tests use `internal/testutil.NewTestServer()` for test harness setup.
- **Frontend**: Vitest tests in `tests/` or co-located `*.test.ts`/`*.spec.ts`. SDK tests in `tests/lib/api/`. Wiring verification in `tests/wiring-verification.test.ts` — enforces no mock data in dashboard.
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
- **pgx v5** — PostgreSQL connection pool. Raw SQL in repositories (all parameterized).
- **Domain layer** (`internal/domain/`): Shared models, typed errors, and enums used across all backend layers.
- **Layered architecture**: `handler/` → `service/` → `repository/` + `domain/`
- **Dual provider systems** (architecture note): There are two provider registries — `internal/provider/provider.go` (used by legacy handler endpoints) and `pkg/llm/provider/` (used by `/v1/*` OpenAI-compatible proxy). Adding a new LLM backend requires registering in both. `pkg/llm/provider/` is the canonical one for new work.
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

**Auth endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |
| PUT | `/api/auth/password` | Change password |

**Chat & AI:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Streaming chat (SSE) |
| POST | `/api/embeddings` | Generate embeddings |
| POST | `/v1/chat/completions` | OpenAI-compatible proxy |
| POST | `/v1/embeddings` | OpenAI-compatible embeddings |
| GET | `/v1/models` | OpenAI-compatible model list |
| GET | `/api/models` | List available models |

**API Keys:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Create API key |
| DELETE | `/api/keys/:id` | Delete API key |
| POST | `/api/keys/:id/revoke` | Revoke API key |

**Credits & Billing:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/credits` | Credit balance |
| POST | `/api/credits/purchase` | Purchase credits |
| GET | `/api/credits/budget` | Budget settings |
| PUT | `/api/credits/budget` | Set budget limits |
| GET | `/api/transactions` | Transaction history |

**Usage & Logs:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/logs` | Request logs (paginated) |
| GET | `/api/analytics` | Usage analytics |

**Conversations:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/{id}` | Get conversation |
| DELETE | `/api/conversations/{id}` | Delete conversation |
| POST | `/api/conversations/{id}/messages` | Add message |

**Prompts:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List prompts |
| POST | `/api/prompts` | Create prompt |
| GET | `/api/prompts/{name}` | Get prompt |
| POST | `/api/prompts/{name}/render` | Render prompt template |
| DELETE | `/api/prompts/{name}` | Delete prompt |

**Webhooks:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks/{id}` | Get webhook |
| PUT | `/api/webhooks/{id}` | Update webhook |
| DELETE | `/api/webhooks/{id}` | Delete webhook |

**Organizations:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/organizations` | List orgs |
| POST | `/api/organizations` | Create org |
| GET | `/api/organizations/{id}` | Get org |
| POST | `/api/organizations/{id}/invite` | Invite member |
| DELETE | `/api/organizations/{id}/members/{userId}` | Remove member |
| GET | `/api/organizations/{id}/members` | List members |
| POST | `/api/invites/accept` | Accept invitation |

**Batch & Files:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/batch` | Submit batch chat job |
| GET | `/api/batch/{id}` | Get batch job status |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List files |

**Real-time:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications/stream` | SSE notification stream |

**Admin endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete user account |
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/circuit-breakers` | Circuit breaker status |
| GET | `/api/admin/provider-health` | Provider health |

**Other:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate` | Validate structured output |
| POST | `/webhooks/stripe` | Stripe webhook (public, signature-verified) |
| GET | `/health/providers` | LLM provider health summary |

### SDK duality
Both Go SDK (`pkg/sdk/client.go`) and TypeScript SDK (`lib/api/sdk.ts`) must be kept in sync. They cover the same backend endpoints with matching types. When adding new endpoints, implement in Go backend → Go SDK → TypeScript SDK.

### Docker
```bash
docker-compose up -d    # Full stack: Postgres + frontend + backend
```

## Mandatory: Skill & Rule Usage

Before EVERY task, you MUST:
1. Scan `~/.claude/skills/` for relevant skills and invoke matching ones via the Skill tool
2. Review applicable rules from `~/.claude/rules/`
3. See `.claude/rules/common/skill-usage.md` for the complete task-to-skill mapping table
4. Do not skip — even for "simple" tasks

## Important notes
- **Go 1.25** — use `slog` for logging, `context` for timeouts.
- **Next.js 16 canary** — check `node_modules/next/dist/docs/` before writing new frontend code.
- **Tailwind CSS v4** — uses `@tailwindcss/postcss`, not v3 config approach.
- **No mock data** — dashboard fetches live data via SDK.
- **Module path**: `dra-platform/backend` in all Go imports.
- **AUTH_SECRET must be identical** between frontend and backend for HS256 JWT validation.
- **`.npmrc` has `legacy-peer-deps=true`** — do not remove.
- **Drizzle** uses `@neondatabase/serverless` driver (even for local Postgres).
- **Backend auth methods**: JWT (`Authorization: Bearer`), session cookie (`authjs.session-token`), or `x-api-key` header.
- **`tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*`** from type checking (top-level await).
- **`turbo.json` passes build env vars**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `BACKEND_URL`.
- **Full API endpoint reference** with behavioral rules for AI agents is in `AGENTS.md` at repo root. Read it for the complete list (40+ endpoints) and operating constraints.

### Environment Variables

**Required:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | JWT signing secret (openssl rand -base64 32) |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Public base URL (http://localhost:3000) |
| `BACKEND_URL` | Go backend URL (http://localhost:8080) |

**AI Provider Keys (at least one):**
| Variable | Description |
|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GROQ_API_KEY` | Groq API key |
| `GEMINI_API_KEY` | Google Gemini API key |
