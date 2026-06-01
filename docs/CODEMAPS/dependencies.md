<!-- Generated: 2026-05-31 (INCREMENTAL) | Files scanned: 2 package.json + 1 go.mod + enterprise packages | Token estimate: ~750 | Last full scan: 2026-05-29 -->
<!-- INCREMENTAL UPDATE: Added 9 enterprise packages (pkg/llm/{credentials,virtualkeys,budget,audit,security,usage,loadbalancer,otel,ws}), stores layer, migration 022 tables -->

# Dependencies & Integrations Codemap

**Monorepo**: Turborepo (`turbo.json`)
**Package Manager**: npm@10.0.0 (root), workspaces in `apps/*`

---

## External Services

| Service | Purpose | Integration Points | Auth |
|---------|---------|-------------------|------|
| **PostgreSQL 16** | Primary data store (users, keys, logs, credits, admin tables) | Backend: `pgx/v5` pool; Frontend: `@neondatabase/serverless` + `pg` (dev) | Connection string (`DATABASE_URL`) |
| **Redis** (optional) | Cache, rate limiting, session storage | Backend: `redis/go-redis/v9`; Fallback: in-memory map | `REDIS_URL` |
| **Stripe** | Payment processing (credit purchases, subscriptions) | Backend: `stripe/stripe-go/v76`; Webhook: `/webhooks/stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **SMTP** (optional) | Email delivery (password resets, notifications) | Backend: `pkg/email/` (net/smtp wrapper) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| **GitHub OAuth** | Social login | Frontend: NextAuth v5 provider | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| **Google OAuth** | Social login | Frontend: NextAuth v5 provider | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |

---

## LLM Provider Integrations

| Provider | SDK | Auth Header | Base URL | Notes |
|----------|-----|-------------|----------|-------|
| **OpenAI** | `sashabaranov/go-openai` (legacy) + `openai/openai-go/v3` (official) | `Authorization: Bearer` | `https://api.openai.com/v1` | Primary fallback provider |
| **Anthropic** | Direct HTTP (custom, no SDK for streaming control) | `x-api-key` | `https://api.anthropic.com/v1` | `/v1/messages` compatibility layer in backend |
| **Google Gemini** | `google/generative-ai` (via generic provider) | `x-goog-api-key` | `https://generativelanguage.googleapis.com/v1` | Via GenericProvider |
| **Groq** | OpenAI-compatible | `Authorization: Bearer` | `https://api.groq.com/openai/v1` | Via GenericProvider |
| **NVIDIA NIM** | OpenAI-compatible | `Authorization: Bearer` | Configurable per instance | Via GenericProvider |
| **Custom / Self-hosted** | Configurable | Per-instance | Per-instance | `provider_plugins` table + admin UI |

**Provider Registry**: `pkg/llm/provider/` — multi-key rotation, health checks, circuit breaker wrapper

---

## Frontend (Next.js 16) — Key Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `^16.3.0-canary.16` | React framework (App Router, RSC, standalone output) |
| `react` / `react-dom` | `^19.2.5` | UI library |
| `next-auth` | `^5.0.0-beta.31` | Authentication (OAuth + credentials) |
| `@tanstack/react-query` | `^5.71.0` | Server state management (caching, invalidation) |
| `zod` | `^4.4.3` | Schema validation (v4 — breaking changes from v3) |
| `drizzle-orm` | `^0.45.2` | Type-safe ORM (5 core tables only) |
| `@neondatabase/serverless` | `^1.1.0` | Serverless Postgres driver (works with local too) |
| `framer-motion` | `^12.38.0` | Component animations, gestures, page transitions |
| `gsap` / `@gsap/react` | `^3.15.0` / `^2.1.2` | Scroll-triggered animations (landing, docs) |
| `recharts` | `^3.8.1` | Data visualization (analytics, cost charts) |
| `lucide-react` | `^1.14.0` | Icon library |
| `class-variance-authority` (`cva`) | `^0.7.1` | Component variant system |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^3.5.0` | Conditional class merging |
| `@monaco-editor/react` | `^4.7.0` | Code editor (playground, prompt editor) |
| `@xterm/xterm` + `@xterm/addon-fit` | `^5.5.0` / `^0.10.0` | Terminal emulator (logs, playground output) |
| `mermaid` | `^11.14.0` | Diagram rendering (docs) |
| `react-markdown` + `react-syntax-highlighter` | `^10.1.0` / `^16.1.1` | Markdown + code highlighting |
| `prism-react-renderer` | `^2.4.1` | Alternative syntax highlighter |
| `openai` | `^6.36.0` | OpenAI SDK (frontend playground) |
| `@ai-sdk/react` | `^3.0.176` | AI streaming hooks |
| `@ai-sdk/openai` | `^3.0.26` | OpenAI provider for AI SDK |
| `react-hook-form` | `^7.74.0` | Form state management |
| `@hookform/resolvers` | `^5.2.2` | Zod resolver for RHF |
| `dotenv` | `^17.4.2` | Env loading (dev scripts) |

### Development & Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.9.3` | Type checking |
| `vitest` | `^3.2.0` | Unit test runner (jsdom) |
| `@playwright/test` | `^1.52.0` | E2E + visual regression |
| `@testing-library/react` + `dom` + `jest-dom` | `^16.3.2` / `^10.4.1` / `^6.9.1` | Component testing utilities |
| `jsdom` | `^26.1.0` | DOM simulation for Vitest |
| `eslint` + `eslint-config-next` | `^10.3.0` / `^16.2.6` | Linting |
| `drizzle-kit` | `^0.31.10` | Drizzle migrations (`db:push`, `db:seed`) |
| `autoprefixer` + `postcss` + `tailwindcss` | `^10.4.22` / `^8.5.10` / `^4.2.2` | Tailwind v4 PostCSS pipeline |
| `@types/*` | Various | TypeScript declarations |

