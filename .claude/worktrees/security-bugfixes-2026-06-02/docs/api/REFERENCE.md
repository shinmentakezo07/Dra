# API Reference

## Base URLs

| Environment       | Backend URL                   |
| ----------------- | ----------------------------- |
| Local Development | `http://localhost:8080`       |
| Production        | `https://yapa.up.railway.app` |

Frontend proxies `/api/*` and `/v1/*` from `localhost:3000` to the backend via `proxyToBackend()`.

---

## Authentication

Three authentication methods are supported:

| Method         | Header/Cookie                 | Usage                        |
| -------------- | ----------------------------- | ---------------------------- |
| JWT            | `Authorization: Bearer <jwt>` | Server-to-server, SDK        |
| Session Cookie | `authjs.session-token`        | Browser sessions (NextAuth)  |
| API Key        | `x-api-key: <key>`            | External clients, SDK config |

---

## Response Format

All API responses follow a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

For errors:

```json
{
  "success": false,
  "error": "Error message",
  "data": null
}
```

---

## Error Codes

| HTTP Status | Error Type           | Description                               |
| ----------- | -------------------- | ----------------------------------------- |
| 400         | BadRequest           | Invalid input or validation failure       |
| 401         | Unauthorized         | Missing or invalid authentication         |
| 403         | Forbidden            | Insufficient permissions                  |
| 402         | PaymentRequired      | Insufficient credits                      |
| 404         | NotFound             | Resource not found                        |
| 409         | Conflict             | Resource conflict (e.g., duplicate email) |
| 415         | UnsupportedMediaType | Wrong Content-Type                        |
| 429         | RateLimited          | Rate limit exceeded                       |
| 503         | ServiceUnavailable   | Backend unreachable                       |

---

## Endpoints

### Public Endpoints

| Method | Path                | Description                                     |
| ------ | ------------------- | ----------------------------------------------- |
| `GET`  | `/health`           | Backend health check (returns status + version) |
| `GET`  | `/health/providers` | LLM provider health summary                     |
| `GET`  | `/v1/models`        | OpenAI-compatible model list                    |

---

### Auth Endpoints

Rate-limited to **10 requests per minute**.

| Method | Path                    | Description                  |
| ------ | ----------------------- | ---------------------------- |
| `POST` | `/auth/signup`          | Register new user            |
| `POST` | `/auth/login`           | Login with email/password    |
| `POST` | `/auth/oauth`           | OAuth login (GitHub, Google) |
| `POST` | `/auth/forgot-password` | Request password reset email |
| `POST` | `/auth/reset-password`  | Reset password with token    |
| `GET`  | `/auth/me`              | Get current user profile     |
| `PUT`  | `/auth/profile`         | Update profile (name, email) |
| `PUT`  | `/auth/password`        | Change password              |

**Signup Request:**

```json
{ "name": "User", "email": "user@example.com", "password": "securepass123" }
```

**Login Response:**

```json
{
  "user": { "id": "...", "name": "User", "email": "...", "role": "user" },
  "token": "jwt-token..."
}
```

---

### OpenAI-Compatible Proxy

| Method | Path                   | Description                    |
| ------ | ---------------------- | ------------------------------ |
| `POST` | `/v1/chat/completions` | OpenAI-format chat completions |
| `POST` | `/v1/messages`         | Anthropic-format messages      |
| `POST` | `/v1/embeddings`       | OpenAI-format embeddings       |
| `GET`  | `/v1/models`           | List models in OpenAI format   |

These endpoints use the full LLM pipeline: auth -> quota -> validator -> router -> cache -> guardrails -> moderation -> translator -> provider -> telemetry -> circuitbreaker.

---

### API Keys

| Method   | Path                    | Description          |
| -------- | ----------------------- | -------------------- |
| `GET`    | `/api/keys`             | List user's API keys |
| `POST`   | `/api/keys`             | Create new API key   |
| `DELETE` | `/api/keys/{id}`        | Delete API key       |
| `POST`   | `/api/keys/{id}/revoke` | Revoke API key       |

