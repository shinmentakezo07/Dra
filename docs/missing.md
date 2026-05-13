# SDK Coverage Gap Analysis — What's Missing

> Both SDKs (`apps/backend/pkg/sdk/` — Go, `apps/web/lib/api/sdk.ts` — TypeScript) cover ~14 of ~60 backend endpoints. This document maps every gap, organized by module, with severity, implementation effort, and suggested method signatures.

---

## Legend

| Icon | Severity | Meaning |
|------|----------|---------|
| 🔴 P0 | Blocking | Core feature users can't access via SDK |
| 🟡 P1 | High | Important feature, workaroundable but painful |
| 🟠 P2 | Medium | Admin/internal tooling, nice to have |
| 🟢 P3 | Low | Trivial addition, non-critical |

---

## 1. Auth Flows — 🔴 P0

### `POST /auth/oauth`
**OAuth login (GitHub/Google)**

```go
// Go SDK — pkg/sdk/client.go
type OAuthRequest struct {
    Provider string `json:"provider"` // "github" | "google"
    Code     string `json:"code"`
}
type OAuthResponse struct {
    User  User   `json:"user"`
    Token string `json:"token"`
}
func (c *Client) OAuthLogin(ctx context.Context, req OAuthRequest) (*OAuthResponse, error)
```

```typescript
// TS SDK — lib/api/sdk.ts
oauthLogin(data: { provider: string; code: string }): Promise<AuthResponse>
```

### `POST /auth/forgot-password`
**Request password reset email**

```go
func (c *Client) ForgotPassword(ctx context.Context, email string) error
// POST /auth/forgot-password  body: {email}
```

```typescript
forgotPassword(data: { email: string }): Promise<{ sent: boolean }>
```

### `POST /auth/reset-password`
**Reset password with token**

```go
func (c *Client) ResetPassword(ctx context.Context, token, newPassword string) error
// POST /auth/reset-password  body: {token, newPassword}
```

```typescript
resetPassword(data: { token: string; newPassword: string }): Promise<{ updated: boolean }>
```

---

## 2. Budget Settings — 🔴 P0

### `GET /api/credits/budget`
**Get spending budget configuration**

```go
// Go SDK — add to types.go
type BudgetConfig struct {
    ID              string    `json:"id"`
    UserID          string    `json:"userId"`
    MonthlyLimit    int       `json:"monthlyLimit"`
    DailyLimit      int       `json:"dailyLimit"`
    NotifyAtPercent int       `json:"notifyAtPercent"`
    UpdatedAt       time.Time `json:"updatedAt"`
}
func (c *Client) GetBudget(ctx context.Context) (*BudgetConfig, error)
```

```typescript
// TS SDK — add types
interface BudgetConfig {
  id: string;
  userId: string;
  monthlyLimit: number;
  dailyLimit: number;
  notifyAtPercent: number;
  updatedAt: string;
}
getBudget(): Promise<BudgetConfig>
```

### `PUT /api/credits/budget`
**Set spending budget limits**

```go
func (c *Client) SetBudget(ctx context.Context, cfg BudgetConfig) (*BudgetConfig, error)
```

```typescript
setBudget(data: Partial<BudgetConfig>): Promise<BudgetConfig>
```

---

## 3. Conversations CRUD — 🔴 P0

All 5 endpoints missing from both SDKs.

### Go SDK types to add (`types.go`)

