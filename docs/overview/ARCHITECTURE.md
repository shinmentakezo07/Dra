# Architecture — Source-Level Reference

---

## Domain Error System (`internal/domain/errors.go`)

```go
type ErrorCode string

const (
    ErrUnauthorized      ErrorCode = "UNAUTHORIZED"
    ErrForbidden         ErrorCode = "FORBIDDEN"
    ErrBadRequest        ErrorCode = "BAD_REQUEST"
    ErrNotFound          ErrorCode = "NOT_FOUND"
    ErrConflict          ErrorCode = "CONFLICT"
    ErrRateLimited       ErrorCode = "RATE_LIMITED"
    ErrPaymentRequired   ErrorCode = "PAYMENT_REQUIRED"
    ErrInternal          ErrorCode = "INTERNAL_ERROR"
    ErrServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
)

type AppError struct {
    Code    ErrorCode `json:"code"`
    Message string   `json:"message"`
    Status  int      `json:"-"`
    Cause   error    `json:"-"`
}
```

**Pre-defined errors**: ErrAuthRequired (401), ErrInvalidToken (401), ErrInvalidAPIKey (401), ErrAdminOnly (403), ErrBadInput (400), ErrUserNotFound (404), ErrKeyNotFound (404), ErrWebhookNotFound (404), ErrEmailExists (409), ErrTooManyRequests (429), ErrNoCredits (402), ErrAIUnavailable (503)

`NewError(code, status, msg)` creates standalone. `Wrap(code, status, msg, cause)` wraps underlying error.

---

## JWT Token System (`internal/pkg/token/token.go`)

```go
type Claims struct {
    UserID string `json:"sub"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func Generate(userID, email, role, secret string) (string, error)
func Parse(tokenStr, secret string) (*Claims, error)
```

- Algorithm: HS256 only (enforced in Parse with `jwt.WithValidMethods([]string{"HS256"})`)
- Default expiry: 7 days
- Claims: sub, email, role, exp, iat
- Secret: shared AUTH_SECRET env var (must match between frontend and backend)

---

## Auth Middleware (`internal/middleware/auth.go`)

Three methods tried in order:

### 1. API Key Header
```
x-api-key: <key>
```
HMAC-SHA256 hash with AuthSecret as pepper -> lookup in api_keys table -> inject User + APIKey into context

### 2. Bearer Token
```
Authorization: Bearer <jwt>
```

### 3. Session Cookie
Checks in order: `authjs.session-token`, `__Secure-authjs.session-token`, `next-auth.session-token`, `__Secure-next-auth.session-token`

### JWT Validation
1. Parse HS256, validate signing method
2. Check `exp` claim (float64 -> unix timestamp)
3. Extract `sub` claim (userID)
4. Look up user in database (verifies user still exists + gets role)
5. Inject `*domain.User` into context

### Context Helpers
```go
func GetUser(r) *domain.User       // nil if not authenticated
func GetAPIKey(r) *domain.APIKey   // nil if not using API key
func RequireAuth(next) http.HandlerFunc
func RequireAdmin(next) http.HandlerFunc    // checks u.IsAdmin()
func RequirePermission(perm) func(http.HandlerFunc) http.HandlerFunc
```

---

## Response Helpers (`internal/pkg/response/response.go`)

```go
type Body struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Total      int `json:"total"`
    Page       int `json:"page"`
    Limit      int `json:"limit"`
    TotalPages int `json:"totalPages"`
}

func JSON(w, status, body)       // raw
func OK(w, data)                 // 200
func Created(w, data)            // 201
func Error(w, status, message)   // error JSON
func Paginated(w, data, total, page, limit)  // with meta
```

---

## Logger (`internal/pkg/logger/logger.go`)

- JSON output to stdout via `log/slog`
- Default: `slog.LevelInfo`, `ENV=development` enables `slog.LevelDebug`
- Functions: `Debug`, `Info`, `Warn`, `Error`, `With(args)`

---

## Database (`internal/db/db.go`)

```go
type DB struct { Pool *pgxpool.Pool }
```

| Config | Value |
|--------|-------|
| MaxConns | 20 |
| MinConns | 2 |
| MaxConnLifetime | 1 hour |
| MaxConnIdleTime | 30 min |
| HealthCheckPeriod | 5 min |
| ConnectTimeout | 5s |

`Health(ctx)`: 2s timeout ping. `Close()`: graceful pool shutdown.

---

## Rate Limiter (`internal/middleware/ratelimit.go`)

### In-Memory
```go
type RateLimiter struct {
    store  map[string]*rateEntry   // key -> {count, resetAt}
    window time.Duration
    max    int
}
```
Sliding window per key (RemoteAddr or UserID). Background cleanup every 5 min. Returns 429.

### Redis
Same interface but uses `INCR` + `EXPIRE`. Activated when `REDIS_URL` is set.

Auth endpoints get stricter 10 req/min limiter.

---

## SSE NotificationHub (`internal/handler/sse.go`)

```go
type NotificationHub struct {
    clients     map[string][]chan SSEEvent  // userID -> []subscriber channels
    broadcastCh chan SSEEvent
}

