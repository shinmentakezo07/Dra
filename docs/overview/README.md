# Yapapa (DRA Platform) — Project Overview

**Yapapa** is a **Universal LLM Gateway** — an OpenRouter-style platform that proxies AI requests to 100+ models across multiple providers. Built as a monorepo with two applications: a Next.js 16 frontend and a Go 1.25 backend.

- **License**: MIT
- **Package Manager**: npm 10 (workspaces via Turborepo)
- **Module Path (Go)**: `dra-platform/backend`

---

## Repository Structure

```
osiwa/
├── apps/
│   ├── web/             # Next.js 16 Frontend (App Router, React 19, Tailwind v4)
│   └── backend/         # Go 1.25 Backend (chi router, pgx, JWT, LLM pipeline)
├── scripts/
│   ├── dev.sh           # Full-stack one-command launcher
│   └── smoke-test.sh    # Post-change wiring verification
├── docs/                # Documentation (categorized)
├── packages/            # Reserved for shared packages (empty)
├── docker-compose.yml   # Postgres + web + backend orchestration
├── Dockerfile           # Frontend multi-stage build
├── turbo.json           # Monorepo task pipeline
└── package.json         # Workspace root
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| Unified AI Gateway | One endpoint for 100+ models across NVIDIA, OpenAI, Anthropic, Groq, Gemini |
| OpenAI-Compatible API | Drop-in `/v1/chat/completions`, `/v1/embeddings`, `/v1/models` proxy |
| Credit-Based Billing | Micro-cent pricing with Stripe integration, budget caps, transaction history |
| Real-Time Analytics | Dashboard with Recharts visualization, model breakdowns, time-range filtering |
| API Key Management | Full lifecycle (create, list, revoke, delete) with usage scoping |
| Neural Playground | Multi-model streaming chat with markdown, syntax highlighting, model comparison |
| Prompt Management | CRUD with template rendering and variable substitution |
| Webhook System | Event-driven outbound delivery with retry and delivery tracking |
| Organizations | Team workspaces with member invitations and role-based access |
| Conversations | Persistent chat history with message-level storage |
| Batch Processing | Async batch job submission and status tracking |
| File Uploads | File attachment support for prompts and requests |
| SSE Notifications | Real-time server-sent events for streaming updates |
| Admin Panel | Full user, provider, model, billing, security, and SSO management |
| Redis Caching | Optional Redis for LLM response caching, rate limiting, and distributed state |
| Prometheus Metrics | Exposed on separate port for monitoring infrastructure |

---

## Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React Framework (App Router, RSC) | 16.3.0-canary |
| React | UI Library | 19.2.5 |
| TypeScript | Type Safety | 5.9.3 |
| Tailwind CSS | Utility-first Styling | v4.2.2 |
| Framer Motion | Animations & Gestures | 12.38.0 |
| GSAP | Advanced Scroll Animations | 3.15.0 |
| Recharts | Data Visualization | 3.8.1 |
| NextAuth | Authentication | 5.0.0-beta |
| Drizzle ORM | Database ORM + Migrations | 0.45.2 |
| Zod | Schema Validation | v4 |
| AI SDK | AI/LLM Integration | 6.0.x |
| TanStack Query | Server State Management | 5.71.0 |
| Lucide React | Icon Library | 1.14.0 |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| Go | Runtime & Language | 1.25.0 |
| Chi Router | HTTP Router & Middleware | v5.2.5 |
| pgx | PostgreSQL Driver + Pool | v5.9.2 |
| golang-jwt | Token Authentication | v5.3.1 |
| Prometheus | Metrics Collection | client_golang |
| slog | Structured Logging | stdlib |
| go-redis | Redis Client | v9 |
| google/uuid | UUID Generation | v1.6 |
| stripe-go | Payment Processing | v76 |
| go-openai (sashabaranov) | Provider SDK | v1.41 |
| openai-go (official) | Official OpenAI SDK | v3.35 |
| anthropic-sdk-go | Official Anthropic SDK | v1.43 |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| PostgreSQL 16 | Primary Database |
| Neon | Serverless PostgreSQL |
| Redis | Optional caching + rate limiting |
| Docker | Containerization |
| Turborepo | Monorepo Task Runner |
| Railway | Deployment Platform |

---

## Root Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both apps in dev mode |
| `npm run build` | Production build (Turborepo) |
| `npm run lint` | Lint all packages |
| `npm run format` | Prettier format (TS/MD) |
| `npm run test` | All tests |
| `npm run test:web` | Frontend tests only |
| `npm run test:backend` | Backend tests only |

---

## Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | JWT signing secret (must match frontend & backend) |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Public base URL |
| `BACKEND_URL` | Go backend URL |
| At least one AI provider key | NVIDIA, OpenAI, Anthropic, Groq, or Gemini |
