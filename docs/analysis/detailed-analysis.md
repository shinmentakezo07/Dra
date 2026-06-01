<!-- Generated: 2026-05-29 | Deep technical analysis of critical API subsystems -->
<!-- Based on full codebase scan + source-level review of concurrency, security, and streaming logic -->

# Detailed API Analysis — Critical Subsystems & Deep Mechanics

**Purpose**: This document drills far deeper than the high-level codemaps into the hardest, most subtle, and most important parts of the Yapapa (DRA Platform) API.

It explains **why** things are built the way they are, the concurrency and security trade-offs, failure modes, and invariants that must be preserved.

---

## 1. Quota, Budget Enforcement & Credit Deduction — Race Condition Safety

### The Problem
Multiple concurrent requests from the same user (or same API key) must not over-spend credits. A naive `SELECT balance, UPDATE balance` creates a classic TOCTOU (time-of-check to time-of-use) race.

### The Solution: Transactional Atomic Deduction + Advisory Budgets

**Core Deduction Path** (`repository/credits.go:59` and `service/credits.go:76`):

```go
// Inside a serializable or repeatable-read transaction
func (r *CreditsRepo) DeductTx(ctx, tx, userID string, amount int) (bool, error) {
    // Single atomic UPDATE with WHERE guard
    tag, err := tx.Exec(ctx, `
        UPDATE user_credits
        SET balance = balance - $2,
            daily_spent = daily_spent + $2,
            monthly_spent = monthly_spent + $2,
            updated_at = NOW()
        WHERE user_id = $1 AND balance >= $2
    `, userID, amount)

    return tag.RowsAffected() == 1, err
}
```

**Why this works**:
- The `WHERE balance >= $2` turns the check into part of the atomic operation.
- Only one transaction can succeed in deducting when balance is marginal.
- All other concurrent transactions see either the old balance (and fail the WHERE) or the new one.

**Budget Enforcement** happens **before** the LLM call in `middleware/quota.go`:

1. `CheckRequest` looks up `user_credits` (with 5-min cache in `cached_credits.go`).
2. It also checks per-API-key scoping (`ScopedAPIKey`):
   - `AllowedModels`
   - `AllowedIPs`
   - `MaxTokensPerReq`
   - `DailyRequestLimit` / `MonthlyTokenLimit` (tracked in the `QuotaTracker` in-memory map or Redis)

3. **Hard budgets** (`monthly_budget`, `daily_budget`) are **advisory** in the current implementation — they trigger alerts (`budget_alerts` table) but the actual hard stop is still the `balance >= amount` check in the atomic deduct.

**Important Invariant**: The `balance` column is the single source of truth for "can this request proceed?" Budget columns are for UX and alerting only.

**Cache Invalidation**:
- After any `DeductTx` or `UpsertTx`, the credits cache key for that user is explicitly deleted.
- This prevents the 5-min cache from serving stale balance to subsequent requests.

---

## 2. Webhook Delivery Engine — Retry, Backoff, Dead Letter Queue

### Architecture

```
WebhookService (internal/service/webhook.go)
    └── owns Dispatcher (pkg/webhook/dispatcher.go)
    └── owns bounded semaphore (max 20 concurrent deliveries)
    └── background retry worker (started via Start())
```

**Retry Schedule** (hard-coded in service):
```go
var webhookRetryBackoff = []time.Duration{
    1 * time.Second,
    4 * time.Second,
    16 * time.Second,
    64 * time.Second,
}
const webhookMaxAttempts = 5
```

**Delivery State Machine** (in `webhook_deliveries` table + `pkg/webhook/`):

1. **Dispatch** (fire-and-forget from main request path)
   - Creates a `webhook_deliveries` row with `attempts=0`, `next_retry_at = now + 1s`
   - Enqueues into the dispatcher (non-blocking)

2. **Dispatcher Worker**
   - Picks up deliveries where `next_retry_at <= now` and `attempts < max_attempts`
   - Acquires semaphore slot (max 20 concurrent)
   - Signs payload with HMAC-SHA256 using the webhook's `secret`
   - POSTs to `webhook.url` with custom `headers` from `webhooks.headers` JSONB

3. **On Success**
   - Sets `status_code`, `delivered_at`, marks as final success

4. **On Failure**
   - Increments `attempts`
   - If `attempts < max_attempts`:
     - Calculates `next_retry_at = now + backoff[attempts]`
     - Updates row
   - Else:
     - Moves to Dead Letter Queue (conceptual — actually just left in `webhook_deliveries` with `attempts == 5` and no more retries scheduled)
     - Emits internal alert / `suspicious_activities` entry

### Key Design Decisions

