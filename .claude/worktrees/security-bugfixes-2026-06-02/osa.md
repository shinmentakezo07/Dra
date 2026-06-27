# OSA — Comprehensive Security & Bug Audit (Round 2)

> **Audit date**: 2026-05-26 (Round 2 — post Round 1 fixes)
> **Scope**: Full codebase — Go backend (`apps/backend/`), Next.js frontend (`apps/web/`), LLM pipeline (`pkg/llm/`)
> **Method**: 6 parallel deep-dive agents (backend handlers, services+repo, middleware+LLM, frontend pages, frontend lib+api, LLM pipeline)
> **Build status**: Go build, TypeScript check, Next.js build, and all tests pass clean

---

## Summary

| Severity  | Backend | Frontend | LLM Pipeline | Total   |
| --------- | ------- | -------- | ------------ | ------- |
| CRITICAL  | 9       | 3        | 2            | **14**  |
| HIGH      | 18      | 14       | 9            | **41**  |
| MEDIUM    | 22      | 16       | 7            | **45**  |
| LOW       | 10      | 5        | 5            | **20**  |
| **Total** | **59**  | **38**   | **23**       | **120** |

---

## CRITICAL Issues

### C1. Quota middleware consumes request body — downstream handlers get empty body

**File**: `apps/backend/internal/middleware/quota.go:232-236` + `routes.go:112-129`

```go
// quota.go reads and restores body:
body, readErr := io.ReadAll(r.Body)
r.Body.Close()
r.Body = io.NopCloser(bytes.NewReader(body))

// Then parseRequest decodes the body AGAIN:
model, tokens = parseRequest(r)  // json.NewDecoder(r.Body).Decode(&req) — consumes body

// After parseRequest returns, r.Body is at EOF. next.ServeHTTP(w, r) gets empty body.
```

**Problem**: The quota middleware reads the body, restores it, then calls `parseRequest` which decodes the body again (consuming it). After `parseRequest` returns, `r.Body` is at EOF. The downstream handler receives an empty body. This affects every `/v1/chat/completions` request.

**Fix**: After `parseRequest` returns, restore `r.Body` again: `r.Body = io.NopCloser(bytes.NewReader(body))`.

---

### C2. Nil pointer dereference in JWT auth when token is invalid but err is nil

**File**: `apps/backend/internal/middleware/auth.go:69`

```go
if err != nil || !token.Valid {
    logger.Warn("jwt_validation_failed", "error", err.Error(), ...)
```

**Problem**: When `err` is nil but `token.Valid` is false (expired at boundary, custom validation hook rejects), `err.Error()` is called on nil. This crashes the goroutine with a nil pointer dereference.

**Fix**: Guard with `if err != nil` before calling `err.Error()`, or use a separate message for the `!token.Valid` case.

---

### C3. MongoDB transactions are non-functional — queries bypass session

**File**: `apps/backend/internal/db/tx.go:64-77`

```go
func (t *mongoTx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
    mq := newMongoQuerier(t.db)  // Creates new querier NOT bound to session
    return mq.Query(ctx, sql, args...)
}
```

**Problem**: `Query`, `QueryRow`, and `Exec` each create a fresh `mongoQuerier` operating on `t.db` directly, without using `t.session`. All operations within a MongoDB "transaction" bypass the session entirely — zero isolation or atomicity.

**Fix**: Each operation must call `mongo.WithSession(ctx, t.session)` or pass the session context.

---

### C4. Double-counted input tokens inflates Anthropic billing

**File**: `apps/backend/internal/handler/anthropic_messages.go:275-280`

```go
inputTokens := len(req.Messages) * 50  // 50-token base per message
for _, m := range req.Messages {
    if len(m.Content) > 0 {
        inputTokens += llm.EstimateTokens(m.Content)  // ALSO adds full content
    }
}
```

**Problem**: Every message is counted twice — once as 50-token overhead and again with full content estimation. 10-message conversation with 2000 tokens bills ~2500 instead of ~2050.

**Fix**: Start at 0, add role + content separately.

---

### C5. Anthropic content moderation silently skips array-format content blocks

**File**: `apps/backend/internal/handler/anthropic_messages.go:70-80`

```go
var contentStr string
if err := json.Unmarshal(m.Content, &contentStr); err == nil && contentStr != "" {
    modResult, modErr := h.moderator.Moderate(r.Context(), contentStr)
```

**Problem**: Anthropic messages use `json.RawMessage` for content — either a string OR an array of content blocks. The code only unmarshals as string. Array-format messages (the common case for multi-modal) bypass moderation entirely.

**Fix**: Also handle `[]ContentBlock` format and extract text from each block.

---

