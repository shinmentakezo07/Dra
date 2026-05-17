# Update — Codebase Cleanup & Feature Wiring

> **Session**: Sisyphus (OhMyOpenCode), 2026-05-17
> **Branch**: main (continuation of prior session work)
> **Total**: 43 files changed, +1,672 / −3,937 lines (net −2,265)

---

## 1. P0 — Dead Code Removal (Backend)

### Deleted Files (21 files, −2,849 lines)

| File | Lines | Why |
|------|-------|-----|
| `apps/backend/internal/handler/comparison.go` | 84 | Dead handler — routes removed, no callers |
| `apps/backend/internal/handler/export.go` | 71 | Dead handler — no routes registered |
| `apps/backend/internal/handler/fine_tuning.go` | 100 | Dead handler — only `ListFineTuningJobs` and `GetFineTuningJob` used; 3 others removed from `main.go` |
| `apps/backend/internal/handler/provider_plugin.go` | 78 | Dead handler — no routes registered |
| `apps/backend/internal/handler/rbac.go` | 112 | Dead handler — RBAC not implemented |
| `apps/backend/internal/middleware/validate.go` | 37 | Dead middleware — not wired |
| `apps/backend/internal/repository/interfaces.go` | 149 | Dead file — interface-based repo pattern abandoned; all repos use concrete structs |
| `apps/backend/internal/service/experiment.go` | 249 | Dead service — A/B experiment logic unused |
| `apps/backend/pkg/llm/context/compressor.go` | 139 | Dead package — context compression never wired into pipeline |
| `apps/backend/pkg/llm/provider/balancer.go` | 209 | Dead package — replaced by `pkg/llm/provider/` registry |
| `apps/backend/pkg/llm/provider/balancer_test.go` | 157 | Tests for dead balancer |
| `apps/backend/pkg/llm/provider/fallback.go` | 189 | Dead package — fallback logic moved to circuit breaker |
| `apps/backend/pkg/llm/provider/fallback_test.go` | 196 | Tests for dead fallback |
| `apps/backend/pkg/llm/telemetry/logger.go` | 95 | Dead package — replaced by stdlib `slog` |
| `apps/backend/pkg/llm/telemetry/span.go` | 120 | Dead package — no tracing backend configured |
| `apps/backend/pkg/llm/translate/errors.go` | 55 | Dead package — error translation unused |
| `apps/backend/pkg/llm/translate/errors_test.go` | 94 | Tests for dead translate/errors |
| `apps/backend/pkg/llm/translate/validate.go` | 126 | Dead package — validation step removed from pipeline |
| `apps/backend/pkg/llm/translate/validate_test.go` | 255 | Tests for dead translate/validate |
| `apps/web/components/CodeEditor.tsx` | 145 | Orphaned component — no imports found |
| `apps/web/components/ModelDetailModal.tsx` | 189 | Orphaned component — no imports found |

### Modified Files — Dead Code Stripped

| File | Change | Before | After |
|------|--------|--------|-------|
| `apps/backend/cmd/api/main.go` | −25 lines | Wired `dedupCache`, `semanticCache`, `guard`, 3 fine-tuning routes | Removed dead cache/guard setup, removed `ListFineTuningDatasets`, `GetFineTuningDataset`, `CreateFineTuningJob` routes. Added `AdminFetchModels` route. |
| `apps/backend/internal/handler/handler.go` | −49 lines | Handler struct had `guard`, `dedupCache`, `semanticCache` fields + 5 setter methods | Removed dead fields and setters (`SetGuard`, `SetDedupCache`, `SetSemanticCache`) |
| `apps/backend/internal/handler/admin_providers.go` | +85 lines | — | Added `AdminFetchModels` handler for admin provider model fetching |
| `apps/backend/internal/service/fine_tuning.go` | −54 lines | 7 methods including `CreateFineTuningJob`, `ListDatasets`, etc. | Stripped to `GetJob` and `ListJobs` only |
| `apps/backend/internal/service/provider.go` | −15 lines | Had `SetPipeline`, `SetModelRouter`, `SetABRouter` setters | Removed dead setters |
| `apps/backend/internal/service/comparison.go` | −14 lines | Dead comparison service methods | Stripped unused methods |
| `apps/backend/pkg/llm/pipeline/pipeline.go` | −216 lines | Had `StandardPipeline()`, `BuildPipeline()`, `ChainPipelines()`, `TokenCheckStep`, `MetricsStep`, 8 unused step types | Removed 3 dead factory functions + 8 unused step types. Kept 5 used steps: `ValidationStep`, `SanitizationStep`, `LoggingStep`, `CacheStep`, `GuardrailsStep` + core pipeline logic |
| `apps/backend/internal/repository/cache.go` | −9 lines | Had `NewDedupCache`, `NewSemanticCache` constructors | Removed dead constructors |
| `apps/backend/internal/repository/cache_test.go` | −13 lines | `TestNopRepoCache` tested dead cache | Removed dead test |
| `apps/backend/internal/repository/prompt.go` | −12 lines | Dead prompt repo methods | Removed unused methods |

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

| File | Lines | Why |
|------|-------|-----|
| `apps/web/components/CodeEditor.tsx` | 145 | No imports found anywhere in codebase |
| `apps/web/components/ModelDetailModal.tsx` | 189 | No imports found anywhere in codebase |

---

## 3. Summary by Layer

| Layer | Files Deleted | Files Modified | Net Lines |
|-------|--------------|----------------|-----------|
| Backend handlers | 5 | 3 | −436 |
| Backend services | 1 | 3 | −83 |
| Backend middleware | 1 | 0 | −37 |
| Backend repository | 1 | 3 | −170 |
| Backend pkg/llm | 8 | 1 | −1,284 |
| Frontend components | 2 | 5 | −343 |
| Frontend pages | 0 | 4 | +478 |
| Frontend lib/api | 0 | 2 | +16 |
| Config/docs | 0 | 2 | −44 |
| **Total** | **21** | **22** | **−2,265** |

---

## 4. Verification Status

| Check | Status |
|-------|--------|
| `go build ./...` | Pass |
| `go test -race -short ./...` | Pass |
| TypeScript (changed files) | 0 errors |
| TypeScript (pre-existing) | 19 Framer Motion type errors in admin pages (unrelated) |
| Frontend build | Pre-existing Framer Motion type error in `Hero.tsx`/`AnimatedCounter.tsx` |

---

## 5. Remaining Work

| Priority | Task | Status |
|----------|------|--------|
| P1 | SDK coverage gap (Go + TypeScript) — ~40 missing methods per `docs/missing.md` | Not started |
| P2 | E2E tests | Not started |
| P2 | Handler tests for new `AdminFetchModels` | Not started |
| P2 | Component tests for wired dashboard | Not started |
| P3 | Cache directive audit | Not started |
| P3 | Webhook UI improvements | Not started |
| P3 | Provider health UI polish | Not started |