### Root-Level (Monorepo)

| Package | Version | Purpose |
|---------|---------|---------|
| `turbo` | `latest` | Turborepo build orchestrator |
| `prettier` | `^3.2.5` | Code formatting |
| `tsx` | `^4.21.0` | TypeScript execution (seed scripts) |
| `bcryptjs` + `@types/bcryptjs` | `^3.0.3` / `^2.4.6` | Password hashing (dev utilities) |
| `drizzle-kit` | `^0.31.10` | Shared migration tooling |

### Package Overrides (root `package.json`)

```json
"overrides": {
  "dompurify": "^3.4.2",   // XSS sanitizer (forced upgrade)
  "esbuild": "^0.25.12",   // Bundler (forced upgrade)
  "postcss": "^8.5.10",    // CSS processor (Tailwind v4 compat)
  "uuid": "^14.0.0"        // UUID generator (forced upgrade)
}
```

**Rationale**: Prevent vulnerable or incompatible transitive versions across all workspaces.

---

## Backend (Go 1.25) — Key Dependencies

### Direct Dependencies (`go.mod`)

| Package | Version | Purpose |
|---------|---------|---------|
| `github.com/go-chi/chi/v5` | `v5.2.5` | HTTP router + middleware (lightweight, composable) |
| `github.com/go-chi/cors` | `v1.2.2` | CORS middleware for chi |
| `github.com/jackc/pgx/v5` | `v5.9.2` | PostgreSQL driver + connection pool (preferred over database/sql) |
| `github.com/golang-jwt/jwt/v5` | `v5.3.1` | JWT token generation/validation (HS256 only) |
| `github.com/google/uuid` | `v1.6.0` | UUID generation (`uuid.New()`, `uuid.MustParse()`) |
| `github.com/redis/go-redis/v9` | `v9.19.0` | Redis client (cache, rate limiting, token blacklist) |
| `github.com/prometheus/client_golang` | `v1.23.2` | Prometheus metrics exposition (`/metrics`) |
| `github.com/stripe/stripe-go/v76` | `v76.25.0` | Stripe API client (checkout, webhooks, customers) |
| `github.com/sashabaranov/go-openai` | `v1.41.2` | OpenAI-compatible SDK (legacy, still used for GenericProvider) |
| `github.com/openai/openai-go/v3` | `v3.35.0` | Official OpenAI Go SDK (v3, preferred for new code) |
| `github.com/anthropics/anthropic-sdk-go` | `v1.43.0` | Official Anthropic SDK (messages, streaming) |
| `go.mongodb.org/mongo-driver/v2` | `v2.1.0` | MongoDB driver (optional, behind feature flag) |
| `golang.org/x/crypto` | `v0.51.0` | `argon2id`, `bcrypt` for password hashing |
| `golang.org/x/sync` | `v0.20.0` | `errgroup`, `semaphore` for concurrent operations |

