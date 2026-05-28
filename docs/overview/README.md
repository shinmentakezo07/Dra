# Yapapa (DRA Platform) — Project Overview

**Yapapa** is a **Universal LLM Gateway** — an OpenRouter-style platform that proxies AI requests to 100+ models across multiple providers. Built as a monorepo with two applications: a Next.js 16 frontend and a Go 1.25 backend.

- **License**: MIT
- **Package Manager**: npm 10 (workspaces via Turborepo)
- **Module Path (Go)**: `dra-platform/backend`
- **Deployment**: Railway (production), Docker Compose (local)

---

## Repository Structure

```
shinway/
├── apps/
│   ├── web/                  # Next.js 16 Frontend (~65 API routes, 30+ pages)
│   │   ├── app/              # App Router pages & API routes
│   │   ├── components/       # UI components (~40 files)
│   │   ├── lib/              # SDK, hooks, utilities (~15 files)
│   │   ├── db/               # Drizzle schema, seed, migrations
│   │   └── tests/            # Vitest + Playwright tests
│   └── backend/              # Go 1.25 Backend (~100+ API endpoints)
│       ├── cmd/api/          # Entry point, routes, DI wiring
│       ├── internal/         # Handler, service, repository, middleware, domain
│       └── pkg/              # LLM pipeline, SDK, email, shared packages
├── scripts/
│   ├── dev.sh                # Full-stack one-command launcher
│   └── smoke-test.sh         # Post-change wiring verification
├── docs/                     # Documentation (categorized, ~30+ files)
├── packages/                 # Reserved for shared packages (empty)
├── docker-compose.yml        # Postgres + web + backend orchestration
├── Dockerfile                # Frontend multi-stage build
├── turbo.json                # Monorepo task pipeline
└── package.json              # Workspace root
```

---

## Key Features

| Feature                  | Description                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Unified AI Gateway       | One endpoint for 100+ models across NVIDIA, OpenAI, Anthropic, Groq, Gemini, Yapa, Shinway |
| OpenAI-Compatible API    | Drop-in `/v1/chat/completions`, `/v1/embeddings`, `/v1/models` proxy                       |
| Anthropic-Compatible API | `/v1/messages` endpoint with format translation                                            |
| Credit-Based Billing     | Micro-cent pricing with Stripe integration, budget caps, transaction history               |
| Real-Time Analytics      | Dashboard with Recharts visualization, model breakdowns, time-range filtering              |
| API Key Management       | Full lifecycle (create, list, revoke, delete) with HMAC-hashed storage                     |
| Neural Playground        | Multi-model streaming chat with markdown, syntax highlighting, model comparison            |
| Prompt Management        | CRUD with Go template rendering and variable substitution                                  |
| Webhook System           | Event-driven outbound delivery with retry, DLQ, and delivery tracking                      |
| Organizations            | Team workspaces with member invitations, roles, and shared billing                         |
| Conversations            | Persistent chat history with message-level storage                                         |
| Batch Processing         | Async batch job submission with progress tracking                                          |
| File Uploads             | Multipart file attachment support                                                          |
| SSE Notifications        | Real-time server-sent events for streaming updates, alerts                                 |
| Admin Panel              | Full user, provider, model, billing, security, SSO, audit management                       |
| LLM Routing              | 5 strategies: cost, latency, reliability, capability, random                               |
| Circuit Breaker          | Automatic provider fault isolation with half-open recovery                                 |
| Caching                  | 4 cache types: TTL, semantic (cosine similarity), dedup, Redis                             |
| Guardrails               | Content filtering, PII detection, prompt injection prevention                              |
| Multi-Key Rotation       | Round-robin across primary + secondary API keys per provider                               |
| Prometheus Metrics       | Exposed on separate port for monitoring infrastructure                                     |
| RBAC                     | Role-based access control with fine-grained permissions                                    |

---

## Tech Stack

### Frontend