type SSEEvent struct {
    UserID  string
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"`
    Time    time.Time       `json:"time"`
}
```

**Flow**: Subscribe (buffered ch 10) -> "connected" event -> 30s keepalive pings -> Send() via broadcast channel -> fan out to user's subscribers -> Unsubscribe on disconnect.

---

## Main Server (`cmd/api/main.go`)

### Startup (wiring diagram)

```
Config  ->  DB Pool  ->  Redis  ->  Repos  ->  LLM Providers  ->  Services  ->  Handler  ->  Chi Router  ->  HTTP Server
                                                                                                                           |
                                                                                                                    Metrics Server
```

### Complete Middleware Chain

```go
r.Use(chiMiddleware.Recoverer)                    // panic recovery
r.Use(chiMiddleware.RequestID)                    // X-Request-ID
r.Use(chiMiddleware.RealIP)                       // X-Forwarded-For
r.Use(chiMiddleware.Timeout(cfg.RequestTimeout))  // default 30s
r.Use(appmiddleware.RequestContext)               // context values
r.Use(appmiddleware.TraceMiddleware)              // tracing spans
r.Use(appmiddleware.BodyLimit(10 << 20))           // 10MB
r.Use(appmiddleware.RequestLogger)                // structured logging
r.Use(appmiddleware.Metrics)                      // Prometheus
r.Use(appmiddleware.TransformMiddleware(...))      // transforms
r.Use(cors.Handler(cors.Options{...}))            // CORS
r.Use(appmiddleware.RateLimit(...))               // memory or Redis
r.Use(authMW)                                     // JWT/Session/Key
r.Use(quotaMW)                                    // quota tracking
```

### Route Groups

| Group | Middleware | Routes |
|-------|-----------|--------|
| Public | None | /health, /health/providers |
| Auth (strict RL) | 10 req/min per-IP | /auth/* (5 endpoints) |
| OpenAI proxy | auth + quota | /v1/* (4 endpoints) |
| Protected | auth + quota | 40+ API routes |
| Stripe webhook | None (sig verified) | /webhooks/stripe |
| Admin | auth + admin role | 60+ admin routes |
| Metrics | CORS only | /metrics (separate :9090) |

### Graceful Shutdown

```go
signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
srv.Shutdown(ctx)  // configurable timeout, default 10s
```

---

## Provider Architecture (`pkg/llm/provider/`)

| Type | SDK | Auth | Base URL |
|------|-----|------|----------|
| OpenAIProvider | sashabaranov/go-openai | Bearer token | https://api.openai.com/v1 |
| AnthropicProvider | Direct HTTP | x-api-key header | https://api.anthropic.com/v1 |
| GenericProvider | sashabaranov/go-openai | Bearer token | Per-instance config |
| SandboxProvider | Mock (no API) | None | N/A |

**MultiKey rotation**: Round-robin across primary + secondary API keys.

**CircuitBreaker wrapping**: 5 failures → open (30s) → 2 successes half-open → closed

---

## Repository: API Key Pattern

```go
func HashAPIKey(key, pepper string) string {
    mac := hmac.New(sha256.New, []byte(pepper))
    mac.Write([]byte(key))
    return hex.EncodeToString(mac.Sum(nil))
}
```

Keys stored as HMAC-SHA256 hash. Dual lookup (hash first, raw fallback for legacy). `k.Key = ""` on every query — hash never returned to client.

---

## Error Handling Patterns

| Layer | Pattern |
|-------|---------|
| Handler | Decode -> call service -> check AppError -> write response |
| Service | Returns `*domain.AppError`, wraps DB errors with context |
| Repository | Raw pgx SQL, returns Go errors (pgx.ErrNoRows → nil, nil) |
| Middleware | Chain with short-circuit on failure |
| Async | `defer recover()` in goroutines |
| HTTP | Consistent `{success, data, error, meta}` envelope |

---

## Environment Quirks

- `.npmrc` has `legacy-peer-deps=true` — do not remove
- `AUTH_SECRET` must be identical frontend ↔ backend (HS256 JWT)
- Drizzle uses `@neondatabase/serverless` even for local Postgres
- `tsconfig.json` excludes `db/seed*.ts` and `scripts/**/*` from type checking
- Go binary path: `$(HOME)/.local/go/bin/go` or Makefile prepends PATH
- `ENV=development` enables `slog.LevelDebug`
- Module path: `dra-platform/backend` in all Go imports
- Frontend `@/` → `apps/web/` root
- Next.js `output: 'standalone'`; Docker entry: `apps/web/server.js`
- Tailwind CSS v4: `@tailwindcss/postcss` plugin (not v3 config)
