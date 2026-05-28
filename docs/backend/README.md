# Go Backend — Source-Level Reference

The backend lives in `apps/backend/` and is a **Go 1.25** service using **chi router v5**, **pgx v5** PostgreSQL driver, **JWT authentication**, and a comprehensive **LLM pipeline** for AI request proxying.

---

## Tech Stack

| Technology               | Purpose                            | Version |
| ------------------------ | ---------------------------------- | ------- |
| Go                       | Runtime & Language                 | 1.25.0  |
| Chi Router               | HTTP Router & Middleware           | v5.2.5  |
| pgx                      | PostgreSQL Driver + Pool           | v5.9.2  |
| golang-jwt               | Token Authentication               | v5.3.1  |
| Prometheus client_golang | Metrics Collection                 | v1.23   |
| slog                     | Structured Logging                 | stdlib  |
| go-redis                 | Redis Client                       | v9      |
| google/uuid              | UUID Generation                    | v1.6    |
| stripe-go                | Payment Processing                 | v76     |
| go-openai (sashabaranov) | Provider SDK                       | v1.41   |
| openai-go (official)     | Official OpenAI SDK                | v3.35   |
| anthropic-sdk-go         | Official Anthropic SDK             | v1.43   |
| golang.org/x/crypto      | argon2id + bcrypt Password Hashing | v0.51   |

---

## Server Startup Sequence (`cmd/api/main.go`)

```
config.Load()
  -> db.New(databaseURL)        [pgx pool: 20 max conns, 2 min, 1h lifetime]
  -> Redis init                  [optional, via REDIS_URL]
  -> Repository creation         [user, apikey, credits, transactions, logs]
  -> LLM provider init           [nvidia, openai, anthropic, groq, gemini]
     -> Cache init               [memory or Redis, configurable TTL]
     -> Watcher init             [global error observer with registerAll]
     -> MultiKey rotation        [if secondary keys configured]
     -> CircuitBreaker wrap      [default: 5 failures, 30s timeout]
  -> Service wiring              [15+ services with DI]
  -> Handler construction        [New() with all dependencies]
  -> Chi router setup            [global middleware + route groups]
  -> Metrics server              [separate goroutine on :9090 with CORS]
  -> HTTP server                 [:8080, ReadTimeout=15s, WriteTimeout=120s]
  -> Graceful shutdown           [signal.Notify SIGINT/SIGTERM]
```

### Server Configuration

```go
srv := &http.Server{
    Addr:         ":" + cfg.Port,     // default :8080
    Handler:      r,                  // chi router
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 120 * time.Second,  // supports long SSE streams
    IdleTimeout:  60 * time.Second,
}
```

---

## Chat Proxy Flow (`internal/handler/handler.go:ChatProxy`)

```
1. Decode JSON body -> domain.ChatRequest
2. Validate (messages required, default model "qwen/qwen3-coder-480b-a35b-instruct")
3. Content moderation check via h.moderator (local)
4. API key scoping check (max tokens per request)
5. Estimate tokens (char-based + word-based heuristic)
6. Balance check (sufficient credits for minimum 100 cost)
7. Tracing span start (tagged with user_id, model)
8. ChatStream via providerSvc -> <-chan StreamChunk
9. SSE response: "data: {choices:[{delta:{content:...}}]}\n\n"
10. Async goroutine: LogAndDeduct + webhook dispatch
```

### Token Estimation (`pkg/llm/helper.go`)

```go
// 4 chars = 1 token heuristic
charEstimate := utf8.RuneCountInString(text) / 4
// 0.75 words = 1 token
wordEstimate := int(float64(len(words)) * 1.33)
// 1.2x density for code
if countCodeBlocks(text) > 0 { wordEstimate *= 1.2 }
avg := (charEstimate + wordEstimate) / 2
```

Cost = (inputTokens + outputTokens) \* 2, minimum 100 credits.

### SSE Format

```
data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n
data: [DONE]\n\n
```

---

## OpenAI Proxy (`internal/handler/openai_proxy.go`)

