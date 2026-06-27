# Backend Audit: Errors, Missing Logic, Wiring Issues & System Gaps

> Generated 2026-05-23 from full codebase scan of `apps/backend/`
> Last updated: 2026-05-23 — fixes applied (see [Fixes Applied](#fixes-applied))

## CRITICAL — Runtime Panics

| #   | File                               | Line    | Issue                                                                                                                                                                   |
| --- | ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `pkg/sdk/client.go`                | 173-176 | `get()` has empty `if err != nil {}` block — error is silently discarded, then `decodeJSON(resp, v)` is called on nil `resp`, causing **nil pointer dereference panic** |
| C2  | `pkg/sdk/client.go`                | 185-189 | Same nil-deref bug in `post()`                                                                                                                                          |
| C3  | `pkg/sdk/client.go`                | 198-202 | Same nil-deref bug in `put()`                                                                                                                                           |
| C4  | `pkg/sdk/client.go`                | 205-210 | Same nil-deref bug in `delete()`                                                                                                                                        |
| C5  | `pkg/llm/translator/translator.go` | ~201    | `ExtractOpenAIContent` accesses `resp.Choices[0]` without bounds check — **panics on empty choices**                                                                    |
| C6  | `pkg/llm/cache/dedup.go`           | ~75     | `Do()` does `v.(*llm.ChatResponse)` type assertion without comma-ok check — **panics if fn returns wrong type**                                                         |

## HIGH — Bugs & Security Issues

| #   | File                                     | Line     | Issue                                                                                                                                                                                        |
| --- | ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `internal/middleware/auth.go`            | 141-153  | `RequireAdmin` only checks `u.IsAdmin()` which returns `u.Role == "admin"`, missing `"superadmin"` — superadmin users are **blocked from admin endpoints**                                   |
| H2  | `internal/domain/models.go`              | 24       | `User.IsAdmin()` only checks `Role == "admin"`, not `"superadmin"` — inconsistent with `HasPermission()` which treats superadmin as all-powerful                                             |
| H3  | `internal/domain/admin.go`               | 275-282  | `AdminUser.HasPermission()` doesn't check superadmin role unlike `User.HasPermission()` — two parallel permission systems with different behavior                                            |
| H4  | `internal/middleware/redis_ratelimit.go` | 40       | Uses `context.Background()` instead of propagating request context — loses tracing/cancellation                                                                                              |
| H5  | `internal/middleware/redis_ratelimit.go` | 56       | Returns `false` (blocks request) on Redis error — **fail-closed**. If Redis is down, ALL requests are blocked                                                                                |
| H6  | `internal/middleware/redis_quota.go`     | 63, 96   | Uses `context.Background()` + **fail-open** on Redis errors — quota limits are **bypassed** when Redis is down                                                                               |
| H7  | `internal/middleware/quota.go`           | 231-237  | `QuotaCheck` middleware reads entire request body **twice** (lines 231 and 237) — expensive for large payloads                                                                               |
| H8  | `internal/middleware/quota.go`           | 241      | Uses `r.RemoteAddr` instead of `clientIP()` helper — misses X-Forwarded-For behind proxies                                                                                                   |
| H9  | `internal/pkg/password/password.go`      | 14       | `argon2Time = 1` — very low time parameter, insufficient for production security (OWASP recommends >= 3)                                                                                     |
| H10 | `internal/pkg/response/response.go`      | 25       | `_ = json.NewEncoder(w).Encode(body)` — silently discards JSON encoding errors                                                                                                               |
| H11 | `pkg/llm/provider/provider.go`           | ~492-522 | `RouteRequest` and `RouteStreamRequest` **mutate** `req.Model` in place (strips provider prefix) — caller's request is corrupted, breaks retries                                             |
| H12 | `pkg/llm/cache/redis.go`                 | ~91      | `RedisCache.Clear()` calls `FlushDB()` — **deletes ALL keys** in Redis database, not just LLM cache keys. Dangerous in shared Redis                                                          |
| H13 | `pkg/webhook/webhook.go`                 | 97       | Sends signature as `"sha256="+sig` prefix format                                                                                                                                             |
| H14 | `pkg/sdk/webhook.go`                     | 16       | `VerifyWebhookSignature` compares raw hex without `"sha256="` prefix — **webhook verification always fails**                                                                                 |
| H15 | `pkg/llm/guardrails/guardrails.go`       | ~149-155 | `detectInjection()` sets `Allowed = false` only when risk > 0.8, but a single phrase match gives risk 0.1 (1/10) — **injection detection is effectively disabled** for single-phrase matches |
| H16 | `internal/middleware/auth.go`            | 82-88    | Redundant manual JWT expiry check — `jwt.Parse` with `WithValidMethods` already validates expiry                                                                                             |
| H17 | `internal/middleware/auth.go`            | 99-108   | Inconsistent error handling: `userLookup` error vs nil user both lead to 401 but with different messages ("Invalid token" vs "User not found") — **leaks user existence info**               |

## MEDIUM — Logic Bugs & Missing Functionality

| #   | File                                         | Line           | Issue                                                                                                                                                                                              |
| --- | -------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ---- | ---------------------------------------------------------------------------------------------- |
| M1  | `internal/domain/models.go`                  | 78             | `UserCredits.MonthlyBudget` is `*int` but `RateLimitTier.MonthlyBudget` in `admin.go:106` is `int64` — type mismatch across domain                                                                 |
| M2  | `internal/domain/models.go`                  | 196-203        | `ChatRequest.Validate()` **mutates** `r.Model` by setting a default — violates immutability principle                                                                                              |
| M3  | `internal/domain/models.go`                  | 624-632        | `RateLimit` struct **duplicates** `RateLimitTier` in `admin.go:99-108` — two parallel types for same concept                                                                                       |
| M4  | `internal/domain/errors.go`                  | 44-55          | Missing sentinel errors: `ErrInvalidEmail`, `ErrPasswordTooWeak`, `ErrOrgNotFound`, `ErrConversationNotFound` — referenced but not defined                                                         |
| M5  | `internal/middleware/ratelimit.go`           | 26-35          | In-memory only rate limiter — doesn't scale across multiple instances                                                                                                                              |
| M6  | `internal/middleware/ratelimit.go`           | 59-77          | Cleanup goroutine runs every 5 min — potential unbounded memory growth between cleanups                                                                                                            |
| M7  | `internal/middleware/bodylimit.go`           | 9-19           | No custom error handler — `http.MaxBytesReader` returns generic "http: request body too large" without JSON error response                                                                         |
| M8  | `internal/middleware/token_blacklist.go`     | 29-40          | Duplicates token extraction logic from `auth.go:47-55` — should share a helper                                                                                                                     |
| M9  | `internal/middleware/transform.go`           | 31-39          | Reads body with 10MB limit but only logs warning if exceeded — **truncated body** causes unexpected behavior                                                                                       |
| M10 | `internal/middleware/transform.go`           | 59-109         | Mutates request map directly (line 84: `first["content"] = prompt`) instead of creating a new map                                                                                                  |
| M11 | `internal/middleware/context.go`             | 20-22          | Gets request ID from chi middleware but `tracing.go` has its own request ID — **two competing request ID systems**                                                                                 |
| M12 | `internal/pkg/token/token.go`                | 19             | `Generate()` doesn't accept custom expiry time — hardcoded 7 days, no way to create short-lived tokens                                                                                             |
| M13 | `internal/pkg/logger/logger.go`              | 10-14          | Uses `init()` function — impossible to inject custom loggers in tests                                                                                                                              |
| M14 | `pkg/sdk/types.go`                           | 134-141        | `BudgetConfig` uses `MonthlyLimit`/`DailyLimit` but domain models use `MonthlyBudget`/`DailyBudget` — **naming inconsistency** causes deserialization failures                                     |
| M15 | `pkg/sdk/types.go`                           | 333-341        | `BudgetCap.SoftLimit` is `int` (not pointer) but domain model uses `*int` — can't distinguish between 0 and unset                                                                                  |
| M16 | `pkg/sdk/openai/sdk.go`                      | 82-88          | Role mapping buggy — `oai.UserMessage(m.Content)` always called first even for system/assistant messages, then overwritten                                                                         |
| M17 | `pkg/sdk/utils.go`                           | 50-77          | `ReadSSE` uses fixed 4096-byte buffer — lines longer than 4KB are **split incorrectly**                                                                                                            |
| M18 | `pkg/email/smtp.go`                          | 41             | Uses `smtp.PlainAuth` which sends credentials in plain text — requires TLS connection to be secure                                                                                                 |
| M19 | `pkg/llm/types.go`                           | 262-298        | `Client.Chat()` caches with hardcoded 5-minute TTL — should be configurable                                                                                                                        |
| M20 | `pkg/llm/types.go`                           | 269-273        | Cache key collision: `CacheKey()` doesn't include `TopK` or `ResponseFormat` — requests differing only in those fields get same cache key                                                          |
| M21 | `pkg/llm/helper.go`                          | 196-203        | `ValidateRequest()` **mutates** `req.Temperature` and `req.TopP` via `ClampTemperature`/`ClampTopP` — violates immutability                                                                        |
| M22 | `pkg/llm/helper.go`                          | 377-413        | `DeepCopyRequest` doesn't deep-copy `Metadata` map or `ContentBlocks` in Messages — **shallow copy** allows mutation                                                                               |
| M23 | `pkg/llm/cache/cache.go`                     | 101, 109       | `MemoryCache.Get()` returns `fmt.Errorf("cache miss")` and `fmt.Errorf("cache entry expired")` instead of `ErrCacheMiss` sentinel — callers checking for `ErrCacheMiss` won't match                |
| M24 | `pkg/llm/cache/semantic.go`                  | 103-106        | `SemanticCache.Delete()` is a **no-op** — violates `Cache` interface contract                                                                                                                      |
| M25 | `pkg/llm/cache/redis.go`                     | 100-108        | `RedisCache.Stats()` always returns zeros — misleading                                                                                                                                             |
| M26 | `pkg/llm/circuitbreaker/circuitbreaker.go`   | 184-208        | `wrapStream()` uses `time.After(5s)` per chunk (creates new timer each time) + both success/failure branches call `recordResult(nil)` — **stream failures never recorded**                         |
| M27 | `pkg/llm/guardrails/guardrails.go`           | 76-78          | Default blocked pattern `(?i)\b(attack                                                                                                                                                             | kill | murder | bomb | terrorist)\b` blocks legitimate content (cybersecurity, cooking "kill the heat", self-defense) |
| M28 | `pkg/llm/moderation/moderation.go`           | ~109           | `LocalModerator` email regex uses `[A-Z\|a-z]` — pipe `\|` is treated as literal inside character class, not alternation. Should be `[A-Za-z]`                                                     |
| M29 | `pkg/llm/pipeline/pipeline.go`               | 78-82, 120-136 | `SanitizationStep.Before()` and `ThinkingStep.Before()` **mutate** request fields in place                                                                                                         |
| M30 | `pkg/llm/embeddings/types.go`                | 64             | `RouteRequest` **mutates** `req.Model` by stripping provider prefix — caller's request is modified                                                                                                 |
| M31 | `pkg/llm/router/router.go`                   | 191-203        | `filterByCapability` checks `SupportsThinking()` for tool filtering — thinking support is **unrelated** to tool support                                                                            |
| M32 | `pkg/llm/router/budget.go`                   | 131-138        | `CostEstimate` uses flat `2x` token multiplier regardless of model pricing — over-estimates cheap models, under-estimates expensive ones                                                           |
| M33 | `pkg/llm/tokens/tokens.go`                   | 146-150        | `CalculateCredits` uses `int(usd * 1e6)` which **truncates** rather than rounds — small credits may be lost                                                                                        |
| M34 | `pkg/llm/tools/stream.go`                    | 93-96          | `applyToolCallDelta` appends `delta.Function.Arguments` to existing — **mutates** `json.RawMessage` slice in place                                                                                 |
| M35 | `pkg/llm/translator/openai_to_anthropic.go`  | ~27            | `TranslateRequest` doesn't include `ResponseFormat` — structured output requests silently lose this setting                                                                                        |
| M36 | `pkg/llm/translator/handler/middleware.go`   | 242-243        | `cachedHandler.TranslateRequest` uses `context.Background()` for cache operations instead of propagating request context                                                                           |
| M37 | `pkg/llm/provider/health.go`                 | ~177           | `checkProvider` uses `context.Background()` instead of parent context — loses cancellation propagation                                                                                             |
| M38 | `internal/service/credits.go`                | 52-53          | `Purchase()` calls `s.creditsRepo.Upsert()` inside `WithTx` but `Upsert` uses the pool connection, not the transaction — **not actually transactional**                                            |
| M39 | `internal/repository/admin_audit_repo.go`    | 25             | `Insert()` always wraps error with `fmt.Errorf("insert audit: %w", err)` — even on success (nil err), returns `"insert audit: %!w(<nil>)"`                                                         |
| M40 | `internal/repository/admin_security_repo.go` | 22             | Same issue: `AddIPEntry()` wraps error unconditionally — returns error even on success                                                                                                             |
| M41 | `internal/repository/admin_security_repo.go` | 92             | `ReviewSuspicious()` wraps error unconditionally — returns error even on success                                                                                                                   |
| M42 | `internal/repository/user.go`                | 121            | `List()` runs COUNT query separately without checking its error — `total` could be 0 on error                                                                                                      |
| M43 | `internal/handler/handler.go`                | 501            | `ChatProxy` FINISH: estimates `inputTokens` from `outputBuf.String()` (the **output** buffer) — variable name is misleading, but the value is actually used as input token estimate which is wrong |
| M44 | `internal/handler/handler.go`                | 525            | `ChatProxy` uses `context.Background()` for async billing `errgroup` — loses request-scoped context                                                                                                |

## Wiring & Architecture Issues

| #   | Area                                 | Issue                                                                                                                                                                                                                                              |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | **Handler construction**             | `New()` creates many services internally (conversation, prompt, file, rbac, rate-limit, budget, comparison, fine-tuning, provider-plugin, export) instead of receiving them via DI — makes testing impossible for those services                   |
| W2  | **Handler optional fields**          | `modelRouter`, `budgetRouter`, `abRouter`, `llmCache`, `adminSvc`, `adminSessionRepo`, `emailSender`, `stripeSvc` are all nil by default and set via `Set*()` methods — no compile-time safety, nil dereference risk in all handlers that use them |
| W3  | **Redis failure mode inconsistency** | Redis rate limiter fails **closed** (blocks all requests), Redis quota tracker fails **open** (bypasses limits) — opposite failure modes should be a deliberate, documented choice                                                                 |
| W4  | **Duplicate rate-limit systems**     | In-memory `RateLimiter` + `RedisRateLimiter` + `QuotaTracker` + `RedisQuotaTracker` — four overlapping systems with different semantics                                                                                                            |
| W5  | **Duplicate SSE readers**            | `pkg/llm/provider/provider.go` and `pkg/sdk/utils.go` both have `ReadSSE` with same 4KB buffer limitation                                                                                                                                          |
| W6  | **Duplicate circuit breakers**       | `pkg/llm/circuitbreaker/` and `pkg/llm/watcher/` both implement circuit-breaking with different semantics                                                                                                                                          |
| W7  | **Context propagation gaps**         | `redis_ratelimit.go`, `redis_quota.go`, `health.go`, translator cache middleware, and billing goroutines all use `context.Background()` — lose tracing, cancellation, and deadlines                                                                |
| W8  | **Auth middleware**                  | `RequireAdmin` and `RequirePermission` both check `u.IsAdmin()` which misses superadmin — admin routes are inaccessible to superadmin users                                                                                                        |
| W9  | **Auto-provision admin**             | `routes.go:89-97` auto-creates `admin_users` entry with `superadmin` role and `['*']` permissions when a user with `Role == "admin"` is found but has no admin_users row — this is a security risk (auto-escalation)                               |
| W10 | **CORS configuration**               | `AllowedHeaders` doesn't include `X-Sandbox`, `X-Request-ID`, or custom webhook headers — these may be blocked on preflight                                                                                                                        |

## Missing Logic & Incomplete Implementations

| #   | Area                             | What's Missing                                                                                                                     |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Password validation**          | `SignupRequest.Validate()` only checks length >= 6 — no complexity requirements (uppercase, number, special char)                  |
| L2  | **Email verification**           | No email verification flow after signup — users can use any email                                                                  |
| L3  | **Password reset expiry**        | `GetPasswordReset()` doesn't check if token is expired — expired tokens can still be used                                          |
| L4  | **Password reset reuse**         | `MarkPasswordResetUsed()` doesn't check if token was already used — tokens can be reused                                           |
| L5  | **API key rate limiting**        | API key scoping (`AllowedModels`, `AllowedIPs`) is checked in quota middleware but **not enforced** in the main chat proxy handler |
| L6  | **Webhook URL validation**       | `CreateWebhookRequest.Validate()` doesn't validate URL format — invalid URLs accepted                                              |
| L7  | **Webhook event validation**     | No validation that event types match a known list — any string accepted                                                            |
| L8  | **Organization ownership**       | No check that the user performing org operations is the owner or admin of that org                                                 |
| L9  | **Conversation ownership**       | No check that the user owns the conversation before adding messages or deleting                                                    |
| L10 | **Batch job ownership**          | No check that the user owns the batch job before querying status                                                                   |
| L11 | **File ownership**               | No check that the user owns the file before deleting                                                                               |
| L12 | **Export job ownership**         | No check that the user owns the export job before accessing                                                                        |
| L13 | **Fine-tuning job cancellation** | No endpoint or logic to cancel a running fine-tuning job                                                                           |
| L14 | **User deletion cascade**        | `UserRepo.Delete()` only deletes from `users` table — no cascade for API keys, credits, logs, webhooks, conversations, etc.        |
| L15 | **Admin audit logging**          | Many admin operations (update user status, update role, bulk suspend) don't create audit log entries                               |
| L16 | **Token blacklisting**           | Token blacklist repo exists but no middleware checks it — revoked JWTs can still be used                                           |
| L17 | **Pagination defaults**          | `parsePagination()` defaults to page=1, limit=20 but doesn't validate max page — can request page=999999 for large offset queries  |
| L18 | **Cost calculation**             | Token cost uses flat `(inputTokens + outputTokens) * 2` everywhere — doesn't account for model-specific pricing                    |
| L19 | **Budget alert dedup**           | `checkBudgetAlert()` sends email every time 80% threshold is crossed — no dedup, user gets spammed                                 |
| L20 | **Notification delivery**        | `NotificationHub.Send()` drops events silently if broadcast channel is full (`default:` case)                                      |
| L21 | **SSO**                          | `SSOConfig` model exists but no SSO authentication handler or callback                                                             |
| L22 | **Scheduled reports**            | `ScheduledReport` model exists but no scheduler or report generation logic                                                         |
| L23 | **Changelog**                    | `ChangelogEntry` model exists but no handler or service for changelog management                                                   |
| L24 | **User groups**                  | `UserGroup` model exists but no group management logic                                                                             |
| L25 | **Stripe webhook**               | Stripe service exists for checkout but no webhook handler for payment confirmation                                                 |
| L26 | **Provider key rotation**        | No mechanism to rotate provider API keys — must delete and recreate                                                                |
| L27 | **Model alias deletion**         | Model aliases can be created but there's no delete endpoint                                                                        |
| L28 | **Impersonation audit**          | Impersonation sessions are created but no audit log entry for the impersonation event                                              |

## Performance Issues

| #   | File                                       | Issue                                                                                                    |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| P1  | `pkg/llm/cache/cache.go`                   | `evictOldest()` uses O(n²) bubble sort — acceptable for small counts but should use sort.Slice           |
| P2  | `pkg/llm/tokens/tokens.go`                 | `PricingTable` is hardcoded — must be updated manually when providers change prices                      |
| P3  | `internal/repository/user.go:121`          | `List()` runs two separate queries (SELECT + COUNT) — should use window function or CTE for single-pass  |
| P4  | `internal/repository/admin_audit_repo.go`  | Same two-query pattern for paginated list                                                                |
| P5  | `pkg/llm/circuitbreaker/circuitbreaker.go` | `time.After()` in `wrapStream()` creates new timer per chunk — should use `time.NewTimer` with `Reset()` |
| P6  | `pkg/llm/watcher/watcher.go:186`           | `containsAny` uses `fmt.Sprintf("%s", s)` to convert string to string — unnecessary allocation           |
| P7  | `pkg/llm/openai/formatter.go:221`          | `generateID()` uses `time.Now().UnixNano()` — not unique under concurrency                               |
| P8  | `pkg/llm/anthropic/formatter.go:374`       | Same `time.Now().UnixNano()` uniqueness issue                                                            |

## Dead Code

| #   | File                                   | Issue                                                                                                |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| D1  | `pkg/llm/guardrails/guardrails.go:306` | `sandboxCounter` declared but never used                                                             |
| D2  | `pkg/llm/tools/builtin.go:88-122`      | `NewWebSearchTool()` returns stub that always says "provider_not_configured" — dead code in practice |
| D3  | `pkg/llm/cache/redis.go:100-108`       | `RedisCache.Stats()` returns zeros — effectively dead code                                           |

## Fixes Applied

| #       | Status | Description                                                                  |
| ------- | ------ | ---------------------------------------------------------------------------- |
| C1-C4   | FIXED  | SDK nil-deref in get/post/put/delete — added `return err`                    |
| C5      | FIXED  | `ExtractOpenAIContent` bounds check on `resp.Choices`                        |
| C6      | FIXED  | `DedupCache.Do()` type assertion with comma-ok check                         |
| H1-H2   | FIXED  | `User.IsAdmin()` now includes `"superadmin"`                                 |
| H3      | FIXED  | `AdminUser.HasPermission()` checks superadmin role                           |
| H4      | FIXED  | Redis rate limiter uses request context instead of Background                |
| H5      | FIXED  | Redis rate limiter now fail-open (allow when Redis down)                     |
| H6      | FIXED  | Redis quota tracker uses request context                                     |
| H7      | FIXED  | `QuotaCheck` middleware reads body once instead of twice                     |
| H8      | FIXED  | `QuotaCheck` uses X-Forwarded-For when available                             |
| H9      | FIXED  | Argon2 time parameter increased from 1 to 3                                  |
| H10     | FIXED  | `response.JSON()` logs encoding errors instead of discarding                 |
| H11     | FIXED  | `RouteRequest`/`RouteStreamRequest` deep-copies request before mutation      |
| H12     | FIXED  | `RedisCache.Clear()` uses Keys+Del instead of FlushDB                        |
| H13-H14 | FIXED  | `VerifyWebhookSignature` strips `"sha256="` prefix                           |
| H16     | FIXED  | Removed redundant JWT expiry check                                           |
| H17     | FIXED  | Consistent error message for invalid tokens (no user existence leak)         |
| M4      | FIXED  | Added missing sentinel errors (ErrInvalidEmail, ErrPasswordTooWeak, etc.)    |
| M23     | FIXED  | `MemoryCache.Get()` returns `ErrCacheMiss` sentinel instead of ad-hoc errors |
| M28     | FIXED  | Email regex `[A-Z\|a-z]` → `[A-Za-z]`                                        |
| M33     | FIXED  | `CalculateCredits` uses `math.Round` instead of truncation                   |
| M39-M41 | FIXED  | Unconditional error wrapping in admin repos (wrap only when err != nil)      |
| M42     | FIXED  | `UserRepo.List()` checks COUNT query error                                   |
| M43     | FIXED  | ChatProxy input token estimation uses request messages, not output buffer    |
| L1      | FIXED  | Password complexity validation (uppercase, lowercase, digit, min 8 chars)    |
| L3-L4   | FIXED  | Password reset checks expiry and prevents reuse                              |
| L6-L7   | FIXED  | Webhook URL format validation + event type validation                        |
| L16     | FIXED  | Token blacklist middleware added to proxy routes                             |
| L17     | FIXED  | Pagination capped at max 10,000 pages                                        |
| W10     | FIXED  | CORS headers include X-Sandbox, X-Request-ID, webhook headers                |

## Summary by Priority

| Priority      | Count | Key Themes                                                                                                                                |
| ------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL      | 6     | SDK nil-deref panics, translator index-out-of-range, cache type assertion panic                                                           |
| HIGH          | 17    | Auth bypass for superadmin, Redis fail-open/closed inconsistency, webhook signature mismatch, password hashing weakness, request mutation |
| MEDIUM        | 44    | Immutability violations, context propagation gaps, type mismatches, missing validation, duplicate systems                                 |
| Wiring        | 10    | DI gaps, optional field nil risks, inconsistent failure modes, auto-escalation security risk                                              |
| Missing Logic | 28    | Ownership checks, cascade deletes, email verification, token blacklist enforcement, cost calculation                                      |
| Performance   | 8     | O(n²) sort, two-query pagination, hardcoded pricing, timer churn                                                                          |
| Dead Code     | 3     | Unused counter, stub web search, zero-return Stats()                                                                                      |
