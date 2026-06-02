# Security and Public Page Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the audited critical/high/medium backend security, billing, quota, webhook, and frontend public-page correctness/accessibility issues while preserving existing routes and SDK patterns.

**Architecture:** Treat backend security/billing fixes as the first release gate, with regression tests added before each fix. Treat frontend public-page issues as a second release gate, using small route/content/accessibility fixes instead of new product infrastructure unless an existing backend/contact endpoint is available. Some audit findings appear already partially fixed in the current tree (`/auth/oauth` route removed and global chi timeout removed), so the first tasks explicitly lock those fixes with regression tests and update the frontend OAuth integration accordingly.

**Tech Stack:** Go 1.25 backend with chi, pgx, layered handler/service/repository architecture; Next.js 16 canary frontend with App Router, React 19, Tailwind CSS v4, Vitest; repository requires `UPDATE.md` after code changes and code review after implementation.

---

## Current Root-Cause Notes From Re-Inspection

- `apps/backend/cmd/api/routes.go` currently does **not** register `/auth/oauth`, and contains a comment explaining why global `chiMiddleware.Timeout` is not applied. These two audit findings should be treated as already-fixed backend behavior but still need regression tests and frontend OAuth cleanup.
- `apps/web/auth.ts` still calls `BACKEND_URL/auth/oauth`, so OAuth sign-in can fail even though the insecure backend endpoint is gone.
- `apps/backend/internal/handler/openai_proxy.go` still skips embeddings billing directly from raw `X-Sandbox` header.
- `apps/backend/internal/handler/openai_proxy.go` and `apps/backend/internal/handler/anthropic_messages.go` still estimate preflight balance with `EstimateTokens(..., nil)`.
- `apps/backend/internal/middleware/quota.go` still does not increment in-memory monthly tokens during `CheckRequest`.
- `apps/backend/pkg/webhook/webhook.go` still uses an `http.Client` that follows redirects by default.
- `apps/web/next.config.ts` still has `ignoreBuildErrors: true`, no HSTS, and a CSP with `unsafe-eval`.
- `apps/web/app/contact/page.tsx` still discards form submissions and lacks label/input association.
- Several new public pages still link to missing routes.

---

## File Structure / Responsibilities

### Backend files to modify

- `apps/backend/cmd/api/routes.go`
  - Keep `/auth/oauth` absent.
  - Keep global timeout absent.
  - Add/keep comments explaining streaming constraint.

- `apps/backend/cmd/api/routes_test.go` or existing route test file if present
  - Add route-regression tests that assert `/auth/oauth` is not registered and long-lived routes are not wrapped by chi timeout.

- `apps/backend/internal/handler/openai_proxy.go`
  - Add shared sandbox helper usage for embeddings.
  - Use actual messages for preflight token/cost estimation.
  - Keep async billing timeout.

- `apps/backend/internal/handler/anthropic_messages.go`
  - Use actual messages for preflight token/cost estimation.
  - Add timeout to Anthropic async billing goroutine.

- `apps/backend/internal/handler/openai_proxy_test.go`
  - Add targeted tests for preflight estimation behavior where feasible.
  - If direct handler tests require too much setup, add focused helper tests by extracting small helper functions.

- `apps/backend/internal/middleware/quota.go`
  - Increment monthly in-memory usage atomically inside `CheckRequest` after limit passes.
  - Keep `RecordUsage` as actual usage adjustment hook.

- `apps/backend/internal/middleware/quota_test.go`
  - Adjust/add tests for monthly token accounting.

- `apps/backend/pkg/webhook/webhook.go`
  - Reject redirects or validate redirect targets before following. Preferred minimal safe fix: reject all redirects.
  - Apply `ValidateWebhookURL` on update at service layer.

- `apps/backend/pkg/webhook/webhook_test.go`
  - Add redirect SSRF regression test.

- `apps/backend/internal/service/webhook.go`
  - Validate webhook URL on update.

- `apps/backend/internal/service/webhook_test.go`
  - Add update validation test if test harness supports service-level tests.

- `apps/backend/internal/repository/webhook.go`
  - Consider masking secrets in read paths only if dashboard/API contract can be updated safely in this pass.
  - If raw secret is needed for dispatch, do not hash in this pass; plan a separate migration/encryption task.

- `apps/backend/internal/handler/enterprise.go`
  - Replace raw `err.Error()` client responses with stable messages; log raw error server-side.

- `.gitignore`
  - Add `apps/backend/api`.

- `UPDATE.md`
  - Append mandatory project entry after implementation.

### Frontend files to modify