**Create Request:** `{ "name": "My Key" }`

---

### Credits & Billing

| Method | Path                    | Description                                              |
| ------ | ----------------------- | -------------------------------------------------------- |
| `GET`  | `/api/credits`          | Get credit balance                                       |
| `POST` | `/api/credits/purchase` | Purchase credits (returns Stripe checkout URL or direct) |
| `GET`  | `/api/credits/budget`   | Get budget settings                                      |
| `PUT`  | `/api/credits/budget`   | Set budget limits                                        |
| `POST` | `/api/promos/redeem`    | Redeem promo code                                        |
| `GET`  | `/api/transactions`     | List transactions (paginated)                            |
| `POST` | `/webhooks/stripe`      | Stripe webhook (public, signature-verified)              |

**Purchase Response (Stripe):** `{ "checkoutUrl": "https://checkout.stripe.com/..." }`

**Purchase Response (Direct):** `{ "id": "...", "amount": 5000, "type": "purchase", ... }`

---

### Chat & AI

| Method | Path              | Description                |
| ------ | ----------------- | -------------------------- |
| `POST` | `/api/chat`       | Streaming chat (SSE)       |
| `POST` | `/api/embeddings` | Generate embeddings        |
| `POST` | `/api/validate`   | Validate structured output |
| `GET`  | `/api/models`     | List available models      |

**Chat Request:**

```json
{ "model": "gpt-4o", "messages": [{ "role": "user", "content": "Hello!" }] }
```

**Chat Response (SSE stream):**

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"! How"}}]}
data: {"choices":[{"delta":{"content":" can I help?"}}]}
data: [DONE]
```

---

### Conversations

| Method   | Path                               | Description                    |
| -------- | ---------------------------------- | ------------------------------ |
| `GET`    | `/api/conversations`               | List conversations (paginated) |
| `POST`   | `/api/conversations`               | Create conversation            |
| `GET`    | `/api/conversations/{id}`          | Get conversation               |
| `DELETE` | `/api/conversations/{id}`          | Delete conversation            |
| `POST`   | `/api/conversations/{id}/messages` | Add message                    |

---

### Prompts

| Method   | Path                         | Description                           |
| -------- | ---------------------------- | ------------------------------------- |
| `GET`    | `/api/prompts`               | List prompts                          |
| `POST`   | `/api/prompts`               | Create prompt                         |
| `GET`    | `/api/prompts/{name}`        | Get prompt by name                    |
| `POST`   | `/api/prompts/{name}/render` | Render prompt template with variables |
| `DELETE` | `/api/prompts/{name}`        | Delete prompt                         |

---

### Webhooks

| Method   | Path                 | Description    |
| -------- | -------------------- | -------------- |
| `GET`    | `/api/webhooks`      | List webhooks  |
| `POST`   | `/api/webhooks`      | Create webhook |
| `GET`    | `/api/webhooks/{id}` | Get webhook    |
| `PUT`    | `/api/webhooks/{id}` | Update webhook |
| `DELETE` | `/api/webhooks/{id}` | Delete webhook |

---

### Organizations

| Method   | Path                                       | Description         |
| -------- | ------------------------------------------ | ------------------- |
| `GET`    | `/api/organizations`                       | List organizations  |
| `POST`   | `/api/organizations`                       | Create organization |
| `GET`    | `/api/organizations/{id}`                  | Get organization    |
| `POST`   | `/api/organizations/{id}/invite`           | Invite member       |
| `DELETE` | `/api/organizations/{id}/members/{userId}` | Remove member       |
| `GET`    | `/api/organizations/{id}/members`          | List members        |
| `POST`   | `/api/invites/accept`                      | Accept invitation   |

---

### Logs & Analytics

| Method | Path             | Description                                             |
| ------ | ---------------- | ------------------------------------------------------- |
| `GET`  | `/api/logs`      | Request logs (paginated)                                |
| `GET`  | `/api/analytics` | Usage analytics (summary, model breakdown, daily usage) |

---

### Batch & Files

| Method | Path                | Description             |
| ------ | ------------------- | ----------------------- |
| `POST` | `/api/batch`        | Submit batch chat job   |
| `GET`  | `/api/batch/{id}`   | Get batch job status    |
| `POST` | `/api/files/upload` | Upload file (multipart) |
| `GET`  | `/api/files`        | List uploaded files     |

---

### Real-Time

| Method | Path                        | Description             |
| ------ | --------------------------- | ----------------------- |
| `GET`  | `/api/notifications/stream` | SSE notification stream |

---

### Admin Endpoints

All admin endpoints require `auth` middleware + `admin` role.

**Users (14 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/users` |
| `GET` | `/api/admin/users/{id}` |
| `PUT` | `/api/admin/users/{id}/status` |
| `PUT` | `/api/admin/users/{id}/role` |
| `DELETE` | `/api/admin/users/{id}` |
| `POST` | `/api/admin/users/{id}/impersonate` |
| `POST` | `/api/admin/impersonations/{id}/stop` |
| `POST` | `/api/admin/users/bulk/suspend` |
| `GET` | `/api/admin/users/{id}/keys` |
| `GET` | `/api/admin/users/{id}/usage` |

