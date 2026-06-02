# Configuration Reference

All backend configuration is loaded from environment variables via `internal/config/config.go`. The `Config` struct is validated on startup and passed throughout the application via dependency injection.

---

## Required Variables

| Variable       | Default | Description                                                                                                                                                            |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | --      | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`). Required unless `DB_TYPE=mongodb`                                                          |
| `AUTH_SECRET`  | --      | JWT signing secret (must match frontend's `AUTH_SECRET`). Also used as pepper for API key hashing. Generate with `openssl rand -base64 32`. **Startup panic if unset** |

---

## Database

| Variable       | Default        | Description                                                                                                                                       |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_TYPE`      | `postgres`     | Database backend: `postgres`, `neon` (cloud, skips local container), or `mongodb`. Auto-detects `neon` from `DATABASE_URL` containing `neon.tech` |
| `DATABASE_URL` | --             | PostgreSQL/Neon connection string (required when `DB_TYPE` is `postgres` or `neon`)                                                               |
| `MONGODB_URI`  | --             | MongoDB URI (required when `DB_TYPE=mongodb`)                                                                                                     |
| `MONGODB_NAME` | `dra_platform` | MongoDB database name                                                                                                                             |

---

## Server

| Variable           | Default                                       | Description                                                                                                                  |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PORT`             | `8080`                                        | HTTP server port                                                                                                             |
| `ENV`              | `development`                                 | Environment (`development` or `production`). Enables `slog.LevelDebug` logging in development; sets `LogLevel` in production |
| `ALLOWED_ORIGINS`  | `http://localhost:3000,http://localhost:3001` | CORS allowed origins (comma-separated). **Required in production** -- startup error if unset                                 |
| `REQUEST_TIMEOUT`  | `30s`                                         | Per-request timeout (Go duration format)                                                                                     |
| `SHUTDOWN_TIMEOUT` | `10s`                                         | Graceful shutdown timeout (Go duration format)                                                                               |

---

## LLM Provider API Keys

At least one provider key is required for LLM proxy functionality. Each provider supports comma-separated secondary keys for key rotation (multi-key support with weighted round-robin):

| Variable              | Required | Description                                                                                                                                                               |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NVIDIA_API_KEY`      | No       | NVIDIA NIM API key (primary). Default model: `nvidia/qwen3-coder-480b`. Base URL: `https://integrate.api.nvidia.com/v1`                                                   |
| `NVIDIA_API_KEY_2`    | No       | NVIDIA secondary API keys (comma-separated)                                                                                                                               |
| `OPENAI_API_KEY`      | No       | OpenAI API key (primary). Uses `llmprovider.NewOpenAIProvider` with full SDK support                                                                                      |
| `OPENAI_API_KEY_2`    | No       | OpenAI secondary API keys (comma-separated)                                                                                                                               |
| `ANTHROPIC_API_KEY`   | No       | Anthropic API key (primary). Uses `llmprovider.NewAnthropicProvider` with full SDK support                                                                                |
| `ANTHROPIC_API_KEY_2` | No       | Anthropic secondary API keys (comma-separated)                                                                                                                            |
| `GROQ_API_KEY`        | No       | Groq API key (primary). Base URL: `https://api.groq.com/openai/v1`. Ships with 3 built-in models (Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B)                                |
| `GROQ_API_KEY_2`      | No       | Groq secondary API keys (comma-separated)                                                                                                                                 |
| `GEMINI_API_KEY`      | No       | Google Gemini API key (primary). Base URL: `https://generativelanguage.googleapis.com/v1beta/openai`. Ships with 3 built-in models (Gemini 2.0 Flash, 2.5 Pro, 1.5 Flash) |
| `GEMINI_API_KEY_2`    | No       | Gemini secondary API keys (comma-separated)                                                                                                                               |
| `YAPA_API_KEY`        | No       | Yapapa gateway API key. Base URL: `https://yapa.up.railway.app/v1`. Ships with 1 built-in model (Mimo V2.5 Pro)                                                           |
| `SHINWAY_API_KEY`     | No       | Shinway proxy backend API key. Base URL: `http://localhost:20128/v1`. Ships with 1 built-in model (Zhipu GLM 5.1 Full)                                                    |

