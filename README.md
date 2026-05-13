<div align="center">

<!-- Animated Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:1e1b4b,100:312e81&height=280&section=header&text=YAPAPA&fontSize=90&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Universal%20LLM%20Gateway&descAlignY=55&descSize=24&descAlign=50" />

<br/>

<!-- Animated Typing Text -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=22&pause=1000&color=3B82F6&center=true&vCenter=true&width=600&lines=One+API+%F0%9F%94%90+100%2B+Models+%F0%9F%A4%96+Zero+Complexity+%E2%9A%A1;GPT-4+%C2%B7+Claude+%C2%B7+Gemini+%C2%B7+Llama+%C2%B7+Mistral+%C2%B7+Grok;Production-Grade+AI+Gateway+%F0%9F%9A%80;Next.js+16+%2B+Go+%2B+PostgreSQL" alt="Typing SVG" />
</a>

<br/><br/>

<!-- Premium Badges Row -->
[![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go%201.25-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)

<br/>

<!-- Status Badges -->
![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)
![Node](https://img.shields.io/badge/Node-20+-3b82f6?style=flat-square&logo=node.js)
![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat-square&logo=go)
![Tests](https://img.shields.io/badge/Tests-Vitest+Go%20Test-6d28d9?style=flat-square)
![Database](https://img.shields.io/badge/DB-PostgreSQL%2016-4169E1?style=flat-square&logo=postgresql)

<br/>

<!-- Quick Navigation -->
<p align="center">
  <a href="#-quick-start"><kbd> <br/>⚡ Quick Start<br/> </kbd></a>&nbsp;
  <a href="#-architecture"><kbd> <br/>🏗️ Architecture<br/> </kbd></a>&nbsp;
  <a href="#-features"><kbd> <br/>✨ Features<br/> </kbd></a>&nbsp;
  <a href="#-api-reference"><kbd> <br/>📡 API Reference<br/> </kbd></a>&nbsp;
  <a href="#-tech-stack"><kbd> <br/>🛠️ Tech Stack<br/> </kbd></a>&nbsp;
  <a href="#-deployment"><kbd> <br/>🐳 Deploy<br/> </kbd></a>
</p>

</div>

---

## ✨ What Makes Yapapa Special

<table>
<tr>
<td width="50%" valign="top">

### 🌐 Unified AI Gateway
**One endpoint for all models.** Switch between GPT-4, Claude-3, Gemini, Llama, Mistral, Grok, and 100+ others instantly — no code changes, no vendor lock-in. Includes an OpenAI-compatible `/v1/chat/completions` proxy for drop-in replacement of existing OpenAI integrations.

### 💳 Credit-Based Billing
**Pay per token, not per month.** Transparent micro-cent pricing with real-time balance tracking, budget caps, detailed transaction history, Stripe payment integration, and automatic cost deduction on every request. No subscriptions, no hidden fees.

### 📊 Real-Time Analytics
**Monitor everything.** Beautiful dashboards tracking requests, latency, costs, token usage, and model breakdowns with interactive Recharts visualizations. Time-range filtering (7d/30d/90d) and exportable reports.

</td>
<td width="50%" valign="top">

### 🧪 Neural Playground
**Compare models side-by-side.** Interactive streaming chat interface with multi-model selection, persistent chat history, markdown rendering, code syntax highlighting, and real-time response rendering. Test prompts across providers simultaneously.

### 🔐 Enterprise Security
**JWT + API Key dual auth.** Per-user rate limiting (sliding window + optional Redis), CORS protection, comprehensive request logging, admin controls with role-based access, bcrypt password hashing, and input validation. Session validation via NextAuth v5 with GitHub + Google OAuth.

### ⚡ Blazing Performance
**Go backend + Next.js frontend.** Sub-50ms API responses, connection-pooled PostgreSQL (pgx v5), intelligent response caching with semantic dedup, circuit breakers for provider fault isolation, Docker-optimized multi-stage builds, and Turborepo-powered monorepo task pipeline.

### 🔌 OpenAI-Compatible API
**Drop-in replacement for OpenAI SDKs.** Use any OpenAI client library against Yapapa's `/v1/chat/completions`, `/v1/embeddings`, and `/v1/models` endpoints. No SDK changes needed — just swap the base URL.

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           🌐 YAPAPA PLATFORM                                      │
├──────────────────────────────────┬───────────────────────────────────────────────┤
│      🎨 Next.js 16 (Frontend)    │          ⚙️ Go Backend (API)                  │
│  ┌────────────────────────────┐  │  ┌──────────────┐  ┌───────────────────┐     │
│  │  🏠 Landing Page           │  │  │  🔐 Auth     │  │  ⏱️ Rate Limit    │     │
│  │  🧪 AI Playground          │  │  │  JWT +       │  │  (Sliding Window) │     │
│  │  📊 Dashboard + Analytics  │◄─┼──┤  API Key     │  │  + Redis          │     │
│  │  🔑 API Key Manager        │  │  └──────┬───────┘  └───────────────────┘     │
│  │  💳 Billing & Credits      │  │         │                                    │
│  │  📋 Request Logs           │  │  ┌──────┴─────────────────────────┐          │
│  │  👤 User Settings          │  │  │      🌐 Chi Router (v5)        │          │
│  │  🏢 Organizations          │  │  └──┬──────┬──────┬──────┬───────┘          │
│  │  📡 Webhooks               │  │     │      │      │      │                  │
│  │  💬 Conversations          │  │  ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐           │
│  │  📁 Prompts & Files        │  │  │Auth │ │Keys │ │Chat │ │Orgs  │           │
│  └───────────┬────────────────┘  │  └─────┘ │Creds│ │(SSE)│ └──────┘           │
│              │                   │          │Logs │ └──┬──┘                    │
│              ▼                   │          └─────┘    │                       │
│   ┌────────────────────┐         │              ┌──────┴───────┐              │
│   │  🐘 PostgreSQL 16  │◄────────┼──────────────┤  🤖 LLM SDK  │              │
│   │  Drizzle ORM + pgx │         │              │  • Provider   │              │
│   └────────────────────┘         │              │  • Translator │              │
│                                  │              │  • Router     │              │
│                                  │              │  • Cache      │              │
│                                  │              │  • Guardrails │              │
│                                  │              │  • Circuit    │              │
│                                  │              │    Breaker    │              │
│                                  │              │  • Telemetry  │              │
│                                  │              └───────────────┘              │
│                                  │  ┌──────────────────────────────────┐      │
│                                  │  │  📤 Webhooks · 📡 SSE Events     │      │
│                                  │  │  📦 Batch Jobs · 📁 File Uploads │      │
│                                  │  │  📧 Email (SMTP) · 📊 Telemetry  │      │
│                                  │  └──────────────────────────────────┘      │
└──────────────────────────────────┴───────────────────────────────────────────┘
```

### Data Flow

```
User Request → Chi Router → Auth Middleware → Rate Limiter → CORS → Handler
                                                                  ↓
                          ┌─────────────────────┬─────────────────────┐
                          ▼                     ▼                     ▼
                     API Keys              Credits/Budget        Chat Proxy
                          ↓                     ↓                     ↓
                     PostgreSQL           PostgreSQL          LLM SDK Pipeline
                          ↓                     ↓                     ↓
                     Drizzle ORM         Stripe/Webhooks    Provider → Model → SSE
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose | Version |
|:-----------|:--------|:-------:|
| [Next.js](https://nextjs.org/) | React Framework (App Router, RSC, Server Actions) | 16.3.0-canary |
| [React](https://react.dev/) | UI Library | 19.2.5 |
| [TypeScript](https://www.typescriptlang.org/) | Type Safety | 5.9.3 |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first Styling | v4.2.2 |
| [Framer Motion](https://www.framer.com/motion/) | Animations & Gestures | 12.38.0 |
| [GSAP](https://greensock.com/gsap/) | Advanced Scroll Animations | 3.15.0 |
| [Recharts](https://recharts.org/) | Data Visualization | 3.8.1 |
| [NextAuth.js v5](https://authjs.dev/) | Authentication (Credentials + GitHub + Google OAuth) | 5.0.0-beta |
| [Drizzle ORM](https://orm.drizzle.team/) | Database ORM + Migrations | 0.45.2 |
| [Zod](https://zod.dev/) | Schema Validation | v4 |
| [AI SDK](https://sdk.vercel.ai/) | AI/LLM Integration | 6.0.x |
| [TanStack React Query](https://tanstack.com/query) | Server State Management | 5.71.0 |
| [Lucide React](https://lucide.dev/) | Icon Library | 1.14.0 |
| [CVA](https://cva.style/) | Component Variants | 0.7.1 |

### Backend

| Technology | Purpose | Version |
|:-----------|:--------|:-------:|
| [Go](https://go.dev/) | Runtime & Language | 1.25.0 |
| [Chi Router](https://github.com/go-chi/chi) | HTTP Router & Middleware | v5.2.5 |
| [pgx](https://github.com/jackc/pgx) | PostgreSQL Driver + Connection Pool | v5.9.2 |
| [JWT](https://github.com/golang-jwt/jwt) | Token Authentication | v5.3.1 |
| [bcrypt](https://golang.org/x/crypto) | Password Hashing | latest |
| [Prometheus](https://prometheus.io/) | Metrics Collection | client_golang |
| [Google UUID](https://github.com/google/uuid) | UUID Generation | v1.6.0 |
| [slog](https://pkg.go.dev/log/slog) | Structured Logging (stdlib) | built-in |
| [Staticcheck](https://staticcheck.io/) | Go Linter | latest |

### Infrastructure

| Technology | Purpose |
|:-----------|:--------|
| [PostgreSQL](https://www.postgresql.org/) | Primary Database |
| [Neon](https://neon.tech/) | Serverless PostgreSQL (optional) |
| [Redis](https://redis.io/) | Optional caching + rate limiting |
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Multi-service Orchestration |
| [Turborepo](https://turbo.build/) | Monorepo Task Runner |
| [Railway](https://railway.app/) | Deployment Platform |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Go](https://go.dev/dl/) 1.25+ (for backend development)
- [Docker](https://www.docker.com/) & Docker Compose (for PostgreSQL)

### 1. Clone & Install

```bash
git clone https://github.com/shinmentakezo07/owsiwa.git
cd osiwa
npm install
```

### 2. Environment Setup

```bash
# Copy environment templates
cp apps/web/.env.example apps/web/.env.local
cp apps/backend/.env.example apps/backend/.env
```

Generate secrets and configure API keys:

```bash
# Required secrets (generate with openssl)
openssl rand -base64 32  # AUTH_SECRET
openssl rand -base64 32  # NEXTAUTH_SECRET

# AI Provider Keys (at least one required for chat functionality)
OPENAI_API_KEY=sk-your-key-here
NVIDIA_API_KEY=nvapi-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROQ_API_KEY=gsk-your-key-here
GEMINI_API_KEY=your-key-here
```

### 3. Start PostgreSQL

```bash
docker-compose up -d postgres
```

### 4. Initialize Database

```bash
cd apps/web
npm run db:setup   # Pushes schema + seeds demo data
```

### 5. Run Development Servers

```bash
# From repository root — starts both frontend and backend concurrently
npm run dev
```

| Service | URL | Description |
|:--------|:----|:------------|
| 🌐 Web App | [http://localhost:3000](http://localhost:3000) | Next.js frontend |
| ⚙️ Backend API | [http://localhost:8080](http://localhost:8080) | Go API server |
| 📚 API Docs | [http://localhost:3000/docs](http://localhost:3000/docs) | Interactive documentation |
| 🧪 Playground | [http://localhost:3000/playground](http://localhost:3000/playground) | AI Playground |

> **Pro tip**: Use `bash scripts/dev.sh` for a full-stack one-command setup — installs deps, starts Postgres, pushes schema, seeds the DB, and starts both servers.

---

## 📁 Project Structure

```
osiwa/
├── 📦 apps/
│   ├── 🌐 web/                          # Next.js 16 Frontend
│   │   ├── 📂 app/                      # App Router (RSC + Client Components)
│   │   │   ├── 🏠 page.tsx              # Landing page (Hero + Features)
│   │   │   ├── 🧪 playground/           # AI Playground (multi-model chat)
│   │   │   ├── 📊 dashboard/            # Analytics, Keys, Logs, Billing
│   │   │   │   ├── page.tsx             # Dashboard overview
│   │   │   │   ├── analytics/           # Usage charts & model breakdown
│   │   │   │   ├── keys/                # API key management
│   │   │   │   ├── logs/                # Request audit trail
│   │   │   │   └── settings/            # User profile settings
│   │   │   ├── 🌐 gateway/              # AI Gateway interface
│   │   │   ├── 💰 pricing/              # Credit plans & billing
│   │   │   ├── 🔐 login/                # Authentication pages
│   │   │   ├── 📝 signup/               # Registration
│   │   │   ├── 🔑 forgot-password/      # Password recovery
│   │   │   ├── 📚 docs/                 # API documentation
│   │   │   ├── 📁 admin/                # Admin panel
│   │   │   ├── 📁 models/               # Model browser
│   │   │   ├── 📁 api/                  # Next.js API routes & Server Actions
│   │   │   ├── 🛑 error.tsx             # Global error boundary
│   │   │   ├── 👻 not-found.tsx         # 404 page
│   │   │   ├── 🎨 globals.css           # Global styles + animations + Tailwind
│   │   │   ├── 📐 layout.tsx            # Root layout
│   │   │   └── 🔧 providers.tsx         # React Query + Session providers
│   │   ├── 🗄️ db/
│   │   │   ├── schema.ts                # Drizzle ORM schema definition
│   │   │   ├── index.ts                 # Database connection (Neon/pg)
│   │   │   └── seed.ts                  # Demo data seeder
│   │   ├── 🧩 components/               # Shared & feature UI components
│   │   │   ├── ui/                      # Primitives (Button, Input, Modal, Card)
│   │   │   ├── dashboard/               # Dashboard-specific components
│   │   │   └── playground/              # Playground-specific components
│   │   ├── 🔧 lib/
│   │   │   ├── api/
│   │   │   │   ├── sdk.ts               # TypeScript SDK (DraSDK — full CRUD)
│   │   │   │   ├── admin-sdk.ts         # Admin SDK extensions
│   │   │   │   ├── errors.ts            # Typed error handling
│   │   │   │   ├── hooks.ts             # React Query hooks
│   │   │   │   ├── types.ts             # Shared TypeScript types
│   │   │   │   ├── proxy.ts             # Server-side proxy to Go backend
│   │   │   │   ├── key-auth.ts          # API key auth utilities
│   │   │   │   ├── rate-limit.ts        # Client-side rate limiting
│   │   │   │   ├── require-auth.ts      # Auth guard utilities
│   │   │   │   └── index.ts             # Public API barrel
│   │   │   └── utils.ts                 # Utility functions (cn, etc.)
│   │   ├── 🔐 auth.ts                   # NextAuth v5 configuration
│   │   ├── 🔐 auth.config.ts            # Auth config (providers, callbacks)
│   │   ├── 🪞 proxy.ts                  # NextAuth middleware + route protection
│   │   └── 🧪 tests/                    # Vitest test suite
│   │       ├── wiring-verification.test.ts  # Enforces no mock data in dashboard
│   │       └── lib/api/                 # SDK + error tests
│   │
│   └── ⚙️ backend/                      # Go Backend Service
│       ├── 🚀 cmd/api/                  # Application entrypoint
│       │   └── main.go                  # Server bootstrap & middleware stack
│       ├── 🧠 internal/
│       │   ├── config/                  # Environment configuration loader
│       │   ├── db/                      # PostgreSQL connection pool (pgx)
│       │   ├── domain/                  # Domain models & custom errors
│       │   ├── handler/                 # 21 HTTP route handlers (chi)
│       │   ├── middleware/              # Auth, rate limit, CORS, logging, tracing, metrics
│       │   ├── repository/              # Data access layer (raw SQL, parameterized)
│       │   ├── service/                 # 15 business logic services
│       │   ├── redis/                   # Optional Redis client
│       │   └── pkg/                     # Shared internal packages
│       │       ├── logger/              # Structured logging (slog)
│       │       ├── response/            # Standardized HTTP response helpers
│       │       └── token/               # JWT generation & validation
│       ├── 📦 pkg/
│       │   ├── sdk/                     # Go SDK client for external consumers
│       │   ├── llm/                     # LLM SDK (16 subpackages)
│       │   │   ├── sdk.go               # High-level facade
│       │   │   ├── provider/            # Provider registry (OpenAI, Anthropic, Generic)
│       │   │   ├── translator/          # Format translation (Anthropic ↔ OpenAI)
│       │   │   ├── pipeline/            # Request/response middleware pipeline
│       │   │   ├── router/              # Model-to-provider routing
│       │   │   ├── cache/               # Response caching (TTL + semantic dedup)
│       │   │   ├── guardrails/          # Input/output guardrail checks
│       │   │   ├── moderation/          # Content moderation filtering
│       │   │   ├── validator/           # Request validation
│       │   │   ├── watcher/             # Error watching & retry logic
│       │   │   ├── circuitbreaker/      # Provider fault isolation
│       │   │   ├── telemetry/           # OpenTelemetry-style spans
│       │   │   ├── tokens/              # Token counting & limits
│       │   │   ├── context/             # Context window management
│       │   │   ├── embeddings/          # Embedding generation
│       │   │   ├── batch/               # Batch request processing
│       │   │   ├── tools/               # Tool/function calling definitions
│       │   │   └── openai/              # OpenAI-compatible request building
│       │   ├── webhook/                 # Outbound webhook delivery with retry
│       │   ├── email/                   # SMTP email sender
│       │   ├── trace/                   # Distributed tracing
│       │   └── llmsdk/                  # (legacy) LLM SDK wrapper
│       ├── 📂 migrations/               # 7 raw SQL migrations (hand-applied)
│       ├── 🧪 tests/                    # Integration tests
│       ├── 📋 Makefile                  # Build, test, lint, coverage targets
│       └── 🐋 Dockerfile                # Backend production build
│
├── 🐳 docker-compose.yml                # Full stack (Postgres + Frontend + Backend)
├── 🐋 Dockerfile                        # Frontend production build
├── ⚡ turbo.json                        # Monorepo task pipeline config
├── 📦 package.json                      # Workspace root
├── 📜 AGENTS.md                         # Agent guide (architecture, endpoints, quirks)
├── 📜 CLAUDE.md                         # Claude Code instructions
└── 📂 docs/                             # Implementation guides & docs
```

---

## 📡 API Reference

### 🔓 Public Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/health` | Backend health check |
| `GET` | `/health/providers` | LLM provider health summary |
| `GET` | `/api/models` | List available AI models |
| `GET` | `/v1/models` | OpenAI-compatible model list |

### 🔐 Authenticated Endpoints (JWT Cookie, `Authorization` header, or `x-api-key`)

#### Auth

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/auth/signup` | User registration |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/profile` | Update user profile |
| `PUT` | `/api/auth/password` | Change password |

#### Chat & AI

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/chat` | Stream AI completions (SSE) |
| `POST` | `/api/embeddings` | Generate embeddings |
| `POST` | `/v1/chat/completions` | OpenAI-compatible streaming proxy |
| `POST` | `/v1/embeddings` | OpenAI-compatible embeddings |
| `POST` | `/api/validate` | Validate structured output |

#### API Keys

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/keys` | List API keys |
| `POST` | `/api/keys` | Create new API key |
| `DELETE` | `/api/keys/:id` | Delete API key |
| `POST` | `/api/keys/:id/revoke` | Revoke API key |

#### Credits & Billing

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/credits` | Get credit balance |
| `POST` | `/api/credits/purchase` | Purchase credits |
| `GET` | `/api/credits/budget` | Get budget settings |
| `PUT` | `/api/credits/budget` | Set budget limits |
| `GET` | `/api/transactions` | Transaction history |
| `POST` | `/webhooks/stripe` | Stripe webhook (public, signature-verified) |

#### Conversations

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id` | Get conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation |
| `POST` | `/api/conversations/:id/messages` | Add message to conversation |

#### Prompts

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/prompts` | List prompts |
| `POST` | `/api/prompts` | Create prompt |
| `GET` | `/api/prompts/:name` | Get prompt by name |
| `POST` | `/api/prompts/:name/render` | Render prompt template |
| `DELETE` | `/api/prompts/:name` | Delete prompt |

#### Webhooks

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |
| `GET` | `/api/webhooks/:id` | Get webhook |
| `PUT` | `/api/webhooks/:id` | Update webhook |
| `DELETE` | `/api/webhooks/:id` | Delete webhook |

#### Organizations

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/organizations` | List organizations |
| `POST` | `/api/organizations` | Create organization |
| `GET` | `/api/organizations/:id` | Get organization |
| `POST` | `/api/organizations/:id/invite` | Invite member |
| `DELETE` | `/api/organizations/:id/members/:userId` | Remove member |
| `GET` | `/api/organizations/:id/members` | List members |
| `POST` | `/api/invites/accept` | Accept invitation |

#### Usage & Logs

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/logs` | Request logs (paginated) |
| `GET` | `/api/analytics` | Usage analytics |

#### Batch & Files

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/batch` | Submit batch chat job |
| `GET` | `/api/batch/:id` | Get batch job status |
| `POST` | `/api/files/upload` | Upload file |
| `GET` | `/api/files` | List files |

#### Real-Time

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/notifications/stream` | SSE notification stream |

### 👑 Admin Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/admin/users` | List all users |
| `DELETE` | `/api/admin/users/:id` | Delete user account |
| `GET` | `/api/admin/stats` | Platform statistics |
| `GET` | `/api/admin/circuit-breakers` | Circuit breaker status |
| `GET` | `/api/admin/provider-health` | Provider health |
| `GET` | `/api/admin/settings` | Admin settings |

### Example: Streaming Chat (cURL)

```bash
curl -N http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=..." \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Example: Using the TypeScript SDK

```typescript
import { getSDK, configureSDK } from "@/lib/api/sdk";

// Configure once
configureSDK({ baseUrl: "http://localhost:8080" });

// Stream chat completions
const stream = getSDK().chatStream({
  model: "claude-opus-4",
  messages: [{ role: "user", content: "Explain quantum computing in simple terms" }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Example: OpenAI-Compatible API (Drop-In Replacement)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://yapa.up.railway.app/v1",  # or http://localhost:8080/v1
    api_key="your-yapapa-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

### Example: Using API Key Authentication

```bash
curl http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "model": "llama-3-70b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🗄️ Database Schema

```sql
-- Users (with role-based access)
users (id, name, email, password, role, created_at)

-- API Keys
api_keys (id, user_id, name, key, last_used, created_at, revoked_at)

-- API Request Logs (detailed audit trail)
api_logs (
  id, user_id, api_key_id, model, provider,
  input_tokens, output_tokens, cost, latency,
  status, error_message, created_at
)

-- User Credits with Stripe integration
user_credits (id, user_id, balance, total_purchased, total_spent, budget_limit, updated_at)

-- Credit Transactions (with Stripe payment reference)
credit_transactions (
  id, user_id, amount, type, description,
  related_log_id, stripe_payment_id, created_at
)

-- Organizations / Team Workspaces
organizations (id, name, owner_id, created_at)
organization_members (org_id, user_id, role, joined_at)

-- Conversations & Prompt History
conversations (id, user_id, title, model, created_at, updated_at)
messages (id, conversation_id, role, content, tokens, created_at)

-- Webhook Configuration
webhooks (id, user_id, url, events, secret, active, created_at)
webhook_deliveries (id, webhook_id, event, payload, status, response_code, next_retry_at)

-- File Uploads
files (id, user_id, name, mime_type, size, storage_path, created_at)

-- Password Reset Tokens
password_resets (id, email, token, expires_at, used_at, created_at)
```

### Performance Indexes

All tables include optimized indexes for production performance:

| Index | Table | Columns |
|:------|:------|:--------|
| `api_keys_user_id_idx` | `api_keys` | `user_id` |
| `api_logs_user_id_idx` | `api_logs` | `user_id` |
| `api_logs_created_at_idx` | `api_logs` | `created_at` |
| `api_logs_model_idx` | `api_logs` | `model` |
| `user_credits_user_id_idx` | `user_credits` | `user_id` |
| `credit_transactions_user_id_idx` | `credit_transactions` | `user_id` |
| `credit_transactions_created_at_idx` | `credit_transactions` | `created_at` |

---

## 🧪 Available Scripts

### Root Workspace

```bash
npm run dev           # Start all services in dev mode (Turborepo)
npm run build         # Production build for all apps
npm run lint          # Lint all packages
npm run format        # Prettier format all files
npm run test          # Run all tests via turbo
npm run test:web      # Frontend tests only (Vitest)
npm run test:backend  # Backend tests only (Go test)
```

### apps/web (Frontend)

```bash
npm run dev           # Start Next.js dev server (port 3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint check
npm run test          # Run Vitest test suite
npm run test:watch    # Run Vitest in watch mode
npm run db:push       # Push Drizzle schema to database
npm run db:seed       # Seed demo data
npm run db:setup      # Push schema + seed (one command)
```

### apps/backend (Go API)

```bash
make build            # go build -o api ./cmd/api
make dev              # go run ./cmd/api
make run              # Build + run binary
make test             # go test -race -cover ./...
make test-race        # go test -race -v ./...
make test-unit        # go test -v -short ./... (skips integration)
make test-integration # Needs TEST_DATABASE_URL set
make test-coverage    # Coverage report (text + HTML)
make coverage-html    # Generate coverage.html
make vet              # go vet ./...
make lint             # vet + staticcheck
make fmt              # gofmt + goimports
make clean            # rm api coverage.out coverage.html
make docker           # docker build -t dra-backend
```

### Full-Stack Scripts

```bash
bash scripts/dev.sh         # Full stack: deps → Postgres → schema → seed → servers
bash scripts/smoke-test.sh  # Post-change wiring verification
```

---

## 🐳 Deployment

### Docker Compose (Full Stack — Recommended)

```bash
# Production deployment with one command
docker-compose up -d
```

This deploys the complete stack:
- 🐘 **PostgreSQL 16** — Persistent volume, health check
- 🌐 **Next.js Frontend** — Port 3000, production build
- ⚙️ **Go Backend** — Port 8080, with all middleware

### Manual Docker Build

```bash
# Frontend (from repo root)
docker build -t dra-web .
docker run -p 3000:3000 --env-file apps/web/.env.local dra-web

# Backend (from apps/backend)
cd apps/backend
docker build -t dra-backend .
docker run -p 8080:8080 --env-file .env dra-backend
```

### Railway Deployment

The platform is deployable to [Railway](https://railway.app/):

```bash
# Backend
railway up --service backend --deploy

# Frontend
railway up --service web --deploy
```

The API is accessible at your Railway URL (e.g., `https://yapa.up.railway.app`). Use the OpenAI-compatible endpoint:

```
https://yapa.up.railway.app/v1/chat/completions
```

### Environment Variables

| Variable | Required | Description | Example |
|:---------|:--------:|:------------|:--------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgres://dra:dra_secret@localhost:5432/dra_platform` |
| `AUTH_SECRET` | ✅ | JWT signing secret (generate with `openssl rand -base64 32`) | — |
| `NEXTAUTH_SECRET` | ✅ | NextAuth session secret | — |
| `NEXTAUTH_URL` | ✅ | Public base URL | `http://localhost:3000` |
| `BACKEND_URL` | ✅ | Go backend URL | `http://localhost:8080` |
| `OPENAI_API_KEY` | ❌ | OpenAI API key | `sk-...` |
| `NVIDIA_API_KEY` | ❌ | NVIDIA NIM API key | `nvapi-...` |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API key | `sk-ant-...` |
| `GROQ_API_KEY` | ❌ | Groq API key | `gsk-...` |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key | — |
| `RATE_LIMIT_RPM` | ❌ | Rate limit (requests per minute) | `60` |
| `STRIPE_SECRET_KEY` | ❌ | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Stripe webhook signing secret | `whsec_...` |
| `SMTP_HOST` | ❌ | SMTP server host | `smtp.sendgrid.net` |
| `SMTP_USER` | ❌ | SMTP username | `apikey` |
| `SMTP_PASS` | ❌ | SMTP password | — |
| `REDIS_URL` | ❌ | Redis connection (for caching + rate limiting) | `redis://localhost:6379` |

---

## 🧠 Best Practices

### Development Workflow

- **Branch naming**: `feature/description`, `fix/description`, `refactor/description`
- **Commit style**: Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
- **Always run**: `make vet` + `make test` for backend, `npm run lint` + `npm run test` for frontend before committing
- **No `as any` or `@ts-ignore`** in TypeScript — type properly or refactor
- **No mock data** in dashboard components — all data comes from the SDK (`getSDK()`)
- **Dual SDK sync**: When adding endpoints, update Go backend → Go SDK (`pkg/sdk/`) → TypeScript SDK (`lib/api/sdk.ts`)

### Architecture Rules

- **Keep layers pure**: Handler → parse request/call service → write response. Service → business logic only (no `net/http`). Repository → data access only (raw SQL, all parameterized).
- **Provider registration**: New LLM backends must register in BOTH `internal/provider/` (legacy) and `pkg/llm/provider/` (canonical).
- **Sandbox mode**: Use `X-Sandbox: true` header for testing — skips quota, cost tracking, and logging.
- **Migrations**: Hand-applied SQL only (no auto-migrator). Apply in order, one-time.

---

## 🗺️ Roadmap

| Status | Feature | Description |
|:------:|:--------|:------------|
| ✅ | Multi-provider AI gateway | OpenAI, Anthropic, NVIDIA NIM, Groq, Gemini — 100+ models |
| ✅ | OpenAI-compatible API | Drop-in `/v1/chat/completions`, `/v1/embeddings`, `/v1/models` |
| ✅ | Credit-based billing | Micro-cent pricing, balance tracking, Stripe payments |
| ✅ | Real-time analytics | Usage charts, model breakdown, cost tracking |
| ✅ | API key lifecycle | Create, revoke, track usage per key |
| ✅ | Neural Playground | Multi-model chat comparison with streaming |
| ✅ | Prompt management | Create, version, render prompt templates |
| ✅ | Webhook system | Event-driven outbound webhooks with retry |
| ✅ | Organization workspaces | Multi-user teams with role-based membership |
| ✅ | Conversations & history | Persistent chat history with message management |
| ✅ | Batch processing | Async batch job submission and status tracking |
| ✅ | File uploads | File storage for prompt attachments |
| ✅ | SSE notifications | Real-time server-sent events |
| ✅ | LLM pipeline | Provider registry, router, translator, cache, guardrails, moderation, telemetry, circuit breakers |
| ✅ | Admin management | User listing, stats, provider health, settings |
| ⏳ | Fine-grained RBAC | Role-based permissions beyond admin/user |
| ⏳ | Usage alerts & budget caps | Email/Slack alerts for spending thresholds |
| ⏳ | Model fine-tuning interface | UI for custom model training |
| ⏳ | Custom provider plugins | Plugin system for adding new AI providers |
| ⏳ | Usage exports | CSV/PDF export of analytics and billing data |

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style (Prettier + ESLint for frontend, `gofmt` + `staticcheck` for backend)
- Write tests for new features (Vitest for frontend, `go test -race` for backend)
- Update both SDKs (Go + TypeScript) for API changes
- Ensure `npm run build` + `make test` pass before submitting PR
- Never use `as any` or `@ts-ignore` — maintain strict TypeScript coverage

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [Shinmen007](https://github.com/Shinmen007)**

<br/>

<p align="center">
  <a href="https://github.com/shinmentakezo07/owsiwa/stargazers">⭐ Star this repo</a> •
  <a href="https://github.com/shinmentakezo07/owsiwa/issues">🐛 Report Bug</a> •
  <a href="https://github.com/shinmentakezo07/owsiwa/issues">💡 Request Feature</a>
</p>

<br/>

<!-- Footer Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:312e81,50:1e1b4b,100:0f172a&height=120&section=footer&text=&fontSize=0" />

</div>