| Technology      | Purpose                           | Version       |
| --------------- | --------------------------------- | ------------- |
| Next.js         | React Framework (App Router, RSC) | 16.3.0-canary |
| React           | UI Library                        | 19.2.5        |
| TypeScript      | Type Safety                       | 5.9.3         |
| Tailwind CSS    | Utility-first Styling             | v4.2.2        |
| Framer Motion   | Animations & Gestures             | 12.38.0       |
| GSAP            | Advanced Scroll Animations        | 3.15.0        |
| Recharts        | Data Visualization                | 3.8.1         |
| NextAuth        | Authentication                    | 5.0.0-beta    |
| Drizzle ORM     | Database ORM + Migrations         | 0.45.2        |
| Zod             | Schema Validation                 | v4            |
| AI SDK          | AI/LLM Integration                | 6.0.x         |
| TanStack Query  | Server State Management           | 5.71.0        |
| React Hook Form | Form Management                   | 7.74.0        |
| Lucide React    | Icon Library                      | 1.14.0        |
| Monaco Editor   | Code Editing                      | 4.7.0         |
| Mermaid         | Diagram Rendering                 | 11.14.0       |
| Xterm           | Terminal Emulator                 | 5.5.0         |

### Backend

| Technology               | Purpose                  | Version       |
| ------------------------ | ------------------------ | ------------- |
| Go                       | Runtime & Language       | 1.25.0        |
| Chi Router               | HTTP Router & Middleware | v5.2.5        |
| pgx                      | PostgreSQL Driver + Pool | v5.9.2        |
| golang-jwt               | Token Authentication     | v5.3.1        |
| Prometheus               | Metrics Collection       | client_golang |
| slog                     | Structured Logging       | stdlib        |
| go-redis                 | Redis Client             | v9            |
| google/uuid              | UUID Generation          | v1.6          |
| stripe-go                | Payment Processing       | v76           |
| go-openai (sashabaranov) | Provider SDK             | v1.41         |
| openai-go (official)     | Official OpenAI SDK      | v3.35         |
| anthropic-sdk-go         | Official Anthropic SDK   | v1.43         |

### Infrastructure

| Technology    | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| PostgreSQL 16 | Primary Database                                     |
| Neon          | Serverless PostgreSQL (cloud)                        |
| Redis         | Optional caching + rate limiting + distributed state |
| Docker        | Containerization & local dev                         |
| Turborepo     | Monorepo Task Runner                                 |
| Railway       | Deployment Platform (production)                     |

---

## Architecture Overview

### System Flow

```
User/Browser
    │
    ├── Next.js Frontend (apps/web) :3000
    │   ├── Server Components (auth check, metadata)
    │   ├── Client Components (interactive UI)
    │   ├── API Proxy Routes (proxyToBackend)
    │   └── NextAuth (session management)
    │
    └── Go Backend (apps/backend) :8080
        ├── Chi Router (100+ routes)
        ├── Middleware Chain (10 layers)
        ├── Handler Layer (HTTP concerns)
        ├── Service Layer (business logic)
        ├── Repository Layer (data access)
        ├── LLM Pipeline (10 stages)
        └── Database (PostgreSQL / Neon)
```

### Frontend Data Flow

```
Page (Server Component)
    │
    ├── export metadata (SEO)
    ├── auth check (session)
    └── Client Component
        ├── SDK (lib/api/sdk.ts) ── HTTP ──► Go Backend
        ├── React Query Hooks (lib/api/hooks.ts)
        ├── SSE Streams (chat, notifications)
        └── Local State (useState, useReducer)
```

### Backend Request Lifecycle

```
HTTP Request
    │
    ├── Global Middleware (9 layers)
    │   ├── Recoverer / RequestID / RealIP
    │   ├── Timeout / BodyLimit
    │   ├── Request Logger / Metrics
    │   ├── CORS / Rate Limiter
    │   └── Auth / Quota (per-route)
    │
    ├── Handler
    │   └── Parse Request → Validate → Call Service → Write Response
    │
    ├── Service (business logic layer)
    │   └── Orchestrate → Call Repositories → Return Result/Error
    │
    ├── Repository (data access layer)
    │   └── SQL Queries → pgx Pool → Cache Layer
    │
    └── Response
        └── Consistent JSON Envelope { success, data, error, meta }
```

