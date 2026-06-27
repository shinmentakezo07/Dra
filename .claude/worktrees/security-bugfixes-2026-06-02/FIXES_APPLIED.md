# Fixes Applied - OLLA Audit

## Date: 2026-05-25

### P1-01: Embeddings Hardcoded to OpenAI ✅ FIXED

**Problem:** The embeddings handler was hardcoded to use only OpenAI, ignoring model routing and silently failing if the OpenAI key was empty.

**Solution:**

1. Added `embeddingRegistry` field to Handler struct
2. Created `initEmbeddingRegistry()` in services.go to wire up the registry
3. Updated `Embed()` handler to use `embeddingRegistry.RouteRequest()` for proper provider routing
4. Registry supports model ID format `provider/model` (e.g., `openai/text-embedding-3-small`)

**Files Changed:**

- `apps/backend/internal/handler/handler.go` - Added embeddingRegistry field and setter
- `apps/backend/internal/handler/embeddings.go` - Updated to use registry routing
- `apps/backend/cmd/api/services.go` - Added embedding registry initialization

---

### P2-02: Error Messages Leak Internal Details ✅ FIXED

**Problem:** 112+ instances of `err.Error()` returned raw Go error messages to HTTP clients, exposing internal implementation details.

**Solution:**

1. Created `admin_errors.go` with safe error handling functions:
   - `adminError()` - Logs full error, returns generic message
   - `adminErrorWithStatus()` - Same with custom status code
2. Updated all admin handlers to use safe error handling

**Files Changed:**

- `apps/backend/internal/handler/admin_errors.go` - NEW: Safe error helpers
- `apps/backend/internal/handler/admin_users_full.go` - Updated all error handling
- `apps/backend/internal/handler/admin_providers.go` - Updated all error handling
- `apps/backend/internal/handler/admin_models.go` - Updated all error handling
- `apps/backend/internal/handler/admin_security.go` - Updated all error handling
- `apps/backend/internal/handler/admin_settings.go` - Updated all error handling
- `apps/backend/internal/handler/admin_billing.go` - Updated all error handling
- `apps/backend/internal/handler/admin_promo.go` - Updated all error handling

---

### P2-01: Admin Handlers Bypass Service Layer ✅ FIXED

**Problem:** Some admin handlers contained raw SQL queries instead of using the service layer.

**Solution:**

1. Added repository methods:
   - `ListAdminUsers()` - List all active admin users
   - `CreateAdminUser()` - Create or reactivate admin user
   - `RemoveAdmin()` - Deactivate admin user
   - `TogglePromoStatus()` - Toggle promo code active status
2. Added service layer methods for all admin operations
3. Updated handlers to use service layer instead of raw SQL

**Files Changed:**

- `apps/backend/internal/repository/admin_user_repo.go` - Added ListAdminUsers, CreateAdminUser, RemoveAdmin
- `apps/backend/internal/repository/admin_features_repo.go` - Added TogglePromoStatus
- `apps/backend/internal/service/admin.go` - Added service methods
- `apps/backend/internal/handler/admin_users_full.go` - Updated to use service layer
- `apps/backend/internal/handler/admin_promo.go` - Updated to use service layer

---

### Test Updates

**File:** `apps/backend/internal/handler/admin_providers_test.go`

- Added SSRF check bypass for tests (httptest.NewServer uses localhost)

---

### Build Verification

```bash
✅ go build ./cmd/api - SUCCESS
✅ go vet ./... - SUCCESS
✅ go test -short ./... - ALL TESTS PASS
```

---

### Remaining Issues (from OLLA audit)

| #     | Severity | Issue                                         | Status                                    |
| ----- | -------- | --------------------------------------------- | ----------------------------------------- |
| P1-03 | High     | No CSRF protection for cookie-based auth      | Not addressed (requires frontend changes) |
| P1-05 | High     | In-memory rate limiter default                | Design decision, not a bug                |
| P2-05 | Medium   | Oversized files (sdk.ts, schema.ts, hooks.ts) | Requires major refactoring                |
| P2-09 | Medium   | Wrong DB driver for local dev                 | Requires Drizzle config changes           |
| P3-01 | Low      | Console statements in playground              | Minor cleanup                             |
| P3-02 | Low      | Missing "use cache" directives                | Next.js 16 optimization                   |
| P3-03 | Low      | Dual animation libraries                      | Dependency cleanup                        |
| P3-04 | Low      | Stripe SDK outdated                           | go.mod update                             |
| P3-05 | Low      | No middleware.ts for edge auth                | Next.js middleware                        |