- **No separate DLQ table** — failed deliveries stay in `webhook_deliveries` with `attempts >= max`. Simpler, queryable.
- **Bounded concurrency** (20) prevents one misbehaving webhook from taking down the entire delivery system.
- **Signing is mandatory** — every delivery includes `X-Webhook-Signature: t=<timestamp>,v1=<hmac>` (standard-webhooks inspired).
- **Idempotency** is the caller's responsibility (no automatic dedup on retries).

**Operational Visibility**:
- `GET /api/webhooks/[id]/deliveries` (admin + owner) shows the full attempt history.
- Failed deliveries with `attempts == 5` are the de-facto DLQ.

---

## 3. RBAC Permission Model — Enforcement Layers

### Three Layers of Enforcement

| Layer | File | What it checks | Failure mode |
|-------|------|----------------|--------------|
| **Route** | `middleware/admin.go` + `require_auth.go` | `user.role == "admin"` | 403 |
| **Permission** | `middleware/rbac.go` (via `RequirePermission(perm)`) | User has role that grants the permission string | 403 |
| **Service** | `service/rbac.go` + repo | Same check (defense in depth) | Returns `AppError` |

### Permission Model

From migration `008_rbac.sql`:

- `roles` table (name, description)
- `role_permissions` junction (role → permission strings)
- `user_roles` junction (user → role)

**Special case**: The very first admin who logs in (detected by `admin_users` table being empty) is auto-provisioned as `superadmin` with the single permission `"*"`.

**Wildcard semantics**:
- `"*"` grants everything.
- Checked early in `HasPermission` — if user has any role with `"*"`, all checks pass.

### How Middleware Applies It

```go
// Example from routes.go
r.Group(func(r chi.Router) {
    r.Use(appmiddleware.RequireAdmin)                    // role == admin
    r.Use(appmiddleware.RequirePermission("users.read")) // finer-grained
    r.Get("/api/admin/users", h.AdminListUsers)
})
```

The `RequirePermission` middleware:
1. Extracts user from context (must already be authenticated)
2. Calls `rbacService.HasPermission(user.ID, "users", "read")`
3. On false → 403 with generic message

**Important**: Permission strings are **flat** (e.g. `"billing.write"`, not hierarchical). This is intentional for simplicity.

---

## 4. Circuit Breaker + Multi-Key Rotation Interaction

### Circuit Breaker State Machine (`pkg/llm/circuitbreaker/circuitbreaker.go`)

Classic 3-state with extra safeguards:

```
Closed (normal)
  - failures < 5 → stay closed
  - failures >= 5 → transition to Open, record lastFailureTime

Open (failing fast)
  - time since lastFailure < 30s → immediately return ErrCircuitOpen
  - time >= 30s → transition to HalfOpen, reset halfOpenCalls = 0

HalfOpen (probing recovery)
  - Allow up to 3 calls (HalfOpenMaxCalls)
  - Any failure → back to Open
  - 2+ successes (SuccessThreshold) → back to Closed
```

### How It Wraps Providers

Every provider registered in `pkg/llm/provider/registry.go` is wrapped:

```go
provider := NewOpenAIProvider(keys...)
provider = circuitbreaker.New(provider, DefaultConfig())
registry.Register(provider)
```

### Interaction with Multi-Key Rotation

**Critical ordering** (in `provider/openai.go` and generic):

1. Circuit breaker is **outside** the key rotation logic.
2. When a call fails inside the breaker, the provider's `NextKey()` has **already** been called for that attempt.
3. On circuit open, **all keys** for that provider are effectively black-holed for 30s.

**Failure Attribution**:
- The breaker counts **any** error from the provider (auth errors, rate limits, 5xx, network, etc.).
- This is somewhat coarse — a single bad secondary key can open the circuit for the whole provider.
- Mitigation: providers expose `Health()` which is called periodically by the watcher and can force-close circuits.

---

## 5. Streaming Translation Layer — Anthropic ↔ OpenAI Format

This is one of the most complex and subtle parts of the system.

### The Core Challenge

Anthropic's streaming format is fundamentally different from OpenAI's:

**OpenAI SSE**:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

**Anthropic SSE**:
```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: ...

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}

event: message_stop
data: ...
```

### The Translator's Job (`pkg/llm/translator/` + `handler/`)

When a client calls `/v1/chat/completions` (OpenAI format) but the backend routes to Anthropic:

1. **Request translation** (`openai_to_anthropic.go`):
   - Converts `messages[]` + `system` into Anthropic's `messages[]` + top-level `system`
   - Maps `tool_choice`, `tools`, temperature, etc.