```go
type Conversation struct {
    ID        string    `json:"id"`
    UserID    string    `json:"userId"`
    Title     string    `json:"title"`
    Model     string    `json:"model"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type ConversationMessage struct {
    ID             string    `json:"id"`
    ConversationID string    `json:"conversationId"`
    Role           string    `json:"role"`
    Content        string    `json:"content"`
    CreatedAt      time.Time `json:"createdAt"`
}
```

### SDK methods

```go
// Go SDK
func (c *Client) ListConversations(ctx context.Context, page, limit int) (*PaginatedResult[Conversation], error)
func (c *Client) CreateConversation(ctx context.Context, title, model string) (*Conversation, error)
func (c *Client) GetConversation(ctx context.Context, id string) (*Conversation, error)
func (c *Client) DeleteConversation(ctx context.Context, id string) error
func (c *Client) AddMessage(ctx context.Context, conversationID string, role, content string) (*ConversationMessage, error)
```

```typescript
// TS SDK
listConversations(page?: number, limit?: number): Promise<PaginatedResult<Conversation>>
createConversation(data: { title: string; model: string }): Promise<Conversation>
getConversation(id: string): Promise<Conversation>
deleteConversation(id: string): Promise<{ deleted: boolean }>
addMessage(conversationId: string, data: { role: string; content: string }): Promise<ConversationMessage>
```

---

## 4. Prompts CRUD + Render — 🔴 P0

All 5 endpoints missing.

### Go SDK types to add

```go
type Prompt struct {
    Name        string    `json:"name"`
    Content     string    `json:"content"`
    Description string    `json:"description,omitempty"`
    Template    bool      `json:"template"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

type RenderRequest struct {
    Template string                 `json:"template"`
    Variables map[string]string     `json:"variables"`
}

type RenderResponse struct {
    Rendered string `json:"rendered"`
}
```

### SDK methods

```go
// Go SDK
func (c *Client) ListPrompts(ctx context.Context) ([]Prompt, error)
func (c *Client) CreatePrompt(ctx context.Context, name, content, description string, template bool) (*Prompt, error)
func (c *Client) GetPrompt(ctx context.Context, name string) (*Prompt, error)
func (c *Client) RenderPrompt(ctx context.Context, name string, variables map[string]string) (*RenderResponse, error)
func (c *Client) DeletePrompt(ctx context.Context, name string) error
```

```typescript
// TS SDK
listPrompts(): Promise<Prompt[]>
createPrompt(data: { name: string; content: string; description?: string; template?: boolean }): Promise<Prompt>
getPrompt(name: string): Promise<Prompt>
renderPrompt(name: string, variables: Record<string, string>): Promise<{ rendered: string }>
deletePrompt(name: string): Promise<{ deleted: boolean }>
```

---

## 5. Webhooks CRUD — 🔴 P0

All 5 endpoints missing.

### Go SDK types to add

```go
type Webhook struct {
    ID        string    `json:"id"`
    UserID    string    `json:"userId"`
    Name      string    `json:"name"`
    URL       string    `json:"url"`
    Events    []string  `json:"events"`
    Secret    string    `json:"secret,omitempty"`
    Active    bool      `json:"active"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}
```

### SDK methods

```go
// Go SDK
func (c *Client) ListWebhooks(ctx context.Context) ([]Webhook, error)
func (c *Client) CreateWebhook(ctx context.Context, name, url string, events []string) (*Webhook, error)
func (c *Client) GetWebhook(ctx context.Context, id string) (*Webhook, error)
func (c *Client) UpdateWebhook(ctx context.Context, id string, webhook Webhook) (*Webhook, error)
func (c *Client) DeleteWebhook(ctx context.Context, id string) error
```

```typescript
// TS SDK
listWebhooks(): Promise<Webhook[]>
createWebhook(data: { name: string; url: string; events: string[] }): Promise<Webhook>
getWebhook(id: string): Promise<Webhook>
updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook>
deleteWebhook(id: string): Promise<{ deleted: boolean }>
```

### 🏗️ Extra: Webhook Signature Verification

```go
// Go SDK — pkg/sdk/webhook.go (new file)
// VerifyWebhookSignature validates a webhook payload against the signature
// sent in the X-Webhook-Signature header (HMAC-SHA256).
func VerifyWebhookSignature(payload []byte, signature string, secret string) error {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))
    if !hmac.Equal([]byte(signature), []byte(expected)) {
        return fmt.Errorf("webhook: invalid signature")
    }
    return nil
}
```

---

## 6. Organizations CRUD — 🔴 P0

All 7 endpoints missing.

### Go SDK types to add

```go
type Organization struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    OwnerID   string    `json:"ownerId"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type OrgMember struct {
    UserID string `json:"userId"`
    Name   string `json:"name"`
    Email  string `json:"email"`
    Role   string `json:"role"`
}

type InviteRequest struct {
    Email    string `json:"email"`
    Role     string `json:"role,omitempty"`
}

type AcceptInviteRequest struct {
    Token string `json:"token"`
}
```

### SDK methods