**Key rotation**: Secondary keys are configured in comma-separated lists (e.g., `OPENAI_API_KEY_2=key1,key2,key3`). The `MultiKeyProvider` wraps all keys with equal weight and rotates through them.

---

## Rate Limiting

| Variable         | Default | Description                                                                                                                                                                                              |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_RPM` | `60`    | Requests per minute per user (sliding window). Auth endpoints get a stricter limit of 10 RPM                                                                                                             |
| `REDIS_URL`      | --      | Redis connection URL (e.g., `redis://localhost:6379`). Enables Redis-backed rate limiting, distributed quota tracking, and LLM response caching. Without this, in-memory backends are used for all three |

---

## Caching

| Variable                   | Default | Description                                                                                         |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `ENABLE_CACHE`             | `true`  | Enable LLM response caching. When disabled, `llmCache` is `nil` and no caching occurs               |
| `CACHE_MAX_SIZE`           | `10000` | Maximum cache entries (for memory cache backend)                                                    |
| `CACHE_DEFAULT_TTL`        | `5m`    | Default cache TTL (Go duration format: `5m`, `1h`, `30s`). Also controls repository-level cache TTL |
| `ENABLE_SEMANTIC_CACHE`    | `false` | Enable fuzzy/embedding-based cache matching (semantic similarity)                                   |
| `SEMANTIC_CACHE_THRESHOLD` | `0.92`  | Similarity threshold for semantic cache (0.0-1.0). Higher = stricter match                          |

**Cache backends**: When `REDIS_URL` is set, uses Redis for both LLM cache (`llm:cache:` key prefix) and repository cache (`repo:` key prefix). Otherwise uses in-memory caches with configurable max size and periodic cleanup (LLM cache: 1-minute cleanup interval).

---

## Model Router