**Providers (8 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/providers` |
| `POST` | `/api/admin/providers` |
| `GET` | `/api/admin/providers/{id}` |
| `PUT` | `/api/admin/providers/{id}` |
| `PUT` | `/api/admin/providers/{id}/status` |
| `GET` | `/api/admin/providers/{id}/keys` |
| `POST` | `/api/admin/providers/{id}/keys` |
| `DELETE` | `/api/admin/providers/{id}/keys/{keyId}` |
| `PUT` | `/api/admin/providers/{id}/keys/reorder` |

**Models (5 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/models` |
| `POST` | `/api/admin/models` |
| `PUT` | `/api/admin/models/{id}/status` |
| `GET` | `/api/admin/aliases` |
| `POST` | `/api/admin/aliases` |
| `DELETE` | `/api/admin/aliases/{id}` |

**Billing (4 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/billing/summary` |
| `GET` | `/api/admin/billing/transactions` |
| `POST` | `/api/admin/billing/credits/adjust` |
| `GET` | `/api/admin/billing/usage-daily` |

**Settings (4 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/settings` |
| `PUT` | `/api/admin/settings/{key}` |
| `GET` | `/api/admin/feature-flags` |
| `POST` | `/api/admin/feature-flags` |
| `PUT` | `/api/admin/feature-flags/{id}` |

**Security (5 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/security/suspicious` |
| `PUT` | `/api/admin/security/suspicious/{id}` |
| `GET` | `/api/admin/ip` |
| `POST` | `/api/admin/ip` |
| `DELETE` | `/api/admin/ip/{id}` |
| `GET` | `/api/admin/logs/ip-access` |

**Audit:** `GET /api/admin/audit`

**Announcements:** `GET /api/admin/announcements`, `POST /api/admin/announcements`

**Promos (4 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/promos` |
| `POST` | `/api/admin/promos` |
| `PUT` | `/api/admin/promos/{id}/toggle` |
| `GET` | `/api/admin/promos/{id}/redemptions` |

**Groups:** `GET /api/admin/groups`, `POST /api/admin/groups`

**Reports:** `GET /api/admin/reports`

**Changelog (3 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/changelog` |
| `POST` | `/api/admin/changelog` |
| `POST` | `/api/admin/changelog/{id}/publish` |

**Admins (3 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/admins` |
| `POST` | `/api/admin/admins` |
| `DELETE` | `/api/admin/admins/{id}` |

**SSO:** `GET /api/admin/sso`

**Cost (3 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/cost/optimizations` |
| `GET` | `/api/admin/cost/forecast` |
| `GET` | `/api/admin/cost/breakdown` |

**Operations (4 endpoints):**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/cache/stats` |
| `POST` | `/api/admin/cache/clear` |
| `GET` | `/api/admin/webhooks/logs` |
| `POST` | `/api/admin/webhooks/{id}/retry` |

**Legacy Admin:**
| Method | Path |
|--------|------|
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/circuit-breakers` |
| `GET` | `/api/admin/provider-health` |
| `GET` | `/api/admin/dashboard` |

---

## OpenAI Error Format

The `/v1/*` endpoints return OpenAI-compatible error responses:

```json
{
  "error": {
    "message": "Insufficient credits",
    "type": "insufficient_quota"
  }
}
```

Error types: `invalid_request_error`, `authentication_error`, `insufficient_quota`, `api_error`

---

## Rate Limit Headers

All responses include rate limit information:

| Header                  | Description                 |
| ----------------------- | --------------------------- |
| `x-ratelimit-limit`     | Max requests per window     |
| `x-ratelimit-remaining` | Remaining requests          |
| `x-ratelimit-reset`     | Seconds until window resets |
| `x-request-id`          | Unique request identifier   |

Auth endpoints: 10 req/min. General API: configurable (default 60/min). Returns `429 Rate limit exceeded. Please slow down.`

---

## Full Request/Response Schemas

### POST /auth/signup

**Request:**

```json
{
  "name": "string (min 2 chars)",
  "email": "string (valid email format)",
  "password": "string (min 6 chars)"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "jwt-string"
  }
}
```

### POST /auth/login

**Request:** `{"email": "string", "password": "string"}`

**Response:** Same AuthResponse structure as signup.

### GET /auth/me

**Response:** User object without password field.

### POST /api/keys

**Request:** `{"name": "string (1-100 chars)"}`

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "My Key",
    "key": "dra_abc123...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

Note: The raw key is only returned once at creation time.

### POST /api/chat (Streaming SSE)

**Request:**

```json
{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "system", "content": "You are helpful." },
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response (SSE stream):**

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"! How"}}]}
data: {"choices":[{"delta":{"content":" can I help?"}}]}
data: [DONE]
```

### POST /api/embeddings

**Request:** `{"model": "text-embedding-3-small", "input": "Hello world"}`

**Response:**

```json
{
    "object": "list",
    "data": [{"object": "embedding", "index": 0, "embedding": [-0.0069, 0.0045, ...]}],
    "model": "text-embedding-3-small",
    "usage": {"prompt_tokens": 2, "total_tokens": 2}
}
```

### GET /api/models

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "openai/gpt-4o",
      "name": "GPT-4o",
      "provider": "openai",
      "inputPricePer1k": 0.0025,
      "outputPricePer1k": 0.01,
      "contextWindow": 128000,
      "description": "OpenAI's most capable multimodal model.",
      "capabilities": ["text", "vision", "code"]
    }
  ]
}
```

### GET /api/logs?page=1&limit=20

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "apiKeyId": null,
      "model": "openai/gpt-4o",
      "provider": "openai",
      "inputTokens": 50,
      "outputTokens": 150,
      "cost": 400,
      "latency": 1234,
      "status": "success",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### GET /api/analytics

**Response:**

```json
{
    "success": true,
    "data": {
        "summary": {"totalRequests": 100, "successRequests": 95, "errorRequests": 5},
        "recentLogs": [...],
        "modelBreakdown": [
            {"model": "openai/gpt-4o", "count": 60, "totalCost": 24000}
        ],
        "dailyUsage": [
            {"date": "2024-01-01", "requests": 50, "cost": 20000, "tokens": 50000}
        ]
    }
}
```

### POST /api/conversations

**Request:** `{"title": "string", "model": "string"}`

**Response:** `{"id": "uuid", "userId": "uuid", "title": "string", "model": "string", "createdAt": "...", "updatedAt": "..."}`

### POST /api/organizations

**Request:** `{"name": "string (min 2 chars)"}`

**Response:** Organization object with id, name, ownerId, plan, createdAt.

### POST /api/files/upload (multipart/form-data)

Form fields: `file` (binary), `name` (optional string).

**Response:** `{"id": "uuid", "userId": "uuid", "name": "filename.txt", "size": 1234, "mimeType": "text/plain", "createdAt": "..."}`

---

## API Key Authentication Example

```bash
# Chat with API key
curl -N http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: dra_abc123..." \
  -d '{"model": "openai/gpt-4o", "messages": [{"role": "user", "content": "Hi"}]}'

# List models with API key
curl http://localhost:8080/api/models \
  -H "x-api-key: dra_abc123..."
```

## OpenAI-Compatible API Examples

### cURL — OpenAI Format

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-or-api-key>" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Python — OpenAI SDK

```python
from openai import OpenAI
client = OpenAI(
    base_url="https://yapa.up.railway.app/v1",
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

### TypeScript — DraSDK

```typescript
import { getSDK, configureSDK } from "@/lib/api/sdk";
configureSDK({ baseUrl: "http://localhost:8080" });
const sdk = getSDK();

// List API keys
const keys = await sdk.listKeys();

// Streaming chat
const stream = sdk.chatStream({
  model: "openai/gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### JavaScript — Fetch API

```javascript
const res = await fetch("http://localhost:8080/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
const reader = res.body.getReader();
// ... SSE parsing
```

---

## Additional Admin Endpoints

### RBAC Endpoints

All under `/api/admin/rbac/`. Require admin role.

| Method   | Path                                                    | Description                    |
| -------- | ------------------------------------------------------- | ------------------------------ |
| `GET`    | `/api/admin/rbac/permissions`                           | List all available permissions |
| `GET`    | `/api/admin/rbac/roles`                                 | List all roles                 |
| `GET`    | `/api/admin/rbac/roles/{role}/permissions`              | Get permissions for a role     |
| `POST`   | `/api/admin/rbac/roles/{role}/permissions`              | Add permission to role         |
| `DELETE` | `/api/admin/rbac/roles/{role}/permissions/{permission}` | Remove permission from role    |

### Rate Limit Management

| Method | Path                                         | Description                |
| ------ | -------------------------------------------- | -------------------------- |
| `GET`  | `/api/admin/rate-limits/tiers`               | List rate limit tiers      |
| `PUT`  | `/api/admin/rate-limits/tiers/{tier}`        | Update tier limits         |
| `PUT`  | `/api/admin/rate-limits/users/{userId}/tier` | Set user's rate limit tier |

### Provider Plugins

| Method   | Path                             | Description                  |
| -------- | -------------------------------- | ---------------------------- |
| `GET`    | `/api/admin/plugins`             | List all provider plugins    |
| `POST`   | `/api/admin/plugins`             | Create a new provider plugin |
| `GET`    | `/api/admin/plugins/{id}`        | Get plugin details           |
| `PUT`    | `/api/admin/plugins/{id}/toggle` | Enable/disable plugin        |
| `DELETE` | `/api/admin/plugins/{id}`        | Delete plugin                |

### User Adjustments

| Method | Path                                | Description                        |
| ------ | ----------------------------------- | ---------------------------------- |
| `GET`  | `/api/admin/users/{id}/adjustments` | List credit adjustments for a user |

### Operations

| Method | Path                             | Description            |
| ------ | -------------------------------- | ---------------------- |
| `GET`  | `/api/admin/cache/stats`         | Get cache statistics   |
| `POST` | `/api/admin/cache/clear`         | Clear all caches       |
| `GET`  | `/api/admin/webhooks/logs`       | List webhook logs      |
| `POST` | `/api/admin/webhooks/{id}/retry` | Retry a failed webhook |

### Data Exports

| Method | Path                         | Description               |
| ------ | ---------------------------- | ------------------------- |
| `GET`  | `/api/exports`               | List export jobs          |
| `POST` | `/api/exports`               | Create export job         |
| `GET`  | `/api/exports/{id}`          | Get export job status     |
| `GET`  | `/api/exports/{id}/download` | Download completed export |
