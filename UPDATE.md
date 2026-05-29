# Update — Codebase Cleanup & Feature Wiring

> **Session**: Sisyphus (OhMyOpenCode), 2026-05-17
> **Branch**: main (continuation of prior session work)
> **Total**: 43 files changed, +1,672 / −3,937 lines (net −2,265)

---

## 1. P0 — Dead Code Removal (Backend)

### Deleted Files (21 files, −2,849 lines)

| File                                               | Lines | Why                                                                                                   |
| -------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `apps/backend/internal/handler/comparison.go`      | 84    | Dead handler — routes removed, no callers                                                             |
| `apps/backend/internal/handler/export.go`          | 71    | Dead handler — no routes registered                                                                   |
| `apps/backend/internal/handler/fine_tuning.go`     | 100   | Dead handler — only `ListFineTuningJobs` and `GetFineTuningJob` used; 3 others removed from `main.go` |
| `apps/backend/internal/handler/provider_plugin.go` | 78    | Dead handler — no routes registered                                                                   |
| `apps/backend/internal/handler/rbac.go`            | 112   | Dead handler — RBAC not implemented                                                                   |
| `apps/backend/internal/middleware/validate.go`     | 37    | Dead middleware — not wired                                                                           |
| `apps/backend/internal/repository/interfaces.go`   | 149   | Dead file — interface-based repo pattern abandoned; all repos use concrete structs                    |
| `apps/backend/internal/service/experiment.go`      | 249   | Dead service — A/B experiment logic unused                                                            |
| `apps/backend/pkg/llm/context/compressor.go`       | 139   | Dead package — context compression never wired into pipeline                                          |
| `apps/backend/pkg/llm/provider/balancer.go`        | 209   | Dead package — replaced by `pkg/llm/provider/` registry                                               |
| `apps/backend/pkg/llm/provider/balancer_test.go`   | 157   | Tests for dead balancer                                                                               |
| `apps/backend/pkg/llm/provider/fallback.go`        | 189   | Dead package — fallback logic moved to circuit breaker                                                |
| `apps/backend/pkg/llm/provider/fallback_test.go`   | 196   | Tests for dead fallback                                                                               |
| `apps/backend/pkg/llm/telemetry/logger.go`         | 95    | Dead package — replaced by stdlib `slog`                                                              |
| `apps/backend/pkg/llm/telemetry/span.go`           | 120   | Dead package — no tracing backend configured                                                          |
| `apps/backend/pkg/llm/translate/errors.go`         | 55    | Dead package — error translation unused                                                               |
| `apps/backend/pkg/llm/translate/errors_test.go`    | 94    | Tests for dead translate/errors                                                                       |
| `apps/backend/pkg/llm/translate/validate.go`       | 126   | Dead package — validation step removed from pipeline                                                  |
| `apps/backend/pkg/llm/translate/validate_test.go`  | 255   | Tests for dead translate/validate                                                                     |
| `apps/web/components/CodeEditor.tsx`               | 145   | Orphaned component — no imports found                                                                 |
| `apps/web/components/ModelDetailModal.tsx`         | 189   | Orphaned component — no imports found                                                                 |

### Modified Files — Dead Code Stripped

