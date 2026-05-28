# TypeScript SDK — DraSDK

The **DraSDK** class (`lib/api/sdk.ts`) is the typed client for all backend endpoints. It mirrors the Go SDK (`pkg/sdk/`) and both must be kept in sync.

---

## Configuration

```typescript
interface DraSDKConfig {
  baseUrl?: string; // Backend URL (default: "")
  apiKey?: string; // API key for x-api-key auth
  timeout?: number; // Request timeout in ms (default: 30000)
  retries?: number; // Retry count on failure (default: 2)
}
```

### Singleton Pattern

```typescript
import { configureSDK, getSDK } from "@/lib/api/sdk";

// Configure once at app startup
configureSDK({ baseUrl: "http://localhost:8080", timeout: 30000 });

// Use throughout the app
const sdk = getSDK();
const keys = await sdk.listKeys();
```

---

## API Methods

### Health

| Method     | Returns               | Description          |
| ---------- | --------------------- | -------------------- |
| `health()` | `{ status, version }` | Backend health check |

### Auth

| Method                 | Parameters                         | Returns        |
| ---------------------- | ---------------------------------- | -------------- |
| `signup(data)`         | `{ name, email, password }`        | `User`         |
| `login(data)`          | `{ email, password }`              | `AuthResponse` |
| `me()`                 | —                                  | `User`         |
| `updateProfile(data)`  | `{ name, email }`                  | `{ updated }`  |
| `changePassword(data)` | `{ currentPassword, newPassword }` | `{ updated }`  |
| `oauthLogin(data)`     | `{ provider, code }`               | `AuthResponse` |
| `forgotPassword(data)` | `{ email }`                        | `{ sent }`     |
| `resetPassword(data)`  | `{ token, newPassword }`           | `{ updated }`  |

### API Keys

| Method            | Returns       | Description          |
| ----------------- | ------------- | -------------------- |
| `listKeys()`      | `APIKey[]`    | List user's API keys |
| `createKey(data)` | `APIKey`      | Create new key       |
| `deleteKey(id)`   | `{ deleted }` | Delete key           |
| `revokeKey(id)`   | `{ revoked }` | Revoke key           |

### Credits & Budget

| Method                  | Returns             | Description         |
| ----------------------- | ------------------- | ------------------- |
| `getCredits()`          | `UserCredits`       | Get credit balance  |
| `purchaseCredits(data)` | `CreditTransaction` | Purchase credits    |
| `getBudget()`           | `BudgetConfig`      | Get budget settings |
| `setBudget(data)`       | `BudgetConfig`      | Set budget limits   |

### Transactions

| Method                            | Returns                              | Description         |
| --------------------------------- | ------------------------------------ | ------------------- |
| `listTransactions(page?, limit?)` | `PaginatedResult<CreditTransaction>` | Transaction history |

### Logs

| Method                    | Returns                   | Description  |
| ------------------------- | ------------------------- | ------------ |
| `listLogs(page?, limit?)` | `PaginatedResult<APILog>` | Request logs |

### Analytics

| Method           | Returns         | Description     |
| ---------------- | --------------- | --------------- |
| `getAnalytics()` | `AnalyticsData` | Usage analytics |

### Models

| Method         | Returns       | Description      |
| -------------- | ------------- | ---------------- |
| `listModels()` | `ModelInfo[]` | Available models |

### Chat

| Method             | Returns                  | Description              |
| ------------------ | ------------------------ | ------------------------ |
| `chat(data)`       | `ChatCompletionChunk`    | Non-streaming chat       |
| `chatStream(data)` | `AsyncGenerator<string>` | **Streaming chat** (SSE) |

### Conversations

| Method                             | Returns                         |
| ---------------------------------- | ------------------------------- |
| `listConversations(page?, limit?)` | `PaginatedResult<Conversation>` |
| `createConversation(data)`         | `Conversation`                  |
| `getConversation(id)`              | `Conversation`                  |
| `deleteConversation(id)`           | `{ deleted }`                   |
| `addMessage(conversationId, data)` | `ConversationMessage`           |

### Prompts