- `apps/web/auth.ts`
  - Remove direct call to deleted/insecure `/auth/oauth` endpoint or replace with a safe backend-supported flow if one exists.
  - Ensure OAuth users do not silently lose backend token support without clear handling.

- `apps/web/next.config.ts`
  - Set `ignoreBuildErrors: false` or remove the override.
  - Add HSTS.
  - Remove `unsafe-eval` from production CSP, keeping dev allowances only if required.

- `apps/web/app/contact/page.tsx`
  - Make the form honest: either mailto fallback or visible “Email us” action, not fake success.
  - Read URL `topic` query and validate it.
  - Add missing topic IDs or align CTAs.
  - Associate labels and controls.

- `apps/web/app/about/page.tsx`
  - Replace `/careers/...` generated links with `mailto:careers@yapapa.com` or `#careers` until real career pages exist.

- `apps/web/app/blog/page.tsx`
  - Replace post detail links and RSS CTA with existing-route behavior, or add route stubs.
  - Preferred minimal fix: make cards non-navigational or link to `/blog#<slug>` anchors.

- `apps/web/app/changelog/page.tsx`
  - Replace `/changelog/rss` CTA with `/changelog` anchor or remove RSS CTA until route exists.

- `apps/web/app/enterprise/page.tsx`, `apps/web/app/roadmap/page.tsx`, `apps/web/app/legal/page.tsx`
  - Align `?topic=` values with valid contact topics.

- `apps/web/app/roadmap/page.tsx`
  - Replace `What we&apos;re building` string prop with `What we're building`.
  - Remove accidental quote in “Have an idea we should" build?”.

- `apps/web/app/status/page.tsx`
  - Remove fake live/auto-refresh claims or wire a real endpoint. Minimal fix: make the copy explicitly static/historical.

- `apps/web/tests/...`
  - Add tests for route link integrity / contact topic mapping if existing test setup supports component rendering.

---

## Task 1: Lock Down Removed Public OAuth Mint Endpoint

**Root cause:** The original issue was a public backend route that trusted arbitrary `email/name/provider` claims and minted backend JWTs. Current backend routing no longer registers `/auth/oauth`, but frontend still calls it.

**Files:**
- Modify: `apps/web/auth.ts:44-57,90-147`
- Test: `apps/backend/cmd/api/routes_test.go` or nearest existing route test file
- Test: `apps/web/tests/integration/auth-flow.test.ts` if OAuth callback behavior is already represented

- [ ] **Step 1: Write backend route regression test**

Create or extend `apps/backend/cmd/api/routes_test.go` with a test that builds the real router using test dependencies where possible, then POSTs `/auth/oauth` and expects `404 Method Not Allowed` or `404 Not Found`. If real router setup is too heavy, add a focused test around route registration helpers.

```go
func TestRegisterRoutes_DoesNotExposeOAuthMintEndpoint(t *testing.T) {
    // Arrange: use the existing testutil server/router setup if available.
    srv := testutil.NewTestServer(t)

    // Act
    req := httptest.NewRequest(http.MethodPost, "/auth/oauth", strings.NewReader(`{"email":"victim@example.com","name":"Victim","provider":"google"}`))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    srv.Router.ServeHTTP(rr, req)

    // Assert
    if rr.Code != http.StatusNotFound && rr.Code != http.StatusMethodNotAllowed {
        t.Fatalf("/auth/oauth must not be public; got status %d body %s", rr.Code, rr.Body.String())
    }
}
```

- [ ] **Step 2: Run test to verify current backend behavior**

Run:

```bash
cd apps/backend
go test -run TestRegisterRoutes_DoesNotExposeOAuthMintEndpoint ./cmd/api -v
```

Expected: PASS if current route removal is intact. If it fails due test harness setup, adjust only the test harness, not route behavior.

- [ ] **Step 3: Fix frontend OAuth backend-token refresh path**

Remove the unsafe `backendOAuth()` call from `apps/web/auth.ts`. Minimal safe behavior: OAuth signs into NextAuth, but does not mint a backend token until a secure backend exchange exists. Credentials flow remains unchanged.

Replace the OAuth callback sections with this behavior:

```ts
async function backendLogin(email: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;
  return json.data as {
    user: { id: string; name: string; email: string; role: string };
    token: string;
  };
}
```

Then in callbacks:

```ts
async signIn({ user, account }) {
  if (account && account.provider !== "credentials") {
    return Boolean(user.email);
  }
  return true;
},
async jwt({ token, user, account }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.backendToken = user.backendToken;
    token.provider = account?.provider;
  }

  if (token.backendToken && isTokenExpired(token.backendToken as string)) {
    token.backendToken = undefined;
  }

  return token;
},
```