| File                                               | Change     | Before                                                                                                                | After                                                                                                                                                                               |
| -------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/cmd/api/main.go`                     | −25 lines  | Wired `dedupCache`, `semanticCache`, `guard`, 3 fine-tuning routes                                                    | Removed dead cache/guard setup, removed `ListFineTuningDatasets`, `GetFineTuningDataset`, `CreateFineTuningJob` routes. Added `AdminFetchModels` route.                             |
| `apps/backend/internal/handler/handler.go`         | −49 lines  | Handler struct had `guard`, `dedupCache`, `semanticCache` fields + 5 setter methods                                   | Removed dead fields and setters (`SetGuard`, `SetDedupCache`, `SetSemanticCache`)                                                                                                   |
| `apps/backend/internal/handler/admin_providers.go` | +85 lines  | —                                                                                                                     | Added `AdminFetchModels` handler for admin provider model fetching                                                                                                                  |
| `apps/backend/internal/service/fine_tuning.go`     | −54 lines  | 7 methods including `CreateFineTuningJob`, `ListDatasets`, etc.                                                       | Stripped to `GetJob` and `ListJobs` only                                                                                                                                            |
| `apps/backend/internal/service/provider.go`        | −15 lines  | Had `SetPipeline`, `SetModelRouter`, `SetABRouter` setters                                                            | Removed dead setters                                                                                                                                                                |
| `apps/backend/internal/service/comparison.go`      | −14 lines  | Dead comparison service methods                                                                                       | Stripped unused methods                                                                                                                                                             |
| `apps/backend/pkg/llm/pipeline/pipeline.go`        | −216 lines | Had `StandardPipeline()`, `BuildPipeline()`, `ChainPipelines()`, `TokenCheckStep`, `MetricsStep`, 8 unused step types | Removed 3 dead factory functions + 8 unused step types. Kept 5 used steps: `ValidationStep`, `SanitizationStep`, `LoggingStep`, `CacheStep`, `GuardrailsStep` + core pipeline logic |
| `apps/backend/internal/repository/cache.go`        | −9 lines   | Had `NewDedupCache`, `NewSemanticCache` constructors                                                                  | Removed dead constructors                                                                                                                                                           |
| `apps/backend/internal/repository/cache_test.go`   | −13 lines  | `TestNopRepoCache` tested dead cache                                                                                  | Removed dead test                                                                                                                                                                   |
| `apps/backend/internal/repository/prompt.go`       | −12 lines  | Dead prompt repo methods                                                                                              | Removed unused methods                                                                                                                                                              |

### Verification

- `go build ./...` — passes
- `go test -race -short ./...` — passes

---

## 2. P1 — Frontend API Wiring

### 2.1 Gateway Dashboard (`apps/web/components/GatewayDashboard.tsx`)

**Before**: 6 hardcoded mock model objects, hardcoded `usageStats` object, no API calls.
**After**: Uses 3 React Query hooks — `useAnalytics()`, `useModels()`, `usePublicProviderHealth()` — to fetch real data.

Key changes:

- Removed 6 mock model entries (lines 10–87)
- Removed hardcoded `usageStats` object
- Added `formatPricePer1M()` and `deriveCategory()` helpers for dynamic model categorization from API data
- Stats derived from `analytics.recentLogs` and `analytics.summary`
- Model list sourced from `useModels()` with loading state
- Provider health from `usePublicProviderHealth()`

### 2.2 Organization Page (`apps/web/app/dashboard/organization/page.tsx`)

**Before**: Local `useState` with hardcoded initial member (`{ id: "1", name: "You", ...}`), no API calls, manual `addMember`/`removeMember` functions.
**After**: Uses 5 React Query hooks — `useOrganizations()`, `useCreateOrganization()`, `useOrgMembers()`, `useInviteMember()`, `useRemoveMember()`.

Key changes:

- Removed hardcoded member list and `orgName` state
- Replaced manual `addMember()` with `useInviteMember()` mutation (calls `POST /api/organizations/:id/invite`)
- Replaced manual `removeMember()` with `useRemoveMember()` mutation (calls `DELETE /api/organizations/:id/members/:userId`)
- Added org creation UI with `useCreateOrganization()` mutation
- Added org selector with `useOrganizations()` query
- Added error banner with `AnimatePresence`
- Loading states via React Query `isLoading`/`isPending`

### 2.3 Notifications Page (`apps/web/app/dashboard/notifications/page.tsx`)

**Before**: `setInterval` polling with `Math.random()` generating fake notifications.
**After**: Real SSE stream via `getSDK().notificationsStream()`.

Key changes:

- Replaced `setInterval` mock with `AsyncGenerator` SSE stream
- Added `AbortController` for clean disconnect on unmount
- Added `mapEventType()` to map SSE event types to notification severity
- Added `showBrowserToast()` for native browser notifications
- Added `WifiOff` indicator for disconnected state
- Filters out heartbeat/ping events (`SKIP_TYPES`)

### 2.4 Playground Page (`apps/web/app/playground/page.tsx`)

**Before**: Simulated responses with `setTimeout` and hardcoded text: `"This is a simulated response from ${model.name}..."`
**After**: Real streaming chat via `getSDK().chatStream()`.

Key changes:

- Added `configureSDK({ baseUrl: ... })` on mount
- Replaced `setTimeout` simulation with parallel `AsyncGenerator` streams per model
- Each model streams independently; content accumulated and displayed in real-time
- Added `streamingContent` and `streamErrors` state tracking
- Responses saved to chat history on stream completion

### 2.5 React Query Hooks (`apps/web/lib/api/hooks.ts`)

**Added**: `useModels()` hook (lines 181–193)

```typescript
export function useModels() {
  return useQuery<ModelInfo[]>({
    queryKey: ["models"],
    queryFn: () => sdk.listModels(),
  });
}
```

Also added `ModelInfo` import from SDK types.

### 2.6 Admin SDK (`apps/web/lib/api/admin-sdk.ts`)

**Added**: `fetchProviderModels()` method for admin provider model fetching endpoint.

### 2.7 Deleted Frontend Components

| File                                       | Lines | Why                                   |
| ------------------------------------------ | ----- | ------------------------------------- |
| `apps/web/components/CodeEditor.tsx`       | 145   | No imports found anywhere in codebase |
| `apps/web/components/ModelDetailModal.tsx` | 189   | No imports found anywhere in codebase |

---

## 3. Summary by Layer

| Layer               | Files Deleted | Files Modified | Net Lines  |
| ------------------- | ------------- | -------------- | ---------- |
| Backend handlers    | 5             | 3              | −436       |
| Backend services    | 1             | 3              | −83        |
| Backend middleware  | 1             | 0              | −37        |
| Backend repository  | 1             | 3              | −170       |
| Backend pkg/llm     | 8             | 1              | −1,284     |
| Frontend components | 2             | 5              | −343       |
| Frontend pages      | 0             | 4              | +478       |
| Frontend lib/api    | 0             | 2              | +16        |
| Config/docs         | 0             | 2              | −44        |
| **Total**           | **21**        | **22**         | **−2,265** |

---

## 4. Verification Status

| Check                        | Status                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `go build ./...`             | Pass                                                                      |
| `go test -race -short ./...` | Pass                                                                      |
| TypeScript (changed files)   | 0 errors                                                                  |
| TypeScript (pre-existing)    | 19 Framer Motion type errors in admin pages (unrelated)                   |
| Frontend build               | Pre-existing Framer Motion type error in `Hero.tsx`/`AnimatedCounter.tsx` |

---

## 5. SDK Coverage — Already Complete

Both SDKs already implement all ~40 methods listed in `docs/missing.md`. The gap analysis is outdated from a prior session.

### TypeScript SDK (`apps/web/lib/api/sdk.ts`) — 1060 lines

All methods present:

- **Auth extended**: `oauthLogin`, `forgotPassword`, `resetPassword`
- **Budget**: `getBudget`, `setBudget`
- **Budget Alerts & Caps**: `listBudgetAlerts`, `createBudgetAlert`, `deleteBudgetAlert`, `getBudgetCap`, `createBudgetCap`, `updateBudgetCap`, `deleteBudgetCap`
- **Conversations**: `listConversations`, `createConversation`, `getConversation`, `deleteConversation`, `addMessage`
- **Prompts**: `listPrompts`, `createPrompt`, `getPrompt`, `renderPrompt`, `deletePrompt`
- **Webhooks**: `listWebhooks`, `createWebhook`, `getWebhook`, `updateWebhook`, `deleteWebhook`
- **Organizations**: `listOrganizations`, `createOrganization`, `getOrganization`, `inviteMember`, `removeMember`, `listMembers`, `acceptInvite`
- **Batch**: `submitBatch`, `getBatchJob`
- **Files**: `uploadFile`, `listFiles` (with `FormData` helper)
- **Embeddings**: `embed`
- **Validate**: `validate`
- **Notifications**: `notificationsStream` (AsyncGenerator SSE)
- **OpenAI Proxy**: `openaiChatCompletions`, `openaiEmbeddings`, `openaiListModels`
- **Admin Extended**: `adminCircuitBreakers`, `adminProviderHealth`
- **Admin Messages**: `adminListMessages`, `adminCreateMessage`, `adminGetMessage`, `adminUpdateMessage`, `adminDeleteMessage`
- **User Messages**: `getUserMessages`, `getUserMessageUnreadCount`, `markMessageRead`, `markAllMessagesRead`
- **Public Health**: `providerHealth`
- **Architectural**: `uploadFormData` helper, rate limit header extraction, request ID tracing, jittered retry

### Go SDK (`apps/backend/pkg/sdk/client.go`) — 1083 lines

All methods present:

- **Auth extended**: `OAuthLogin`, `ForgotPassword`, `ResetPassword`
- **Budget**: `GetBudget`, `SetBudget`
- **Conversations**: `ListConversations`, `CreateConversation`, `GetConversation`, `DeleteConversation`, `AddMessage`
- **Prompts**: `ListPrompts`, `CreatePrompt`, `GetPrompt`, `RenderPrompt`, `DeletePrompt`
- **Webhooks**: `ListWebhooks`, `CreateWebhook`, `GetWebhook`, `UpdateWebhook`, `DeleteWebhook`
- **Organizations**: `ListOrganizations`, `CreateOrganization`, `GetOrganization`, `InviteMember`, `RemoveMember`, `ListMembers`, `AcceptInvite`
- **Batch**: `SubmitBatch`, `GetBatchJob`
- **Files**: `UploadFile`, `ListFiles` (with `doUpload` multipart helper)
- **Embeddings**: `Embed`
- **Validate**: `Validate`
- **Notifications**: `NotificationsStream` (channel-based SSE)
- **OpenAI Proxy**: `OpenAIChatCompletions`, `OpenAIEmbeddings`, `OpenAIListModels`
- **Admin Extended**: `AdminCircuitBreakers`, `AdminProviderHealth`
- **Public Health**: `ProviderHealth`
- **Architectural**: `doUpload` helper, rate limit header extraction, request ID tracing, jittered backoff retry

### Types — Both SDKs

All types from `docs/missing.md` section E are present:
`BudgetConfig`, `Conversation`, `ConversationMessage`, `Prompt`, `Webhook`, `Organization`, `OrgMember`, `BatchJob`, `FileInfo`, `CircuitBreakerStatus`, `ProviderHealthStatus`

**Action**: `docs/missing.md` should be marked as resolved or deleted in a future cleanup pass.

---

## 7. Session 2 — P2 Test Implementation (2026-05-17)

### New Test Files (2 files, +300 lines)

| File                                                    | Lines | What                                              |
| ------------------------------------------------------- | ----- | ------------------------------------------------- |
| `apps/backend/internal/handler/admin_providers_test.go` | 189   | 6 unit tests for `AdminFetchModels` handler       |
| `apps/web/tests/lib/api/hooks.test.ts`                  | 111   | 6 wiring verification tests for React Query hooks |

### AdminFetchModels Handler Tests (Go)

| Test                                         | What It Verifies                                                                                          | Result |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| `TestAdminFetchModels_InvalidBody`           | Returns 400 on malformed JSON                                                                             | PASS   |
| `TestAdminFetchModels_MissingBaseURL`        | Returns 400 when baseUrl empty                                                                            | PASS   |
| `TestAdminFetchModels_Success`               | Fetches models from mock provider, parses OpenAI-compatible response, returns transformed list with count | PASS   |
| `TestAdminFetchModels_StripsTrailingV1`      | Normalizes baseUrl with trailing `/v1` before appending `/v1/models`                                      | PASS   |
| `TestAdminFetchModels_ProviderError`         | Propagates provider HTTP status (401) to client                                                           | PASS   |
| `TestAdminFetchModels_TransformsModelFields` | Strips extra fields (`created`, `permission`) from model response, keeps only `id`, `object`, `owned_by`  | PASS   |

**Key design**: Tests use `&handler.Handler{}` directly since `AdminFetchModels` is a pure HTTP handler with no service dependencies — it makes an outbound HTTP call to the provider's `/v1/models` endpoint. Mock providers use `httptest.NewServer`.

### Hook-SDK Wiring Tests (TypeScript)

| Test                                                      | What It Verifies                                                                   | Result |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| `all query hooks call their corresponding SDK methods`    | 22 query hooks (useKeys, useAnalytics, useModels, etc.) each call their SDK method | PASS   |
| `all mutation hooks call their corresponding SDK methods` | 26 mutation hooks (useCreateKey, useDeleteKey, etc.) each call their SDK method    | PASS   |
| `hooks file imports getSDK from sdk module`               | Correct import path                                                                | PASS   |
| `hooks file calls getSDK() at module level`               | SDK initialized once at module scope                                               | PASS   |
| `no hardcoded mock data in hooks`                         | No `const mock` patterns in hooks.ts                                               | PASS   |
| `useNotificationsStream uses sdk.notificationsStream`     | SSE stream hook wired correctly                                                    | PASS   |

### Test Results Summary

```
Go (make test-unit):    ALL PASS (race detector enabled)
  - handler tests:      6/6 pass (AdminFetchModels)
  - existing tests:     All pass
  - integration tests:  Skipped (TEST_DATABASE_URL not set — expected)

