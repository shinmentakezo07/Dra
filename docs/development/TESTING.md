# Testing

---

## Frontend Testing (Vitest)

### Configuration

- **Config file**: `apps/web/vitest.config.ts`
- **Environment**: jsdom (browser-like DOM)
- **Path alias**: `@/` maps to `apps/web/` root
- **Test file location**: All tests in `apps/web/tests/` directory (not co-located)

### Test Files

| File | Description | What It Tests |
|------|-------------|---------------|
| `tests/lib/api/sdk.test.ts` | SDK unit tests | Mock fetch, validates all SDK methods parse responses correctly, tests error handling |
| `tests/lib/api/errors.test.ts` | Error handling tests | ApiError hierarchy, status code mapping, error message extraction |
| `tests/wiring-verification.test.ts` | Wiring enforcement | **No mock data**: greps dashboard .tsx for `const mock`. **SDK imports**: verifies key files import from `@/lib/api/sdk`. **Route proxy**: checks expected API routes exist |

### Running Tests

```bash
# From apps/web/
npm run test              # All tests (Vitest)
npm run test:watch        # Watch mode (re-runs on changes)
npm run test -- --run     # Single run (no watch)

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

### Test File Inventory

| File | Package | What It Tests |
|------|---------|---------------|
| `internal/domain/domain_test.go` | domain | Model validation (Signup, Login, ChatRequest, CreateKey, Purchase validations) |
| `internal/middleware/auth_test.go` | middleware | JWT parsing, API key lookup, session cookie extraction, admin guards |
| `internal/middleware/quota_test.go` | middleware | Quota tracking, daily/monthly limits, budget enforcement |
| `internal/handler/handler_test.go` | handler | Full HTTP round-trip: auth, CRUD, chat proxy, billing, admin |
| `tests/integration/integration_test.go` | integration | End-to-end flows with real database |
| `pkg/sdk/client_test.go` | sdk | Go SDK client methods |
| `pkg/llm/provider/balancer_test.go` | provider | Load balancing across instances |
| `pkg/llm/provider/fallback_test.go` | provider | Provider fallback chain |
| `pkg/llm/provider/health_test.go` | provider | Health check endpoint testing |
| `pkg/llm/cache/dedup_test.go` | cache | Request deduplication cache |
| `pkg/llm/validator/validator_test.go` | validator | Request schema validation |
| `pkg/llm/translator/handler/*_test.go` | translator/handler | Batch processing, direction detection, error handling, middleware |
| `pkg/llm/tools/builtin_test.go` | tools | Built-in tool definitions |
| `pkg/llm/tools/executor_test.go` | tools | Tool execution with results |
| `pkg/llm/tools/loop_test.go` | tools | Multi-turn tool conversation loop |
| `pkg/llm/tools/registry_test.go` | tools | Tool registration and lookup |
| `pkg/llm/tools/result_test.go` | tools | Tool result formatting |
| `pkg/llm/tools/stream_test.go` | tools | Tool call streaming |
| `pkg/llm/tools/websearch/*_test.go` | tools/websearch | Web search tool (SERP API) |
| `pkg/llm/router/budget_test.go` | router | Budget-aware model routing |
| `pkg/llm/translate/*_test.go` | translate | Translation validation (errors, validate) |
| `pkg/llm/embeddings/*_test.go` | embeddings | Embedding generation with OpenAI |
| `pkg/llm/openai/*_test.go` | openai | OpenAI request/response formatting |
| `pkg/llm/anthropic/*_test.go` | anthropic | Anthropic request/response formatting |
| `pkg/llm/llm_test.go` | llm | Core type tests |
| `examples/llmtests/*_test.go` | examples | Example integration patterns |

### Running Tests

```bash
# From apps/backend/
make test                # go test -race -cover ./... (ALL tests)
make test-unit           # go test -v -short ./... (skips integration)
make test-integration    # needs TEST_DATABASE_URL
make test-coverage       # coverage profile + function report
make coverage-html       # opens HTML coverage report

# Single package
go test -race -cover ./pkg/llm/provider/...

# Single test function
go test -race -cover -run TestName ./pkg/llm/tools/...

# Single test with verbose
go test -v -race -run TestAuthMiddleware ./internal/middleware/...

# From root via Turborepo
npm run test:backend
```

---

## Smoke Test

The smoke test (`scripts/smoke-test.sh`) provides quick wiring verification. It is a bash script with 8 checks:

| # | Check | Method | Pass/Fail |
|---|-------|--------|-----------|
| 1 | Go backend compiles | `go build ./...` | PASS/FAIL |
| 2 | No mock data in dashboard | `grep -r "const mock" apps/web/app/dashboard --include="*.tsx"` | PASS/FAIL |
| 3 | SDK imports in dashboard | Checks 4 files import `from "@/lib/api/sdk"` | PASS/FAIL per file |
| 4 | API route coverage | Checks 8 expected proxy routes exist | PASS/WARN per route |
| 5 | Chat SSE wiring | Checks route.ts has `encodeDataStream` + `encodeStreamFinish` | PASS/FAIL |
| 6 | Backend test files | Checks 4 test files exist | PASS/WARN per file |
| 7 | Frontend test files | Checks 3 test files exist | PASS/WARN per file |
| 8 | Environment config | Checks 3 required vars in .env.example | PASS/WARN per var |

**Output**: "Results: X passed, Y failed, Z warnings". Exit 0 = pass (warnings ok), 1 = failure.

```bash
bash scripts/smoke-test.sh
```

---

## Test Utilities (`internal/testutil/testutil.go`)

```go
func NewTestServer() *TestServer {
    // Creates chi router with mock handlers
    // Returns TestServer with URL, Close(), etc.
}
```

Used by integration tests for full HTTP round-trips against a chi server.

---

## Makefile Test Targets

```makefile
export PATH := $(HOME)/.local/go/bin:$(PATH)

test:
	go test -race -cover ./...

test-race:
	go test -race -v ./...

test-unit:
	go test -v -short ./...

test-integration:
	@if [ -z "$(TEST_DATABASE_URL)" ]; then echo "skipped"; exit 0; fi
	go test -v -race ./internal/handler/... ./tests/integration/...

test-coverage:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

coverage-html: test-coverage
	go tool cover -html=coverage.out -o coverage.html
```

---

## Testing Best Practices

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

### Frontend
- Vitest with jsdom environment for DOM APIs
- SDK tests mock the global `fetch` function
- Wiring tests do static file content analysis (grep patterns)
- React Query hooks tested with `QueryClientProvider` wrapper