2. **Stream translation on the fly** (`handler/handler.go:67`):
   - The provider returns `<-chan StreamChunk` (internal canonical format).
   - As chunks arrive, `TranslateStreamChunk` is called for **each** raw Anthropic event.
   - The translator maintains **state** across events (current content block index, whether we've emitted `message_start`, etc.).

3. **Response translation** for non-streaming.

### Why Direct HTTP Instead of Anthropic SDK?

The official Anthropic Go SDK at the time did not give fine-grained control over the raw SSE event stream needed for low-latency, zero-copy translation of `content_block_delta` events. Direct HTTP + manual event parsing gives the translator exactly the bytes it needs.

### Invariant

The translator **never** buffers the entire response. It is a pure streaming transducer. Memory usage is O(1) with respect to response length.

---

## 6. API Key Security Model — Hashing + Legacy Dual Lookup

### Creation (only time raw key is shown)

```go
raw := "dra_" + secureRandom(32)           // 64 hex chars after prefix
hash := hmac_sha256(raw, AUTH_SECRET)      // pepper = AUTH_SECRET
storeInDB(rawHash: hash, ...)
return raw to user (shown once)
```

### Every Authenticated Request

```go
// Fast path (99.9% of keys after migration)
h := hmac_sha256(providedKey, AUTH_SECRET)
key := repo.GetByHash(h)

// Slow path (legacy unhashed keys still in DB during transition)
if key == nil {
    key = repo.GetByRawKey(providedKey)   // full table scan or index on raw key
    if key != nil {
        log.Warn("legacy raw key used — migration debt")
    }
}
```

**Security Properties**:
- Even if the entire `api_keys` table is dumped, attacker cannot use the keys without also knowing `AUTH_SECRET`.
- The pepper (`AUTH_SECRET`) is the same secret used for JWTs — convenient but means JWT compromise = API key hash compromise (acceptable trade-off in this architecture).

---

## 7. Async Side Effects Pattern — The "Fire and Forget" Contract

This is the most important **consistency model** decision in the entire platform.

### The Pattern (seen in chat, embeddings, batch, etc.)

```go
func (h *Handler) ChatProxy(...) {
    resp := pipeline.Execute(...)           // the expensive LLM call

    writeResponse(w, resp)                  // user gets answer NOW

    go func() {                             // everything below is best-effort
        logID := h.logs.Insert(...)
        h.credits.DeductForUsage(..., logID)
        h.webhooks.Dispatch("request.completed", ...)
        h.analytics.UpdateAggregates(...)
    }()
}
```

### Why This Exists

- LLM responses can take 5–60+ seconds for large outputs.
- Users (and SDKs) expect low tail latency on the actual content.
- Database writes + webhook delivery + analytics updates would add hundreds of milliseconds even on success.

### The Trade-offs (Explicitly Accepted)

**Pros**:
- Excellent perceived performance.
- Partial failure of side effects does not affect the user.

**Cons & Mitigations**:
- **Lost billing**: If the goroutine panics or the process crashes between response and deduction, user got free inference.
  - Mitigation: `suspicious_activities` table + daily reconciliation jobs + alerting on large negative `credit_transactions` gaps.
- **Lost audit logs**: Same risk.
  - Mitigation: Structured logs at INFO level are still written synchronously before the goroutine; DB log is best-effort.
- **Webhook "at least once" is actually "best effort"** under crash.
  - Mitigation: The retry worker can be made to also pick up deliveries that were created but never attempted (on restart it scans for `delivered_at IS NULL AND attempts < 5`).

**This is not a bug** — it is a documented, intentional trade-off. The comment in the code and in `CLAUDE.md` makes this clear.

---

## 8. Rate Limiting — Two Implementations, Same Interface

### In-Memory (`middleware/ratelimit.go`)

```go
type RateLimiter struct {
    store  map[string]*rateEntry   // key → {count, resetAt}
    window time.Duration
    max    int
    mu     sync.Mutex
}
```

- Sliding window approximated by "resetAt" timestamp.
- Background goroutine cleans expired entries every 5 minutes.
- **Per-process**. Loses all state on restart or horizontal scale.

### Redis Implementation

Activated automatically when `REDIS_URL` is set. Uses:
- `INCR` + `EXPIRE` with a composite key that encodes the window.

Same interface (`RateLimiterInterface`), so handlers don't care.

### Special Case: Auth Endpoints

Hard-coded 10 requests per minute per IP on `/auth/*` routes, regardless of global rate limiter settings. Defense against credential stuffing and password reset abuse.

---

## 9. Admin Error Handling Philosophy

From `internal/handler/admin_errors.go`:

```go
func adminError(w http.ResponseWriter, err error) {
    logger.Error("admin operation failed", "error", err)
    response.Error(w, 500, "internal server error")  // NEVER err.Error()
}
```

**Rationale**:
- Admin endpoints are extremely powerful.
- Leaking stack traces, SQL errors, or internal IDs to an admin UI that might be screenshotted or logged is a data leak / reconnaissance vector.
- Even "trusted" admins should not see raw error details in production.

This is stricter than normal user-facing error handling.

---

## 10. SSE Notification Hub — Per-User Fanout

`internal/handler/sse.go`:

```go
type NotificationHub struct {
    clients     map[string][]chan SSEEvent   // userID → []subscriber channels
    broadcastCh chan SSEEvent
}
```

**Flow**:
1. Authenticated user hits `GET /api/notifications/stream` (with `Accept: text/event-stream`).
2. Handler registers a buffered channel (size 10) under their `userID`.
3. Hub runs a select loop:
   - On broadcast → fan out to all channels for that userID.
   - Every 30s → send `:keepalive` comment to all clients.
4. On client disconnect or context cancel → remove channel, close it.

**Why per-user fanout instead of global broadcast?**
- Most notifications are user-specific (credit alerts, job completion, new shared key, etc.).
- Avoids every connected admin receiving every user's events.

**Backpressure**: If a user's channel buffer fills (slow client), the hub drops the event for that client only (non-blocking send with `select` + `default`).

---

## 11. Token Blacklist & Forced Logout

`internal/middleware/token_blacklist.go` + `service/token_blacklist.go`:

- On logout (or password change, or admin force-logout), the JWT `jti` (or the entire token string) is added to `token_blacklist` table (or Redis set with TTL = remaining token lifetime).
- Every authenticated request (except public routes) checks the blacklist **after** JWT signature validation but **before** proceeding.
- This enables immediate revocation without waiting for natural expiry.

**Performance note**: Blacklist checks are cached for 30–60 seconds per token in the hot path to avoid a DB/Redis roundtrip on every request.

---

## 12. Fine-Tuning & Export Job Lifecycles (Async Job Pattern)

Both systems follow the same high-level pattern:

1. User submits job via API → row created in `fine_tuning_jobs` / `export_jobs` with `status = 'queued'`.
2. Background worker (goroutine pool or external queue) picks up `queued` jobs.
3. Worker updates `status = 'running'`, `started_at`, `progress`.
4. On completion: `status = 'completed'`, `result_*` columns populated, `ended_at`.
5. On failure: `status = 'failed'`, `error` column, optional retry count.
6. User polls `GET /api/fine-tuning/[id]` or receives webhook.

**Dataset storage** for fine-tuning currently uses the generic `files` table + a JSONL MIME type check.

---

## 13. Provider Plugin System — Runtime Extensibility

Introduced in migration `013_provider_plugins.sql`:

Admins can register entirely new providers at runtime via `POST /api/admin/provider-plugins` without restarting the backend.

**Plugin record**:
- `name`, `base_url`, `auth_header_name`, `auth_header_value` (encrypted at rest)
- `headers` (extra static headers as JSONB)
- `enabled` flag

At startup (and on plugin CRUD), the `provider_plugin.go` service registers these as `GenericProvider` instances in the LLM registry.

This is how self-hosted vLLM, Ollama, or custom company gateways can be added without code changes.

**Security model**: Only super-admins can create plugins. The `auth_header_value` is stored encrypted (separate key from `AUTH_SECRET`).

---

## Cross-Cutting Invariants (Must Never Be Violated)

1. **Balance is the only hard gate** — Budget columns are informational.
2. **Raw API keys exist in plaintext in exactly one place** — the response body of the initial `POST /api/keys` call.
3. **Admin error responses are always generic** — full details only in logs.
4. **Streaming translation is zero-buffer** — memory does not grow with response size.
5. **Async side effects after response are best-effort** — documented and monitored, not guaranteed.
6. **Circuit breaker wraps the entire provider**, not individual keys.
7. **Webhook deliveries are signed with per-webhook secrets** — never shared secrets.
8. **JWT + API key + session all resolve to the same `domain.User` + optional `domain.APIKey` objects** in the request context.

---

## Summary

This platform makes several sophisticated but pragmatic engineering decisions:

- **Performance over strict consistency** for billing and audit (async side effects).
- **Defense in depth** for permissions and admin operations.
- **Streaming transducers** instead of buffering for translation.
- **Simple but effective** circuit breaker + key rotation model.
- **Observable DLQ** via normal tables rather than exotic infrastructure.

Understanding these trade-offs is essential before modifying any of the core paths (especially quota, credits, webhooks, translator, or auth middleware).

---

**End of Detailed Analysis**
