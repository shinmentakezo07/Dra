# Deployment & Infrastructure

> Production deployment configuration and infrastructure setup.
> Last updated: 2026-05-22

---

## Local Development

### Prerequisites

- **Node.js 20+** (with npm 10)
- **Go 1.25+**
- **Docker** (for PostgreSQL and optional containerized backend)
- **Make** (for backend build commands)

### Quick Start (One Command)

```bash
bash scripts/dev.sh          # Full launch
bash scripts/dev.sh --check  # Dependency check only
bash scripts/dev.sh --logs   # Show logs from last run
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
docker compose up -d postgres

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

| Service            | URL                             | Description      |
| ------------------ | ------------------------------- | ---------------- |
| Frontend (Next.js) | `http://localhost:3000`         | Web application  |
| Backend (Go)       | `http://localhost:8080`         | API server       |
| PostgreSQL         | `localhost:5432`                | Database         |
| Prometheus Metrics | `http://localhost:9090/metrics` | Metrics endpoint |

---

## Docker Compose

`docker-compose.yml` at the project root orchestrates services:

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d postgres

# Start with mongo profile
docker-compose --profile mongo up -d

# View logs
docker compose logs -f

# Stop all
docker compose down
```

### Services

| Service    | Image                                  | Port | Description                         |
| ---------- | -------------------------------------- | ---- | ----------------------------------- |
| `postgres` | `postgres:16-alpine`                   | 5432 | Primary database with health check  |
| `web`      | Custom build (root Dockerfile)         | 3000 | Next.js standalone production build |
| `backend`  | Custom build (apps/backend/Dockerfile) | 8080 | Go production binary                |

### MongoDB Profile

```yaml
services:
  mongo:
    image: mongo:7
    profiles: ["mongo"]
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
```

### Environment

Services inherit environment from the host or `.env` files. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — JWT signing secret (must match frontend & backend)
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXTAUTH_URL` — Public URL
- AI Provider Keys (at minimum one of: NVIDIA, OpenAI, Anthropic, Groq, Gemini)
- `REDIS_URL` — Optional Redis for caching and distributed rate limiting
- `STRIPE_SECRET_KEY` — Optional Stripe for credit purchases

---

## Docker Build

### Frontend (Root Dockerfile)

Multi-stage build:

**Stage 1: Builder** (`node:20-alpine`)

- Installs dependencies via `npm ci` (with `--legacy-peer-deps` for `.npmrc` compat)
- Runs `npm run build` (Turborepo build pipeline)
- Produces `.next/standalone` output

**Stage 2: Runner** (`node:20-alpine`)

- Copies `.next/standalone` (Next.js standalone output + node_modules)
- Copies `.next/static` for static assets
- Copies `public/` directory
- Runs `node apps/web/server.js` on port 3000
- Includes security headers from `next.config.ts`

### Backend (apps/backend/Dockerfile)

```dockerfile
# Stage 1: Build
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api

# Stage 2: Run
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /api /api
EXPOSE 8080
CMD ["/api"]
```

- Multi-stage Go build for minimal image size
- Alpine-based production image (~20MB)
- CGO disabled for static linking
- Runs on port 8080 with `ENV=production`

---

## Railway Deployment

The platform is deployed on Railway.

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

**Production endpoints:**
| Service | URL |
|---------|-----|
| Frontend | `https://yapa.up.railway.app` |
| Backend | `https://yapa.up.railway.app` (via frontend proxy) |
| OpenAI-compatible | `https://yapa.up.railway.app/v1/chat/completions` |
| Metrics | Internal only (port 9090) |

### Railway Configuration Notes

- Backend `ENV=production` enables production mode
- `AUTH_SECRET` must be identical in both frontend and backend services
- `NEXTAUTH_URL` must be set to the Railway public URL
- `ALLOWED_ORIGINS` must include the Railway domain
- Database uses Railway's PostgreSQL plugin or external Neon connection
- Redis uses Railway's Redis plugin for cache and rate limiting

---

## CI/CD

### GitHub Actions

Two workflows in `.github/workflows/`:

**ci.yml** — Runs on push/PR to `main`:
| Step | What it does |
|------|-------------|
| Lint | ESLint (frontend) + go vet (backend) |
| Frontend Tests | Vitest run |
| Backend Tests | `go test -race -cover` |
| Build | Turborepo production build |

**e2e.yml** — Runs on push/PR to `main`:
| Step | What it does |
|------|-------------|
| Setup | Install deps, build |
| Playwright Tests | E2E test suite |
| Upload Artifacts | Screenshots, videos, traces on failure |

---

## Production Checklist

### Required Configuration

- [ ] `ALLOWED_ORIGINS` configured with your production domain(s)
- [ ] `AUTH_SECRET` is a strong random value (minimum 32 bytes base64)
- [ ] `DATABASE_URL` points to production PostgreSQL/Neon
- [ ] `NEXTAUTH_URL` set to the public-facing URL
- [ ] `BACKEND_URL` correctly points to the Go backend
- [ ] At least one AI provider API key configured
- [ ] Redis URL configured (for production caching and rate limiting)
- [ ] Stripe keys configured (for credit purchases)
- [ ] SMTP configured (for password reset emails, billing alerts)
- [ ] `ENV=production` set on the backend
- [ ] Rate limit values tuned for expected traffic
- [ ] Database migrations applied in order

### Security

- [ ] Metrics port not exposed publicly (port 9090)
- [ ] CORS origins restricted to your domain(s) only
- [ ] Backend and frontend `AUTH_SECRET` values match
- [ ] API keys stored as HMAC-SHA256 hashes (verified)
- [ ] JWT expiry set to appropriate duration (default 7 days)
- [ ] Rate limiting configured per endpoint group
- [ ] Body size limits enforced (10MB for proxy, 1MB for API)
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Suspicious activity monitoring enabled

### Monitoring

- [ ] Prometheus metrics endpoint accessible
- [ ] Provider health monitoring active
- [ ] Circuit breaker thresholds configured
- [ ] Error watcher logging to production logging system
- [ ] Webhook delivery retry configured with DLQ
- [ ] Budget alerts configured for billing thresholds

### Performance

- [ ] Redis configured for cache and rate limiting
- [ ] LLM response caching enabled with appropriate TTL
- [ ] Database connection pool tuned (max 20 conns)
- [ ] Request timeout set appropriately (default 30s)
- [ ] Static assets served via CDN or edge caching

---

## Monitoring & Observability

### Metrics (Prometheus)

Exposed on port 9090 (separate metrics server):

- Request counts and latency histograms
- Provider error rates
- Cache hit/miss ratios
- Circuit breaker state transitions
- Active user sessions

### Logging (Structured)

Backend uses `log/slog` with JSON output:

- `ENV=development`: `slog.LevelDebug` with verbose logging
- `ENV=production`: `slog.LevelInfo` with structured JSON

### Provider Health

- Auto-refresh health checks (30s-60s intervals)
- Circuit breaker state visualization
- Per-provider latency tracking
- Error rate monitoring via watcher

---

## Environment Variables

See [CONFIG.md](../backend/CONFIG.md) for the complete environment variable reference.