### LLM Request Pipeline (10 stages)

```
Chat Request → Validator → Router → Cache → Guardrails → Moderation
    → Translator → Provider → Telemetry → CircuitBreaker → Watcher → Response
```

---

## Page Inventory

### Public Pages (10 routes)

- `/` — Landing page with hero, features, CTA
- `/playground` — Multi-model chat playground
- `/gateway` — AI Gateway overview dashboard
- `/pricing` — Pricing plans, cost calculator
- `/models` — Model explorer
- `/models/[id]` — Model detail with architecture, performance, pricing panels
- `/docs/*` — 17 documentation subpages
- `/login`, `/signup`, `/forgot-password` — Auth pages

### Dashboard Pages (15 routes)

- `/dashboard` — Overview with metrics, charts, activity feed
- `/dashboard/analytics` — Usage analytics with 5 chart types
- `/dashboard/keys` — API key management (create, list, revoke)
- `/dashboard/logs` — Request logs with search, filter, detail drawer
- `/dashboard/billing` — Credit packages, Stripe checkout, promos
- `/dashboard/chat` — In-dashboard chat with ambient background
- `/dashboard/settings` — Profile, password, budget settings
- `/dashboard/organization` — Organization management, member invites
- `/dashboard/webhooks` — Webhook CRUD with event selection
- `/dashboard/inbox` — System messages with priority system
- `/dashboard/notifications` — Real-time SSE notification stream
- `/dashboard/battle` — Model comparison with parallel streaming
- `/dashboard/fine-tuning` — Fine-tuning job management
- `/dashboard/provider-health` — Provider health monitoring
- `/dashboard/exports` — Data export jobs (logs, usage, audit)

### Admin Pages (18+ routes)

- `/admin/login` — Admin authentication
- `/admin/dashboard` — Admin overview with stats
- `/admin/users` — User management (search, suspend, delete)
- `/admin/providers` — Provider CRUD, multi-key management
- `/admin/models` — Model registry, aliases
- `/admin/billing` — Revenue summary, credit adjustments
- `/admin/settings` — System settings, feature flags
- `/admin/security` — Suspicious activity monitoring
- `/admin/audit` — Audit log viewer
- `/admin/logs` — Transaction logs
- `/admin/operations` — Operations dashboard
- `/admin/admins` — Admin user management
- `/admin/announcements` — Platform announcements
- `/admin/changelog` — Changelog management
- `/admin/cost` — Cost intelligence dashboard
- `/admin/promos` — Promo code management
- `/admin/reports` — Scheduled reports
- `/admin/sso` — SSO configuration
- `/admin/ip` — IP allow/block list management

---

## Environment Variables (Required)

| Variable                     | Description                                        | Required            |
| ---------------------------- | -------------------------------------------------- | ------------------- |
| `DATABASE_URL`               | PostgreSQL connection string                       | Yes (postgres/neon) |
| `AUTH_SECRET`                | JWT signing secret (must match frontend & backend) | Yes                 |
| `NEXTAUTH_SECRET`            | NextAuth session secret                            | Yes                 |
| `NEXTAUTH_URL`               | Public base URL                                    | Yes                 |
| `BACKEND_URL`                | Go backend URL                                     | Yes                 |
| At least one AI provider key | NVIDIA, OpenAI, Anthropic, Groq, or Gemini         | Recommended         |

See `docs/backend/CONFIG.md` for the complete environment variable reference.

---

## Version History

| Date       | Change                                                 |
| ---------- | ------------------------------------------------------ |
| 2026-05-17 | API key HMAC hashing, caching layer, admin tests added |
| 2026-05-16 | Admin panel implementation (22+ pages, 100+ endpoints) |
| 2026-05-15 | Legacy provider consolidation, SDK verification        |
| 2026-05-14 | Docs redesign, model detail page redesign              |
| 2026-05-13 | Dashboard redesign, docs restructure                   |
| 2026-05-12 | Admin panel plan, docs superpower plans                |