```go
// Go SDK
func (c *Client) ListOrganizations(ctx context.Context) ([]Organization, error)
func (c *Client) CreateOrganization(ctx context.Context, name string) (*Organization, error)
func (c *Client) GetOrganization(ctx context.Context, id string) (*Organization, error)
func (c *Client) InviteMember(ctx context.Context, orgID, email, role string) error
func (c *Client) RemoveMember(ctx context.Context, orgID, userID string) error
func (c *Client) ListMembers(ctx context.Context, orgID string) ([]OrgMember, error)
func (c *Client) AcceptInvite(ctx context.Context, token string) error
```

```typescript
// TS SDK
listOrganizations(): Promise<Organization[]>
createOrganization(data: { name: string }): Promise<Organization>
getOrganization(id: string): Promise<Organization>
inviteMember(orgId: string, data: { email: string; role?: string }): Promise<{ invited: boolean }>
removeMember(orgId: string, userId: string): Promise<{ removed: boolean }>
listMembers(orgId: string): Promise<OrgMember[]>
acceptInvite(data: { token: string }): Promise<{ accepted: boolean }>
```

---

## 7. Batch Processing — 🟡 P1

### `POST /api/batch` + `GET /api/batch/{id}`

```go
// Go SDK types
type BatchJob struct {
    ID        string    `json:"id"`
    UserID    string    `json:"userId"`
    Status    string    `json:"status"`    // "pending" | "processing" | "completed" | "failed"
    Total     int       `json:"total"`
    Completed int       `json:"completed"`
    Failed    int       `json:"failed"`
    CreatedAt time.Time `json:"createdAt"`
}

type BatchSubmitRequest struct {
    Requests []BatchChatRequest `json:"requests"`
}

type BatchChatRequest struct {
    Model    string        `json:"model"`
    Messages []ChatMessage `json:"messages"`
}

// Go SDK methods
func (c *Client) SubmitBatch(ctx context.Context, req BatchSubmitRequest) (*BatchJob, error)
func (c *Client) GetBatchJob(ctx context.Context, id string) (*BatchJob, error)
```

```typescript
// TS SDK types
interface BatchJob {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  completed: number;
  failed: number;
  createdAt: string;
}

// TS SDK methods
submitBatch(data: { requests: Array<{ model: string; messages: ChatMessage[] }> }): Promise<BatchJob>
getBatchJob(id: string): Promise<BatchJob>
```

---

## 8. File Upload — 🟡 P1

### `POST /api/files/upload` (multipart) + `GET /api/files`

> **Note**: This is architecturally different from all other endpoints because it uses `multipart/form-data`, not JSON. Both SDKs need a new request pattern.

```go
// Go SDK types
type FileInfo struct {
    ID        string    `json:"id"`
    UserID    string    `json:"userId"`
    Name      string    `json:"name"`
    Size      int64     `json:"size"`
    MimeType  string    `json:"mimeType"`
    CreatedAt time.Time `json:"createdAt"`
}

// Go SDK methods
func (c *Client) UploadFile(ctx context.Context, name string, content io.Reader) (*FileInfo, error) {
    // Uses multipart/form-data — needs a new doUpload helper or
    // a multipart-aware variant of doRequest.
    // POST /api/files/upload  (multipart/form-data)
}

func (c *Client) ListFiles(ctx context.Context) ([]FileInfo, error)
```

```typescript
// TS SDK methods
uploadFile(file: File | Blob, name?: string): Promise<FileInfo>
// POST /api/files/upload  (multipart/form-data)
listFiles(): Promise<FileInfo[]>
```

---

## 9. Embeddings — 🟡 P1

### `POST /api/embeddings`

```go
// Go SDK types — add to types.go
type EmbeddingRequest struct {
    Model string   `json:"model"`
    Input []string `json:"input"`
}

type EmbeddingResponse struct {
    Model      string      `json:"model"`
    Embeddings [][]float32 `json:"embeddings"`
    Usage      struct {
        PromptTokens int `json:"promptTokens"`
        TotalTokens  int `json:"totalTokens"`
    } `json:"usage"`
}

func (c *Client) Embed(ctx context.Context, req EmbeddingRequest) (*EmbeddingResponse, error)
```

```typescript
// TS SDK
embed(data: { model: string; input: string[] }): Promise<EmbeddingResponse>
```

---

## 10. Validate Structured Output — 🟠 P2

### `POST /api/validate`