Frontend (npx vitest run):  87/87 pass across 4 files
  - wiring-verification:  6/6 pass
  - sdk.test:            64/64 pass
  - errors.test:         11/11 pass
  - hooks.test:           6/6 pass (NEW)
```

---

## 8. Remaining Work

| Priority | Task                                | Status      |
| -------- | ----------------------------------- | ----------- |
| P2       | E2E tests                           | Not started |
| P3       | Cache directive audit               | Not started |
| P3       | Webhook UI improvements             | Not started |
| P3       | Provider health UI polish           | Not started |
| P3       | Delete `docs/missing.md` (resolved) | Not started |

---

### [2026-05-29 12:00] fix(ui): add dedicated mobile bottom nav bar for phone screens

**Why**: The existing navbar tried to serve both desktop and mobile, resulting in a cramped header on small screens where nav links were hidden behind a hamburger menu with no quick way to navigate between pages. A dedicated mobile bottom tab bar gives phone users instant access to all main pages.

**Files changed**:

| File | Lines | Change type |
|------|-------|-------------|
| `apps/web/components/MobileBottomNav.tsx` | L1-L93 | created |
| `apps/web/components/Header.tsx` | L67-L225 | modified |
| `apps/web/components/MainLayout.tsx` | L1-L185 | modified |
| `UPDATE.md` | L289 | modified |

**Before** (`apps/web/components/Header.tsx` L67):

```tsx
<header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
  <div className="relative w-full max-w-6xl h-16 px-4 flex items-center justify-between rounded-2xl ...">
