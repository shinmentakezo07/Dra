# Testing — Complete Reference

> Full inventory of all test files, configurations, and testing patterns.
> Last updated: 2026-05-22

---

## Frontend Testing (Vitest)

### Configuration

- **Config file**: `apps/web/vitest.config.ts`
- **Environment**: jsdom (browser-like DOM)
- **Path alias**: `@/` maps to `apps/web/` root
- **Test file location**: All tests in `apps/web/tests/` directory (not co-located)
- **Setup file**: `apps/web/tests/setup.ts`
- **Framework**: `@testing-library/react` + `@testing-library/jest-dom`

### Test Files (22 files)

#### Infrastructure Tests

| File                                | What It Tests                                                 |
| ----------------------------------- | ------------------------------------------------------------- |
| `tests/wiring-verification.test.ts` | No mock data in dashboard, SDK imports, route proxy existence |

#### SDK & API Tests

| File                               | What It Tests                                                              |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `tests/lib/api/sdk.test.ts`        | DraSDK typed client — validates all ~40+ methods parse responses correctly |
| `tests/lib/api/admin-sdk.test.ts`  | Admin SDK endpoints                                                        |
| `tests/lib/api/errors.test.ts`     | ApiError hierarchy (7 error types), status code mapping                    |
| `tests/lib/api/hooks.test.ts`      | React Query hook wiring (useKeys, useLogs, useAnalytics, etc.)             |
| `tests/lib/api/rate-limit.test.ts` | Rate limit logic                                                           |
| `tests/lib/api/types.test.ts`      | TypeScript type definitions                                                |

#### Utility Tests

| File                                   | What It Tests                       |
| -------------------------------------- | ----------------------------------- |
| `tests/lib/utils.test.ts`              | General utility functions           |
| `tests/lib/model-utils.test.ts`        | Model utility functions             |
| `tests/lib/docs-config.test.ts`        | Docs configuration helpers          |
| `tests/lib/pricing-data.test.ts`       | Pricing data structures             |
| `tests/lib/playground-storage.test.ts` | Playground localStorage persistence |

#### Component Tests

| File                                                  | What It Tests                          |
| ----------------------------------------------------- | -------------------------------------- |
| `tests/components/ui/button.test.tsx`                 | Button rendering (5 variants)          |
| `tests/components/ui/toast.test.tsx`                  | Toast notification lifecycle           |
| `tests/components/ui/glass-card.test.tsx`             | GlassCard component rendering          |
| `tests/components/dashboard/MetricCard.test.tsx`      | MetricCard display and formatting      |
| `tests/components/dashboard/AnimatedCounter.test.tsx` | AnimatedCounter transition behavior    |
| `tests/components/dashboard/DataTable.test.tsx`       | DataTable sorting and pagination       |
| `tests/components/dashboard/StatusBadge.test.tsx`     | StatusBadge variant rendering          |
| `tests/components/pricing/CostCalculator.test.tsx`    | Cost calculator logic and calculations |
| `tests/components/playground/ModelSelector.test.tsx`  | Model selector behavior                |
| `tests/components/playground/CodeSnippets.test.tsx`   | Code snippet display and formatting    |

#### Integration Tests

| File                                   | What It Tests                |
| -------------------------------------- | ---------------------------- |
| `tests/integration/api-routes.test.ts` | Proxy route existence checks |
| `tests/integration/auth-flow.test.ts`  | Auth redirect flows          |

### Running Tests

```bash
# From apps/web/
npm run test                # All tests (single run)
npm run test:watch          # Watch mode (re-runs on changes)
npm run test -- --run       # Single run (no watch)

# Single test file
npm run test -- --run tests/lib/api/sdk.test.ts
npm run test -- --run tests/lib/api/errors.test.ts
npm run test -- --run tests/wiring-verification.test.ts

# From root via Turborepo
npm run test:web
```

---

## Backend Testing (Go)

### Configuration

- **Race detector**: Always enabled (`make test` runs with `-race`)
- **Short mode**: `make test-unit` uses `-short` flag (skips integration tests)
- **Integration tests**: Require `TEST_DATABASE_URL` env var
- **Test harness**: `internal/testutil.NewTestServer()` creates chi test server with mock dependencies
- **Coverage**: `make test-coverage` generates `coverage.out`
- **Go 1.26+ compat**: Makefile filters packages to only test those with test files

### Test Files (30+ files)

#### Core Tests

