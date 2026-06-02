# Pre-existing Issues

> Issues found during SDK coverage implementation (May 2026). Not caused by the SDK changes — these were present before and remain unfixed.

---

## 1. Vitest 429 RateLimitError Test Fails

| Attribute      | Value                                                                                                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**       | `apps/web/tests/lib/api/sdk.test.ts` line 279                                                                                                                                                                                                                                                                  |
| **Test**       | `maps 429 to RateLimitError`                                                                                                                                                                                                                                                                                   |
| **Root cause** | The SDK retries on 429 (line 369: `if (err.status < 500 && err.status !== 429)`). The test only sets up one mock response. On retry, `mockFetch()` returns `undefined` → `TypeError: Cannot read properties of undefined (reading 'headers')` → the error thrown is a `TypeError` instead of `RateLimitError`. |
| **Fix**        | Either: (a) add a second `mockFetch.mockResolvedValueOnce(...)` for the retry, (b) configure the SDK with `retries: 0` in the test, or (c) make `mockFetch` return a default response when called without a preset.                                                                                            |

```typescript
// Current broken test
it("maps 429 to RateLimitError", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 429,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: false, error: "Rate limited" }),
  });
  const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
  await expect(sdk.me()).rejects.toThrow(RateLimitError);
  // ^^ Fails: second retry call to mockFetch() returns undefined
});
```

**Note**: All other error-mapping tests (400, 401, 403, 404, 402) pass because those status codes are NOT retried (only 429 retries).

---

## 2. Go SDK Test Coverage Below 80%

| Attribute     | Value                                 |
| ------------- | ------------------------------------- |
| **File**      | `apps/backend/pkg/sdk/client_test.go` |
| **Coverage**  | 51.1%                                 |
| **Threshold** | 80% (per CLAUDE.md rules)             |

The SDK package has 43 test functions covering all new methods, but coverage is 51.1% overall. Untested paths include:

- Error parsing fallbacks in `apiError()` (when JSON envelope parsing fails)
- `paginatedResult` edge cases (nil meta, empty data)
- `ReadSSE` edge cases (empty lines, partial reads, error mid-stream)
- `doUpload` multipart error paths
- Constructor validation (`WithBaseURL("")`, negative timeout, etc.)
- HTTP client configuration edge cases

---

## 3. SDK Request ID Not Populated

| Attribute | Value                                                             |
| --------- | ----------------------------------------------------------------- |
| **Files** | `apps/backend/pkg/sdk/utils.go`, `apps/backend/pkg/sdk/client.go` |
| **Type**  | Architectural gap                                                 |

The `RequestID` field was added to the `envelope` struct in `utils.go`, and `X-Request-ID` is returned by the backend on every response, but:

- The Go SDK's `decodeJSON()` never reads the `X-Request-ID` header and populates the envelope field
- The TypeScript SDK's `request()` method doesn't extract `x-request-id` from response headers
- Consumers have no way to correlate SDK calls with backend traces

---

## 4. Rate Limit Headers Not Exposed

| Attribute | Value                                                             |
| --------- | ----------------------------------------------------------------- |
| **File**  | `apps/backend/pkg/sdk/types.go` (RateLimitInfo exists but unused) |
| **Type**  | Architectural gap                                                 |

The `RateLimitInfo` struct exists in `types.go` but:

- Neither SDK populates it from response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- The Go SDK's envelope or response wrappers don't include rate limit info
- The TypeScript SDK's `request()` doesn't expose rate limit headers

---

## 5. Monorepo Dependency Hoisting — No Root-Level Binaries

| Attribute | Value                            |
| --------- | -------------------------------- |
| **Files** | Turborepo config, `package.json` |
| **Type**  | Environment/DevEx                |

Key binaries (`vitest`, `tsc`, `prettier`) are not available at the root `node_modules/.bin/` level. They exist only within `apps/web/node_modules/.bin/`. This means:

- `npx vitest` only works from `apps/web/` directory
- Running tests from root requires `cd apps/web && npm run test`
- TypeScript checking requires running from the correct subdirectory
- IDEs and tools that expect root-level binaries may fail

**Workaround**: Always run commands from `apps/web/` for frontend tasks, `apps/backend/` for backend tasks.

---

## 6. No SDK Integration Tests

| Attribute | Value             |
| --------- | ----------------- |
| **File**  | Not applicable    |
| **Type**  | Test coverage gap |

The Go SDK tests use `httptest.NewServer` (unit-level). The TypeScript SDK tests mock `global.fetch` (unit-level). Neither SDK has integration tests that:

- Spin up the actual Go backend
- Create a real SDK client pointing to the test server
- Exercise the full request/response cycle (auth → SDK call → response parsing)

The backend's smoke test (`scripts/smoke-test.sh`) covers basic endpoint wiring but doesn't use either SDK.

---

## 7. Go SDK `UploadFile` Return Path Duplicates JSON Decoding

| Attribute | Value                                                  |
| --------- | ------------------------------------------------------ |
| **File**  | `apps/backend/pkg/sdk/client.go` — `UploadFile` method |
| **Type**  | Minor code quality                                     |

The `UploadFile` method calls `doUpload` (which returns an `*http.Response` and already inspected the response body on error), then calls `decodeJSON` on the same response body. The body stream may have been partially consumed. Current tests pass because `httptest` servers buffer the full response, but this pattern is fragile and could silently return empty data in production.

---

## 8. TypeScript SDK `uploadFile` Uses `FormData` with No `content-type` Header

| Attribute | Value                                               |
| --------- | --------------------------------------------------- |
| **File**  | `apps/web/lib/api/sdk.ts` — `uploadFormData` method |
| **Type**  | Minor                                               |

The `uploadFormData` helper intentionally omits `Content-Type` (letting the browser set it with the boundary), which is correct for browser environments. However:

- In Node.js test environments, `FormData` may not automatically set the boundary/Content-Type
- If the SDK is ever used in non-browser environments (e.g., Node.js scripts), this will break
- There's no type guard or environment check