```

**After** (`apps/web/components/Header.tsx` L67):

```tsx
<header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 md:pt-4 px-3 md:px-4">
  <div className="relative w-full max-w-6xl h-14 md:h-16 px-3 md:px-4 flex items-center justify-between rounded-xl md:rounded-2xl ...">
```

**Before** (`apps/web/components/MainLayout.tsx` content wrapper):

```tsx
<div className={`flex ${isDashboardRoute || ... ? "" : "pt-20"}`}>
  <main className="flex-1 w-full min-w-0">{children}</main>
</div>
```

**After** (`apps/web/components/MainLayout.tsx` content wrapper):

```tsx
<div className={`flex ${isDashboardRoute || ... ? "" : "pt-16 md:pt-20 pb-20 md:pb-0"}`}>
  <main className="flex-1 w-full min-w-0">{children}</main>
</div>

{!isDashboardRoute && !isAuthRoute && !isFullScreenRoute && !isAdminRoute && !isDocsRoute && <MobileBottomNav />}
```

**Notes**: `MobileBottomNav.tsx` is a new component — fixed bottom tab bar with 5 tabs (Home, Models, Play, Docs, Pricing) using `md:hidden` breakpoint. Matches the cyberpunk/cyan theme with animated active indicator via Framer Motion `layoutId`. Header on mobile is now more compact (`h-14`, tighter padding). Bottom padding (`pb-20 md:pb-0`) prevents content from being hidden behind the fixed bottom nav. Sidebar drawer preserved for account/settings actions.

---

### [2026-05-29 12:05] docs: enforce UPDATE.md mandatory rules in AGENTS.md and CLAUDE.md

**Why**: AGENTS.md and CLAUDE.md were missing the explicit UPDATE.md enforcement rules, which could cause agents to skip the mandatory change-log step. Also added Anthropic SSE event names to CLAUDE.md for completeness.

**Files changed**:

| File | Lines | Change type |
|------|-------|-------------|
| `AGENTS.md` | L66-L78 | modified |
| `CLAUDE.md` | L125, L141 | modified |

**Before** (`AGENTS.md` L66):

```md
## Critical Constraints

