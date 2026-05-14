# Configuration Reference

All backend configuration is loaded from environment variables via `internal/config/config.go`. The Config struct is passed throughout the application.

---

## Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `AUTH_SECRET` | — | JWT signing secret (must match frontend's AUTH_SECRET). Generate with `openssl rand -base64 32` |

---

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `ENV` | `development` | Environment (`development` or `production`). Enables debug logging in dev |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | CORS allowed origins (comma-separated). **Required in production** |
| `REQUEST_TIMEOUT` | `30s` | Per-request timeout |
| `SHUTDOWN_TIMEOUT` | `10s` | Graceful shutdown timeout |

---

## AI Provider API Keys

At least one provider key is required for AI functionality. Each provider also supports secondary keys for rotation:

| Variable | Description |
|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key (primary) |
| `NVIDIA_API_KEY_2` | NVIDIA secondary API keys (comma-separated) |
| `OPENAI_API_KEY` | OpenAI API key (primary) |
| `OPENAI_API_KEY_2` | OpenAI secondary API keys (comma-separated) |
| `ANTHROPIC_API_KEY` | Anthropic API key (primary) |
| `ANTHROPIC_API_KEY_2` | Anthropic secondary API keys (comma-separated) |
| `GROQ_API_KEY` | Groq API key (primary) |
| `GROQ_API_KEY_2` | Groq secondary API keys (comma-separated) |
| `GEMINI_API_KEY` | Google Gemini API key (primary) |
| `GEMINI_API_KEY_2` | Gemini secondary API keys (comma-separated) |

---

## Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_RPM` | `60` | Requests per minute per user |
| `REDIS_URL` | — | Redis connection URL (enables Redis-backed rate limiting; without this, in-memory is used) |

---

## Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_CACHE` | `true` | Enable LLM response caching |
| `CACHE_MAX_SIZE` | `10000` | Maximum cache entries (for memory backend) |
| `CACHE_DEFAULT_TTL` | `5m` | Default cache TTL (Go duration format) |
| `ENABLE_SEMANTIC_CACHE` | `false` | Enable fuzzy/embedding-based cache matching |
| `SEMANTIC_CACHE_THRESHOLD` | `0.92` | Similarity threshold for semantic cache |

---

## Model Router

| Variable | Default | Description |
|----------|---------|-------------|
| `ROUTER_STRATEGY` | `cost` | Model routing strategy: `cost`, `latency`, `reliability`, `capability`, `random` |
| `MODEL_ALIASES` | — | Model name aliases (format: `alias:model,alias2:model2`) |

---

## A/B Testing

| Variable | Default | Description |
|----------|---------|-------------|
| `AB_TEST_VARIANT_A` | — | First variant provider name |
| `AB_TEST_VARIANT_B` | — | Second variant provider name |
| `AB_TEST_TRAFFIC_A` | `0.5` | Traffic percentage for variant A |
| `AB_TEST_TRAFFIC_B` | `0.5` | Traffic percentage for variant B |

---

## Metrics

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_METRICS` | `true` | Enable Prometheus metrics endpoint |
| `METRICS_PORT` | `9090` | Metrics server port (separate from main server) |

---

## Email (SMTP)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for outgoing emails |

Used for password reset emails.

---

## Stripe (Billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Stripe price ID for credit purchases |

---

## Frontend Environment Variables

These are set in `apps/web/.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | Yes | Go backend URL (`http://localhost:8080` for dev) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (same as backend) |
| `AUTH_SECRET` | Yes | JWT signing secret (must match backend) |
| `NEXTAUTH_SECRET` | Yes | NextAuth session encryption secret |
| `NEXTAUTH_URL` | Yes | Public-facing URL (`http://localhost:3000` for dev) |
| `OPENAI_API_KEY` | No | OpenAI key (used for fallback) |
| `NVIDIA_API_KEY` | No | NVIDIA NIM key |

---

## Build Environment (turbo.json)

These env vars are passed through during `turbo run build`:

`DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `BACKEND_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`