```go
func (h *Handler) OpenAIChatCompletions(w, r) {
    // 1. Decode openai.ChatCompletionRequest
    // 2. Resolve model aliases (cfg.ModelAliases map)
    // 3. Check X-Sandbox header for test mode
    // 4. Extract user/apiKeyID from context
    // 5. openai.ToInternalRequest() -> llm.ChatRequest
    // 6. ModelRouter.Route() for intelligent provider selection
    // 7. ABRouter.Route() for A/B testing
    // 8. BudgetRouter for cost-aware fallback
    // 9. Stream or non-stream response
    // 10. Async billing (asyncLogAndDeduct)
}
```

OpenAI error format: `{"error":{"message":"...","type":"invalid_request_error|authentication_error|insufficient_quota|api_error"}}`

---

## Full Route Table

### Public

| Method | Path              | Handler          |
| ------ | ----------------- | ---------------- |
| GET    | /health           | h.Health         |
| GET    | /health/providers | h.ProviderHealth |

### Auth (10 req/min per-IP rate limit)

| POST | /auth/signup | h.Signup |
| POST | /auth/login | h.Login |
| POST | /auth/oauth | h.OAuthLogin |
| POST | /auth/forgot-password | h.ForgotPassword |
| POST | /auth/reset-password | h.ResetPassword |

### OpenAI-Compatible Proxy (auth + quota)

| POST | /v1/chat/completions | h.OpenAIChatCompletions |
| POST | /v1/messages | h.AnthropicMessages |
| POST | /v1/embeddings | h.OpenAIEmbeddings |
| GET | /v1/models | h.OpenAIListModels |

### Protected (auth + quota): 40+ routes

| GET/PUT | /auth/me, /auth/profile, /auth/password | User management |
| GET/POST/DELETE/POST | /api/keys/_ | API key CRUD + revoke |
| GET/POST | /api/credits/_, /api/credits/budget | Credit management |
| GET | /api/transactions | Transaction history |
| GET | /api/logs | Request logs |
| GET | /api/analytics | Usage analytics |
| GET | /api/models | Model list |
| POST | /api/chat | Streaming chat proxy |
| POST | /api/embeddings | Embedding generation |
| GET/POST/DELETE | /api/conversations/_ | Conversation CRUD |
| GET/POST/DELETE | /api/prompts/_ | Prompt CRUD + render |
| GET/POST/PUT/DELETE | /api/webhooks/_ | Webhook CRUD |
| GET/POST/DELETE | /api/organizations/_ | Org management + invites |
| POST/GET | /api/batch/_ | Batch job submission |
| POST/GET | /api/files/_ | File upload + list |
| POST | /api/validate | Structured output validation |
| GET | /api/notifications/stream | SSE notification stream |
| POST | /api/promos/redeem | Promo code redemption |
| POST | /webhooks/stripe | Stripe webhook (public) |
| POST | /api/invites/accept | Accept org invite |

### Admin (auth + admin role): 60+ endpoints

Users: List, get detail, update status/role, delete, impersonate, bulk suspend, list keys, list usage
Providers: List, create, get, update, toggle status, manage keys (add, delete, reorder)
Models: List, create, toggle status, manage aliases
Billing: Revenue summary, transactions, adjust credits, daily usage
Settings: List, update, feature flags (create, toggle)
Security: List/review suspicious, manage IP allow/block, IP access logs
Other: Audit log, announcements, promos, groups, reports, changelog, admins, SSO, cost (optimizations, forecast, breakdown), operations (cache stats/clear, webhook logs/retry)

---

## Complete Middleware Chain

```go
r.Use(chiMiddleware.Recoverer)
r.Use(chiMiddleware.RequestID)
r.Use(chiMiddleware.RealIP)
r.Use(chiMiddleware.Timeout(cfg.RequestTimeout))  // default 30s
r.Use(appmiddleware.RequestContext)
r.Use(appmiddleware.TraceMiddleware)
r.Use(appmiddleware.BodyLimit(10 << 20))           // 10MB
r.Use(appmiddleware.RequestLogger)
r.Use(appmiddleware.Metrics)
r.Use(appmiddleware.TransformMiddleware(...))
r.Use(cors.Handler(cors.Options{
    AllowedOrigins:   corsOrigins,        // configurable
    AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Api-Key"},
    AllowCredentials: true,
    MaxAge:           300,
}))
r.Use(appmiddleware.RateLimit)     // memory or Redis sliding window
r.Use(authMW)                      // JWT / Session / API Key
r.Use(quotaMW)                     // API key quota tracking
```