| File                                       | Package    | What It Tests                                                      |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------ |
| `internal/domain/domain_test.go`           | domain     | Model validation (Signup, Login, ChatRequest, CreateKey, Purchase) |
| `internal/middleware/auth_test.go`         | middleware | JWT parsing, API key lookup, session cookie, admin guards          |
| `internal/middleware/quota_test.go`        | middleware | Quota tracking, daily/monthly limits, budget enforcement           |
| `internal/handler/handler_test.go`         | handler    | Full HTTP round-trip: auth, CRUD, chat proxy, billing              |
| `internal/handler/admin_providers_test.go` | handler    | AdminFetchModels handler                                           |
| `internal/handler/openai_proxy_test.go`    | handler    | OpenAI proxy endpoint behavior                                     |
| `internal/handler/billing_test.go`         | handler    | Billing/credits handler                                            |
| `internal/config/config_test.go`           | config     | Configuration loading and validation                               |
| `internal/pkg/response/response_test.go`   | response   | Response helpers and envelope                                      |
| `internal/pkg/token/token_test.go`         | token      | JWT generation, parsing, validation                                |
| `internal/repository/repository_test.go`   | repository | Repository data access                                             |
| `internal/repository/user_cache_test.go`   | repository | User cache behavior                                                |

#### Service Tests

| File                                           | What It Tests                                           |
| ---------------------------------------------- | ------------------------------------------------------- |
| `internal/service/service_test.go`             | General service tests                                   |
| `internal/service/stripe_test.go`              | Stripe payment integration                              |
| `internal/service/credits_test.go`             | Credit system (balance, budget, transactions)           |
| `internal/service/webhook_test.go`             | Webhook delivery and retry                              |
| `internal/service/service_integration_test.go` | Full service integration (requires `TEST_DATABASE_URL`) |

#### LLM Pipeline Tests

| File                                            | Package        | What It Tests                                                      |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `pkg/llm/llm_test.go`                           | llm            | Core type tests and helpers                                        |
| `pkg/llm/provider/provider_test.go`             | provider       | Provider registry, registration, model listing                     |
| `pkg/llm/provider/health_test.go`               | provider       | Health check behavior                                              |
| `pkg/llm/router/router_test.go`                 | router         | Router strategies (cost, latency, reliability, capability, random) |
| `pkg/llm/router/budget_test.go`                 | router         | Budget-aware model routing                                         |
| `pkg/llm/circuitbreaker/circuitbreaker_test.go` | circuitbreaker | State machine (closed, open, half-open)                            |
| `pkg/llm/tokens/tokens_test.go`                 | tokens         | Token counting and estimation                                      |
| `pkg/llm/embeddings/embeddings_test.go`         | embeddings     | Embedding generation                                               |
| `pkg/llm/anthropic/formatter_test.go`           | anthropic      | Anthropic request/response formatting                              |
| `pkg/llm/openai/formatter_test.go`              | openai         | OpenAI request/response formatting                                 |

#### Translation Tests

| File                                            | What It Tests              |
| ----------------------------------------------- | -------------------------- |
| `pkg/llm/translator/handler/handler_test.go`    | Translation handler        |
| `pkg/llm/translator/handler/direction_test.go`  | Direction detection        |
| `pkg/llm/translator/handler/batch_test.go`      | Batch translation          |
| `pkg/llm/translator/handler/middleware_test.go` | Translation middleware     |
| `pkg/llm/translator/handler/errors_test.go`     | Translation error handling |

#### Tool Tests

| File                                      | What It Tests        |
| ----------------------------------------- | -------------------- |
| `pkg/llm/tools/websearch/tool_test.go`    | Web search tool      |
| `pkg/llm/tools/websearch/serpapi_test.go` | SERP API integration |

#### SDK & Example Tests

| File                                           | What It Tests                 |
| ---------------------------------------------- | ----------------------------- |
| `pkg/sdk/client_test.go`                       | Go SDK client methods         |
| `examples/llmtests/translator_example_test.go` | Translation example patterns  |
| `examples/llmtests/tools_example_test.go`      | Tool calling example patterns |

#### Integration Tests

| File                                    | What It Tests                       |
| --------------------------------------- | ----------------------------------- |
| `tests/integration/integration_test.go` | End-to-end flows with real database |

### Running Tests

```bash
# From apps/backend/
make test                # go test -race -cover ./... (ALL tests, ~30+ files)
make test-unit           # go test -v -short ./... (skips integration)
make test-integration    # needs TEST_DATABASE_URL
make test-coverage       # coverage profile + function report
make coverage-html       # opens HTML coverage report

# Single package
go test -race -cover ./pkg/llm/provider/...
go test -race -cover ./internal/handler/...
go test -race -cover ./internal/service/...
go test -race -cover ./internal/middleware/...

# Single test function
go test -race -cover -run TestAdminFetchModels ./internal/handler/...
go test -race -cover -run TestCredits ./internal/service/...
go test -race -cover -run TestCircuitBreaker ./pkg/llm/circuitbreaker/...

# Single test with verbose output
go test -v -race -run TestAuthMiddleware ./internal/middleware/...

# From root via Turborepo
npm run test:backend
```