### C6. Prompt endpoints lack user-scoping — IDOR vulnerability

**File**: `apps/backend/internal/handler/prompt.go:33-111`

```go
prompt, appErr := h.promptSvc.CreatePrompt(r.Context(), req.Name, req.Template, req.Model, req.Config)
// u.ID is never passed — no user scoping

prompts, appErr := h.promptSvc.ListPrompts(r.Context(), page, limit)
// Returns ALL prompts across all users
```

**Problem**: All prompt endpoints (`CreatePrompt`, `ListPrompts`, `GetPrompt`, `RenderPrompt`, `DeletePrompt`) authenticate the user but never pass `u.ID` to any service call. Any authenticated user can read, overwrite, or delete any other user's prompts.

**Fix**: Pass `u.ID` to all service calls. `ListPrompts` must filter by user. `GetPrompt`/`DeletePrompt` must verify ownership.

---

### C7. Upload handler accepts any MIME type despite having an allowlist

**File**: `apps/backend/internal/handler/upload.go:102-151`

**Problem**: `supportedImageTypes` map is defined at line 20 but never checked against. `processUpload` detects content type but never rejects unsupported types. An attacker can upload HTML files, SVG files (XSS vector), or executables.

**Fix**: Add the MIME type check gate:

```go
if _, ok := supportedImageTypes[detectedType]; !ok {
    return nil, fmt.Errorf("unsupported file type: %s", detectedType)
}
```

---

### C8. `AdminUpdateProvider` skips SSRF validation on URL updates

**File**: `apps/backend/internal/handler/admin_providers.go:123-143`

**Problem**: `AdminCreateProvider` correctly calls `validateNotPrivateURL()`, but `AdminUpdateProvider` only validates URL format. After creating a provider with a safe URL, an admin can update it to `http://169.254.169.254/latest/meta-data/`.

**Fix**: Add `validateNotPrivateURL(p.BaseURL)` to the update handler.

---

### C9. `AdminProviderRepo.Create` always returns non-nil error on success

**File**: `apps/backend/internal/repository/admin_provider_repo.go:40`

```go
return fmt.Errorf("create provider: %w", err)  // BUG: always non-nil
```

**Problem**: `fmt.Errorf` wrapping nil err produces non-nil error. Every successful provider creation is reported as failure. Same pattern as C1/C2 in Round 1.

**Fix**: Add `if err != nil` guard.

---

### C10. `AdminBillingRepo.AdjustCredits` queries wrong column/table structure

**File**: `apps/backend/internal/repository/admin_billing_repo.go:28-37`

```go
// Queries SUM(amount) — column doesn't exist
err = tx.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM user_credits WHERE user_id=$1`, adj.UserID).Scan(&balance)

// Inserts individual rows — violates unique constraint
_, err = tx.Exec(ctx, `INSERT INTO user_credits (user_id, amount, created_at) VALUES ($1, $2, NOW())`, adj.UserID, adj.Amount)
```

**Problem**: The `user_credits` table has `balance`, `total_purchased`, `total_spent` columns with a UNIQUE constraint on `user_id`. `AdjustCredits` queries a non-existent `amount` column and inserts rows that violate the unique constraint. This function cannot work against the current schema.

**Fix**: Use `UPDATE user_credits SET balance = balance + $2 WHERE user_id = $1`.

---

### C11. `DeductForUsage` is not atomic — credit deduction and record can desync

**File**: `apps/backend/internal/service/credits.go:76-89`

**Problem**: Balance deduction and transaction record insertion are two separate non-atomic operations. If the process crashes between them, credits are deducted without a record (or vice versa). Compare with `LogAndDeduct` which correctly uses `db.WithTx`.

**Fix**: Wrap in `db.WithTx`.

---

### C12. Shallow copy of `Choices` in `deepCopyResponse` — shared mutable state in cache

**File**: `apps/backend/pkg/llm/cache/cache.go:311-319`

```go
func deepCopyResponse(resp *llm.ChatResponse) *llm.ChatResponse {
    cpy := *resp
    cpy.Choices = make([]llm.Choice, len(resp.Choices))
    copy(cpy.Choices, resp.Choices)  // Shallow copy — shared json.RawMessage backing arrays
    return &cpy
}
```

**Problem**: `copy()` performs a shallow copy. `Choice.Message.ToolCalls[].Function.Arguments` is `json.RawMessage` ([]byte). Both cached entry and caller share the same backing array. If either side appends to arguments (which `StreamAccumulator.applyToolCallDelta` does), it corrupts the other side or causes a data race.

**Fix**: Deep-copy `ToolCalls` and `ContentBlocks` individually.

---

### C13. Race condition in batch `process` — cancelled job can start processing

**File**: `apps/backend/pkg/llm/batch/batch.go:166-174`

**Problem**: `Submit` calls `go p.process(ctx, job)` immediately. If `Cancel` is called between the goroutine being scheduled and acquiring `job.mu.Lock()`, the cancellation check happens too late. Progress counter is still incremented for in-flight workers, causing wrong final status.

**Fix**: Use atomic check-and-set for cancellation status transition.

---

### C14. Raw backend error messages forwarded to clients

**Files**: `apps/web/lib/api/proxy.ts:81-85`, `apps/web/app/api/chat/route.ts:73-75`

```typescript
// proxy.ts:81
const message = err instanceof Error ? err.message : "Backend unreachable";
return Response.json(
  { success: false, error: `Backend error: ${message}` },
  { status: 503 },
);