**Enterprise packages** (`pkg/llm/{credentials,virtualkeys,budget,audit,security,usage,loadbalancer,otel,ws}`) are **internal** — zero new external dependencies beyond standard library + existing `pgx` (via `stores/`). `otel` optionally uses `go.opentelemetry.io/otel` when `EnableMetrics=true`.

### Notable Indirect Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/tidwall/gjson` + `sjson` | Fast JSON parsing / mutation (used in LLM pipeline) |
| `github.com/klauspost/compress` | Compression (pgx, redis, HTTP) |
| `github.com/standard-webhooks/standard-webhooks/libraries` | Webhook signature verification (WHv1 spec) |
| `go.uber.org/atomic` | Atomic primitives (legacy, prefer `sync/atomic`) |

### Enterprise Package Internal Dependencies (NEW — 2026-05-31)

All 9 enterprise packages are **pure Go** (no external service dependencies beyond PostgreSQL via the stores layer):

| Package | Key External Deps | Internal Interfaces |
|---------|-------------------|---------------------|
| `credentials` | `crypto/aes`, `crypto/cipher` (AES-256-GCM) | `Store` (injected) |
| `virtualkeys` | `crypto/rand`, `crypto/sha256` | `Store` (injected) |
| `budget` | `context`, `sync` | `Store`, `AlertFunc` callback |
| `audit` | `encoding/json`, `net` | `Store` (immutable append-only) |
| `security` | (stateless regex + heuristics) | `Guard` config struct |
| `usage` | (pricing math only) | `UsageStore`, `PricingStore` |
| `loadbalancer` | (pure selection algorithms) | 6 strategy implementations |
| `otel` | `go.opentelemetry.io/otel` (if enabled) | `Exporter` interface |
| `ws` | `github.com/gorilla/websocket` | `Gateway` hub |

**Design invariant**: Enterprise packages define interfaces (`Store`, `Exporter`); concrete PostgreSQL implementations live in `pkg/llm/stores/`. This allows swapping persistence (Redis, in-memory) without touching business logic.

---



## Docker & Infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local dev: Postgres + Redis (MongoDB behind `mongo` profile) |
| `Dockerfile` (root) | Multi-stage: build Go binary + Next.js standalone |
| `.dockerignore` | Exclude `node_modules`, `.git`, `.next`, test artifacts |
| `docker-compose.yml` (Mongo profile) | Optional MongoDB for document storage features |

**Production Entry Points**:
- Backend: Compiled binary from `cmd/api/main.go`
- Frontend: `apps/web/server.js` inside `.next/standalone/`

---

## Environment Variables (Required)

| Var | Used By | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | Both | Postgres connection string |
| `AUTH_SECRET` | Both | **MUST MATCH** — HS256 JWT signing secret |
| `NEXTAUTH_URL` | Frontend | Canonical URL for NextAuth callbacks |
| `BACKEND_URL` | Frontend (proxy) | Go API base URL (local: `http://localhost:8080`, Docker: `http://backend:8080`) |
| `REDIS_URL` | Backend | Optional — enables Redis cache/rate limiting |
| `STRIPE_SECRET_KEY` | Backend | Optional — billing features |
| `STRIPE_WEBHOOK_SECRET` | Backend | Optional — Stripe signature verification |
| `SMTP_*` | Backend | Optional — email delivery |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Frontend | Optional — GitHub OAuth |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Frontend | Optional — Google OAuth |

---

## Build Tooling & Scripts

| Tool | Command | Purpose |
|------|---------|---------|
| **Turborepo** | `npm run dev`, `npm run build` | Orchestrates frontend + backend builds in parallel |
| **Next.js** | `npm run dev` (in `apps/web`) | Dev server on :3000, HMR, RSC |
| **Go** | `make dev` (in `apps/backend`) | `go run ./cmd/api` with hot reload via `air` (if installed) |
| **Vitest** | `npm run test:web` | Frontend unit tests |
| **Go test** | `make test` (backend) | Backend tests with `-race` |
| **Playwright** | `npx playwright test` | E2E + visual regression |
| **Prettier** | `npm run format` | TS/TSX/MD formatting |
| **ESLint** | `npm run lint` | Next.js lint rules |
| **Drizzle Kit** | `npm run db:push`, `npm run db:seed` | Schema push + demo data |
| **gofmt / goimports** | `make fmt` (backend) | Go formatting |
| **go vet** | `make vet` | Static analysis |

---

## CI/CD Workflows (`.github/workflows/`)

