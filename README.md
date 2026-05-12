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
![Tests](https://img.shields.io/badge/Tests-Vitest-6d28d9?style=flat-square&logo=vitest)
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
**One endpoint for all models.** Switch between GPT-4, Claude-3, Gemini, Llama, Mistral, Grok, and 100+ others instantly — no code changes, no vendor lock-in. Our intelligent translator automatically converts between OpenAI, Anthropic, and generic formats.

### 💳 Credit-Based Billing
**Pay per token, not per month.** Transparent micro-cent pricing with real-time balance tracking, detailed transaction history, and automatic cost deduction on every request. No subscriptions, no hidden fees.

### 📊 Real-Time Analytics
**Monitor everything.** Beautiful dashboards tracking requests, latency, costs, token usage, and model breakdowns with interactive Recharts visualizations. Time-range filtering (7d/30d/90d) and exportable reports.

</td>
<td width="50%" valign="top">

### 🧪 Neural Playground
**Compare models side-by-side.** Interactive streaming chat interface with multi-model selection, persistent chat history, markdown rendering, code syntax highlighting, and real-time response rendering. Test prompts across providers simultaneously.

### 🔐 Enterprise Security
**JWT + API Key dual auth.** Per-user rate limiting (sliding window), CORS protection, comprehensive request logging, admin controls with role-based access, and bcrypt password hashing. Session validation via NextAuth v5.

### ⚡ Blazing Performance
**Go backend + Next.js frontend.** Sub-50ms API responses, connection-pooled PostgreSQL (pgx), intelligent response caching, Docker-optimized multi-stage builds, and Turborepo-powered monorepo task pipeline.

</td>
</tr>
</table>

---

## 🎬 Live Preview

<div align="center">

| 🏠 Landing Page | 🧪 AI Playground | 📊 Analytics Dashboard |
|:---:|:---:|:---:|
| *Cyberpunk hero with interactive terminal* | *Multi-model chat comparison* | *Real-time metrics & insights* |

<br/>

> 🎨 **Design Philosophy**: Dark-themed cyberpunk UI with glassmorphism effects, Framer Motion micro-interactions, GSAP scroll-triggered animations, and Tailwind CSS v4 utility-first styling. Lucide icons throughout.

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           🌐 YAPAPA PLATFORM                                 │
├─────────────────────────────────┬───────────────────────────────────────────┤
│      🎨 Next.js 16 (Frontend)   │         ⚙️ Go Backend (API)               │
│  ┌───────────────────────────┐  │  ┌─────────────┐  ┌──────────────────┐   │
│  │  🏠 Landing Page          │  │  │  🔐 Auth    │  │  ⏱️ Rate Limit   │   │
│  │  🧪 AI Playground         │◄─┼──┤  JWT +      │  │  (Sliding Window)│   │
│  │  📊 Dashboard             │  │  │  API Key    │  └──────────────────┘   │
│  │  🔑 API Key Manager       │  │  └──────┬──────┘                         │
│  │  💳 Billing & Credits     │  │         │                                │
│  │  📋 Request Logs          │  │  ┌──────┴──────────────────────┐         │
│  │  👤 User Settings         │  │  │      🌐 Chi Router          │         │
│  └───────────┬───────────────┘  │  └──────┬──────────────┬───────┘         │
│              │                   │         │              │                 │
│              ▼                   │  ┌──────┴───┐   ┌──────┴───┐             │
│   ┌─────────────────────┐        │  │ API Keys │   │ 💬 Chat  │             │
│   │  🐘 PostgreSQL 16   │◄───────┼──│ Credits  │   │ Proxy    │             │
│   │  Drizzle ORM + pgx  │        │  │ Logs     │   │ (SSE)    │             │
│   └─────────────────────┘        │  └──────────┘   └──────────┘             │
│                                  │  ┌──────────────────────────┐             │
│                                  │  │  🤖 LLM SDK (Go)         │             │
│                                  │  │  • Multi-provider        │             │
│                                  │  │  • Format translation    │             │
│                                  │  │  • Response caching      │             │
│                                  │  │  • Pipeline middleware   │             │
│                                  │  └──────────────────────────┘             │
└─────────────────────────────────┴───────────────────────────────────────────┘
```

### Data Flow

```
User Request → Chi Router → Auth Middleware → Rate Limiter → Handler
                                                    ↓
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                         API Keys              Credits               Chat Proxy
                              ↓                     ↓                     ↓
                         PostgreSQL          PostgreSQL          LLM SDK → Providers
                              ↓                     ↓                     ↓
                         Drizzle ORM         Transaction Log      OpenAI / Anthropic
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
| [NextAuth.js v5](https://authjs.dev/) | Authentication | 5.0.0-beta |
| [Drizzle ORM](https://orm.drizzle.team/) | Database ORM | 0.45.2 |
| [Zod](https://zod.dev/) | Schema Validation | 4.4.3 |
| [AI SDK](https://sdk.vercel.ai/) | AI/LLM Integration | 6.0.176 |
| [Lucide React](https://lucide.dev/) | Icon Library | 1.14.0 |

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

### Infrastructure

| Technology | Purpose |
|:-----------|:--------|
| [PostgreSQL](https://www.postgresql.org/) | Primary Database |
| [Neon](https://neon.tech/) | Serverless PostgreSQL (optional) |
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Multi-service Orchestration |
| [Turborepo](https://turbo.build/) | Monorepo Task Runner |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Go](https://go.dev/dl/) 1.25+ (for backend development)
- [Docker](https://www.docker.com/) & Docker Compose (for PostgreSQL)

### 1. Clone & Install

```bash
git clone https://github.com/Shinmen007/DRA.git
cd DRA
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
NVIDIA_API_KEY=nvapi-your-key-here
OPENAI_API_KEY=sk-your-key-here
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

---

## 📁 Project Structure

```
DRA/
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
│   │   │   ├── 📚 docs/                 # API documentation
│   │   │   └── api/                     # Next.js API routes & Server Actions
│   │   ├── 🗄️ db/
│   │   │   ├── schema.ts                # Drizzle ORM schema definition
│   │   │   ├── index.ts                 # Database connection (Neon/pg)
│   │   │   └── seed.ts                  # Demo data seeder
│   │   ├── 🧩 components/               # Shared & feature UI components
│   │   │   ├── Hero.tsx                 # Animated landing hero
│   │   │   ├── MainLayout.tsx           # App shell layout
│   │   │   ├── dashboard/               # Dashboard-specific components
│   │   │   └── playground/              # Playground-specific components
│   │   ├── 🔧 lib/
│   │   │   ├── api/sdk.ts               # TypeScript SDK (full CRUD)
│   │   │   ├── api/errors.ts            # Typed error handling
│   │   │   └── utils.ts                 # Utility functions (cn, etc.)
│   │   ├── 🔐 auth.ts                   # NextAuth v5 configuration
│   │   └── 🎨 globals.css               # Global styles + animations + Tailwind
│   │
│   └── ⚙️ backend/                      # Go Backend Service
│       ├── 🚀 cmd/api/                  # Application entrypoint
│       │   └── main.go                  # Server bootstrap & middleware stack
│       ├── 🧠 internal/
│       │   ├── config/                  # Environment configuration loader
│       │   ├── db/                      # PostgreSQL connection pool (pgx)
│       │   ├── domain/                  # Domain models & custom errors
│       │   ├── handler/                 # HTTP route handlers (chi)
│       │   ├── middleware/              # Auth, rate limit, CORS, logging
│       │   ├── repository/              # Data access layer (raw SQL)
│       │   ├── service/                 # Business logic layer
│       │   └── pkg/                     # Internal packages
│       │       ├── logger/              # Structured logging (slog)
│       │       ├── response/            # Standardized HTTP response helpers
│       │       └── token/               # JWT generation & validation
│       ├── 📦 pkg/
│       │   ├── sdk/                     # Go SDK client for external consumers
│       │   └── llm/                     # LLM SDK system
│       │       ├── sdk.go               # High-level facade
│       │       ├── provider/            # Provider registry (OpenAI, Anthropic, Generic)
│       │       ├── translator/          # Format translation (Anthropic ↔ OpenAI)
│       │       ├── pipeline/            # Request/response middleware pipeline
│       │       ├── cache/               # Response caching layer
│       │       └── watcher/             # Error watching & retry logic
│       └── 🧪 tests/                    # Integration tests
│
├── 🐳 docker-compose.yml                # Full stack orchestration
├── 🐋 Dockerfile                        # Next.js production build
├── ⚡ turbo.json                        # Monorepo task pipeline config
└── 📦 package.json                      # Workspace root
```

---

## 📡 API Reference

### 🔓 Public Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/health` | Backend health check |
| `GET` | `/api/models` | List available AI models |

### 🔐 Authenticated Endpoints (JWT Cookie or `x-api-key` Header)

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/auth/signup` | User registration |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/profile` | Update user profile |
| `PUT` | `/api/auth/password` | Change password |
| `POST` | `/api/chat` | Stream AI completions (SSE) |
| `GET` | `/api/keys` | List API keys |
| `POST` | `/api/keys` | Create new API key |
| `DELETE` | `/api/keys/:id` | Delete API key |
| `POST` | `/api/keys/:id/revoke` | Revoke API key |
| `GET` | `/api/credits` | Get credit balance |
| `POST` | `/api/credits/purchase` | Purchase credits |
| `GET` | `/api/transactions` | Transaction history |
| `GET` | `/api/logs` | Request logs |
| `GET` | `/api/analytics` | Usage analytics |

### 👑 Admin Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/stats` | Platform statistics |
| `DELETE` | `/api/admin/users/:id` | Delete user account |

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
-- Users
users (id, name, email, password, role, created_at)

-- API Keys
api_keys (id, user_id, name, key, last_used, created_at, revoked_at)

-- API Request Logs
api_logs (
  id, user_id, api_key_id, model, provider,
  input_tokens, output_tokens, cost, latency,
  status, error_message, created_at
)

-- User Credits
user_credits (id, user_id, balance, total_purchased, total_spent, updated_at)

-- Credit Transactions
credit_transactions (
  id, user_id, amount, type, description,
  related_log_id, created_at
)
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
npm run dev        # Start all services in dev mode (Turborepo)
npm run build      # Production build for all apps
npm run lint       # Lint all packages
npm run format     # Prettier format all files
```

### apps/web (Frontend)

```bash
npm run dev        # Start Next.js dev server (port 3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint check
npm run test       # Run Vitest test suite
npm run test:watch # Run Vitest in watch mode
npm run db:push    # Push Drizzle schema to database
npm run db:seed    # Seed demo data
npm run db:setup   # Push schema + seed (one command)
```

### apps/backend (Go API)

```bash
go run ./cmd/api     # Start backend dev server (port 8080)
go build ./cmd/api   # Compile binary
go test ./...        # Run all tests
docker build -t dra-backend .   # Build Docker image
```

---

## 🐳 Deployment

### Docker Compose (Full Stack — Recommended)

```bash
# Production deployment with one command
docker-compose up -d
```

This deploys the complete stack:
- 🐘 **PostgreSQL 16** — Persistent volume for data
- 🌐 **Next.js Frontend** — Port 3000
- ⚙️ **Go Backend** — Port 8080

### Manual Docker Build

```bash
# Frontend
docker build -t dra-web .
docker run -p 3000:3000 --env-file apps/web/.env.local dra-web

# Backend
cd apps/backend
docker build -t dra-backend .
docker run -p 8080:8080 --env-file .env dra-backend
```

### Environment Variables

| Variable | Required | Description | Example |
|:---------|:--------:|:------------|:--------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgres://dra:dra_secret@localhost:5432/dra_platform` |
| `AUTH_SECRET` | ✅ | JWT signing secret (generate with `openssl rand -base64 32`) | — |
| `NEXTAUTH_SECRET` | ✅ | NextAuth session secret | — |
| `NEXTAUTH_URL` | ✅ | Public base URL | `http://localhost:3000` |
| `BACKEND_URL` | ✅ | Go backend URL | `http://localhost:8080` |
| `NVIDIA_API_KEY` | ❌ | NVIDIA NIM API key | `nvapi-...` |
| `OPENAI_API_KEY` | ❌ | OpenAI API key | `sk-...` |
| `RATE_LIMIT_RPM` | ❌ | Rate limit (requests per minute) | `60` |

---

## 🎨 Design System

Yapapa uses a custom **cyberpunk-inspired design system** built on Tailwind CSS v4:

| Token | Value | Usage |
|:------|:------|:------|
| **Background** | `#050505`, `#0A0A0A` | Page backgrounds |
| **Surface** | `rgba(15, 23, 42, 0.6)` | Cards, panels |
| **Primary** | `#3b82f6` | Buttons, links, accents |
| **Secondary** | `#8b5cf6` | Highlights, gradients |
| **Success** | `#10b981` | Success states, positive trends |
| **Typography** | Inter + Space Grotesk | Headings + body text |

### Key CSS Utilities

```css
.glass-card      /* backdrop-blur-xl + subtle border + semi-transparent bg */
.neon-text       /* Glowing text shadow with color accent */
.text-gradient   /* Purple-to-pink gradient text */
.mesh-gradient   /* Radial gradient mesh background */
.animate-orbit   /* Rotating orbital animation */
.animate-pulse-glow  /* Pulsing glow effect */
```

### Animation Stack

| Library | Use Case |
|:--------|:---------|
| **Framer Motion** | Page transitions, component animations, gestures |
| **GSAP + ScrollTrigger** | Scroll-triggered reveals, parallax effects |
| **Tailwind Animate** | Utility animations (fade, slide, bounce) |

---

## 🗺️ Roadmap

| Status | Feature | Description |
|:------:|:--------|:------------|
| ✅ | Multi-provider AI gateway | OpenAI, Anthropic, generic provider support |
| ✅ | Credit-based billing | Micro-cent pricing, balance tracking, transactions |
| ✅ | Real-time analytics | Usage charts, model breakdown, cost tracking |
| ✅ | API key lifecycle | Create, revoke, track usage per key |
| ✅ | Neural Playground | Multi-model chat comparison with streaming |
| ✅ | Admin user management | User listing, stats, account deletion |
| ✅ | LLM SDK | Go SDK with translator, pipeline, cache, watcher |
| ⏳ | Organization / team workspaces | Multi-user team billing and shared keys |
| ⏳ | Webhook event streaming | Real-time event notifications |
| ⏳ | Fine-grained RBAC | Role-based permissions beyond admin/user |
| ⏳ | Usage alerts & budget caps | Email/Slack alerts for spending thresholds |
| ⏳ | Model fine-tuning interface | UI for custom model training |
| ⏳ | Custom provider plugins | Plugin system for adding new AI providers |

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style (Prettier + ESLint)
- Write tests for new features (Vitest for frontend, Go test for backend)
- Update documentation for API changes
- Ensure Docker builds pass before submitting PR

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [Shinmen007](https://github.com/Shinmen007)**

<br/>

<p align="center">
  <a href="https://github.com/Shinmen007/DRA/stargazers">⭐ Star this repo</a> •
  <a href="https://github.com/Shinmen007/DRA/issues">🐛 Report Bug</a> •
  <a href="https://github.com/Shinmen007/DRA/issues">💡 Request Feature</a> •
  <a href="https://github.com/Shinmen007/DRA/discussions">💬 Discussions</a>
</p>

<br/>

<!-- Footer Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:312e81,50:1e1b4b,100:0f172a&height=120&section=footer&text=&fontSize=0" />

</div>