- [ ] **Step 4: Run frontend auth tests**

Run:

```bash
cd apps/web
npm run test -- --run tests/integration/auth-flow.test.ts
```

Expected: existing credentials auth behavior still passes. If tests assert OAuth backend token minting, update them to assert OAuth does not call `/auth/oauth`.

---

## Task 2: Fix Embeddings Sandbox Billing Bypass

**Root cause:** `OpenAIEmbeddings` skips billing directly from `r.Header.Get("X-Sandbox")`, while chat completions require an authenticated admin user.

**Files:**
- Modify: `apps/backend/internal/handler/openai_proxy.go:41-45,351-354`
- Test: `apps/backend/internal/handler/openai_proxy_test.go`

- [ ] **Step 1: Extract sandbox helper**

In `openai_proxy.go`, add:

```go
func isAdminSandboxRequest(r *http.Request) bool {
    if r.Header.Get("X-Sandbox") != "true" {
        return false
    }
    u := middleware.GetUser(r)
    return u != nil && u.IsAdmin()
}
```

Use it in chat:

```go
isSandbox := isAdminSandboxRequest(r)
span.SetTag("sandbox", fmt.Sprintf("%v", isSandbox))
```

- [ ] **Step 2: Change embeddings billing gate**

Replace:

```go
if r.Header.Get("X-Sandbox") != "true" {
    h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, resp.TotalTokens, 0)
}
```

with:

```go
if !isAdminSandboxRequest(r) {
    h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, resp.TotalTokens, 0)
}
```

- [ ] **Step 3: Add helper tests**

In `openai_proxy_test.go`, add tests in package `handler` if needed to access helper, or test through request context if package access permits.

```go
func TestIsAdminSandboxRequestRequiresAdminUser(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
    req.Header.Set("X-Sandbox", "true")

    if isAdminSandboxRequest(req) {
        t.Fatal("sandbox should be false without authenticated admin user")
    }

    adminReq := req.WithContext(context.WithValue(req.Context(), middleware.UserContextKeyForTest(), &domain.User{ID: "admin", Role: "admin"}))
    if !isAdminSandboxRequest(adminReq) {
        t.Fatal("sandbox should be true for authenticated admin user")
    }
}
```

If there is no exported test key helper, test through existing middleware/auth helpers or place the test in `package handler` with a small request builder.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
cd apps/backend
go test -run 'TestIsAdminSandboxRequest|Test.*Embedding' ./internal/handler -v
```

Expected: PASS.

---

## Task 3: Fix Chat/Anthropic Preflight Balance Estimation

**Root cause:** Preflight calls `EstimateTokens(model, nil)` instead of using actual request messages, so balance checks undercharge before provider dispatch.

**Files:**
- Modify: `apps/backend/internal/handler/openai_proxy.go:65-119`
- Modify: `apps/backend/internal/handler/anthropic_messages.go:144-178,326-339`
- Test: `apps/backend/internal/handler/openai_proxy_test.go`

- [ ] **Step 1: Extract message conversion helper for OpenAI handler**

Add in `openai_proxy.go`:

```go
func domainMessagesFromLLM(req *llm.ChatRequest) []domain.ChatMessage {
    messages := make([]domain.ChatMessage, 0, len(req.Messages))
    for _, m := range req.Messages {
        messages = append(messages, domain.ChatMessage{
            Role:    string(m.Role),
            Content: m.Content,
        })
    }
    return messages
}

