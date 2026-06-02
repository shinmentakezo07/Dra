# DRA Platform Backend (Go)

A production-ready Go backend service for the DRA Platform. Handles API keys, credit billing, request logging, chat proxying, and admin operations.

## Architecture

```
cmd/api/           - Entry point
internal/
  config/          - Environment configuration
  db/              - PostgreSQL connection pool (pgx)
  models/          - Domain models (matches Drizzle schema)
  repository/      - Data access layer (raw SQL)
  services/        - Business logic
  middleware/      - Auth (JWT + API key), rate limiting, CORS
  handlers/        - HTTP handlers (chi router)
```

## Tech Stack

- **Router**: chi (lightweight, idiomatic)
- **Database**: pgx (PostgreSQL driver + connection pool)
- **Auth**: NextAuth JWT validation + API key authentication
- **Rate Limiting**: In-memory per-user/IP sliding window
- **Passwords**: bcrypt
- **UUIDs**: google/uuid

## API Endpoints

### Public

| Method | Endpoint      | Description              |
| ------ | ------------- | ------------------------ |
| GET    | `/health`     | Health check             |
| GET    | `/api/models` | List available AI models |

### Authenticated (JWT session or x-api-key)

| Method | Endpoint                | Description                 |
| ------ | ----------------------- | --------------------------- |
| GET    | `/api/keys`             | List API keys               |
| POST   | `/api/keys`             | Create API key              |
| DELETE | `/api/keys?id={id}`     | Delete API key              |
| GET    | `/api/credits`          | Get credit balance          |
| POST   | `/api/credits/purchase` | Purchase credits            |
| GET    | `/api/transactions`     | List transactions           |
| GET    | `/api/logs`             | List API request logs       |
| GET    | `/api/analytics`        | User analytics              |
| POST   | `/api/chat`             | AI chat proxy (streams SSE) |

### Admin

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| GET    | `/api/admin/users`         | List all users |
| DELETE | `/api/admin/users?id={id}` | Delete user    |
| GET    | `/api/admin/stats`         | Platform stats |

## Running Locally

```bash
cd apps/backend

# Copy env
cp .env.example .env
# Edit .env with your values

# Run
export PATH="/teamspace/studios/this_studio/.local/go/bin:$PATH"
go run ./cmd/api
```

Server starts on `:8080` by default.

## Building

```bash
go build ./cmd/api
```

## Docker

```bash
docker build -t dra-backend .
docker run -p 8080:8080 --env-file .env dra-backend
```

## Auth Integration

The backend validates NextAuth v5 session tokens:

- Reads `authjs.session-token` cookie (or `__Secure-authjs.session-token` in production)
- Falls back to `Authorization: Bearer <token>` header
- Validates JWT with `AUTH_SECRET` (must match frontend)
- Also supports `x-api-key` header for API key authentication

## Database

Uses the same PostgreSQL schema as the Next.js frontend (Drizzle ORM). All tables:

- `users`
- `api_keys`
- `api_logs`
- `user_credits`
- `credit_transactions`