| Method                          | Returns        |
| ------------------------------- | -------------- |
| `listPrompts()`                 | `Prompt[]`     |
| `createPrompt(data)`            | `Prompt`       |
| `getPrompt(name)`               | `Prompt`       |
| `renderPrompt(name, variables)` | `{ rendered }` |
| `deletePrompt(name)`            | `{ deleted }`  |

### Webhooks

| Method                    | Returns       |
| ------------------------- | ------------- |
| `listWebhooks()`          | `Webhook[]`   |
| `createWebhook(data)`     | `Webhook`     |
| `getWebhook(id)`          | `Webhook`     |
| `updateWebhook(id, data)` | `Webhook`     |
| `deleteWebhook(id)`       | `{ deleted }` |

### Organizations

| Method                        | Returns          |
| ----------------------------- | ---------------- |
| `listOrganizations()`         | `Organization[]` |
| `createOrganization(data)`    | `Organization`   |
| `getOrganization(id)`         | `Organization`   |
| `inviteMember(orgId, data)`   | `{ invited }`    |
| `removeMember(orgId, userId)` | `{ removed }`    |
| `listMembers(orgId)`          | `OrgMember[]`    |
| `acceptInvite(data)`          | `{ accepted }`   |

### Batch

| Method              | Returns    |
| ------------------- | ---------- |
| `submitBatch(data)` | `BatchJob` |
| `getBatchJob(id)`   | `BatchJob` |

### Files

| Method                    | Returns      |
| ------------------------- | ------------ |
| `uploadFile(file, name?)` | `FileInfo`   |
| `listFiles()`             | `FileInfo[]` |

### Embeddings & Validation

| Method           | Returns              |
| ---------------- | -------------------- |
| `embed(data)`    | `EmbeddingResponse`  |
| `validate(data)` | `{ valid, errors? }` |

### Notifications

| Method                  | Returns                             |
| ----------------------- | ----------------------------------- |
| `notificationsStream()` | `AsyncGenerator<NotificationEvent>` |

### OpenAI-Comaptible Proxy

| Method                        | Returns   |
| ----------------------------- | --------- |
| `openaiChatCompletions(body)` | `unknown` |
| `openaiEmbeddings(body)`      | `unknown` |
| `openaiListModels()`          | `unknown` |

### Admin

| Method                          | Returns                  |
| ------------------------------- | ------------------------ |
| `adminListUsers(page?, limit?)` | `PaginatedResult<User>`  |
| `adminDeleteUser(id)`           | `{ deleted }`            |
| `adminStats()`                  | `PlatformStats`          |
| `adminCircuitBreakers()`        | `CircuitBreakerStatus[]` |
| `adminProviderHealth()`         | `ProviderHealthStatus[]` |

### Provider Health

| Method             | Returns             |
| ------------------ | ------------------- |
| `providerHealth()` | `ProviderSummary[]` |

---

## Error Handling

The SDK uses typed error classes:

```typescript
class ApiError       (status: number)
class BadRequestError    extends ApiError  (400)
class UnauthorizedError  extends ApiError  (401)
class ForbiddenError     extends ApiError  (403)
class NotFoundError      extends ApiError  (404)
class PaymentRequiredError extends ApiError (402)
class RateLimitError     extends ApiError  (429)
```

### Retry Logic

- **5xx errors** and **429 (Rate Limit)**: Retried with exponential backoff (500ms, 1000ms, 2000ms)
- **4xx errors** (except 429): Not retried
- **AbortError** (timeout): Thrown immediately as 408 error

### Rate Limit Headers

The SDK extracts rate limit info from response headers:

```typescript
sdk.lastRateLimitInfo(); // { limit, remaining, reset }
sdk.lastRequestId(); // x-request-id header
```

---

## Pagination

List endpoints return `PaginatedResult<T>`:

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Usage: `sdk.listLogs(page=1, limit=20).then(result => result.data)`

---

## Streaming Implementation

Both `chatStream()` and `notificationsStream()` use **async generators** with SSE parsing:

```typescript
for await (const chunk of sdk.chatStream({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
})) {
  process.stdout.write(chunk);
}
```

The SDK handles SSE parsing internally, yielding only the content delta for chat or parsed events for notifications.