| Variable          | Default | Description                                                                                                                                                                    |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ROUTER_STRATEGY` | `cost`  | Model routing strategy. Options: `cost` (lowest price), `latency` (lowest average latency), `reliability` (lowest error rate), `capability` (model feature matching), `random` |
| `MODEL_ALIASES`   | --      | Model name aliases (format: `alias:model,alias2:model2`). Maps user-facing names to actual model IDs                                                                           |

---

## A/B Testing

| Variable            | Default | Description                                                     |
| ------------------- | ------- | --------------------------------------------------------------- |
| `AB_TEST_VARIANT_A` | --      | First variant provider name (must match a registered provider)  |
| `AB_TEST_VARIANT_B` | --      | Second variant provider name (must match a registered provider) |
| `AB_TEST_TRAFFIC_A` | `0.5`   | Traffic percentage for variant A (0.0-1.0)                      |
| `AB_TEST_TRAFFIC_B` | `0.5`   | Traffic percentage for variant B (0.0-1.0)                      |

Both `AB_TEST_VARIANT_A` and `AB_TEST_VARIANT_B` must be set for A/B testing to activate.

---

## Metrics (Prometheus)

| Variable         | Default | Description                                          |
| ---------------- | ------- | ---------------------------------------------------- |
| `ENABLE_METRICS` | `true`  | Enable Prometheus metrics endpoint                   |
| `METRICS_PORT`   | `9090`  | Metrics server port (separate from main HTTP server) |

---

## Email (SMTP)

| Variable    | Required | Description                                                                        |
| ----------- | -------- | ---------------------------------------------------------------------------------- |
| `SMTP_HOST` | No       | SMTP server hostname (e.g., `smtp.sendgrid.net`). If empty, a no-op sender is used |
| `SMTP_PORT` | No       | SMTP server port (e.g., `587`)                                                     |
| `SMTP_USER` | No       | SMTP username                                                                      |
| `SMTP_PASS` | No       | SMTP password                                                                      |
| `SMTP_FROM` | No       | From address for outgoing emails (e.g., `noreply@yapapa.io`)                       |

Used for password reset emails and budget alert notifications. When `SMTP_HOST` is empty, all email operations silently succeed without sending.

---

## Stripe (Billing)

| Variable                | Required | Description                                                                                                          |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | No       | Stripe secret key (e.g., `sk_test_...`). If unset, Stripe integration is disabled and direct credit purchase is used |
| `STRIPE_WEBHOOK_SECRET` | No       | Stripe webhook signing secret (`whsec_...`). Used to verify webhook signatures at `/webhooks/stripe`                 |
| `STRIPE_PRICE_ID`       | No       | Stripe price ID for credit purchases (currently unused in code -- credits are priced dynamically by amount)          |

---

## Environment Configuration Summary

### All Variables at a Glance

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/dra
AUTH_SECRET=$(openssl rand -base64 32)

# Server
PORT=8080
ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
REQUEST_TIMEOUT=30s
SHUTDOWN_TIMEOUT=10s

# Database
DB_TYPE=postgres          # postgres | neon | mongodb
MONGODB_URI=              # required when DB_TYPE=mongodb
MONGODB_NAME=dra_platform

# Provider keys (at least one needed)
NVIDIA_API_KEY=nvapi-...
NVIDIA_API_KEY_2=key2,key3
OPENAI_API_KEY=sk-...
OPENAI_API_KEY_2=key2,key3
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_API_KEY_2=key2,key3
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=key2,key3
GEMINI_API_KEY=AIza...
GEMINI_API_KEY_2=key2,key3
YAPA_API_KEY=yp-...
SHINWAY_API_KEY=sw-...

# Optional: Redis (enables distributed rate limiting + caching)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_RPM=60

# Caching
ENABLE_CACHE=true
CACHE_MAX_SIZE=10000
CACHE_DEFAULT_TTL=5m
ENABLE_SEMANTIC_CACHE=false
SEMANTIC_CACHE_THRESHOLD=0.92

# Routing
ROUTER_STRATEGY=cost      # cost | latency | reliability | capability | random
MODEL_ALIASES=gpt4:openai/gpt-4-turbo,claude:anthropic/claude-3-opus

# A/B Testing
AB_TEST_VARIANT_A=openai
AB_TEST_VARIANT_B=anthropic
AB_TEST_TRAFFIC_A=0.5
AB_TEST_TRAFFIC_B=0.5

# Metrics
ENABLE_METRICS=true
METRICS_PORT=9090

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG....
SMTP_FROM=noreply@yapapa.io

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

---

## Frontend Environment Variables

These are set in `apps/web/.env.local`:

| Variable          | Required | Description                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------------- |
| `BACKEND_URL`     | Yes      | Go backend URL (`http://localhost:8080` for dev, `http://backend:8080` for Docker) |
| `DATABASE_URL`    | Yes      | PostgreSQL connection string (must match backend's `DATABASE_URL`)                 |
| `AUTH_SECRET`     | Yes      | JWT signing secret (must match backend's `AUTH_SECRET`)                            |
| `NEXTAUTH_SECRET` | Yes      | NextAuth session encryption secret                                                 |
| `NEXTAUTH_URL`    | Yes      | Public-facing URL (`http://localhost:3000` for dev)                                |
| `OPENAI_API_KEY`  | No       | OpenAI key (used for fallback, e.g., SDK tests)                                    |
| `NVIDIA_API_KEY`  | No       | NVIDIA NIM key                                                                     |

---

## Build Environment (turbo.json)

These env vars are passed through during `turbo run build`:

`DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `BACKEND_URL`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`

**Note**: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, and `GEMINI_API_KEY` are **not** passed through by Turbo -- these are runtime-only and must be set separately in the environment.