func estimateCostForMessages(providerSvc *service.ProviderService, pricingSvc *service.PricingService, model string, messages []domain.ChatMessage) (inputTokens int, outputTokens int, estimatedCost int) {
    inputTokens, outputTokens = providerSvc.EstimateTokens(model, messages)
    if pricingSvc != nil {
        estimatedCost = pricingSvc.CalculateCost(model, inputTokens, outputTokens)
    } else {
        estimatedCost = (inputTokens + outputTokens) * 2
        if estimatedCost < 100 {
            estimatedCost = 100
        }
    }
    return inputTokens, outputTokens, estimatedCost
}
```

If importing concrete service types creates cycles, keep the helper as a method on `Handler`:

```go
func (h *Handler) estimatePreflightCost(model string, messages []domain.ChatMessage) (int, int, int) { ... }
```

- [ ] **Step 2: Use actual messages in OpenAI preflight**

Replace:

```go
estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, nil)
estimatedCost := (estInput + estOutput) * 2
if estimatedCost < 100 {
    estimatedCost = 100
}
```

with:

```go
messages := domainMessagesFromLLM(internalReq)
estInput, estOutput, estimatedCost := h.estimatePreflightCost(internalReq.Model, messages)
```

Budget router should use these same `estInput` and `estOutput` values.

- [ ] **Step 3: Use actual messages in Anthropic preflight**

Replace:

```go
estInput, estOutput := h.providerSvc.EstimateTokens(internalReq.Model, nil)
estimatedCost := (estInput + estOutput) * 2
if estimatedCost < 100 {
    estimatedCost = 100
}
```

with:

```go
messages := domainMessagesFromLLM(internalReq)
estInput, estOutput, estimatedCost := h.estimatePreflightCost(internalReq.Model, messages)
```

- [ ] **Step 4: Add timeout to Anthropic async billing**

Replace:

```go
bgCtx := context.Background()
_, logErr := h.creditSvc.LogAndDeduct(bgCtx, userID, apiKeyID, model, inputTokens, outputTokens, cost, 0)
```

with:

```go
bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
_, logErr := h.creditSvc.LogAndDeduct(bgCtx, userID, apiKeyID, model, inputTokens, outputTokens, cost, 0)
```

- [ ] **Step 5: Add helper unit test for non-empty message estimation**

Add a focused test around the helper if concrete services can be instantiated, or table-test `domainMessagesFromLLM` and use an existing `ProviderService` constructor.

```go
func TestDomainMessagesFromLLMIncludesRequestContent(t *testing.T) {
    req := &llm.ChatRequest{
        Model: "openai/gpt-4o",
        Messages: []llm.Message{
            {Role: llm.RoleUser, Content: strings.Repeat("x", 800)},
        },
    }

    got := domainMessagesFromLLM(req)
    if len(got) != 1 {
        t.Fatalf("messages length = %d, want 1", len(got))
    }
    if got[0].Content != strings.Repeat("x", 800) {
        t.Fatal("message content was not preserved for token estimation")
    }
}
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
cd apps/backend
go test -run 'TestDomainMessagesFromLLM|TestAnthropicMessages|Test.*OpenAI' ./internal/handler -v
```

Expected: PASS.

---

## Task 4: Fix In-Memory Monthly Quota Accounting

**Root cause:** `QuotaTracker.CheckRequest` checks `mq.tokens + estimatedTokens` but never increments `mq.tokens`, while tests already expect it to increment.

**Files:**
- Modify: `apps/backend/internal/middleware/quota.go:120-134`
- Modify/Test: `apps/backend/internal/middleware/quota_test.go:79-104`

- [ ] **Step 1: Confirm failing test**

Run:

```bash
cd apps/backend
go test -run 'TestQuotaTracker_CheckRequest_MonthlyLimit|TestQuotaTracker_RecordUsage' ./internal/middleware -v
```

Expected before fix: `TestQuotaTracker_CheckRequest_MonthlyLimit` should fail if the bug is present.

- [ ] **Step 2: Increment monthly tokens in CheckRequest**

In `quota.go`, replace the monthly block tail:

```go
if mq.tokens+estimatedTokens > key.MonthlyTokenLimit {
    qt.mu.Unlock()
    return fmt.Errorf("monthly token limit %d exceeded", key.MonthlyTokenLimit)
}
qt.mu.Unlock()
```

with:

```go
if mq.tokens+estimatedTokens > key.MonthlyTokenLimit {
    qt.mu.Unlock()
    return fmt.Errorf("monthly token limit %d exceeded", key.MonthlyTokenLimit)
}
mq.tokens += estimatedTokens
qt.mu.Unlock()
```

- [ ] **Step 3: Keep RecordUsage semantics consistent**

Because `CheckRequest` now reserves estimated tokens, `RecordUsage` can be used to adjust actual-vs-estimated usage only if callers pass a delta. No production caller currently uses it. Update the comment:

```go
// RecordUsage adjusts monthly usage after a request completes. Pass a positive
// or negative delta when actual token usage differs from the estimate reserved
// by CheckRequest.
```

- [ ] **Step 4: Run quota tests**

Run:

```bash
cd apps/backend
go test -run 'TestQuotaTracker' ./internal/middleware -v
```

Expected: PASS.

---

## Task 5: Fix Webhook SSRF Redirect Bypass and Update Validation

**Root cause:** Original webhook URL is validated, but the default Go HTTP client follows redirects without validating the target. Update path validates only syntax.

**Files:**
- Modify: `apps/backend/pkg/webhook/webhook.go:53-57`
- Modify: `apps/backend/internal/service/webhook.go:102-113`
- Test: `apps/backend/pkg/webhook/webhook_test.go`
- Test: `apps/backend/internal/service/webhook_test.go`

- [ ] **Step 1: Add redirect rejection test**

In `apps/backend/pkg/webhook/webhook_test.go`, avoid global `SetSkipWebhookSSRFCheck(true)` for this test by setting it false inside the test and restoring it.

```go
func TestDispatcherRejectsWebhookRedirects(t *testing.T) {
    previous := skipWebhookSSRFCheck
    SetSkipWebhookSSRFCheck(false)
    defer SetSkipWebhookSSRFCheck(previous)

    target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        t.Fatal("redirect target should not be reached")
    }))
    defer target.Close()

    redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        http.Redirect(w, r, target.URL, http.StatusFound)
    }))
    defer redirector.Close()

    d := NewDispatcher()
    _, err := d.Send(context.Background(), Config{URL: redirector.URL, Events: []string{"*"}}, Event{Type: "chat.completed", Timestamp: time.Now()})
    if err == nil {
        t.Fatal("expected redirect rejection")
    }
    if !strings.Contains(err.Error(), "redirect") {
        t.Fatalf("expected redirect error, got %v", err)
    }
}
```

- [ ] **Step 2: Reject redirects in dispatcher client**

Replace:

```go
client: &http.Client{Timeout: 30 * time.Second},
```

with:

```go
client: &http.Client{
    Timeout: 30 * time.Second,
    CheckRedirect: func(req *http.Request, via []*http.Request) error {
        return http.ErrUseLastResponse
    },
},
```

Then treat 3xx as failure in `SendWithIdempotency`:

```go
if resp.StatusCode >= 300 && resp.StatusCode < 400 {
    delivery.Error = fmt.Sprintf("HTTP redirect %d", resp.StatusCode)
    return delivery, fmt.Errorf("webhook redirects are not allowed: HTTP %d", resp.StatusCode)
}
```

- [ ] **Step 3: Validate webhook URL on update**

In `apps/backend/internal/service/webhook.go`, after `req.Validate()` in `Update`, add:

```go
if err := webhook.ValidateWebhookURL(req.URL); err != nil {
    return nil, domain.NewError(domain.ErrBadRequest, 400, err.Error())
}
```

- [ ] **Step 4: Run webhook tests**

Run:

```bash
cd apps/backend
go test -run 'TestDispatcherRejectsWebhookRedirects|Test.*Webhook.*Update' ./pkg/webhook ./internal/service -v
```

Expected: PASS.

---

## Task 6: Remove Tracked Backend Binary Artifact

**Root cause:** `apps/backend/api` is a compiled ELF binary tracked in git. `.gitignore` ignores `apps/backend/cmd/api/api` but not `apps/backend/api`.

**Files:**
- Modify: `.gitignore:12-15`
- Delete from git tracking: `apps/backend/api`

- [ ] **Step 1: Verify artifact is tracked**

Run:

```bash
git ls-files --stage apps/backend/api
file apps/backend/api
```

Expected: tracked file and ELF executable output.

- [ ] **Step 2: Update `.gitignore`**

Add:

```gitignore
apps/backend/api
```

near the compiled binaries block.

- [ ] **Step 3: Remove from index and working tree**

Run:

```bash
git rm apps/backend/api
```

Expected: file scheduled for deletion.

- [ ] **Step 4: Verify no tracked binary remains**

Run:

```bash
git ls-files apps/backend/api
```

Expected: no output.

---

## Task 7: Harden Frontend Security Headers and Type Build Behavior

**Root cause:** `next.config.ts` allows TypeScript errors in production, has weak CSP, and lacks HSTS.

**Files:**
- Modify: `apps/web/next.config.ts:2-35`

- [ ] **Step 1: Replace config with environment-aware headers**

Use this shape:

```ts
import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const scriptSrc = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net"
  : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' http://localhost:8080 https: wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