// chat/route.ts:73-74
const text = await backendRes.text();
return new Response(text, { status: backendRes.status });
```

**Problem**: Network error messages expose internal hostnames, IP addresses, stack traces. The chat route forwards the entire raw backend error body without sanitization.

**Fix**: Log full errors server-side, return generic messages to clients.

---

## HIGH Issues

### Backend — Handlers

#### H1. OpenAI embeddings endpoint bypasses embedding registry

**File**: `apps/backend/internal/handler/openai_proxy.go:308`

```go
embedProvider := embeddings.NewOpenAIProvider(h.cfg.OpenAIAPIKey)
```

Always creates OpenAI-specific provider, bypassing `h.embeddingRegistry.RouteRequest()`.

#### H2. OpenAI embeddings bypasses sandbox check for billing

**File**: `apps/backend/internal/handler/openai_proxy.go:340`
Always deducts credits even when `X-Sandbox: true`. Chat completions check sandbox; embeddings don't.

#### H3. Admin `CostBreakdown` leaks raw SQL error to client

**File**: `apps/backend/internal/handler/admin_operations.go:143`

```go
response.Error(w, 500, err.Error())  // Raw DB error sent to client
```

#### H4. `AdminReviewSuspicious` silently converts invalid URL param to ID 0

**File**: `apps/backend/internal/handler/admin_security.go:48`

```go
id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
```

Error discarded — "abc" becomes 0, potentially operating on wrong record.

#### H5. `AdminGetForecast` division by zero when no usage records

**File**: `apps/backend/internal/handler/admin_operations.go:117`

```go
avgDaily := total / float64(count)  // count=0 → +Inf → malformed JSON
```

#### H6. `UpdateTierLimits` struct lacks JSON tags — fields always decode as 0

**File**: `apps/backend/internal/handler/ratelimit_handlers.go:23-28`

```go
var req struct {
    RPM       int    // Frontend sends "rpm" — this expects "RPM"
    Daily     int    // Frontend sends "daily"
    Monthly   int    // Frontend sends "monthly"
    MaxTokens int    // Frontend sends "maxTokens"
}
```

All fields decode as 0. Every tier update zeroes out all rate limits.

#### H7. `notifyNewMessage` uses cancelled request context

**Files**: `apps/backend/internal/handler/admin_messages.go:163`, `admin_operations.go:209`

```go
go h.notifyNewMessage(r.Context(), ...)  // r.Context() cancelled when handler returns
```

DB queries for "tier"/"group" targets fail silently. Only "all" and "user" targets work.

#### H8. `UpdateTierLimits` accepts negative values — disables rate limits

**File**: `apps/backend/internal/handler/ratelimit_handlers.go:29-33`
No validation that RPM/Daily/Monthly/MaxTokens are positive.

#### H9. Duplicate role-update routes with inconsistent authorization

**File**: `apps/backend/cmd/api/routes.go:288,386`
Two routes handle PUT role updates with different authorization. Line 288 always wins; line 386 is dead code.

#### H10. ChatProxy latency always reported as 0

**File**: `apps/backend/internal/handler/handler.go:524`

```go
latency := 0  // Actual latency is never measured
```

### Backend — Services & Repository

#### H11. `ComparisonService.GetByID` returns 500 instead of 404 for not-found

**File**: `apps/backend/internal/service/comparison.go:29-36`
Raw `pgx.ErrNoRows` wrapped as 500 internal error instead of clean not-found.

#### H12. `exportAuditLogs` exports API logs, not audit logs

**File**: `apps/backend/internal/service/export.go:99-130`
Named `exportAuditLogs` but queries `api_logs` table instead of `audit_logs`.

#### H13. `StripeService.FulfillCheckout` is not atomic

**File**: `apps/backend/internal/service/stripe.go:97-132`
Three separate DB operations without a transaction. If process fails mid-way, invoice is recorded but credits never added. On retry, duplicate check prevents adding credits.

#### H14. `ResetPassword` does not validate password complexity

**File**: `apps/backend/internal/service/user.go:184-212`
`Register` validates passwords (min 8, uppercase + digit). `ResetPassword` accepts any string.

#### H15. `UpdateProfile` does not check email uniqueness

**File**: `apps/backend/internal/service/user.go:103-108`
Email updated directly without checking if another user owns it.

#### H16. `WebhookService.Dispatch` uses request context for background goroutines

**File**: `apps/backend/internal/service/webhook.go:121-153`

```go
go func(...) {
    s.sendAndTrack(ctx, ...)  // ctx from HTTP request — cancelled when handler returns
```

#### H17. `toLLMChatRequest` always overrides system prompt

**File**: `apps/backend/internal/service/provider.go:349-362`

```go
System: "You are Shinmen, a distinguished PhD in Computer Science...",
```

Hardcoded system prompt. User cannot customize via API.

#### H18. `RateLimitRepo.GetUserTier` swallows all errors

**File**: `apps/backend/internal/repository/rate_limit.go:17-25`

```go
if err != nil {
    return "free", nil  // All errors swallowed — DB failures silently return "free" tier
}
```

### Backend — Middleware & Config

#### H19. Double-counting tokens in in-memory quota tracker

**File**: `apps/backend/internal/middleware/quota.go:127,142`

```go
// CheckRequest (line 127):
mq.tokens += estimatedTokens  // Adds estimated tokens
// RecordUsage (line 142):
mq.tokens += tokens  // Adds actual tokens again
```

Monthly usage inflated ~2x. Users hit limits prematurely.

#### H20. Rate limiting bypassed via IP header spoofing

**File**: `apps/backend/internal/middleware/ratelimit.go:82-89`

```go
if ip := strings.TrimSpace(r.Header.Get("X-Real-IP")); ip != "" {
    return ip  // Client-controlled header — attacker gets fresh bucket per request
}
```

#### H21. Redis rate limiter fails open — unlimited requests when Redis is down

**File**: `apps/backend/internal/middleware/redis_ratelimit.go:57`

```go
return true // fail-open: allow requests when Redis is unavailable
```

#### H22. Token blacklist doesn't cover API key authentication

**File**: `apps/backend/internal/middleware/token_blacklist.go:28-44`
When authenticating via `x-api-key`, `tokenStr` stays empty — blacklist check skipped entirely.

#### H23. Circuit breaker always records success — never learns about failures

**File**: `apps/backend/pkg/llm/circuitbreaker/circuitbreaker.go:196-205`

```go
if success {
    cb.recordResult(nil)
} else {
    cb.recordResult(nil)  // Both branches do the same thing
}
```

#### H24. Circuit breaker false positives from slow consumers

**File**: `apps/backend/pkg/llm/circuitbreaker/circuitbreaker.go:188-195`

```go
case <-time.After(5 * time.Second):
    cb.recordResult(fmt.Errorf("stream timeout"))  // Consumer-side issue, not provider failure
```

#### H25. Admin routes skip token blacklist and quota middleware

**File**: `apps/backend/cmd/api/routes.go:280-283`

```go
r.Use(authMW)  // Only authMW — no tokenBlacklistMW, no quotaMW
```

Revoked admin tokens still work. Admin requests unbounded by rate limits.

#### H26. `mustGetEnv` panics instead of returning error

**File**: `apps/backend/internal/config/config.go:191-196`
Missing `AUTH_SECRET` causes a panic with confusing stack trace instead of clear error message.

#### H27. Circuit breaker never effectively trips

**File**: `apps/backend/pkg/llm/circuitbreaker/circuitbreaker.go:176-179`

```go
if cb.successes >= cb.config.FailureThreshold {
    cb.failures = 0  // Success resets failures — circuit only opens for 100% failure rate
}
```

### LLM Pipeline

#### H28. Router conflates `SupportsThinking` with tool support

**File**: `apps/backend/pkg/llm/router/router.go:191-203`

```go
if p.SupportsThinking() || strings.Contains(p.Name(), "openai") || ...
```

`SupportsThinking()` ≠ supports tools. DeepSeek-R1 supports thinking but not function calling.

#### H29. `FindAffordableModel` cost estimate ignores candidate pricing

**File**: `apps/backend/pkg/llm/router/budget.go:91`

```go
estCost := CostEstimate(estimatedInputTokens, estimatedOutputTokens)  // Fixed formula, ignores model pricing
```

All candidates get the same `EstimatedCost`. Budget filtering is meaningless.

#### H30. TOCTOU race in `AllModels` — reads `r.models` after releasing lock

**File**: `apps/backend/pkg/llm/provider/provider.go:457-463`

```go
r.mu.RLock()
if r.models != nil {
    r.mu.RUnlock()
    result := make([]llm.ModelInfo, len(r.models))  // r.models can be nil now
```

#### H31. Stream errors silently swallowed in `chatStreamWithSDK`

**File**: `apps/backend/pkg/llm/provider/openai_sdk.go:264-268`

```go
if err != nil {
    return  // Doesn't distinguish io.EOF from actual errors
}
```

#### H32. `BuildToolResultMessage` silently discards `isError` parameter

**File**: `apps/backend/pkg/llm/helper.go:368-374`
`isError` accepted but never used. Downstream code cannot distinguish tool success from error.

#### H33. `MemoryCache.StartCleanup` creates unstoppable goroutine

**File**: `apps/backend/pkg/llm/cache/cache.go:209-218`
No context, no stop channel. Goroutine leaks when cache is no longer needed.

#### H34. `generateSandboxID` not unique across goroutines

**File**: `apps/backend/pkg/llm/guardrails/guardrails.go:308-311`

```go
func generateSandboxID() string {
    return fmt.Sprintf("%d", time.Now().UnixNano())  // Can produce duplicates
}
```

`sandboxCounter` declared but never used. Should use `atomic.AddUint64`.

#### H35. Health checker ignores stored parent context

**File**: `apps/backend/pkg/llm/provider/health.go:177`

```go
ctx, cancel := context.WithTimeout(context.Background(), h.timeout)  // Ignores h.ctx
```

#### H36. `RouterStrategyRandom` always returns first candidate

**File**: `apps/backend/internal/service/router.go:199`

```go
case RouterStrategyRandom:
    return candidates[0], nil  // Not random at all
```

### Frontend

#### H37. Messages catch-all route ignores slug — all sub-paths 404

**File**: `apps/web/app/api/messages/[[...slug]]/route.ts:7-14`

```typescript
return proxyToBackend(request, "/api/messages"); // Always forwards to /api/messages, ignoring slug
```

Breaks: `getUserMessageUnreadCount()`, `markMessageRead()`, `markAllMessagesRead()`.

#### H38. Organization member removal uses wrong HTTP method

**File**: `apps/web/app/api/organizations/[id]/members/[userId]/route.ts:14`

```typescript
export async function POST(...)  // Should be DELETE
```

SDK's `removeMember()` sends DELETE → gets 405 Method Not Allowed.

#### H39. Batch list and cancel routes missing HTTP methods

**File**: `apps/web/app/api/batch/route.ts` — only POST, needs GET for `listBatchJobs()`
**File**: `apps/web/app/api/batch/[id]/route.ts` — only GET, needs DELETE for `cancelBatchJob()`

#### H40. File deletion route does not exist

SDK `deleteFile(id)` calls `DELETE /api/files/{id}` — no `app/api/files/[id]/route.ts` exists.

#### H41. Numerous SDK methods have no corresponding API routes

Missing routes for: `signup()`, `login()`, `logout()`, `deleteAccount()`, `getMyPermissions()`, `oauthLogin()`, `forgotPassword()`, `resetPassword()`, `adminLogin()`, all budget alert/cap methods, `updateConversationTitle()`, `listWebhookDeliveries()`, all OpenAI/Anthropic proxy methods, all fine-tuning methods, all comparison methods, all export methods, `getUserAnnouncements()`, `providerHealth()`.

#### H42. Admin catch-all missing aliases, RBAC, rate-limits, plugins prefixes

**File**: `apps/web/app/api/admin/[[...slug]]/route.ts`
`ADMIN_PATHS` list and prefix list miss four entire categories: `/api/admin/aliases/*`, `/api/admin/rbac/*`, `/api/admin/rate-limits/*`, `/api/admin/plugins/*`.

#### H43. No backend token refresh mechanism

**File**: `apps/web/auth.ts:74-96`
`backendToken` set only on initial sign-in. If backend JWT expires, all subsequent API calls fail with stale token. No refresh logic.

#### H44. OAuth sign-in always succeeds even if backend rejects

**File**: `apps/web/auth.ts:70-72`

```typescript
async signIn({ user, account }) { return true; }
```

If `backendOAuth()` fails in JWT callback, user is signed in without `backendToken`.

#### H45. Schema role enum does not include `superadmin`

**File**: `apps/web/db/schema.ts:42`

```typescript
role: text("role", { enum: ["user", "admin"] }).default("user"),
```

Backend assigns `superadmin` → Drizzle schema constraint rejects it.

#### H46. `request.json()` without try/catch in chat route

**File**: `apps/web/app/api/chat/route.ts:39`
Invalid JSON body throws unhandled error → generic 500 instead of 400 Bad Request.

#### H47-50. Accessibility: clickable elements without keyboard support

- `apps/web/app/dashboard/logs/LogsClient.tsx:346` — clickable `<tr>` without keyboard handlers
- `apps/web/components/dashboard/DataTable.tsx:118-137` — clickable rows without `role`, `tabIndex`, `aria-label`
- `apps/web/components/playground/LayoutSelector.tsx:37-73` — dropdown without keyboard navigation
- `apps/web/components/playground/ShareModal.tsx:43-136` — modal without focus trap or Escape handler

---

## MEDIUM Issues

### Backend

| #   | File                                        | Issue                                                                                        |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| M1  | `admin_operations.go:175-192`               | All 12 dashboard stats queries discard errors with `_ =` — zero-filled stats on DB failure   |
| M2  | `anthropic_messages.go:87`                  | Token estimation passes `nil` messages — estimate always 0, max-tokens check meaningless     |
| M3  | `upload.go:77-80`                           | Returns `null` instead of `[]` when no files succeed                                         |
| M4  | `admin_promo.go:36`                         | `generatePromoCode` discards `crypto/rand` error → nil pointer panic on entropy exhaustion   |
| M5  | `admin_settings.go:58-81`                   | `AdminCreateFeatureFlag` doesn't validate empty `Key` field                                  |
| M6  | `admin_promo.go:48-93`                      | `MaxUses` can be 0 or negative — no validation                                               |
| M7  | `admin_users_full.go:93-109`                | `AdminBulkSuspendUsers` accepts empty string userIDs                                         |
| M8  | `admin_handlers.go:43-46`                   | `ProviderHealth` error sanitization misses key prefixes (`gsk-`, `xai-`, `AIza`)             |
| M9  | `handler.go:69-87`                          | `adminSessionRepo` never initialized in `New()` — admin sessions silently never recorded     |
| M10 | `mongo_querier.go:543`                      | `normalizeSQL` lowercases string literals — case-sensitive comparisons produce wrong results |
| M11 | `mongo_querier.go:669,720`                  | UPDATE arg offset bug — non-sequential `$N` placeholders get wrong values                    |
| M12 | `migrate.go:85-88`                          | Migration recording `INSERT` outside transaction — duplicate application on retry            |
| M13 | `domain/models.go:220`                      | `ChatRequest.Validate()` mutates input — sets default model on receiver                      |
| M14 | `middleware/transform.go:84`                | System prompt injection mutates original parsed JSON                                         |
| M15 | `middleware/metrics.go:52-57`               | Raw URL path as Prometheus label → cardinality explosion on 404s                             |
| M16 | `cmd/api/main.go:46-51`                     | Migration/seed errors don't prevent startup — server runs with inconsistent schema           |
| M17 | `cmd/api/main.go:70`                        | Second `UserService` created outside `initServices()` — inconsistent dependency wiring       |
| M18 | `service/admin.go:320-324`                  | `DeleteProvider` silently ignores key deletion errors — orphaned keys                        |
| M19 | `service/analytics.go:77-78`                | `PlatformStats` silently swallows count errors                                               |
| M20 | `repository/budget.go:67-76`                | `GetUserCap` returns raw `pgx.ErrNoRows` as 500 instead of clean not-found                   |
| M21 | `repository/admin_features_repo.go:223-227` | Promo code redemption doesn't record credit transaction                                      |
| M22 | `repository/token_blacklist.go:42-52`       | `IsBlacklisted` doesn't filter expired tokens — false positives until cleanup runs           |

### LLM Pipeline

| #   | File                                       | Issue                                                                                     |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| M23 | `cache/cache.go:182-206`                   | O(n²) bubble sort in `evictOldest` — blocks mutex on every cache write at capacity        |
| M24 | `circuitbreaker/circuitbreaker.go:176-179` | Success reset uses `FailureThreshold` instead of `SuccessThreshold`                       |
| M25 | `router/router.go:164`                     | `Route` with `StrategyRandom` discards `rand.Int` error — nil panic on entropy exhaustion |
| M26 | `tokens/tokens.go:127-133`                 | Fallback prefix matching is non-deterministic (map iteration order)                       |
| M27 | `provider/provider.go:241`                 | `AnthropicProvider.Chat` discards `io.ReadAll` error                                      |
| M28 | `helper.go:337-341`                        | `ValidateRequest` mutates input (clamps temperature/topP in place)                        |
| M29 | `router/router.go:347-352`                 | A/B router iterates map non-deterministically — unreliable traffic splitting              |

### Frontend

| #   | File                                       | Issue                                                                                                     |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| M30 | `db/schema.ts:735`                         | `adminMessageReads` uses `index` instead of `uniqueIndex` — duplicate reads possible                      |
| M31 | `db/schema.ts` (multiple)                  | 9 tables with `bigserial("id")` lack `.primaryKey()` constraint                                           |
| M32 | `db/schema.ts:503,523`                     | `usageRecords.userId` and `usageDaily.userId` are `text` without foreign key                              |
| M33 | `types/admin.ts:395-401`                   | `RateLimitTier` missing `id` field that exists in schema                                                  |
| M34 | `lib/api/types.ts` + `types/admin.ts`      | Duplicate `ApiResponse<T>` definitions — import ambiguity                                                 |
| M35 | `lib/api/key-auth.ts:30-31`                | UPDATE on every authenticated API key request — write pressure under load                                 |
| M36 | `lib/api/rate-limit.ts:8`                  | In-memory rate limiter ineffective in serverless/multi-instance                                           |
| M37 | `lib/api/sdk.ts:556-596`                   | `paginatedRequest` lacks retry logic unlike `request()`                                                   |
| M38 | `lib/api/sdk.ts:584`                       | `res.json()` in `paginatedRequest` without try/catch — unhandled SyntaxError                              |
| M39 | `lib/api/hooks.ts:456-458`                 | `useNotificationsStream` silently swallows all errors including auth failures                             |
| M40 | `lib/api/sdk.ts:767-769`                   | `chatStream` yields raw payload on JSON parse failure — garbled output                                    |
| M41 | `lib/playground-storage.ts:40-42`          | `hasSession()` lacks try/catch — throws in SSR                                                            |
| M42 | `lib/api/sdk.ts:406-407`                   | Mutable shared state on SDK singleton — concurrent requests overwrite `_lastRequestId`                    |
| M43 | `app/dashboard/billing/page.tsx:26-32`     | Stripe URL validation `startsWith("https://checkout.stripe.com/")` matches `checkout.stripe.com.evil.com` |
| M44 | `components/Mermaid.tsx`                   | Uses `dangerouslySetInnerHTML` with regex sanitizer — bypassable                                          |
| M45 | `components/playground/PlaygroundMain.tsx` | `if (!isMounted) return null` causes layout shift on first render                                         |

---

## LOW Issues

### Backend

| #   | File                                           | Issue                                                                          |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| L1  | `internal/pkg/token/token.go:10`               | JWT expiry 7 days — very long for session token                                |
| L2  | `pkg/llm/watcher/watcher.go:94-95`             | Uses `log.Printf` instead of structured `slog` logger                          |
| L3  | `pkg/llm/batch/batch.go:75-91`                 | Batch processor goroutine not cancellable on shutdown                          |
| L4  | `internal/middleware/quota.go:166-183`         | In-memory quota cleanup goroutine has no stop channel                          |
| L5  | `internal/middleware/token_blacklist.go:48-52` | Blacklist fails open on checker error — revoked tokens work during DB outage   |
| L6  | `internal/middleware/ratelimit.go:42-57`       | `Allow` uses write lock for read-heavy check — serializes all requests         |
| L7  | `pkg/llm/cache/semantic.go:142-166`            | `BuildSemanticKey` loses word order — bag-of-words hashing produces collisions |
| L8  | `internal/service/credits.go:229-270`          | `checkBudgetAlert` sends duplicate alerts — no throttle mechanism              |
| L9  | `internal/repository/comparison.go:36`         | Column name concatenation in SQL (controlled but risky pattern)                |
| L10 | `internal/service/prompt.go:83-89`             | `renderTemplate` doesn't handle nested `{{` in variable values                 |

### LLM Pipeline

| #   | File                           | Issue                                                                                 |
| --- | ------------------------------ | ------------------------------------------------------------------------------------- |
| L11 | `provider/provider.go:526-553` | `ReadSSE` doesn't handle multi-line SSE data fields                                   |
| L12 | `cache/cache.go:297`           | `hashMessages` truncates SHA-256 to 16 hex chars (64 bits) — increased collision risk |
| L13 | `watcher/watcher.go:186`       | `containsAny` uses redundant `fmt.Sprintf("%s", s)` — no-op copy                      |
| L14 | `provider/provider.go:162-164` | OpenAI provider sets translator that is never used                                    |
| L15 | `cache/semantic.go:79-84`      | `SemanticCache.Set` silently ignores decode errors — caller thinks cache succeeded    |

### Frontend

| #   | File                                             | Issue                                             |
| --- | ------------------------------------------------ | ------------------------------------------------- |
| L16 | `components/ChatPlayground.tsx:29`               | `type StoredMessage = any` — disables type safety |
| L17 | `components/GatewayDashboard.tsx:11`             | `user: any` prop accepted but never used          |
| L18 | `components/dashboard/DataTable.tsx:120`         | Index used as key in sorted/filtered table rows   |
| L19 | `components/dashboard/AnimatedCounter.tsx:14-36` | `requestAnimationFrame` loop without cleanup      |
| L20 | `components/playground/ShareModal.tsx:18-27`     | Share link is truncated, non-functional URL       |

---

## Positive Findings

1. **SQL Injection**: All PostgreSQL queries use parameterized queries. No string interpolation into SQL.
2. **Password Hashing**: argon2id with `subtle.ConstantTimeCompare` (after Round 1 fix).
3. **JWT Validation**: HS256 only, token validity checked, user verified in DB per request.
4. **Rate Limiting**: Both Redis-backed and in-memory. Auth endpoints get stricter limits.
5. **Token Blacklisting**: Logout properly blacklists JWT tokens.
6. **Stripe Webhook**: Signature verification enforced.
7. **API Key Storage**: HMAC-SHA256 hashed. Raw key never returned after creation.
8. **File Upload**: Filenames sanitized, MIME detected via magic bytes, size limits enforced.
9. **Admin Error Handling**: `adminError()` pattern logs full errors, returns generic messages.
10. **Build & Tests**: All three builds pass clean. All tests pass.

---

## Action Plan

### P0 — Immediate (blocks production)

| #   | Issue                                   | Effort    |
| --- | --------------------------------------- | --------- |
| C1  | Quota middleware body consumption       | ~5 lines  |
| C2  | Nil pointer in JWT auth                 | ~3 lines  |
| C3  | MongoDB transactions non-functional     | ~30 lines |
| C4  | Anthropic billing double-counted tokens | ~10 lines |
| C5  | Anthropic moderation bypass             | ~15 lines |
| C6  | Prompt IDOR                             | ~20 lines |
| C7  | Upload MIME validation                  | ~5 lines  |
| C8  | SSRF on provider update                 | ~1 line   |
| C9  | AdminProviderRepo.Create always errors  | ~1 line   |
| C10 | AdjustCredits wrong schema              | ~10 lines |
| C11 | DeductForUsage non-atomic               | ~10 lines |
| C12 | Cache shallow copy corruption           | ~15 lines |
| C13 | Batch cancelled job race                | ~5 lines  |
| C14 | Error message leakage to clients        | ~10 lines |

### P1 — Before shipping (security/auth)

| #   | Issue                             | Effort    |
| --- | --------------------------------- | --------- |
| H6  | UpdateTierLimits JSON tags        | ~4 lines  |
| H19 | Double-counting in quota tracker  | ~5 lines  |
| H20 | Rate limit IP spoofing            | ~10 lines |
| H22 | Token blacklist skips API keys    | ~15 lines |
| H25 | Admin routes skip blacklist/quota | ~2 lines  |
| H27 | Circuit breaker never trips       | ~20 lines |
| H37 | Messages slug forwarding          | ~5 lines  |
| H38 | Org member removal wrong method   | ~1 line   |
| H43 | Backend token refresh             | ~30 lines |
| H45 | Schema missing superadmin         | ~1 line   |
| H14 | ResetPassword no validation       | ~5 lines  |

### P2 — Soon (quality/reliability)

| #       | Issue                          | Effort     |
| ------- | ------------------------------ | ---------- |
| H1      | Embeddings registry bypass     | ~5 lines   |
| H5      | Forecast division by zero      | ~3 lines   |
| H7      | Cancelled context in goroutine | ~3 lines   |
| H16     | Webhook request context        | ~3 lines   |
| H23     | Circuit breaker always success | ~5 lines   |
| H28     | Router thinking vs tools       | ~10 lines  |
| H30     | AllModels TOCTOU race          | ~5 lines   |
| H36     | Random always first            | ~1 line    |
| M10     | SQL lowercases literals        | ~5 lines   |
| M11     | Mongo UPDATE arg offset        | ~10 lines  |
| M23     | Cache O(n²) eviction           | ~15 lines  |
| H39-H42 | Missing API routes             | ~100 lines |

### P3 — Backlog

| #       | Issue                    | Effort    |
| ------- | ------------------------ | --------- |
| M30-M32 | Schema constraints       | ~20 lines |
| M35-M36 | Rate limiter performance | ~20 lines |
| M37-M42 | SDK improvements         | ~50 lines |
| M43     | Stripe URL validation    | ~1 line   |
| L1-L10  | Backend low issues       | Various   |
| L11-L15 | LLM pipeline low issues  | Various   |
| L16-L20 | Frontend low issues      | Various   |