```go
type ValidateRequest struct {
    Schema json.RawMessage `json:"schema"`
    Data   json.RawMessage `json:"data"`
}

type ValidateResponse struct {
    Valid  bool     `json:"valid"`
    Errors []string `json:"errors,omitempty"`
}

func (c *Client) Validate(ctx context.Context, req ValidateRequest) (*ValidateResponse, error)
```

```typescript
validate(data: { schema: unknown; data: unknown }): Promise<{ valid: boolean; errors?: string[] }>
```

---

## 11. Notifications SSE Stream — 🟠 P2

### `GET /api/notifications/stream`

Both SDKs already have the SSE streaming pattern from `chatStream`/`ChatStream` — this is a copy-paste adaptation.

```go
// Go SDK — returns channel of notification events
func (c *Client) NotificationsStream(ctx context.Context) (<-chan NotificationEvent, <-chan error)

type NotificationEvent struct {
    Type    string `json:"type"`
    Title   string `json:"title"`
    Message string `json:"message"`
    Read    bool   `json:"read"`
}
```

```typescript
// TS SDK — async generator (same pattern as chatStream)
async *notificationsStream(): AsyncGenerator<NotificationEvent, void, unknown>
```

---

## 12. OpenAI-Compatible Proxy Endpoints — 🟠 P2

### `POST /v1/chat/completions`, `POST /v1/embeddings`, `GET /v1/models`

These let SDK users call the OpenAI-compatible surface directly (useful for testing, or for users who already target the OpenAI API).

```go
// Go SDK
func (c *Client) OpenAIChatCompletions(ctx context.Context, req json.RawMessage) (json.RawMessage, error)
func (c *Client) OpenAIEmbeddings(ctx context.Context, req json.RawMessage) (json.RawMessage, error)
func (c *Client) OpenAIListModels(ctx context.Context) (json.RawMessage, error)
```

```typescript
// TS SDK
openaiChatCompletions(body: unknown): Promise<unknown>
openaiEmbeddings(body: unknown): Promise<unknown>
openaiListModels(): Promise<unknown>
```

---

## 13. Admin Endpoints — 🟠 P2

### `GET /api/admin/circuit-breakers` + `GET /api/admin/provider-health`

```go
type CircuitBreakerStatus struct {
    Provider string `json:"provider"`
    State    string `json:"state"`    // "closed" | "open" | "half-open"
    FailureCount int `json:"failureCount"`
    LastFailure  *time.Time `json:"lastFailure,omitempty"`
}

type ProviderHealthStatus struct {
    Provider string `json:"provider"`
    Healthy  bool   `json:"healthy"`
    Latency  int    `json:"latency"`
    LastCheck time.Time `json:"lastCheck"`
}

func (c *Client) AdminCircuitBreakers(ctx context.Context) ([]CircuitBreakerStatus, error)
func (c *Client) AdminProviderHealth(ctx context.Context) ([]ProviderHealthStatus, error)
```

```typescript
adminCircuitBreakers(): Promise<CircuitBreakerStatus[]>
adminProviderHealth(): Promise<ProviderHealthStatus[]>
```

Also extend the admin list in the TS SDK (currently stops at `adminStats`):

```typescript
// TS SDK — already has adminListUsers, adminDeleteUser, adminStats
// Add:
adminCircuitBreakers(): Promise<CircuitBreakerStatus[]>
adminProviderHealth(): Promise<ProviderHealthStatus[]>
```

---

## 14. Public Provider Health — 🟢 P3

### `GET /health/providers`

```go
type ProviderSummary struct {
    Provider string `json:"provider"`
    Status   string `json:"status"`   // "healthy" | "degraded" | "down"
    Models   int    `json:"models"`
}

func (c *Client) ProviderHealth(ctx context.Context) ([]ProviderSummary, error)
```

```typescript
providerHealth(): Promise<ProviderSummary[]>
```

---

## 15. Architectural Improvements (non-endpoint)

### A. Multipart Upload Helper — 🔴 P0 requirement for file upload

The Go SDK's `doRequest` only sends `application/json`. File upload requires a new helper:

```go
// New internal method in pkg/sdk/client.go
func (c *Client) doUpload(ctx context.Context, path string, fileName string, fileReader io.Reader, extraFields map[string]string) (*http.Response, error) {
    var buf bytes.Buffer
    mw := multipart.NewWriter(&buf)
    
    // Add file part
    part, _ := mw.CreateFormFile("file", fileName)
    io.Copy(part, fileReader)
    
    // Add extra fields
    for k, v := range extraFields {
        mw.WriteField(k, v)
    }
    mw.Close()
    
    req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+path, &buf)
    req.Header.Set("Content-Type", mw.FormDataContentType())
    if c.apiKey != "" {
        req.Header.Set("X-Api-Key", c.apiKey)
    }
    return c.httpClient.Do(req)
}
```