| Workflow | Triggers | Jobs |
|----------|----------|------|
| `ci.yml` | `push`, `pull_request` to `main` | lint, frontend tests, backend tests (`-race`), build |
| `e2e.yml` | `push`, `pull_request` to `main` | Playwright E2E (headed browsers, requires `DATABASE_URL` secrets) |

---

## Security & Compliance Dependencies

| Tool | Purpose | Integration |
|------|---------|-------------|
| **gosec** (optional) | Go static security analysis | Run manually: `gosec ./...` |
| **npm audit** | Node.js vulnerability scanning | `npm audit` / `npm audit fix` |
| **dompurify** (pinned) | XSS sanitizer for user-generated content | Forced via `overrides` |
| **standard-webhooks** | Webhook signature verification (WHv1) | `github.com/standard-webhooks/standard-webhooks/libraries` |

---

## Notable Version Constraints

| Constraint | Rationale |
|------------|-----------|
| **Go 1.25** | `iter.Seq`, `unique`, `slog` improvements; `go vet` before commit |
| **Next.js 16 canary** | App Router, React 19, `"use cache"`, no implicit `fetch` caching |
| **React 19** | Concurrent features, actions, `use()` hook |
| **Tailwind CSS v4** | CSS-first config (`@theme` in `globals.css`), PostCSS plugin `@tailwindcss/postcss` |
| **Zod v4** | Breaking changes from v3 — do not use v3 `z.string().min()` patterns without checking v4 docs |
| **TypeScript 5.9** | Strict mode, no `as any` / `@ts-ignore` |
| **pgx v5** | Preferred over `database/sql` for performance + context support |
| **Migration 022** | `022_enterprise_features.sql` — adds teams, virtual_keys, credentials (encrypted), usage_records, audit_logs, budget_alerts, security_events, model_pricing, fallback_configs, ab_test_configs, provider_health_history |

---

## Monorepo Layout (Workspaces)

```
dra-platform/
├── apps/
│   ├── web/              # Next.js 16 frontend (workspace: "web")
│   └── backend/          # Go 1.25 API (NOT an npm workspace)
│       └── pkg/llm/
│           ├── {credentials,virtualkeys,budget,audit,security,usage,loadbalancer,otel,ws}
│           ├── stores/          # NEW: Postgres*Store implementations for enterprise packages
│           └── {provider,router,cache,guardrails,...} (original 19)
├── packages/             # Reserved for shared packages (currently empty)
├── node_modules/         # Hoisted by npm workspaces
└── package.json          # Root with "workspaces": ["apps/*", "packages/*"]
```

**Note**: Backend is Go-only; it does not participate in npm workspaces. Turborepo orchestrates `dev` / `build` / `test` across both via `turbo.json`.

---

## Third-Party API Contracts

| API | Protocol | Auth | Rate Limits | Notes |
|-----|----------|------|-------------|-------|
| OpenAI | REST + SSE | Bearer token | Per-key (varies by tier) | Primary provider |
| Anthropic | REST + SSE | x-api-key | Per-key (varies) | Messages API, thinking support |
| Gemini | REST | API key | Per-key | Via Google AI SDK or generic |
| Stripe | REST + Webhooks | Secret key + sig verification | N/A | Billing only |
| GitHub OAuth | OAuth 2.0 | Client ID/Secret | N/A | Social login |
| Google OAuth | OAuth 2.0 | Client ID/Secret | N/A | Social login |

---

## Upgrade & Maintenance Notes

- **SDK Parity**: Backend API changes require Go SDK (`pkg/sdk/`) update first, then TS SDK (`lib/api/sdk.ts`)
- **Migration Discipline**: Backend migrations are hand-applied (no auto-migrator); test on staging before production
- **Provider Keys**: Stored encrypted in `provider_keys` table; **NEW**: Credential Vault (`pkg/llm/credentials` + `stores/`) provides AES-256-GCM encrypted keys with health tracking and rotation (migration 022)
- **Enterprise Packages**: 9 new packages (`credentials`, `virtualkeys`, `budget`, `audit`, `security`, `usage`, `loadbalancer`, `otel`, `ws`) + `stores/` layer. Dual repository pattern: legacy `internal/repository/` (user/auth/billing) + `pkg/llm/stores/` (enterprise concerns). All enterprise packages define `Store` interfaces for testability.
- **Vulnerability Scanning**: Run `npm audit` quarterly; `gosec ./...` for Go security issues
- **Dependency Pins**: Overrides in root `package.json` prevent drift; review on major version bumps