---

## Repository Layer: API Key Pattern (`internal/repository/apikey.go`)

```go
func HashAPIKey(key, pepper string) string {
    mac := hmac.New(sha256.New, []byte(pepper))
    mac.Write([]byte(key))
    return hex.EncodeToString(mac.Sum(nil))
}
```

Key SQL patterns:

```sql
-- Lookup by key (hashed first, then raw fallback for legacy)
SELECT id, user_id, name, key, last_used, created_at, revoked_at,
    allowed_models, allowed_ips, max_tokens_per_request,
    daily_request_limit, monthly_token_limit
FROM api_keys WHERE key = $1

-- Create with HMAC-SHA256 hashed key
INSERT INTO api_keys (id, user_id, name, key) VALUES ($1, $2, $3, HashAPIKey($4))
RETURNING id, user_id, name, key, last_used, created_at, revoked_at

-- Touch last_used
UPDATE api_keys SET last_used = NOW() WHERE id = $1

-- Revoke
UPDATE api_keys SET revoked_at = NOW() WHERE id = $1

-- Delete
DELETE FROM api_keys WHERE id = $1 AND user_id = $2
```

Security: `k.Key = ""` after every query — stored hash never returned to client.

---

## Services

| Service             | Key Methods                                                                                        | Dependencies                                |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| UserService         | Register (argon2id), Authenticate, OAuthLogin, ChangePassword, RequestPasswordReset, ResetPassword | UserRepo, token package                     |
| APIKeyService       | Create (dra\_ prefix + 32 bytes hex), List, Delete, Revoke                                         | APIKeyRepo (with pepper)                    |
| CreditService       | GetBalance, Purchase, CheckBalance, LogAndDeduct, SetBudget, ListTransactions                      | CreditsRepo, TxRepo, LogRepo, StripeService |
| AnalyticsService    | UserAnalytics (summary + model breakdown + daily usage), PlatformStats                             | LogRepo, UserRepo, CreditsRepo              |
| ProviderService     | ListModels, Chat, ChatStream, DefaultModel, EstimateTokens                                         | LLM Registry, Cache, Watcher                |
| WebhookService      | CRUD + Dispatch with retry                                                                         | WebhookRepo                                 |
| BatchService        | SubmitBatch, GetBatchJob                                                                           | BatchRepo                                   |
| OrganizationService | CRUD + Invite/Remove/Accept                                                                        | OrgRepo, UserRepo                           |
| AdminService        | 10+ admin operation groups                                                                         | 8 admin repos                               |
| StripeService       | CreateCheckoutSession, HandleWebhook                                                               | Stripe SDK                                  |
| SandboxService      | Test mode (skip quota/cost/logging)                                                                | ProviderService                             |
| ExperimentService   | A/B provider experiments                                                                           | LLM Registry                                |

---

## Makefile Commands

```makefile
build: go build -o api ./cmd/api
dev:   go run ./cmd/api
run:   build + ./api
test:  go test -race -cover ./...
test-unit: go test -v -short ./...
test-integration: go test -v -race ./internal/handler/... ./tests/integration/... (needs TEST_DATABASE_URL)
test-coverage: go test -race -coverprofile=coverage.out ./... + go tool cover -func=coverage.out
coverage-html: test-coverage + go tool cover -html=coverage.out -o coverage.html
vet:   go vet ./...
lint:  vet + staticcheck
fmt:   go fmt ./... + goimports -w .
clean: rm -f api coverage.out coverage.html
docker: docker build -t dra-backend .

export PATH := $(HOME)/.local/go/bin:$(PATH)
```