Note: This keeps `unsafe-inline` for styles/scripts because Next.js 16 nonce integration may need a broader CSP pass. It removes production `unsafe-eval` and stops ignoring TS build errors.

- [ ] **Step 2: Run config/type validation**

Run:

```bash
cd apps/web
npm run build
```

Expected: If type errors appear now that `ignoreBuildErrors` is removed, fix those exact type errors in separate focused tasks before marking complete.

---

## Task 8: Fix Public Page Broken Links and Misleading Static Status

**Root cause:** New public pages were added before supporting detail/RSS/careers/status-live routes existed.

**Files:**
- Modify: `apps/web/app/blog/page.tsx`
- Modify: `apps/web/app/changelog/page.tsx`
- Modify: `apps/web/app/about/page.tsx`
- Modify: `apps/web/app/status/page.tsx`
- Modify: `apps/web/app/roadmap/page.tsx`

- [ ] **Step 1: Fix blog missing detail/RSS links**

Minimal safe change in `blog/page.tsx`:

```tsx
primaryCta={{ label: "Contact for updates", href: "/contact?topic=press", icon: Sparkles }}
```

Replace post links:

```tsx
<Link href={`/blog#${featured.slug}`} ...>
```

and:

```tsx
<Link href={`/blog#${post.slug}`} ...>
```

Add `id={featured.slug}` to the featured section/card wrapper and `id={post.slug}` to article wrappers.

- [ ] **Step 2: Fix changelog RSS missing route**

Replace:

```tsx
primaryCta={{ label: "Subscribe to RSS", href: "/changelog/rss", icon: Rss }}
```

with:

```tsx
primaryCta={{ label: "Contact for updates", href: "/contact?topic=support", icon: Rss }}
```

- [ ] **Step 3: Fix careers generated 404 links**

In `about/page.tsx`, replace generated `/careers/...` href with mailto including subject:

```tsx
href={`mailto:careers@yapapa.com?subject=${encodeURIComponent(role.title)}`}
```

If `next/link` does not accept this in the current setup, use a normal `<a>` for these career cards.

- [ ] **Step 4: Fix roadmap literal entity and typo**

Replace:

```tsx
title="What we&apos;re building"
```

with:

```tsx
title="What we're building"
```

Replace:

```tsx
Have an idea we should"
```

with:

```tsx
Have an idea we should{" "}
```

or split text normally without the stray quote.

- [ ] **Step 5: Make status page honest if no live endpoint exists**

Replace live claims in `status/page.tsx`:

```tsx
<span>Last updated from public incident log</span>
```

and:

```tsx
Historical snapshot
```

Replace `Auto-refresh 30s` with:

```tsx
Updated manually
```

- [ ] **Step 6: Run frontend build/test**

Run:

```bash
cd apps/web
npm run build
npm run test -- --run tests/wiring-verification.test.ts
```

Expected: build succeeds and wiring verification still passes.

---

## Task 9: Fix Contact Form Truthfulness, Topic Mapping, and Accessibility

**Root cause:** The form gives a success state without submitting, query-topic CTAs are ignored, and labels are not programmatically associated.

**Files:**
- Modify: `apps/web/app/contact/page.tsx`
- Modify: `apps/web/app/enterprise/page.tsx`
- Modify: `apps/web/app/roadmap/page.tsx`
- Modify: `apps/web/app/legal/page.tsx`

- [ ] **Step 1: Add topic aliases and read search params**

In `contact/page.tsx`, import:

```ts
import { useSearchParams } from "next/navigation";
```

Add topic IDs for CTA values or aliases:

```ts
const topicAliases: Record<string, string> = {
  enterprise: "sales",
  product: "partnerships",
  security: "security",
};