---

## E2E Testing (Playwright)

### Configuration

- **Config file**: `apps/web/playwright.config.ts`
- **Test files**: `apps/web/e2e/` directory

### Test Files

| File               | What It Tests                                |
| ------------------ | -------------------------------------------- |
| `e2e/auth.spec.ts` | Authentication flows (login, signup, logout) |

### Running E2E Tests

```bash
# From apps/web/
npx playwright test

# With UI mode
npx playwright test --ui

# Specific test
npx playwright test e2e/auth.spec.ts

# With trace on failure
npx playwright test --trace on
```

---

## Smoke Test

The smoke test (`scripts/smoke-test.sh`) provides quick wiring verification:

```bash
bash scripts/smoke-test.sh
```

### Checks

| #   | Check                     | Method                                                          | Pass/Fail           |
| --- | ------------------------- | --------------------------------------------------------------- | ------------------- |
| 1   | Go backend compiles       | `go build ./...`                                                | PASS/FAIL           |
| 2   | No mock data in dashboard | `grep -r "const mock" apps/web/app/dashboard --include="*.tsx"` | PASS/FAIL           |
| 3   | SDK imports in dashboard  | Checks 4 files import `from "@/lib/api/sdk"`                    | PASS/FAIL per file  |
| 4   | API route coverage        | Checks 8 expected proxy routes exist                            | PASS/WARN per route |
| 5   | Chat SSE wiring           | Checks route.ts has `encodeDataStream` + `encodeStreamFinish`   | PASS/FAIL           |
| 6   | Backend test files        | Checks 4 test files exist                                       | PASS/WARN per file  |
| 7   | Frontend test files       | Checks 3 test files exist                                       | PASS/WARN per file  |
| 8   | Environment config        | Checks 3 required vars in .env.example                          | PASS/WARN per var   |

**Output**: "Results: X passed, Y failed, Z warnings". Exit 0 = pass (warnings ok), 1 = failure.

---

## Test Utilities

### Backend (`internal/testutil/testutil.go`)

```go
func NewTestServer() *TestServer {
    // Creates chi router with mock handlers
    // Returns TestServer with URL, Close(), etc.
}
```

Used by integration tests for full HTTP round-trips against a chi server.

### Frontend (`tests/setup.ts`)

Standard Vitest setup with:

- `@testing-library/jest-dom` matchers
- Global `fetch` mock where needed
- React Query test wrapper

---

## Testing Patterns

### Go Table-Driven Tests

```go
func TestCreateAPIKey(t *testing.T) {
    tests := []struct {
        name    string
        userID  string
        request domain.CreateKeyRequest
        wantErr bool
    }{
        {"valid key", "user-1", domain.CreateKeyRequest{Name: "My Key"}, false},
        {"empty name", "user-1", domain.CreateKeyRequest{Name: ""}, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Act + Assert
        })
    }
}
```

### Frontend Component Tests

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("renders with text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText("Click me")).toBeInTheDocument();
});
```

### Wiring Verification Tests

Static code analysis tests that grep file contents:

```typescript
test("dashboard files import from SDK, not mock data", () => {
  const dashboardFiles = glob.sync("app/dashboard/**/*.tsx");
  for (const file of dashboardFiles) {
    const content = fs.readFileSync(file, "utf-8");
    expect(content).not.toContain("const mock");
    expect(content).toMatch(/from ['"]@\/lib\/api\/sdk['"]/);
  }
});
```

---

## Best Practices

### General

- **No `as any` or `@ts-ignore`** in TypeScript
- **No mock data** in dashboard — always use `getSDK()`
- **Table-driven tests** in Go for systematic coverage
- **Race detection** always enabled (`-race` flag)

### Backend

- Repository tests use real PostgreSQL via `TEST_DATABASE_URL`
- Handler tests use `internal/testutil.NewTestServer()`
- LLM pipeline tests use `SandboxProvider` instead of real APIs
- Short mode (`-short`) skips tests needing external dependencies
- Error wrapping with `%w` for `errors.Is()` compatibility
- Go 1.26+ `covdata` removed: Makefile filters packages with tests

### Frontend

- Vitest with jsdom environment for DOM APIs
- SDK tests mock the global `fetch` function
- Wiring tests do static file content analysis (grep patterns)
- React Query hooks tested with `QueryClientProvider` wrapper
- Component tests use `@testing-library/react` for user-centric queries