```typescript
// TS SDK needs a separate method that uses FormData instead of JSON
private async uploadFormData(path: string, formData: FormData): Promise<Response> {
    return this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.apiKey ? { "x-api-key": this.apiKey } : {},
        credentials: "include",
        body: formData,
        // Note: no Content-Type — browser sets it with boundary
    });
}
```

### B. Rate Limit Header Exposure — 🟠 P2

The backend returns headers, but both SDKs swallow them:

```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

```go
// Go SDK — add to envelope or return as optional struct
type RateLimitInfo struct {
    Limit     int `json:"-"`
    Remaining int `json:"-"`
    Reset     int `json:"-"`
}

// Option: make doRequest return rate limit info
// Better: wrap envelope with rate limit metadata
type EnvelopeWithRateLimit struct {
    Envelope  envelope
    RateLimit *RateLimitInfo
}
```

```typescript
// TS SDK — add optional rate limit info to responses
// Best approach: return { data, rateLimit } wrapper from request()
```

### C. Retry with Jitter — 🟠 P2

Current Go SDK backoff is deterministic:
```go
time.After(time.Duration(attempt+1) * 500 * time.Millisecond)
```

Replace with jittered exponential backoff:
```go
import "math/rand"

base := time.Duration(attempt+1) * 500 * time.Millisecond
jitter := time.Duration(rand.Int63n(int64(base / 2)))
sleep := base + jitter
```

### D. Request ID Tracing — 🟢 P3

The backend returns `X-Request-ID` on every response. Consumers debugging latency or tracing through logs need it.

```go
// Go SDK — add to envelope
type envelope struct {
    Success   bool            `json:"success"`
    Data      json.RawMessage `json:"data,omitempty"`
    Error     string          `json:"error,omitempty"`
    Meta      *PaginatedMeta  `json:"meta,omitempty"`
    RequestID string          `json:"requestId,omitempty"`  // ← add
}
```

### E. Missing Types in Both SDKs

The following types exist in the backend's `domain/models.go` but have NO representation in either SDK:

| Backend Model | Go SDK (`types.go`) | TS SDK (`sdk.ts`) |
|---|---|---|
| `Budget` | ❌ | ❌ |
| `Conversation` | ❌ | ❌ |
| `ConversationMessage` | ❌ | ❌ |
| `Prompt` | ❌ | ❌ |
| `Webhook` | ❌ | ❌ |
| `Organization` | ❌ | ❌ |
| `OrgMember` | ❌ | ❌ |
| `BatchJob` | ❌ | ❌ |
| `FileInfo` | ❌ | ❌ |
| `CircuitBreakerStatus` | ❌ | ❌ |
| `ProviderHealthStatus` | ❌ | ❌ |
| `BudgetConfig` | ❌ | ❌ |

---

## Summary: Implementation Effort

| Category | # Methods | Est. Effort (Go) | Est. Effort (TS) |
|---|---|---|---|
| Auth flows | 3 | 1h | 30min |
| Budget settings | 2 | 45min | 20min |
| Conversations CRUD | 5 | 2h | 1h |
| Prompts CRUD | 5 | 2h | 1h |
| Webhooks CRUD + verify | 5+1 | 2.5h | 1h |
| Organizations CRUD | 7 | 3h | 1.5h |
| Batch processing | 2 | 1h | 30min |
| File upload | 2 | 1.5h | 1h |
| Embeddings | 1 | 30min | 15min |
| Validate output | 1 | 30min | 15min |
| Notifications SSE | 1 | 1h | 30min |
| OpenAI proxy passes | 3 | 1h | 30min |
| Admin endpoints | 2 | 45min | 20min |
| Public health | 1 | 15min | 10min |
| **Architectural** | | | |
| Multipart upload helper | — | 1h | 30min |
| Rate limit headers | — | 1h | 1h |
| Retry jitter | — | 15min | — |
| Request ID tracing | — | 30min | 30min |
| **Totals** | **~40 methods** | **~19h** | **~10h** |
