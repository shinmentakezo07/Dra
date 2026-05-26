# OSA — Security & Bug Audit

> **Audit date**: 2026-05-26
> **Scope**: Full codebase — Go backend (`apps/backend/`), Next.js frontend (`apps/web/`), security posture
> **Method**: Automated builds (Go, TypeScript, Next.js all pass clean), parallel code-review agents (backend, frontend, security)
> **Build status**: All three builds pass clean (no compilation errors)

---

## Table of Contents

1. [Summary](#summary)
2. [CRITICAL Issues](#critical-issues)
3. [HIGH Issues](#high-issues)
4. [MEDIUM Issues](#medium-issues)
5. [LOW Issues](#low-issues)
6. [Positive Findings](#positive-findings)
7. [Action Plan](#action-plan)

---

## Summary

| Severity | Backend | Frontend | Security | Total |
|----------|---------|----------|----------|-------|
| CRITICAL | 4 | 0 | 2 | **6** |
| HIGH | 5 | 7 | 4 | **16** |
| MEDIUM | 5 | 7 | 5 | **17** |
| LOW | 0 | 1 | 3 | **4** |
| **Total** | **14** | **15** | **14** | **43** |

---

## CRITICAL Issues

### C1. `StartImpersonation` always returns error

**File**: `apps/backend/internal/repository/admin_security_repo.go:104`

```go
func (r *AdminSecurityRepo) StartImpersonation(ctx context.Context, adminID, userID, reason string) (*domain.ImpersonationSession, error) {
	s := &domain.ImpersonationSession{ID: uuid.New().String(), AdminID: adminID, TargetUserID: userID, Reason: reason, StartedAt: time.Now()}
	_, err := r.db.Exec(ctx, `INSERT INTO admin_impersonations(id,admin_id,target_user_id,reason,started_at) VALUES($1,$2,$3,$4,$5)`, s.ID, s.AdminID, s.TargetUserID, s.Reason, s.StartedAt)
	return s, fmt.Errorf("start impersonation: %w", err)  // BUG: always returns non-nil error
}
```

**Problem**: `fmt.Errorf("start impersonation: %w", nil)` produces a non-nil `error` in Go. This line is reached unconditionally — when `err == nil` (success), it still returns a non-nil error wrapping nil. Every call to `StartImpersonation` appears to fail, making admin impersonation completely broken.

**Impact**: Admin "impersonate user" feature is 100% non-functional. Any admin trying to view the system as a different user will always see an error.

**Fix**:
```go
if err != nil {
    return nil, fmt.Errorf("start impersonation: %w", err)
}
return s, nil
```

---

### C2. `SoftDelete` always returns error

**File**: `apps/backend/internal/repository/admin_user_repo.go:90`

```go
func (r *AdminUserRepo) SoftDelete(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET email='deleted-'||id||'@deleted',name='Deleted User',password='',status='deleted',deleted_at=NOW() WHERE id=$1`, userID)
	return fmt.Errorf("soft delete: %w", err)  // BUG: always returns non-nil error
}
```

**Problem**: Identical bug to C1. Every successful soft delete reports failure to callers. The caller sees an error and may retry, display a failure message, or roll back related operations — even though the user was actually deleted in the database.

**Impact**: Admin user deletion is completely broken at the API layer. The database row IS updated (the SQL executes successfully), but the handler always returns an error to the client. This creates an inconsistent state: the user appears deleted in the DB but the admin sees a failure message.

**Fix**: Add `if err != nil` guard; return `nil` on success.

---

### C3. Input token billing uses output buffer content

**File**: `apps/backend/internal/handler/openai_proxy.go:215`

```go
FINISH:
	inputTokens := llm.EstimateTokens(outputBuf.String())  // BUG: outputBuf contains OUTPUT content
	if inputTokens == 0 {
		inputTokens = len(req.Messages) * 50
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}

	if !isSandbox {
		h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, inputTokens, outputTokens)
	}
```

**Problem**: In the streaming handler (`handleOpenAIStream`), `outputBuf` accumulates the streamed **output** content from the LLM provider. But line 215 estimates **input** tokens from this output buffer. This value is then used for billing at line 224: `h.asyncLogAndDeduct(..., inputTokens, outputTokens)`.

**Impact**: Every streaming API request has incorrect billing:
- Short inputs with long outputs → over-billed (user pays for output as if it were input)
- Long inputs with short outputs → under-billed (platform loses revenue)
- The billing is always wrong for every streaming request

**Fix**: Accumulate input messages into a separate buffer before the streaming loop and estimate tokens from that. Better yet, capture the provider's actual token counts from the streaming response (most providers return `usage` in the final chunk).

---

### C4. IDOR — AddMessage doesn't verify conversation ownership

**File**: `apps/backend/internal/handler/conversation.go:98-118`

```go
func (h *Handler) AddMessage(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	convID := chi.URLParam(r, "id")
	var req createMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	msg, appErr := h.conversationSvc.AddMessage(r.Context(), convID, req.Role, req.Content, req.InputTokens, req.OutputTokens)
	// BUG: u.ID is never passed to the service — no ownership check
```

**Problem**: The handler authenticates the user (`u` is non-nil) but never passes `u.ID` to `AddMessage`. The service method calls `s.repo.AddMessage(ctx, convID, ...)` without verifying that the conversation belongs to the authenticated user.

**Impact**: Any authenticated user can add messages to any other user's conversation by guessing or knowing the conversation ID. This is an Insecure Direct Object Reference (IDOR) vulnerability. An attacker could:
- Inject messages into another user's conversation history
- Corrupt conversation data
- Potentially poison future AI interactions if conversations are used as context

**Fix**: Pass `u.ID` to the service method and verify ownership in the repository query:
```go
msg, appErr := h.conversationSvc.AddMessage(r.Context(), u.ID, convID, req.Role, req.Content, ...)
```
Repository query should include: `WHERE conversation_id = $1 AND user_id = $2`

---

### C5. Hardcoded real API key in committed `.env.example`

**File**: `apps/backend/.env.example:21`

```
SHINWAY_API_KEY=sk-ecc9bfbaf321b57a-420a50-921826ca
```

**Problem**: A real production-style API key is hardcoded in the `.env.example` file, which is tracked by git. The key follows the pattern `sk-ecc9bfbaf321b57a-420a50-921826ca` — if this key has been used in production, it is compromised in the git history.

**Impact**: Anyone with access to the repository (or a fork) has this API key. If it grants access to a real LLM provider, unauthorized usage could result in significant billing charges.

**Fix**:
1. Remove the real key from `.env.example` — replace with `SHINWAY_API_KEY=your-api-key-here`
2. Rotate the exposed key immediately in the provider dashboard
3. Check git history for any other leaked keys: `git log -p --all -S 'sk-ecc9bfbaf321b57a'`

---

### C6. SSRF via webhook URLs — no validation

**File**: `apps/backend/pkg/webhook/webhook.go:81`

```go
req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, bytes.NewReader(payload))
```

**Problem**: Webhook URLs are user-supplied (any authenticated user can create a webhook with an arbitrary URL via `POST /api/webhooks`). The webhook dispatcher makes server-side HTTP POST requests to these URLs without any validation against private/reserved IP ranges.

**Impact**: An attacker can register a webhook pointing to:
- `http://169.254.169.254/latest/meta-data/` — AWS metadata endpoint, steals IAM credentials
- `http://127.0.0.1:8080/internal-endpoint` — internal backend services
- `http://10.x.x.x/` — private network scanning and service discovery
- `http://[::1]:6379/` — Redis on localhost (if exposed)

This is a Server-Side Request Forgery (SSRF) vulnerability that can lead to cloud credential theft, internal network scanning, and data exfiltration.

**Fix**: Add `validateNotPrivateURL()` validation to `webhook.Create` and `webhook.Update` service methods before persisting the URL. Reject:
- Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Link-local (169.254.0.0/16)
- Loopback (127.0.0.0/8, ::1)
- Cloud metadata endpoints (169.254.169.254)

---

## HIGH Issues

### H1. SSE headers written before capacity check

**File**: `apps/backend/internal/handler/sse.go:141-146`

```go
w.Header().Set("Content-Type", "text/event-stream")
w.Header().Set("Cache-Control", "no-cache")
w.Header().Set("Connection", "keep-alive")
w.WriteHeader(http.StatusOK)                   // Line 141: status 200 sent to client

ch := h.notificationHub.Subscribe(u.ID)        // Line 143: THEN check capacity
if ch == nil {
	response.Error(w, 429, "Too many concurrent connections")  // Line 145: TOO LATE
	return
}
```

**Problem**: `w.WriteHeader(200)` is called before the subscription capacity check. In Go's `net/http`, once `WriteHeader` is called, the status code cannot be changed. If `Subscribe` returns nil (user has too many concurrent SSE connections), the 429 error response cannot be sent — the client receives HTTP 200 with an empty body and the connection is silently closed.

**Impact**: Users hitting the SSE connection limit get a confusing silent failure instead of a clear 429 error. They may retry repeatedly, not understanding why the notification stream isn't working.

**Fix**: Move the `Subscribe` check before `WriteHeader(200)`:
```go
ch := h.notificationHub.Subscribe(u.ID)
if ch == nil {
	response.Error(w, 429, "Too many concurrent connections")
	return
}
defer h.notificationHub.Unsubscribe(u.ID, ch)

w.Header().Set("Content-Type", "text/event-stream")
// ...
w.WriteHeader(http.StatusOK)
```

---

### H2. Credit purchase runs outside transaction boundary

**File**: `apps/backend/internal/service/credits.go:52-53`

```go
err := s.db.WithTx(ctx, func(tx db.Querier) error {
	if err := s.creditsRepo.Upsert(ctx, userID, req.Amount, req.Amount); err != nil {
		// BUG: uses `ctx` not the transaction context — Upsert runs outside the transaction
		return domain.Wrap(domain.ErrInternal, 500, "failed to update credits", err)
	}
	desc := req.Description
	if desc == "" {
		desc = "Credit purchase"
	}
	txn, err := s.txRepo.Create(ctx, userID, req.Amount, "purchase", desc, nil)
	// Also uses `ctx` — also runs outside the transaction
```

**Problem**: Inside the `WithTx` callback, both `s.creditsRepo.Upsert(ctx, ...)` and `s.txRepo.Create(ctx, ...)` use the original request context `ctx` instead of the transaction-bound querier. Both operations run as independent queries outside the transaction boundary.

**Impact**: If the `txRepo.Create` call fails after `creditsRepo.Upsert` succeeds, the user's credits are increased but no transaction record exists. This breaks atomicity and creates an audit trail gap. The reverse is also possible — a transaction record could exist without the credit update.

**Fix**: Repository methods need to accept a `db.Querier` parameter so they execute within the transaction:
```go
err := s.db.WithTx(ctx, func(tx db.Querier) error {
	if err := s.creditsRepo.UpsertTx(tx, userID, req.Amount, req.Amount); err != nil {
		return ...
	}
	txn, err := s.txRepo.CreateTx(tx, userID, req.Amount, "purchase", desc, nil)
```

---

### H3. Redis monthly token quota over-counts on rejection

**File**: `apps/backend/internal/middleware/redis_quota.go:88-106`

```go
if key.MonthlyTokenLimit > 0 {
	monthlyKey := fmt.Sprintf("%s%s:monthly:%s", qt.prefix, key.Key, now.Format("2006-01"))
	pipe := qt.client.Pipeline()
	pipe.IncrBy(timeoutCtx, monthlyKey, int64(estimatedTokens))  // Adds tokens FIRST
	pipe.Expire(timeoutCtx, monthlyKey, 40*24*time.Hour)
	results, err := pipe.Exec(timeoutCtx)
	if err != nil {
		logger.Error("redis_quota_monthly_failed", "error", err.Error(), "key", key.Key)
		// Fail open
	} else if len(results) > 0 {
		if countCmd, ok := results[0].(*redis.IntCmd); ok {
			count := int(countCmd.Val())
			if count > key.MonthlyTokenLimit {
				return fmt.Errorf("monthly token limit %d exceeded", key.MonthlyTokenLimit)
			}
		}
	}
}
```

**Problem**: `IncrBy` atomically adds the estimated tokens to the counter BEFORE checking whether the limit is exceeded. If a request's tokens would push the counter past the limit, the tokens are still permanently added. The counter never rolls back on rejection.

**Impact**: Over time, rejected requests inflate the counter far beyond actual usage. A user with a 1M token monthly limit who sends many requests that each estimate 10K tokens could have their counter inflated to 2-3M tokens, causing legitimate requests to be rejected weeks before they should be. The counter only resets when the Redis key expires (40 days).

**Fix**: Use a Lua script for atomic check-then-increment:
```lua
local current = redis.call('GET', KEYS[1]) or 0
if current + tonumber(ARGV[1]) > tonumber(ARGV[2]) then
    return -1
end
return redis.call('INCRBY', KEYS[1], ARGV[1])
```
Or decrement on rejection after the check fails.

---

### H4. Nil pointer dereference risk in admin handlers

**Files**:
- `apps/backend/internal/handler/admin_security.go:42` — `adminID := middleware.GetUser(r).ID`
- `apps/backend/internal/handler/admin_security.go:107` — `adminID := middleware.GetUser(r).ID`
- `apps/backend/internal/handler/admin_promo.go:83` — `CreatedBy: u.ID` (u fetched at line 43, no nil check)
- `apps/backend/internal/handler/admin_billing.go:68` — `AdminID: u.ID` (u fetched at line 49, no nil check)

**Problem**: `middleware.GetUser(r)` can return nil if the user is not in the request context. These handlers access `.ID` without nil checks. While admin routes should be protected by `AdminRequireAdmin` middleware, defense-in-depth requires nil checks.

**Impact**: If the middleware is misconfigured, bypassed, or if the route registration changes, these handlers will panic with a nil pointer dereference, crashing the goroutine and returning a 500 to the client. Compare with `conversation.go:99-103` and `export_handlers.go:64-68` which correctly check for nil.

**Fix**: Add nil guard after every `GetUser(r)` call:
```go
u := middleware.GetUser(r)
if u == nil {
	response.Error(w, 401, "Not authenticated")
	return
}
```

---

### H5. SSRF in `AdminCreateProvider` — missing private URL check

**File**: `apps/backend/internal/handler/admin_providers.go:81`

```go
// AdminCreateProvider validates URL format with isValidHTTPURL() but does NOT call validateNotPrivateURL()
// AdminFetchModels (line 259) correctly calls validateNotPrivateURL()
```

**Problem**: `AdminCreateProvider` accepts a user-supplied `baseUrl` and calls `h.fetchModelsFromUpstream(r.Context(), req.BaseURL, req.APIKey)` which makes a server-side HTTP request to that URL. While `AdminFetchModels` correctly validates against private URLs, `AdminCreateProvider` skips this check.

**Impact**: An admin user (or a compromised admin account) can make the server request internal IP addresses:
- `http://169.254.169.254/latest/meta-data/` — cloud metadata
- `http://127.0.0.1:8080/internal` — internal services
- `http://10.x.x.x/` — private network

**Fix**: Add `validateNotPrivateURL(req.BaseURL)` before calling `fetchModelsFromUpstream`:
```go
if err := validateNotPrivateURL(req.BaseURL); err != nil {
	response.Error(w, 400, "Invalid provider URL: must not point to private network")
	return
}
```

---

### H6. `superadmin` role rejected at API handler level

**File**: `apps/web/lib/api/require-auth.ts:22`

```typescript
export async function requireAdmin(request: Request): Promise<Response | null> {
	const session = await auth();
	if (!session?.user) {
		return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}
	if (session.user.role !== "admin") {  // BUG: rejects "superadmin"
		return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}
	return null;
}
```

**Problem**: The middleware in `auth.config.ts` (line 11) allows both `"admin"` and `"superadmin"` roles:
```typescript
const isAdmin = auth?.user?.role === "admin" || auth?.user?.role === "superadmin";
```
But `requireAdmin()` in API route handlers rejects anyone whose role is not exactly `"admin"`.

**Impact**: Superadmin users can navigate to `/admin/*` pages (middleware passes) but all admin API calls fail with 403. The admin dashboard loads but every data fetch, every mutation, every admin action returns "Admin access required". The superadmin account is effectively useless for API operations.

**Fix**:
```typescript
if (session.user.role !== "admin" && session.user.role !== "superadmin") {
```

---

### H7. Module-level SDK capture defeats `configureSDK()`

**File**: `apps/web/lib/api/hooks.ts:29`

```typescript
import { getSDK, configureSDK, ... } from "./sdk";

const sdk = getSDK();  // Captured at module import time

export function useKeys() {
	return useQuery<APIKey[]>({
		queryKey: ["keys"],
		queryFn: () => sdk.listKeys(),  // Uses stale sdk reference
	});
}
// ... 50+ hooks all use this stale `sdk` variable
```

**Problem**: `const sdk = getSDK()` captures a reference to the SDK singleton at module import time. If `configureSDK()` is called later (e.g., in a provider component, layout, or after authentication), the `sdk` variable still references the old unconfigured instance.

**Impact**: If `configureSDK()` is ever called after the hooks module is imported (which happens during React's module resolution), all React Query hooks silently fail — they make requests to `""` (empty baseUrl) instead of the configured backend URL. This manifests as network errors in every dashboard component.

**Fix**: Call `getSDK()` inside each query/mutation function body:
```typescript
export function useKeys() {
	return useQuery<APIKey[]>({
		queryKey: ["keys"],
		queryFn: () => getSDK().listKeys(),
	});
}
```

---

### H8. Stale auto-save closure in playground

**File**: `apps/web/components/playground/PlaygroundMain.tsx:302-309`

```typescript
// This runs once at mount (empty dependency array)
autoSaverRef.current = new AutoSaver(() => {
	saveSession({
		language: LANGUAGES[activeLang].name,  // Captured at mount time
		code,                                    // Captured at mount time
		timestamp: Date.now()
	});
	setLastSaved(new Date());
});
```

Then at line 317-321:
```typescript
// Auto-save on code change
useEffect(() => {
	if (isMounted && code) {
		autoSaverRef.current?.schedule();  // Triggers the stale callback
	}
}, [code, isMounted, activeLang]);
```

**Problem**: The `AutoSaver` callback is created inside `useEffect(() => { ... }, [])` (empty dependency array). The closure captures `activeLang` and `code` at mount time. Every subsequent auto-save triggered by the `[code, isMounted, activeLang]` effect will persist the **initial** language and code values, not the current ones.

**Impact**: The user sees "Last saved" timestamps and believes their work is being auto-saved. But if they change the language or write new code, the saved data still contains the original values. If they close the browser and return, their latest work is lost.

**Fix**: Use refs for values that change:
```typescript
const activeLangRef = useRef(activeLang);
const codeRef = useRef(code);
// Update refs on every render
activeLangRef.current = activeLang;
codeRef.current = code;

// In the AutoSaver callback, read from refs
autoSaverRef.current = new AutoSaver(() => {
	saveSession({
		language: LANGUAGES[activeLangRef.current].name,
		code: codeRef.current,
		timestamp: Date.now()
	});
});
```

---

### H9. `AnimatedCost` leaks animation frames on unmount

**File**: `apps/web/components/pricing/CostCalculator.tsx:149-166`

```typescript
function AnimatedCost({ value }: { value: number }) {
	const [text, setText] = useState(formatCurrency(0));
	const prevValue = useRef(0);

	useEffect(() => {
		const duration = Math.abs(value - prevValue.current) < 0.001 ? 150 : 400;
		const start = prevValue.current;
		const startTime = performance.now();

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			const current = start + (value - start) * eased;
			setText(formatCurrency(current));
			if (progress < 1) requestAnimationFrame(animate);  // No cleanup
		};

		requestAnimationFrame(animate);  // No cleanup
		prevValue.current = value;
	}, [value]);
	// No cleanup function returned
```

**Problem**: The `useEffect` starts a `requestAnimationFrame` loop but never cancels it on cleanup. If the component unmounts mid-animation (user navigates away from the pricing page), the callback continues firing and calls `setText` on an unmounted component.

**Impact**: React warning in console ("Can't perform a React state update on an unmounted component"). In strict mode or with many rapid navigations, this can accumulate orphaned animation frames and cause memory pressure.

**Fix**: Store the rAF ID and cancel in cleanup:
```typescript
useEffect(() => {
	// ...
	let rafId: number;
	const animate = (now: number) => {
		// ...
		if (progress < 1) rafId = requestAnimationFrame(animate);
	};
	rafId = requestAnimationFrame(animate);
	prevValue.current = value;
	return () => cancelAnimationFrame(rafId);
}, [value]);
```

---

### H10. Double `auth()` call per chat request

**File**: `apps/web/app/api/chat/route.ts:23,57`

```typescript
export async function POST(request: Request) {
	// First call at line 23
	const session = await auth();
	const userId = session?.user?.id;
	// ... rate limiting with userId ...

	// Second call at line 57 (inside `if (!authHeader)` block)
	if (!authHeader) {
		const session = await auth();  // Redundant — same result as line 23
		backendToken = (session?.user as any)?.backendToken;
	}
```

**Problem**: `auth()` is called at line 23 to get `userId` for rate limiting, and again at line 57 to get the `backendToken`. The first call already has the full session data including `backendToken`. The second call is redundant.

**Impact**: Every streaming chat request makes two round-trips to the auth system instead of one. For high-traffic deployments, this doubles auth overhead on the most latency-sensitive endpoint.

**Fix**: Reuse the session from the first call:
```typescript
const session = await auth();
const userId = session?.user?.id;
// ...
if (!authHeader) {
	backendToken = (session?.user as any)?.backendToken;
}
```

---

### H11. Session switch race condition in chat

**File**: `apps/web/components/ChatPlayground.tsx:133-150`

```typescript
// Persistence effect
useEffect(() => {
	if (activeSessionId && messages.length > 0) {
		// Saves current messages to activeSessionId in localStorage
		updateSession(activeSessionId, { messages, updatedAt: now() });
	}
}, [messages, activeSessionId]);
```

And in `handleSwitchChat`:
```typescript
const handleSwitchChat = (id: string) => {
	setActiveSessionId(id);           // Triggers render 1
	const session = getSession(id);
	setMessages(session?.messages || []);  // Triggers render 2
};
```

**Problem**: When `handleSwitchChat` is called, React batches the state updates. On the render where `activeSessionId` is updated but `messages` still contains the old session's messages, the persistence effect fires and overwrites the **new** session's data in localStorage with the **old** session's messages.

**Impact**: Switching between chat sessions can corrupt the destination session's message history in localStorage. The user switches to a previous session and finds it now contains the messages from the session they just left.

**Fix**: Use a ref to track the switching state:
```typescript
const isSwitchingRef = useRef(false);

const handleSwitchChat = (id: string) => {
	isSwitchingRef.current = true;
	setActiveSessionId(id);
	setMessages(getSession(id)?.messages || []);
};

// In persistence effect
useEffect(() => {
	if (isSwitchingRef.current) {
		isSwitchingRef.current = false;
		return; // Skip save during switch
	}
	if (activeSessionId && messages.length > 0) {
		updateSession(activeSessionId, { messages, updatedAt: now() });
	}
}, [messages, activeSessionId]);
```

---

### H12. Open redirect in password reset email

**File**: `apps/backend/internal/handler/auth_handlers.go:181-185`

```go
token, err := h.userSvc.RequestPasswordReset(r.Context(), req.Email)
if err != nil {
	response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
	return
}
if token != "" && h.emailSender != nil {
	origin := r.Header.Get("Origin")       // User-controlled header
	if origin == "" {
		origin = "http://localhost:3000"
	}
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", origin, token)
	if eErr := email.SendPasswordReset(h.emailSender, req.Email, resetURL); eErr != nil {
		logger.Error("password_reset_email_failed", "error", eErr.Error())
	}
}
```

**Problem**: The reset URL is constructed from the `Origin` HTTP header, which is fully user-controlled. An attacker can send a `POST /api/auth/forgot-password` request with `Origin: https://evil.com` and the password reset email will contain a link to `https://evil.com/reset-password?token=<valid_token>`.

**Impact**: Account takeover via token theft. The victim receives a legitimate-looking password reset email, clicks the link, and their reset token is sent to the attacker's server. The attacker uses the token to reset the victim's password.

**Fix**: Use a configured base URL from environment variables:
```go
resetURL := fmt.Sprintf("%s/reset-password?token=%s", os.Getenv("NEXTAUTH_URL"), token)
```

---

### H13. X-Sandbox header bypasses all billing/usage logging

**File**: `apps/backend/internal/handler/openai_proxy.go:41`

```go
isSandbox := r.Header.Get("X-Sandbox") == "true"
```

Later at line 223-225:
```go
if !isSandbox {
	h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, inputTokens, outputTokens)
}
```

**Problem**: Any authenticated user can send `X-Sandbox: true` as a request header to bypass all billing, credit deduction, and usage logging for LLM API calls. While this header is documented as intended for testing, there is no restriction on who can use it.

**Impact**: A malicious user gets unlimited free LLM access. They can make unlimited requests to GPT-4, Claude, Gemini, etc. without any credits being deducted and without any usage being logged. This is a direct revenue loss.

**Fix**: Restrict X-Sandbox to admin users only:
```go
isSandbox := false
if r.Header.Get("X-Sandbox") == "true" {
	u := middleware.GetUser(r)
	isSandbox = u != nil && u.IsAdmin()
}
```

---

### H14. API key looked up by plaintext (timing attack + functional bug)

**File**: `apps/web/lib/api/key-auth.ts:18`

```typescript
const keyRecord = await db.query.apiKeys.findFirst({
	where: eq(apiKeys.key, apiKey),
});
```

**Problem**: The frontend key-auth module does a direct database lookup by plaintext API key using `eq(apiKeys.key, apiKey)`. The backend stores API keys hashed with HMAC-SHA256. If the frontend's `api_keys` table also stores hashed keys (shared DB), this plaintext lookup will always fail — the frontend API key auth path is completely non-functional.

**Impact**: Two scenarios:
1. If the table stores hashed keys (likely, since backend hashes them): the lookup always returns no results → functional bug, frontend API key auth never works
2. If the table stores plaintext keys: timing-attack-vulnerable comparison, and plaintext key storage is a security issue

**Fix**: Remove this frontend API key authentication path entirely. The backend already handles API key auth properly via `x-api-key` header through the middleware chain.

---

### H15. Password reset token uses insufficient entropy

**File**: `apps/backend/internal/service/user.go:232`

```go
tokenStr := domain.NewID()
```

**Problem**: Password reset tokens are generated using `domain.NewID()` which generates a UUID v4. While UUIDs are reasonably random, password reset tokens are high-value targets and should use `crypto/rand` with at least 128 bits of entropy.

**Impact**: If `NewID()` uses `math/rand` (which some UUID libraries do) or has insufficient entropy, reset tokens could be predicted by an attacker who knows the approximate time the reset was requested.

**Fix**: Use `crypto/rand` to generate a cryptographically secure token:
```go
b := make([]byte, 32)
if _, err := crypto_rand.Read(b); err != nil {
	return "", domain.Wrap(domain.ErrInternal, 500, "failed to generate reset token", err)
}
tokenStr := hex.EncodeToString(b)
```

---

### H16. No authentication on `CreateProviderPlugin`

**File**: `apps/backend/internal/handler/provider_plugin_handlers.go:13-25`

```go
func (h *Handler) CreateProviderPlugin(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateProviderPluginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid request body")
		return
	}

	p, err := h.providerPluginSvc.Create(r.Context(), "", req)  // Empty userID — no auth check
	if err != nil {
		response.Error(w, 500, "Failed to create plugin")
		return
	}
	response.Created(w, p)
}
```

**Problem**: The handler passes an empty string `""` for the userID and does not call `middleware.GetUser(r)`. There is no authentication or authorization check.

**Impact**: Even if the route has auth middleware, the empty userID means:
- Audit trails show no creator for the plugin
- Ownership-based access control is broken
- If the route lacks middleware (check `routes.go`), any unauthenticated user can create provider plugins

**Fix**: Retrieve the authenticated user and pass their ID:
```go
u := middleware.GetUser(r)
if u == nil {
	response.Error(w, 401, "Not authenticated")
	return
}
p, err := h.providerPluginSvc.Create(r.Context(), u.ID, req)
```

---

## MEDIUM Issues

### M1. Raw API key logged in plaintext

**File**: `apps/backend/internal/middleware/quota.go:250`

```go
if err := tracker.CheckRequest(r.Context(), key, model, tokens, clientIP); err != nil {
	logger.Warn("quota_check_failed", "error", err.Error(), "key", key.Key)
	response.Error(w, 429, err.Error())
	return
}
```

**Problem**: The raw API key value is logged in warning messages. API keys are secrets — they should never appear in logs. An attacker with log access (log aggregation systems, error tracking services, compromised server) can steal API keys.

**Fix**: Log a truncated/masked version:
```go
logger.Warn("quota_check_failed", "error", err.Error(), "key_prefix", key.Key[:8]+"...")
```

---

### M2. Dashboard stats silently swallow all query errors

**File**: `apps/backend/internal/handler/admin_operations.go:175-187`

```go
func (h *Handler) AdminDashboardStats(w http.ResponseWriter, r *http.Request) {
	var stats domain.DashboardStats
	ctx := r.Context()
	// ...
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.Users.Total)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE last_login_at >= $1", yesterday).Scan(&stats.Users.ActiveToday)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE created_at >= $1", todayStart).Scan(&stats.Users.NewToday)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE status='suspended'").Scan(&stats.Users.Suspended)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Requests.TotalToday)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM usage_records WHERE created_at >= $1", monthStart).Scan(&stats.Requests.TotalMonth)
	_ = h.db.QueryRow(ctx, "SELECT COALESCE(AVG(duration_ms),0) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Requests.AvgLatencyMs)
	_ = h.db.QueryRow(ctx, "SELECT COALESCE(SUM(tokens),0) FROM usage_records WHERE created_at >= $1 AND tokens > 0", todayStart).Scan(&stats.Tokens.InputToday)
	_ = h.db.QueryRow(ctx, "SELECT COALESCE(SUM(cost),0) FROM usage_records WHERE created_at >= $1", todayStart).Scan(&stats.Revenue.TodayCents)
	_ = h.db.QueryRow(ctx, "SELECT COALESCE(SUM(cost),0) FROM usage_records WHERE created_at >= $1", monthStart).Scan(&stats.Revenue.MonthCents)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM providers").Scan(&stats.Providers.Total)
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM providers WHERE status='active'").Scan(&stats.Providers.Healthy)

	response.OK(w, stats)
}
```

**Problem**: All 12 database queries discard errors with `_ =`. If the database is down, a table doesn't exist, or a column is missing, the handler returns HTTP 200 with zero-filled stats.

**Impact**: Admins see a dashboard that appears to work but shows meaningless zero data during database outages. There's no indication that anything is wrong — the dashboard just shows "0 users, 0 requests, $0 revenue" which could be mistaken for a real (empty) state.

**Fix**: Check errors on at least the first critical query, or collect errors and return a partial response with a warning:
```go
err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.Users.Total)
if err != nil {
	logger.Error("admin_stats_users_failed", "error", err.Error())
	response.Error(w, 500, "Failed to load dashboard stats")
	return
}
```

---

### M3. Output token estimate identical to input

**File**: `apps/backend/internal/service/provider.go:228`

```go
outputTokens = inputTokens
```

**Problem**: When the LLM provider does not return actual token counts, the fallback estimation sets `outputTokens = inputTokens`. For most LLM use cases, output tokens differ significantly from input tokens (e.g., a 100-token question often gets a 500-token answer).

**Impact**: Billing estimates are unrealistic. A user sending a 1000-token prompt that gets a 200-token response is billed as if they got a 1000-token response (5x overbilling). The reverse is also true.

**Fix**: Use a heuristic ratio:
```go
outputTokens = inputTokens / 3  // Typical output is ~1/3 of input
```

---

### M4. Rate limiter uses raw `RemoteAddr` instead of extracted IP

**File**: `apps/backend/internal/middleware/redis_ratelimit.go:74`

```go
key := r.RemoteAddr
if u := GetUser(r); u != nil {
	key = u.ID
}
```

**Problem**: The Redis rate limiter uses `r.RemoteAddr` directly as the rate-limiting key for unauthenticated requests (e.g., `192.168.1.1:54321`). Behind a reverse proxy (nginx, Cloudflare, AWS ALB), `RemoteAddr` is the proxy's IP, not the client's.

Compare with the quota middleware (`quota.go:240-247`) which correctly extracts the client IP:
```go
clientIP := r.RemoteAddr
if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
	if idx := strings.Index(xff, ","); idx > 0 {
		clientIP = strings.TrimSpace(xff[:idx])
	} else {
		clientIP = strings.TrimSpace(xff)
	}
}
```

**Impact**: Behind a reverse proxy, all unauthenticated clients share the same rate limit bucket. One client hitting the limit blocks everyone. The rate limiter and quota middleware also use different IP extraction logic, meaning the same request could be rate-limited by one system but not the other.

**Fix**: Extract a shared `getClientIP(r)` helper and use it consistently in both middleware.

---

### M5. errgroup errors silently discarded in billing

**File**: `apps/backend/internal/handler/handler.go:537-566`

```go
eg, ctx := errgroup.WithContext(context.Background())
eg.Go(func() error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if _, logErr := h.creditSvc.LogAndDeduct(ctx, userID, akID, model, inputTokens, outputTokens, cost, latency); logErr != nil {
		logger.Error("post_chat_billing_failed", "error", logErr.Error(), "user_id", userID)
	}
	return nil  // Always returns nil — error is logged but swallowed
})
eg.Go(func() error {
	// ... webhook dispatch ...
	return nil  // Always returns nil
})
go eg.Wait()  // Return value never captured
```

**Problem**: Both goroutines in the errgroup always return `nil` regardless of errors. The `eg.Wait()` is launched in a goroutine whose return value is never captured. Billing failures are logged but otherwise invisible.

**Impact**: If credit deduction fails (database down, insufficient credits race condition, etc.), the user consumes LLM resources without being billed. The error is logged but there's no retry mechanism, no alerting, and no way for the user to know their credits weren't deducted.

**Fix**: At minimum, log errgroup errors. Consider making billing failures visible or implementing a retry queue.

---

### M6. `StoredMessage` typed as `any`

**File**: `apps/web/components/ChatPlayground.tsx:29,467`

```typescript
type StoredMessage = any;  // Line 29

// Line 467 — used in render
messages.map((mRaw: any) => {
```

**Problem**: The `StoredMessage` type alias disables type checking for the entire message handling pipeline in the chat playground. Every property access, every function call, every conditional on message objects is unchecked.

**Impact**: Any typo in property names (`mRaw.contnet` instead of `mRaw.content`), any wrong method call, any missing null check will only be caught at runtime, not at compile time. This makes the component fragile and hard to refactor safely.

**Fix**: Define a proper interface:
```typescript
interface StoredMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt?: number;
}
```

---

### M7. `GatewayDashboard` unused `user` prop

**File**: `apps/web/components/GatewayDashboard.tsx:10-12,25`

```typescript
interface GatewayDashboardProps {
	user: any;  // Line 11 — typed as any
}

export default function GatewayDashboard({ user }: GatewayDashboardProps) {
	// `user` is never referenced in the component body
```

**Problem**: The component accepts a `user: any` prop but never uses it in the render. The `any` type creates a type safety hole, and the unused prop adds confusion about whether it's intended for future use.

**Impact**: Dead code that adds a type safety hole. Callers must pass a `user` prop even though it's unused.

**Fix**: Remove the `user` prop entirely, or if it's planned for future use, type it properly.

---

### M8. Unsafe `as` casts in auth callback

**File**: `apps/web/auth.ts:24,36`

```typescript
return json.data as { user: { id: string; name: string; email: string; role: string }; token: string };
```

**Problem**: The response from the backend is cast with `as` without any runtime validation. If the backend returns an error shape, a different data structure, or `null` data, the cast silently succeeds and downstream code will fail with confusing errors.

**Impact**: If the backend API changes its response format, or if there's a network error that returns a partial response, the auth system will silently accept invalid data and fail later with hard-to-debug errors.

**Fix**: Use Zod `safeParse` or at minimum a runtime check:
```typescript
if (json.data && typeof json.data.token === 'string' && json.data.user?.id) {
	return json.data as { ... };
}
return null;
```

---

### M9. SDK `request()` returns raw `Response` as type `T`

**File**: `apps/web/lib/api/sdk.ts:521`

```typescript
const contentType = res.headers.get("content-type") || "";
if (!contentType.includes("application/json")) {
	if (!res.ok) {
		const text = await res.text();
		throw this.mapError(res.status, text || res.statusText);
	}
	return res as unknown as T;  // Raw Response cast to generic T
}
```

**Problem**: When the response content type is not `application/json` (e.g., SSE streams, plain text), the raw `Response` object is unsafely cast to the generic type `T`. Callers expecting a typed object will get a `Response` instead.

**Impact**: Methods like `chatStream()` that return `AsyncGenerator<string>` will actually receive a `Response` object. The type system says it's an `AsyncGenerator`, but at runtime it's a `Response`. This works by accident if callers handle it correctly, but any refactoring could break it silently.

**Fix**: Use a separate method for streaming responses, or add a type guard.

---

### M10. `useMemo` has empty dependency array

**File**: `apps/web/components/models/ModelsExplorer.tsx:143`

```typescript
const models = useMemo(() => {
	return initialModels.map((model) => {
		// ... transform model ...
		return { ... };
	});
}, []);  // Empty dependency array — never recomputes
```

**Problem**: The `useMemo` that transforms `initialModels` into enriched model objects has an empty dependency array. If the parent component re-renders with updated `initialModels` props (e.g., after a data refetch), the models list will not recompute.

**Impact**: The models explorer shows stale data. If a new model is added via the admin panel, the user must do a full page refresh to see it.

**Fix**: Add `initialModels` as a dependency:
```typescript
}, [initialModels]);
```

---

### M11. No `fullscreenchange` event listener

**File**: `apps/web/components/playground/PlaygroundMain.tsx:373-381`

```typescript
const toggleFullscreen = () => {
	if (!document.fullscreenElement) {
		containerRef.current?.requestFullscreen();
		setIsFullscreen(true);
	} else {
		document.exitFullscreen();
		setIsFullscreen(false);
	}
};
```

**Problem**: `toggleFullscreen` sets `isFullscreen` state, but if the user exits fullscreen via the Escape key (browser native behavior), the `isFullscreen` state remains `true`. There is no `fullscreenchange` event listener to sync state.

**Impact**: The fullscreen toggle button shows the wrong icon (`Minimize2` when not in fullscreen, `Maximize2` when in fullscreen). Clicking it then does the opposite of what the icon suggests.

**Fix**: Add a `fullscreenchange` listener:
```typescript
useEffect(() => {
	const handler = () => setIsFullscreen(!!document.fullscreenElement);
	document.addEventListener("fullscreenchange", handler);
	return () => document.removeEventListener("fullscreenchange", handler);
}, []);
```

---

### M12. `paginatedRequest` lacks retry logic

**File**: `apps/web/lib/api/sdk.ts:556-596`

```typescript
private async paginatedRequest<T>(...): Promise<PaginatedResponse<T>> {
	// Single fetch — no retry loop
	const res = await this.fetchWithTimeout(url, init);
	// ...
}
```

**Problem**: Unlike `request()` which has retry logic with exponential backoff (lines 508-553, retries up to `this.retries` times), `paginatedRequest()` makes a single `fetchWithTimeout` call. Transient network errors on paginated endpoints fail immediately.

**Impact**: Paginated endpoints (logs, transactions, users list, admin lists) are less resilient to transient network issues than non-paginated endpoints. A single network blip causes a full page failure with no retry.

**Fix**: Add the same retry logic that `request()` uses.

---

### M13. Mermaid SVG sanitization is bypassable

**File**: `apps/web/components/Mermaid.tsx:13-18,49`

```typescript
function sanitizeSvg(svg: string): string {
	let cleaned = svg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
	cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
	cleaned = cleaned.replace(/javascript:/gi, "");
	return cleaned;
}

// Used at line 49:
<div dangerouslySetInnerHTML={{ __html: svg }} />
```

**Problem**: The custom SVG sanitizer uses regex-based filtering which is notoriously bypassable. Attack vectors include:
- `data:` URIs in `xlink:href`
- `foreignObject` injection
- SVG `animate` elements with `href` attributes
- Encoded event handlers (`&#111;nload=...`) that bypass the regex
- `on` handlers with no quotes: `onload=alert(1)`

The content originates from AI model responses in the chat, which could contain crafted mermaid syntax.

**Impact**: Stored XSS via AI-generated mermaid diagrams. If an attacker can influence the AI's output (prompt injection), they can inject JavaScript that executes in other users' browsers.

**Fix**: Use DOMPurify instead of regex:
```typescript
import DOMPurify from "dompurify";
const cleaned = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } });
```

---

### M14. Auto-provisioning of admin permissions

**File**: `apps/backend/cmd/api/routes.go:89-98`

```go
if u != nil && u.IsAdmin() {
	au, err := adminUserRepo.GetAdminUser(ctx, userID)
	if err == nil && au != nil {
		u.Permissions = au.Permissions
	} else {
		_, insertErr := database.Exec(ctx,
			`INSERT INTO admin_users (user_id, role, permissions, is_active, created_by)
			 VALUES ($1, 'superadmin', ARRAY['*'], true, $1)
			 ON CONFLICT (user_id) DO NOTHING`,
			userID)
		if insertErr == nil {
			u.Permissions = []string{"*"}
			logger.Info("auto_provisioned_admin_permissions", "user_id", userID)
		}
	}
}
```

**Problem**: Any user with `role=admin` in the `users` table automatically gets `superadmin` with `permissions: ['*']` (all permissions) if they don't already have an `admin_users` row. This bypasses the RBAC permission system.

**Impact**: The RBAC system is effectively bypassed for any admin user. Setting a user's role to "admin" in the database immediately grants them full superadmin access with all permissions, without going through the admin provisioning API.

**Fix**: Remove the auto-provisioning logic. Admin users should be explicitly provisioned through the admin API.

---

### M15. Duplicate password hashing with inconsistent parameters

**Files**:
- `apps/backend/internal/pkg/password/password.go` — `argon2Time=3`
- `apps/backend/internal/service/user.go` — `argon2Time=1`

**Problem**: Two separate password hashing implementations exist with different security parameters. The `password` package uses `argon2Time=3` (more secure) while the `service` package uses `argon2Time=1` (less secure). Additionally, the `password` package uses direct byte comparison (`string(hashBytes) == string(expected)`) instead of constant-time comparison, making it vulnerable to timing attacks. The `service` package correctly uses `subtle.ConstantTimeCompare`.

**Impact**: Passwords hashed by different code paths have different security levels. The `password` package's non-constant-time comparison is vulnerable to timing attacks.

**Fix**: Remove the duplicate in `service/user.go` and use only `internal/pkg/password/password.go`. Update the `password` package to use `subtle.ConstantTimeCompare` and ensure `argon2Time >= 2`.

---

### M16. Seed data uses trivially guessable passwords

**File**: `apps/backend/internal/db/seed.go:31-32`

```go
adminPass, _ := password.Hash("admin123")
userPass, _ := password.Hash("user123")
```

**Problem**: Seed data uses trivially guessable passwords (`admin123`, `user123`). The guard at line 25 only checks if the DB is empty — if the database is accidentally cleared in production, the seed runs and creates a default admin with a weak password.

**Impact**: If the seed runs in production (database cleared, fresh deployment, migration issue), there's an admin account with password `admin123` that anyone can guess.

**Fix**: Use environment-variable-sourced seed passwords, or add an explicit `SEED_ENABLED=false` gate for production:
```go
if os.Getenv("ENV") == "production" {
	return nil
}
```

---

### M17. No CSRF protection

**Files**: Entire backend and frontend auth flow.

**Problem**: There is no CSRF token mechanism anywhere in the codebase. The backend relies on `SameSite=Lax` cookies (set by NextAuth) and CORS headers, but state-changing endpoints (password change, profile update, key creation, webhook creation) accept cookie-based authentication without CSRF tokens.

**Impact**: `SameSite=Lax` provides some protection for top-level navigations but does not protect against all attack vectors:
- Same-site scripting (XSS on a subdomain)
- Certain subdomain attacks
- Top-level GET requests with side effects (if any exist)

**Fix**: Implement CSRF tokens for state-changing operations, especially those accessible via cookie auth. Consider the Double Submit Cookie pattern.

---

## LOW Issues

### L1. `useCallback` depends on `isRunning`

**File**: `apps/web/components/playground/PlaygroundMain.tsx:495`

```typescript
const runCode = useCallback(async () => {
	if (isRunning) return;
	// ...
}, [code, activeLang, isRunning]);  // isRunning in deps
```

**Problem**: Including `isRunning` in the dependency array means `runCode` is recreated every time `isRunning` changes. Since `runCode` is a dependency of the keyboard shortcut `useEffect` (line 511), this causes the event listener to be torn down and re-attached on every run start/stop.

**Fix**: Remove `isRunning` from the dependency array. The `if (isRunning) return` guard at line 389 is sufficient.

---

### L2. Hardcoded DB credentials in docker-compose.yml

**File**: `docker-compose.yml:10-11`

```yaml
POSTGRES_USER: dra
POSTGRES_PASSWORD: dra_secret
```

**Problem**: Hardcoded database credentials. While common for local development, if used as-is in production, it provides trivial database access.

**Fix**: Use environment variable substitution: `${POSTGRES_USER:-dra}`, `${POSTGRES_PASSWORD:-dra_secret}`.

---

### L3. Missing Content-Security-Policy header

**File**: `apps/web/next.config.ts`

**Problem**: The security headers include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`, but there is no `Content-Security-Policy` header.

**Impact**: Without CSP, the application is more vulnerable to XSS attacks. CSP can prevent inline script execution, limit script sources, and block data exfiltration.

**Fix**: Add a CSP header:
```typescript
{ key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;" }
```

---

### L4. `console.error`/`console.warn` left in production code

**Files**:
- `apps/web/components/Mermaid.tsx:36` — `console.error("Mermaid rendering failed:", error)`
- `apps/web/components/playground/PlaygroundMain.tsx:417` — `console.warn('Terminal not ready yet')`
- `apps/web/components/playground/PlaygroundMain.tsx:480,483,486` — Multiple `console.error` calls

**Problem**: Debug logging statements left in production components.

**Fix**: Remove or replace with a structured logger. At minimum, wrap in `if (process.env.NODE_ENV === 'development')`.

---

## Positive Findings

These are well-implemented — no action needed:

1. **SQL Injection**: All PostgreSQL queries use parameterized queries (`$1`, `$2`). No string interpolation into SQL found anywhere in the codebase.
2. **Password Hashing**: Uses argon2id with bcrypt fallback. `service/user.go` uses `subtle.ConstantTimeCompare` for hash comparison.
3. **JWT Validation**: Properly validates signing method (HS256 only), checks token validity, and verifies user exists in DB on every request.
4. **Rate Limiting**: Both Redis-backed and in-memory rate limiters implemented. Auth endpoints get stricter limits (10 RPM). SSE connections capped at 10/user.
5. **Token Blacklisting**: Logout properly blacklists tokens in the database.
6. **Stripe Webhook**: Signature verification is enforced before processing Stripe webhook events.
7. **Admin Authorization**: Admin routes use `RequireAdmin` and `RequirePermission` middleware consistently across the route tree.
8. **API Key Storage**: Keys are hashed with HMAC-SHA256 before storage. The raw key is never returned to clients after creation.
9. **File Upload**: Filenames sanitized, MIME type detected via magic bytes (not just extension), and file size limits enforced.
10. **Admin Error Handling**: Uses `adminError()` pattern that logs full errors server-side but returns generic messages to clients (most admin handlers).

---

## Action Plan

### P0 — Immediate (blocks production)

| Issue | Problem | Fix Effort |
|-------|---------|------------|
| C1 | `StartImpersonation` always errors | 1 line |
| C2 | `SoftDelete` always errors | 1 line |
| C3 | Billing uses output buffer for input tokens | ~20 lines |
| C4 | IDOR in AddMessage | ~15 lines |
| C5 | Rotate exposed API key | Config change |
| C6 | SSRF via webhook URLs | ~10 lines |

### P1 — Before shipping (security/auth)

| Issue | Problem | Fix Effort |
|-------|---------|------------|
| H12 | Open redirect in password reset | 3 lines |
| H5 | SSRF in AdminCreateProvider | 1 line |
| H1 | SSE headers before capacity check | Reorder 5 lines |
| H2 | Credit purchase transaction boundary | ~20 lines |
| H6 | superadmin rejected at API level | 1 line |
| H7 | Module-level SDK capture | ~5 lines |
| H13 | X-Sandbox bypass | ~5 lines |
| H16 | No auth on CreateProviderPlugin | ~5 lines |

### P2 — Soon (quality/reliability)

| Issue | Problem | Fix Effort |
|-------|---------|------------|
| H3 | Redis quota over-counts | ~15 lines |
| H4 | Nil pointer in admin handlers | ~10 lines |
| H8 | Stale auto-save closure | ~10 lines |
| H9 | Animation frame leak | ~5 lines |
| H10 | Double auth call | ~5 lines |
| H11 | Session switch race | ~10 lines |
| M14 | Auto-provisioning of superadmin | Remove code |
| M15 | Duplicate password hashing | Consolidate |
| M1 | API key logged in plaintext | 1 line |
| M2 | Dashboard stats swallow errors | ~5 lines |

### P3 — Backlog

| Issue | Problem | Fix Effort |
|-------|---------|------------|
| M3 | Output token estimate = input | 1 line |
| M4 | Rate limiter IP extraction | ~10 lines |
| M5 | errgroup billing errors | ~5 lines |
| M6 | `any` types in ChatPlayground | Define interface |
| M7 | Unused `user` prop | Remove prop |
| M8 | Unsafe `as` casts in auth | Add runtime check |
| M9 | SDK Response cast to T | Add type guard |
| M10 | useMemo empty deps | 1 line |
| M11 | Fullscreen state sync | ~5 lines |
| M12 | paginatedRequest no retry | ~10 lines |
| M13 | Mermaid sanitizer | Use DOMPurify |
| M16 | Seed passwords | Add env gate |
| M17 | No CSRF protection | Implement tokens |
| L1 | useCallback deps | Remove dep |
| L2 | Docker compose creds | Env vars |
| L3 | Missing CSP header | ~3 lines |
| L4 | console.log in production | Remove |