function normalizeTopic(topic: string | null): string {
  if (!topic) return "sales";
  const aliased = topicAliases[topic] ?? topic;
  return topics.some((item) => item.id === aliased) ? aliased : "sales";
}
```

In component:

```tsx
const searchParams = useSearchParams();
const initialTopic = normalizeTopic(searchParams.get("topic"));
const [selectedTopic, setSelectedTopic] = useState(initialTopic);
```

- [ ] **Step 2: Replace fake submit with mailto submission**

Change `handleSubmit`:

```tsx
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const company = String(formData.get("company") ?? "");
  const role = String(formData.get("role") ?? "");
  const volume = String(formData.get("volume") ?? "");
  const message = String(formData.get("message") ?? "");
  const body = [
    `Topic: ${selectedTopic}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    `Role: ${role}`,
    `Volume: ${volume}`,
    "",
    message,
  ].join("\n");

  window.location.href = `mailto:hello@yapapa.com?subject=${encodeURIComponent(`Yapapa ${selectedTopic} inquiry`)}&body=${encodeURIComponent(body)}`;
}
```

Remove the fake `submitted` state and success panel.

- [ ] **Step 3: Add required fields and accessible labels**

Update `Field` props:

```tsx
function Field({ label, name, type = "text", placeholder, required = false }: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = `contact-${name}`;
  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 block mb-2">
        {label}
      </label>
      <input id={id} type={type} name={name} placeholder={placeholder} required={required} className="...existing classes..." />
    </div>
  );
}
```

Use:

```tsx
<Field label="Full name" name="name" placeholder="Mira Vance" required />
<Field label="Work email" name="email" type="email" placeholder="mira@company.com" required />
```

Wrap volume in fieldset:

```tsx
<fieldset>
  <legend className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 block mb-2">
    Estimated monthly volume
  </legend>
  ...radio labels...
</fieldset>
```

For textarea:

```tsx
<label htmlFor="contact-message" ...>Message</label>
<textarea id="contact-message" name="message" required ... />
```

Make consent required:

```tsx
<input type="checkbox" id="agree" required ... />
```

- [ ] **Step 4: Align CTA query topics**

Either keep aliases from Step 1 or change CTAs:

```tsx
// enterprise/page.tsx
href="/contact?topic=sales"

// roadmap/page.tsx
href="/contact?topic=partnerships"

// legal/page.tsx
href="/contact?topic=security"
```

- [ ] **Step 5: Run frontend tests/build**

Run:

```bash
cd apps/web
npm run build
npm run test -- --run tests/components tests/integration/auth-flow.test.ts
```

Expected: PASS or actionable diagnostics unrelated to this change.

---

## Task 10: Reduce Raw Error Leakage in Enterprise Handlers

**Root cause:** Several enterprise handlers return raw `err.Error()` to clients.

**Files:**
- Modify: `apps/backend/internal/handler/enterprise.go:66-68,91-93,163-165,216-219`

- [ ] **Step 1: Add small helper in `enterprise.go`**

```go
func enterpriseClientError(w http.ResponseWriter, status int, clientMessage string, err error) {
    if err != nil {
        logger.Warn("enterprise_operation_failed", "status", status, "error", err.Error())
    }
    response.Error(w, status, clientMessage)
}
```

- [ ] **Step 2: Replace raw error responses**

Examples:

```go
if err != nil {
    enterpriseClientError(w, 400, "failed to add credential", err)
    return
}
```

```go
if err := h.credVault.Rotate(id, req.NewAPIKey); err != nil {
    enterpriseClientError(w, 400, "failed to rotate credential", err)
    return
}
```

```go
if err != nil {
    enterpriseClientError(w, 400, "failed to create virtual key", err)
    return
}
```

```go
if err != nil {
    enterpriseClientError(w, 500, "failed to scan content", err)
    return
}
```

- [ ] **Step 3: Run handler tests**

Run:

```bash
cd apps/backend
go test ./internal/handler -v
```

Expected: PASS.

---

## Task 11: Decide Webhook Secret Treatment Scope

**Root cause:** Webhook secrets are stored and returned in plaintext. Full encryption/write-only treatment may require DB/API/frontend migration.

**Recommended scope for this pass:** Do not change DB storage unless migration is planned. Stop returning secrets from list/get responses and avoid pre-populating edit form with secret. Keep raw secret internally for dispatch.

**Files:**
- Modify: `apps/backend/internal/repository/webhook.go`
- Modify: `apps/web/app/dashboard/webhooks/page.tsx`
- Test: `apps/backend/internal/repository/webhook_test.go`

- [ ] **Step 1: Add backend test for masked read response**

Add/update repository or handler test to assert list/get responses do not expose full secret. If repository is also used for dispatch, prefer masking at handler/DTO layer instead of repository.

Expected response behavior:

```json
{
  "secret": "whsec_...abcd",
  "hasSecret": true
}
```

or omit `secret` entirely and return `hasSecret: true`.

- [ ] **Step 2: Implement DTO masking at handler boundary**

Preferred: leave repository/domain raw for dispatch, map API responses through safe DTOs in webhook handlers.

```go
type webhookResponse struct {
    ID        string            `json:"id"`
    UserID    string            `json:"userId"`
    URL       string            `json:"url"`
    Events    []string          `json:"events"`
    Headers   map[string]string `json:"headers,omitempty"`
    Active    bool              `json:"active"`
    HasSecret bool              `json:"hasSecret"`
    CreatedAt time.Time         `json:"createdAt"`
}

func toWebhookResponse(w domain.Webhook) webhookResponse {
    return webhookResponse{ID: w.ID, UserID: w.UserID, URL: w.URL, Events: w.Events, Headers: w.Headers, Active: w.Active, HasSecret: w.Secret != "", CreatedAt: w.CreatedAt}
}
```

- [ ] **Step 3: Update dashboard edit form**

In `apps/web/app/dashboard/webhooks/page.tsx`, do not display full secret and do not prepopulate it. Use copy like “Secret configured; enter a new secret to rotate.”

- [ ] **Step 4: Run webhook and frontend tests**

Run:

```bash
cd apps/backend
go test ./internal/handler ./internal/repository ./internal/service -run Webhook -v
cd ../web
npm run test -- --run tests
```

Expected: PASS or precise type updates needed for webhook DTO shape.

---

## Task 12: Append UPDATE.md Entry

**Root cause:** Project rule requires `UPDATE.md` entry after code changes.

**Files:**
- Modify: `UPDATE.md`

- [ ] **Step 1: Gather line ranges**

Run:

```bash
git diff --stat
git diff --name-only
```

Then inspect changed line ranges with:

```bash
git diff --unified=0 -- <file>
```

- [ ] **Step 2: Append UPDATE.md entry**

Use session name:

```text
security-bugfixes-2026-06-02
```

Template title:

```markdown
## [Next]. fix: close auth billing and public-page audit gaps
```

Include:

- Why: audited critical/high/medium security and UX findings.
- Files Changed table with exact paths and line ranges.
- Before/After code blocks for representative changes:
  - embeddings sandbox check
  - preflight estimation
  - webhook redirect policy
  - contact form submit behavior
  - next.config security headers

- [ ] **Step 3: Verify UPDATE.md format**

Run:

```bash
grep -n "security-bugfixes-2026-06-02" UPDATE.md
```

Expected: one new entry with required sections.

---

## Task 13: Final Verification and Reviews

**Files:**
- No direct edits unless prior tasks expose failures.

- [ ] **Step 1: Run backend verification**

```bash
cd apps/backend
make fmt
make vet
make test-unit
```

Expected: PASS. If `go` unavailable, stop and report toolchain blocker exactly.

- [ ] **Step 2: Run frontend verification**

```bash
cd apps/web
npm run lint
npm run build
npm run test
```

Expected: PASS. If dependencies missing, run root `npm install` only with user permission.

- [ ] **Step 3: Run smoke test**

```bash
bash scripts/smoke-test.sh
```

Expected: PASS or documented known blockers.

- [ ] **Step 4: Run required code review agents**

Use:

- `go-reviewer` for backend Go changes.
- `typescript-reviewer` for frontend changes.
- `security-reviewer` for auth/billing/webhook/header changes.
- `code-reviewer` for overall diff.

- [ ] **Step 5: Fix critical/high review findings only**

If reviewers find CRITICAL/HIGH issues, create a small follow-up plan/task and fix them before completion.

---

## Execution Order

1. Task 1 — OAuth route/frontend cleanup regression.
2. Task 2 — embeddings sandbox billing bypass.
3. Task 3 — chat/Anthropic preflight billing and Anthropic async timeout.
4. Task 4 — in-memory quota accounting.
5. Task 5 — webhook redirect SSRF and update validation.
6. Task 6 — remove tracked backend binary.
7. Task 10 — raw enterprise error leakage.
8. Task 7 — frontend headers/type build behavior.
9. Task 8 — public broken links/status/roadmap copy.
10. Task 9 — contact form truthfulness/topic/a11y.
11. Task 11 — webhook secret API/dashboard treatment if accepted for this pass.
12. Task 12 — UPDATE.md.
13. Task 13 — final verification/reviews.

## What Not To Retry

- Do not reintroduce `/auth/oauth` as a public backend JWT mint endpoint.
- Do not restore global chi timeout middleware around streaming routes.
- Do not rely on `X-Sandbox: true` without admin verification.
- Do not treat frontend fake success UI as a real form submission.
- Do not remove `unsafe-eval` from development CSP if it prevents local Next.js dev from booting; make the restriction production-only.
- Do not hash webhook secrets in DB unless dispatch is redesigned, because HMAC signing needs raw secret material or decryptable ciphertext.

## Open Questions / Blockers

- Go toolchain was unavailable during audit (`go: No such file or directory`). Implementation verification requires Go installed or PATH fixed.
- Frontend dependencies were unavailable during audit (`next: not found`). Verification requires `npm install` or restored `node_modules`.
- Need product decision for contact form: mailto fallback vs. real backend contact endpoint. This plan uses mailto fallback as the minimal honest fix.
- Need product/security decision for webhook secret full treatment: DTO masking now vs. encrypted-at-rest migration later.

## Self-Review

- Spec coverage: Covers all 3 critical, all 7 high, and the listed medium items. Webhook secret treatment is split into a decision task because safe encryption-at-rest is larger than a bugfix.
- Placeholder scan: No `TBD` / `TODO` placeholders. Tasks include exact files, commands, and expected outcomes.
- Type/signature consistency: Helper names are consistent within the plan. Some test helper details depend on existing private context keys; plan instructs using existing harness or same-package tests where needed.
