# Deployment & Infrastructure

---

## Local Development

### Prerequisites

- **Node.js 20+** (with npm 10)
- **Go 1.25+**
- **Docker** (for PostgreSQL and optional containerized backend)

### Quick Start (One Command)

```bash
bash scripts/dev.sh
```

This script performs:
1. Checks dependencies (Node, npm, Go, Docker)
2. Installs root, frontend, and backend dependencies
3. Starts PostgreSQL via Docker Compose
4. Generates AUTH_SECRET and NEXTAUTH_SECRET if missing
5. Pushes Drizzle schema to the database
6. Seeds demo data if database is empty
7. Starts the Go backend and Next.js frontend
8. Streams color-coded logs for both services

### Manual Setup

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Install dependencies
npm install

# 3. Set up environment
cp apps/web/.env.example apps/web/.env.local
cp apps/backend/.env.example apps/backend/.env

# 4. Generate secrets
openssl rand -base64 32   # -> AUTH_SECRET
openssl rand -base64 32   # -> NEXTAUTH_SECRET

# 5. Push schema and seed
cd apps/web && npm run db:setup && cd ../..

# 6. Start both servers
npm run dev
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend (Next.js) | `http://localhost:3000` | Web application |
| Backend (Go) | `http://localhost:8080` | API server |
| PostgreSQL | `localhost:5432` | Database |
| Prometheus Metrics | `http://localhost:9090/metrics` | Metrics endpoint |

---

## Docker Compose (Production)

`docker-compose.yml` at the project root orchestrates three services:

```bash
docker-compose up -d
```

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | Database with health check |
| `web` | Custom build (root Dockerfile) | 3000 | Next.js standalone production build |
| `backend` | Custom build (apps/backend/Dockerfile) | 8080 | Go production binary |

### Environment

Services inherit environment from the host or `apps/web/.env.local`. Key variables must be set:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — JWT signing secret
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXTAUTH_URL` — Public URL
- AI Provider Keys

---

## Frontend Docker Build

The root `Dockerfile` uses a multi-stage build:

### Stage 1: Builder
- Base: `node:20-alpine`
- Installs dependencies via `npm ci`
- Runs `npm run build` (Turborepo build)

### Stage 2: Runner
- Base: `node:20-alpine`
- Copies `.next/standalone` (Next.js standalone output)
- Copies `.next/static` for static assets
- Copies `public/` directory
- Runs `node apps/web/server.js` on port 3000

---

## Backend Docker Build

Located at `apps/backend/Dockerfile`:
- Multi-stage Go build
- Alpine-based minimal production image
- Runs the compiled API binary on port 8080

---

## Railway Deployment

The platform is designed for Railway deployment.

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy backend
railway up --service backend --deploy

# Deploy frontend
railway up --service web --deploy
```

**Public endpoint**: `https://yapa.up.railway.app`

**OpenAI-compatible endpoint**: `https://yapa.up.railway.app/v1/chat/completions`

---

## Production Checklist

- [ ] `ALLOWED_ORIGINS` configured with your domain(s)
- [ ] `AUTH_SECRET` is a strong random value (minimum 32 bytes base64)
- [ ] `DATABASE_URL` points to production PostgreSQL/Neon
- [ ] `NEXTAUTH_URL` set to the public-facing URL
- [ ] `BACKEND_URL` correctly points to the Go backend
- [ ] At least one AI provider API key configured
- [ ] Redis URL configured (for production caching and rate limiting)
- [ ] Stripe keys configured (for credit purchases)
- [ ] SMTP configured (for password reset emails)
- [ ] Metrics port not exposed publicly
- [ ] CORS origins restricted to your domain(s) only
- [ ] `ENV=production` set on the backend
- [ ] Rate limit values tuned for expected traffic
- [ ] Database migrations applied in order
- [ ] Backend and frontend `AUTH_SECRET` values match

---

## Environment Variables

See [CONFIG.md](../backend/CONFIG.md) for the complete environment variable reference.