- `AUTH_SECRET` must be identical between frontend and backend (HS256 JWT).
```

**After** (`AGENTS.md` L66):

```md
## Critical Constraints

- **UPDATE.md is MANDATORY for every code change.** After completing ANY modification to the codebase (fixes, features, refactors, config changes — anything), you MUST append a detailed entry to `UPDATE.md`. The entry must include:
  1. Timestamp and **session name/ID** (e.g. Droid session name, `ses_abc123`, or a descriptive label like `mobile-navbar-fix`)
  2. Conventional-commit style title
  3. **Why** — the problem or motivation, not just what changed
  4. **Files changed table** — every file touched, with line ranges and change type (created/modified/deleted)
  5. **Before code block** — the exact old code with file path and line number
  6. **After code block** — the exact new code with file path and line number
  7. Optional notes for side effects, follow-ups, or migration steps
- **Use the same session name across all entries from the same session** so later agents can group changes and understand what happened in each session.
- **No task is considered complete until the UPDATE.md entry is written.** This is a hard requirement. Skipping UPDATE.md logging is a policy violation. See `UPDATE.md` for the full template and examples.
- `AUTH_SECRET` must be identical between frontend and backend (HS256 JWT).
```

**Before** (`CLAUDE.md` L125):

```md
- Anthropic compatibility at `/v1/messages` via `internal/handler/anthropic_messages.go` + `pkg/llm/anthropic/`, reusing the same auth/quota/billing pipeline. Streaming uses Anthropic SSE events.
```

**After** (`CLAUDE.md` L125):

```md
- Anthropic compatibility at `/v1/messages` via `internal/handler/anthropic_messages.go` + `pkg/llm/anthropic/`, reusing the same auth/quota/billing pipeline. Streaming uses Anthropic SSE events (`message_start`, `content_block_delta`, `message_delta`, `message_stop`).
```

**Before** (`CLAUDE.md` L139):

```md
## Hard Constraints

- **No `as any` or `@ts-ignore`** in TypeScript — enforced at review
```

**After** (`CLAUDE.md` L139):

```md
## Hard Constraints

- **UPDATE.md is MANDATORY.** After completing ANY code change (no matter how small), you MUST append an entry to `UPDATE.md` following the exact template defined in that file. The entry must include: timestamp, **session name/ID**, conventional-commit title, "Why" explanation, files-changed table with line ranges, and Before/After code blocks showing the exact old and new code. **No task is "done" until the UPDATE.md entry is written.** Use the same session name across all entries from the same session so later agents can group changes by session. This is non-negotiable — skipping this step is a violation of project rules.
- **No `as any` or `@ts-ignore`** in TypeScript — enforced at review
```

**Notes**: Documentation-only changes. No runtime behavior affected.
