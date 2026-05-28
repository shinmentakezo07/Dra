# Backend Services -- Complete Reference

## Architecture Overview

The backend follows a strict layered architecture:

```
HTTP Request
    |
    v
Handler (internal/handler/)     -- HTTP concerns, request parsing, response writing
    |
    v
Service (internal/service/)     -- Business logic, orchestration, validation
    |
    v
Repository (internal/repository/) -- Data access, SQL queries, caching
    |
    v
Database (Postgres / Neon / MongoDB)
```

Dependency injection is wired in `cmd/api/services.go` via the `initServices()` function. The handler (`handler.Handler`) is a single receiving struct that holds references to all services. Services are constructed with their repository dependencies; some services also reference each other (e.g., `CreditService` references `UserRepo` for email alerts).

```
services.go (initServices)
    |
    +---> Repository layer (UserRepo, APIKeyRepo, CreditsRepo, ...)
    +---> LLM subsystem (Provider Registry, Router, Cache, Watcher, Circuit Breaker)
    +---> Service layer (UserSvc, KeySvc, CreditSvc, ...)
    +---> Handler (receives all services)
```

---

## Service Catalog

### UserService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/user.go`
**Package**: `service`
**Purpose**: Manages user registration, authentication, profile updates, and password management. Uses Argon2id for password hashing with backward-compatible bcrypt support.

**Dependencies**: `repository.UserRepo`, `cfg.AuthSecret` (JWT signing secret)

**Handlers that use it**: All auth handlers (`Signup`, `Login`, `OAuthLogin`, `Me`, `UpdateProfile`, `ChangePassword`, `ForgotPassword`, `ResetPassword`, `DeleteAccount`)

| Method                 | Signature                                                                  | Description                                                                                               |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Register`             | `(ctx, domain.SignupRequest) -> (*domain.AuthResponse, *domain.AppError)`  | Validates request, checks for duplicate email, hashes password with Argon2id, creates user, generates JWT |
| `Authenticate`         | `(ctx, domain.LoginRequest) -> (*domain.AuthResponse, *domain.AppError)`   | Validates credentials, checks bcrypt or Argon2id hash, generates JWT                                      |
| `OAuthLogin`           | `(ctx, email, name, provider) -> (*domain.AuthResponse, *domain.AppError)` | Finds or creates user by email, generates JWT                                                             |
| `GetByID`              | `(ctx, id) -> (*domain.User, *domain.AppError)`                            | Returns user (password field nil'd), returns `ErrUserNotFound`                                            |
| `List`                 | `(ctx, page, limit) -> ([]domain.User, total, *domain.AppError)`           | Paginated user list                                                                                       |
| `UpdateProfile`        | `(ctx, id, name, email) -> *domain.AppError`                               | Updates user name and email                                                                               |
| `ChangePassword`       | `(ctx, id, currentPassword, newPassword) -> *domain.AppError`              | Verifies current password, hashes new password, updates                                                   |
| `RequestPasswordReset` | `(ctx, email) -> (token string, *domain.AppError)`                         | Generates reset token (1-hour expiry), silently returns empty if email not found                          |
| `ResetPassword`        | `(ctx, token, newPassword) -> *domain.AppError`                            | Validates token, updates password, marks token used                                                       |
| `Delete`               | `(ctx, id) -> *domain.AppError`                                            | Deletes user account                                                                                      |

**Error types**: `ErrEmailExists`, `ErrUserNotFound`, `ErrUnauthorized`, `ErrBadRequest` (wrapped with `domain.Wrap`)

---

### APIKeyService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/apikey.go`
**Package**: `service`
**Purpose**: Manages the API key lifecycle (creation, listing, deletion, revocation, update). Keys are generated as `dra_<32-bytes-hex>` and stored hashed (peppered via `AuthSecret`).

**Dependencies**: `repository.APIKeyRepo`

**Handlers that use it**: `ListKeys`, `CreateKey`, `DeleteKey`, `RevokeKey`, `UpdateKey`

| Method   | Signature                                                                      | Description                                                           |
| -------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `List`   | `(ctx, userID) -> ([]domain.APIKey, *domain.AppError)`                         | Lists all keys for user (values are masked)                           |
| `Create` | `(ctx, userID, domain.CreateKeyRequest) -> (*domain.APIKey, *domain.AppError)` | Generates new key, stores hashed copy, returns raw key once           |
| `Delete` | `(ctx, userID, keyID) -> *domain.AppError`                                     | Soft-deletes key, verifies ownership                                  |
| `Revoke` | `(ctx, userID, keyID) -> *domain.AppError`                                     | Sets `revoked_at` timestamp, verifies ownership                       |
| `Update` | `(ctx, userID, keyID, name, models, ips, maxTokens) -> *domain.AppError`       | Updates key name, allowed models, allowed IPs, max tokens per request |

**Error types**: `ErrKeyNotFound`, `ErrBadRequest`

---

### CreditService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/credits.go`
**Package**: `service`
**Purpose**: Manages user credits balance, purchases, spending budgets, and usage deduction. The `LogAndDeduct` method atomically logs API usage and deducts credits in a single DB transaction.

**Dependencies**: `db.DB`, `repository.CreditsRepo`, `repository.TransactionRepo`, `repository.LogRepo`, `repository.UserRepo` (set via `SetUserRepo`), `email.Sender` (set via `SetEmailSender`)

**Handlers that use it**: `GetCredits`, `PurchaseCredits`, `GetBudget`, `SetBudget`, `ListTransactions`, `ChatProxy` (indirectly), `OpenAIChatCompletions` (indirectly)

| Method             | Signature                                                                                                        | Description                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GetBalance`       | `(ctx, userID) -> (*domain.UserCredits, *domain.AppError)`                                                       | Returns current balance, total spent/purchased, budget info                                                                                                                                            |
| `Purchase`         | `(ctx, userID, domain.PurchaseRequest) -> (*domain.CreditTransaction, *domain.AppError)`                         | Adds credits and records transaction (non-Stripe path)                                                                                                                                                 |
| `DeductForUsage`   | `(ctx, userID, amount, logID) -> *domain.AppError`                                                               | Deducts credits and records usage transaction                                                                                                                                                          |
| `ListTransactions` | `(ctx, userID, page, limit) -> ([]domain.CreditTransaction, total, *domain.AppError)`                            | Paginated transaction history                                                                                                                                                                          |
| `CheckBalance`     | `(ctx, userID, required) -> *domain.AppError`                                                                    | Verifies sufficient balance and budget limits                                                                                                                                                          |
| `SetBudget`        | `(ctx, userID, dailyBudget, monthlyBudget) -> *domain.AppError`                                                  | Sets daily/monthly spending limits                                                                                                                                                                     |
| `LogAndDeduct`     | `(ctx, userID, apiKeyID, model, inputTokens, outputTokens, cost, latency) -> (*domain.APILog, *domain.AppError)` | **Atomic transaction**: locks balance row (`FOR UPDATE`), writes `api_logs`, deducts credits, updates budget spending, records `credit_transactions`. Async sends budget alert email at 80% threshold. |

**Error types**: `ErrNoCredits`, `ErrBadRequest` (budget exceeded with 429 status)

---

### AnalyticsService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/analytics.go`
**Package**: `service`
**Purpose**: Generates user-level and platform-level usage analytics.

**Dependencies**: `repository.LogRepo`, `repository.UserRepo`, `repository.CreditsRepo`, `repository.APIKeyRepo`

**Handlers that use it**: `GetAnalytics`

| Method          | Signature                                                     | Description                                                                                           |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `UserAnalytics` | `(ctx, userID) -> (map[string]interface{}, *domain.AppError)` | Returns summary (total/success/error requests), recent logs (10), model breakdown, 30-day daily usage |
| `PlatformStats` | `(ctx) -> (map[string]interface{}, *domain.AppError)`         | Returns total users, keys, logs (by status), credits totals, recent activity (5)                      |

---

### LogService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/log.go`
**Package**: `service`
**Purpose**: Simple passthrough for paginated API log retrieval.

**Dependencies**: `repository.LogRepo`

**Handlers that use it**: `ListLogs`

| Method     | Signature                                                                  | Description                   |
| ---------- | -------------------------------------------------------------------------- | ----------------------------- |
| `ListLogs` | `(ctx, userID, page, limit) -> ([]domain.APILog, total, *domain.AppError)` | Paginated request log entries |

---

### ProviderService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/provider.go`
**Package**: `service`
**Purpose**: Core LLM provider operations: chat (streaming and non-streaming), model listing, routing, pipeline processing, health checking, and capability queries. Wraps the `llmprovider.Registry` with a pre/post processing pipeline (validation, thinking, tools, sanitization, logging).

**Dependencies**: `*llmprovider.Registry`, `cache.Cache`, `*watcher.Watcher`

**Handlers that use it**: `ChatProxy`, `ListModels`, `OpenAIChatCompletions`, `AnthropicMessages`, `OpenAIEmbeddings`, `ProviderHealth`, `AdminCircuitBreakers`

| Method                   | Signature                                                                          | Description                                                    |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `ListModels`             | `(ctx) -> ([]llm.ModelInfo, *domain.AppError)`                                     | Aggregates models from all registered providers                |
| `Chat`                   | `(ctx, domain.ChatRequest) -> (*llm.ChatResponse, *domain.AppError)`               | Non-streaming chat; runs pipeline pre/post, routes to provider |
| `ChatStream`             | `(ctx, domain.ChatRequest) -> (<-chan llm.StreamChunk, *domain.AppError)`          | Streaming chat; runs pipeline pre, returns channel of chunks   |
| `ChatWithThinking`       | `(ctx, domain.ChatRequest, budgetTokens) -> (*llm.ChatResponse, *domain.AppError)` | Chat with extended thinking/reasoning enabled                  |
| `ResolveProvider`        | `(modelID) -> (provider, model string)`                                            | Splits `provider/model` into parts                             |
| `EstimateTokens`         | `(modelID, messages) -> (inputTokens, outputTokens int)`                           | Rough token estimation from message character count            |
| `DefaultModel`           | `() -> string`                                                                     | Returns `nvidia/qwen3-coder-480b`                              |
| `AllProviders`           | `() -> []string`                                                                   | Lists registered provider names                                |
| `ListProviderNames`      | `(ctx) -> []string`                                                                | Lists registered provider names                                |
| `ModelProvider`          | `(modelID) -> (string, bool)`                                                      | Returns provider name and whether it exists in registry        |
| `FindModel`              | `(ctx, modelID) -> (*llm.ModelInfo, *domain.AppError)`                             | Searches for a model by ID or suffix match                     |
| `GetCacheStats`          | `(ctx) -> (cache.Stats, error)`                                                    | Returns cache statistics                                       |
| `IsThinkingModel`        | `(modelID) -> bool`                                                                | Checks if model supports thinking                              |
| `IsVisionModel`          | `(modelID) -> bool`                                                                | Checks if model supports vision                                |
| `SupportsTools`          | `(modelID) -> bool`                                                                | Checks if model supports tool calls                            |
| `GetContextWindow`       | `(ctx, modelID) -> int`                                                            | Returns context window (defaults to 128000)                    |
| `CircuitBreakerStatuses` | `() -> []map[string]interface{}`                                                   | Returns circuit breaker state for each provider                |
| `ValidateRequest`        | `(domain.ChatRequest) -> *domain.AppError`                                         | Validates chat request through pipeline                        |
| `DefaultSystemPrompt`    | `() -> string`                                                                     | Returns default system prompt                                  |
| `ProviderHealthStatuses` | `() -> []llmprovider.ProviderHealth`                                               | Returns current health statuses                                |
| `HealthChecker`          | `() -> *llmprovider.HealthChecker`                                                 | Returns the health checker instance                            |

---

### WebhookService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/webhook.go`
**Package**: `service`
**Purpose**: Manages webhook configuration and event dispatch with retry backoff, idempotency deduplication, and a background retry worker.

**Dependencies**: `repository.WebhookRepo`, `*webhook.Dispatcher`

**Handlers that use it**: `ListWebhooks`, `CreateWebhook`, `GetWebhook`, `UpdateWebhook`, `DeleteWebhook`, `GetWebhookDeliveries`, `AdminListWebhookLogs`, `AdminRetryWebhook`

| Method                  | Signature                                                                               | Description                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `Create`                | `(ctx, userID, domain.CreateWebhookRequest) -> (*domain.Webhook, *domain.AppError)`     | Creates webhook with URL, secret, events, headers                              |
| `List`                  | `(ctx, userID) -> ([]domain.Webhook, *domain.AppError)`                                 | Lists user's webhooks                                                          |
| `Get`                   | `(ctx, userID, id) -> (*domain.Webhook, *domain.AppError)`                              | Gets webhook by ID with ownership check                                        |
| `Delete`                | `(ctx, userID, id) -> *domain.AppError`                                                 | Deletes webhook with ownership check                                           |
| `Update`                | `(ctx, userID, id, domain.CreateWebhookRequest) -> (*domain.Webhook, *domain.AppError)` | Updates webhook config                                                         |
| `ToggleActive`          | `(ctx, userID, id, active) -> *domain.AppError`                                         | Enables/disables a webhook                                                     |
| `Dispatch`              | `(ctx, userID, webhook.Event)`                                                          | Sends event to all active webhooks (async, semaphore-limited to 20 concurrent) |
| `RetryDelivery`         | `(ctx, deliveryID) -> *domain.AppError`                                                 | Manually retries a failed/pending delivery                                     |
| `ListFailedDeliveries`  | `(ctx, limit) -> ([]domain.WebhookDelivery, *domain.AppError)`                          | Returns DLQ deliveries                                                         |
| `ListDeliveryLogs`      | `(ctx, limit) -> ([]domain.WebhookDeliveryLog, *domain.AppError)`                       | Returns recent delivery attempt logs                                           |
| `ListDeliveries`        | `(ctx, userID, webhookID) -> ([]domain.WebhookDelivery, *domain.AppError)`              | Returns delivery history for a webhook                                         |
| `ProcessPendingRetries` | `(ctx) -> error`                                                                        | Fetches and retries due deliveries (batch of 20)                               |
| `StartRetryWorker`      | `(ctx, interval)`                                                                       | Starts background goroutine that polls for pending retries                     |

**Retry backoff**: 1s, 4s, 16s, 64s (max 5 attempts). 4xx client errors are not retried.

---

### OrganizationService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/organization.go`
**Package**: `service`
**Purpose**: Manages organizations, team membership, and invitations. Implements role-based access within orgs (owner, admin, member).

**Dependencies**: `repository.OrganizationRepo`, `repository.UserRepo`

**Handlers that use it**: `ListOrgs`, `CreateOrg`, `GetOrg`, `InviteMember`, `RemoveMember`, `ListMembers`, `AcceptInvite`

| Method         | Signature                                                                                | Description                                                   |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Create`       | `(ctx, userID, domain.CreateOrgRequest) -> (*domain.Organization, *domain.AppError)`     | Creates org, adds creator as admin member                     |
| `List`         | `(ctx, userID) -> ([]domain.Organization, *domain.AppError)`                             | Returns orgs owned + orgs where user is member (deduplicated) |
| `Get`          | `(ctx, userID, orgID) -> (*domain.Organization, *domain.AppError)`                       | Returns org if user has access                                |
| `InviteMember` | `(ctx, userID, orgID, domain.InviteMemberRequest) -> (*domain.Invite, *domain.AppError)` | Creates 7-day invite token (requires owner/admin)             |
| `AcceptInvite` | `(ctx, userID, token) -> (*domain.Organization, *domain.AppError)`                       | Validates invite, verifies email match, adds member           |
| `RemoveMember` | `(ctx, userID, orgID, targetUserID) -> *domain.AppError`                                 | Removes member (prevents removing owner)                      |
| `ListMembers`  | `(ctx, userID, orgID) -> ([]domain.OrgMember, *domain.AppError)`                         | Lists org members if user has access                          |

---

### ConversationService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/conversation.go`
**Package**: `service`
**Purpose**: Manages conversation threads with messages for the chat UI. Default model is `openai/gpt-4o`.

**Dependencies**: `repository.ConversationRepo`

**Handlers that use it**: `ListConversations`, `CreateConversation`, `GetConversation`, `DeleteConversation`, `AddMessage`, `UpdateConversationTitle`

| Method               | Signature                                                                                                        | Description                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `CreateConversation` | `(ctx, userID, title, model) -> (*repository.Conversation, *domain.AppError)`                                    | Creates new conversation thread                   |
| `ListConversations`  | `(ctx, userID, page, limit) -> ([]repository.Conversation, *domain.AppError)`                                    | Paginated list of conversations                   |
| `GetConversation`    | `(ctx, userID, id) -> (*repository.Conversation, []repository.ConversationMessage, *domain.AppError)`            | Gets conversation with messages (ownership check) |
| `DeleteConversation` | `(ctx, userID, id) -> *domain.AppError`                                                                          | Deletes conversation                              |
| `AddMessage`         | `(ctx, convID, role, content, inputTokens, outputTokens) -> (*repository.ConversationMessage, *domain.AppError)` | Adds message to conversation                      |
| `UpdateTitle`        | `(ctx, userID, id, title) -> *domain.AppError`                                                                   | Updates conversation title                        |

---

### PromptService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/prompt.go`
**Package**: `service`
**Purpose**: Manages versioned prompt templates with variable interpolation (mustache-style `{{var}}`).

**Dependencies**: `repository.PromptRepo`

**Handlers that use it**: `ListPrompts`, `CreatePrompt`, `GetPrompt`, `RenderPrompt`, `DeletePrompt`

| Method         | Signature                                                                           | Description                                          |
| -------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `CreatePrompt` | `(ctx, name, template, model, config) -> (*repository.Prompt, *domain.AppError)`    | Creates new prompt template version                  |
| `ListPrompts`  | `(ctx, page, limit) -> ([]repository.Prompt, *domain.AppError)`                     | Paginated list of prompt templates                   |
| `GetPrompt`    | `(ctx, name) -> (*repository.Prompt, *domain.AppError)`                             | Gets latest version of named prompt                  |
| `RenderPrompt` | `(ctx, name, variables) -> (*repository.Prompt, rendered string, *domain.AppError)` | Fetches template and replaces `{{var}}` placeholders |
| `DeletePrompt` | `(ctx, name) -> *domain.AppError`                                                   | Removes all versions of a prompt                     |

---

### BatchService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/batch.go`
**Package**: `service`
**Purpose**: Enables batch chat processing -- submits multiple chat requests, processes them concurrently (4 workers), and tracks results with progress updates. Max 100 items per batch.

**Dependencies**: `repository.BatchJobRepo`, `chatFn` (closure from handler's `ChatFnForBatch`)

**Handlers that use it**: `BatchChat`, `GetBatchJob`, `ListBatchJobs`, `CancelBatchJob`

| Method   | Signature                                                          | Description                                          |
| -------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `Submit` | `(ctx, userID, items) -> (*repository.BatchJob, *domain.AppError)` | Creates pending batch job, launches async processing |
| `Get`    | `(ctx, userID, id) -> (*repository.BatchJob, *domain.AppError)`    | Gets batch job by ID with ownership check            |
| `List`   | `(ctx, userID) -> ([]repository.BatchJob, *domain.AppError)`       | Lists user's batch jobs                              |
| `Cancel` | `(ctx, userID, id) -> *domain.AppError`                            | Cancels pending/running batch job                    |

**Statuses**: `pending`, `running`, `completed`, `failed`, `partial`, `cancelled`

---

### StripeService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/stripe.go`
**Package**: `service`
**Purpose**: Integrates Stripe for credit purchases via Checkout Sessions. Creates Stripe customers on demand, verifies webhook signatures, and fulfills purchases.

**Dependencies**: `repository.StripeRepo`, `repository.UserRepo`, `repository.CreditsRepo`, `repository.TransactionRepo`

**Handlers that use it**: `PurchaseCredits`, `StripeWebhook`

| Method                  | Signature                                                                                | Description                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| `IsConfigured`          | `() -> bool`                                                                             | Returns true if `secretKey` is set           |
| `CreateCheckoutSession` | `(ctx, userID, amount, successURL, cancelURL) -> (checkoutURL string, *domain.AppError)` | Creates Stripe Checkout Session, returns URL |
| `VerifyWebhook`         | `(payload []byte, sigHeader) -> (stripe.Event, error)`                                   | Verifies webhook signature                   |
| `FulfillCheckout`       | `(ctx, session) -> *domain.AppError`                                                     | Adds credits, records invoice (idempotent)   |

---

### AdminService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/admin.go`
**Package**: `service`
**Purpose**: Comprehensive admin backend. Manages users, providers, models, billing, settings, feature flags, security, audit, announcements, promo codes, groups, changelogs, admin users, SSO, cost analytics, and cache operations. Supports **hot-registration** of providers into the LLM runtime at startup and on CRUD operations.

**Dependencies**: 8 admin repos (`AdminUserRepo`, `AdminProviderRepo`, `AdminModelRepo`, `AdminBillingRepo`, `AdminSettingsRepo`, `AdminAuditRepo`, `AdminSecurityRepo`, `AdminFeaturesRepo`), `AuditService`, `*llmprovider.Registry`, `cache.Cache`, `*watcher.Watcher`

**Handlers that use it**: All admin handlers (`api/admin/*`)

| Method Category         | Key Methods                                                                                                                                                                                                                                                    | Description                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **User Management**     | `ListUsers`, `GetUser`, `UpdateUserStatus`, `UpdateUserRole`, `DeleteUser`, `StartImpersonation`, `EndImpersonation`                                                                                                                                           | CRUD for users including soft-delete, impersonation     |
| **Provider Management** | `ListProviders`, `GetProvider`, `CreateProvider`, `CreateProviderFull`, `UpdateProvider`, `ToggleProviderStatus`, `DeleteProvider`, `ListProviderKeys`, `AddProviderKey`, `AddProviderKeyRaw`, `DeleteProviderKey`, `ReorderProviderKeys`, `GetProviderHealth` | Full lifecycle with hot-registration to LLM runtime     |
| **Model Management**    | `ListModels`, `GetModel`, `CreateModel`, `UpdateModel`, `UpdateModelStatus`, `DeleteModel`                                                                                                                                                                     | Model registry CRUD with dynamic provider model refresh |
| **Model Aliases**       | `ListAliases`, `CreateAlias`, `UpdateAlias`, `DeleteAlias`                                                                                                                                                                                                     | Forward/alias management                                |
| **Billing**             | `AdjustCredits`, `ListAdjustments`, `RevenueSummary`, `ListUsageRecords`, `UsageDaily`                                                                                                                                                                         | Manual adjustments, revenue/usage queries               |
| **Settings**            | `ListSettings`, `GetSetting`, `UpdateSetting`                                                                                                                                                                                                                  | Key-value system settings                               |
| **Feature Flags**       | `ListFeatureFlags`, `CreateFeatureFlag`, `ToggleFeatureFlag`                                                                                                                                                                                                   | Boolean feature toggles                                 |
| **Audit**               | `ListAuditLogs`                                                                                                                                                                                                                                                | Filters audit log entries                               |
| **Security**            | `ListSuspicious`, `ReviewSuspicious`, `AddIPEntry`, `ListIPEntries`, `RemoveIPEntry`, `ListIPAccessLogs`                                                                                                                                                       | Suspicious activity management, IP allow/block lists    |
| **Announcements**       | `ListAnnouncements`, `CreateAnnouncement`                                                                                                                                                                                                                      | Platform announcements                                  |
| **Promo Codes**         | `ListPromoCodes`, `CreatePromoCode`, `GetPromoRedemptions`, `RedeemPromoCode`                                                                                                                                                                                  | Promo code lifecycle                                    |
| **Groups**              | `ListGroups`, `CreateGroup`                                                                                                                                                                                                                                    | User groups                                             |
| **Reports**             | `ListScheduledReports`, `CreateScheduledReport`                                                                                                                                                                                                                | Scheduled report configs                                |
| **Changelog**           | `ListChangelog`, `CreateChangelog`, `PublishChangelog`                                                                                                                                                                                                         | Version changelog entries                               |
| **Admin Users**         | `ListSSOConfigs`                                                                                                                                                                                                                                               | SSO configuration listing                               |

**Key internal methods**: `registerProviderRuntime`, `registerProviderWithKey`, `refreshProviderModels`, `LoadProvidersFromDB` (called at startup)

---

### FineTuningService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/fine_tuning.go`
**Package**: `service`
**Purpose**: Manages fine-tuning jobs and datasets.

**Dependencies**: `repository.FineTuningRepo`

**Handlers that use it**: `ListFineTuningJobs`, `CreateFineTuningJob`, `GetFineTuningJob`, `ListFineTuningDatasets`, `CreateFineTuningDataset`, `DeleteFineTuningDataset`

| Method          | Signature                                                                                       | Description                             |
| --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| `CreateJob`     | `(ctx, userID, domain.CreateFineTuningJobRequest) -> (*domain.FineTuningJob, *domain.AppError)` | Creates job linked to a dataset         |
| `GetJob`        | `(ctx, userID, id) -> (*domain.FineTuningJob, *domain.AppError)`                                | Gets job by ID                          |
| `ListJobs`      | `(ctx, userID, page, limit) -> ([]domain.FineTuningJob, *domain.AppError)`                      | Paginated job list                      |
| `CreateDataset` | `(ctx, userID, filename, format) -> (*domain.FineTuningDataset, *domain.AppError)`              | Creates dataset record with storage key |
| `ListDatasets`  | `(ctx, userID) -> ([]domain.FineTuningDataset, *domain.AppError)`                               | Lists user's datasets                   |
| `DeleteDataset` | `(ctx, userID, id) -> *domain.AppError`                                                         | Deletes dataset with ownership check    |

---

### BudgetService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/budget.go`
**Package**: `service`
**Purpose**: Manages user-defined budget alerts and spending caps.

**Dependencies**: `repository.BudgetRepo`

**Handlers that use it**: `ListBudgetAlerts`, `CreateBudgetAlert`, `DeleteBudgetAlert`, `GetBudgetCap`, `CreateBudgetCap`, `UpdateBudgetCap`, `DeleteBudgetCap`

| Method             | Signature                                                                                   | Description                     |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------- |
| `CreateAlert`      | `(ctx, userID, domain.CreateBudgetAlertRequest) -> (*domain.BudgetAlert, *domain.AppError)` | Creates budget alert threshold  |
| `GetUserAlerts`    | `(ctx, userID) -> ([]domain.BudgetAlert, *domain.AppError)`                                 | Lists user's budget alerts      |
| `DeleteAlert`      | `(ctx, userID, id) -> *domain.AppError`                                                     | Deletes alert                   |
| `CreateCap`        | `(ctx, userID, domain.CreateBudgetCapRequest) -> (*domain.BudgetCap, *domain.AppError)`     | Creates hard spending cap       |
| `GetUserCap`       | `(ctx, userID) -> (*domain.BudgetCap, *domain.AppError)`                                    | Gets current cap                |
| `UpdateCap`        | `(ctx, userID, domain.CreateBudgetCapRequest) -> *domain.AppError`                          | Updates cap values              |
| `DeleteCap`        | `(ctx, userID) -> *domain.AppError`                                                         | Removes cap                     |
| `CheckCapExceeded` | `(ctx, userID, cost) -> (exceeded bool, action string, *domain.AppError)`                   | Checks if cost would exceed cap |

---

### ComparisonService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/comparison.go`
**Package**: `service`
**Purpose**: Manages A/B comparison records for side-by-side model output evaluation.

**Dependencies**: `repository.ComparisonRepo`

**Handlers that use it**: `ListComparisons`, `CreateComparison`, `GetComparison`, `DeleteComparison`

| Method       | Signature                                                                                     | Description                       |
| ------------ | --------------------------------------------------------------------------------------------- | --------------------------------- |
| `Create`     | `(ctx, userID, domain.CreateABComparisonRequest) -> (*domain.ABComparison, *domain.AppError)` | Creates comparison record         |
| `GetByID`    | `(ctx, userID, id) -> (*domain.ABComparison, *domain.AppError)`                               | Gets comparison (ownership check) |
| `ListByUser` | `(ctx, userID, page, limit) -> ([]domain.ABComparison, *domain.AppError)`                     | Paginated list (ownership filter) |
| `Delete`     | `(ctx, userID, id) -> *domain.AppError`                                                       | Deletes comparison                |

---

### ExportService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/export.go`
**Package**: `service`
**Purpose**: Creates and processes data export jobs (logs, audit logs) to CSV files on the filesystem.

**Dependencies**: `repository.ExportRepo`, `repository.LogRepo`

**Handlers that use it**: `ListExportJobs`, `CreateExportJob`, `GetExportJob`, `DownloadExportJob`

| Method       | Signature                                                                               | Description                                            |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `CreateJob`  | `(ctx, userID, domain.CreateExportJobRequest) -> (*domain.ExportJob, *domain.AppError)` | Creates export job record                              |
| `GetJob`     | `(ctx, userID, id) -> (*domain.ExportJob, *domain.AppError)`                            | Gets job with ownership check                          |
| `ListJobs`   | `(ctx, userID, page, limit) -> ([]domain.ExportJob, *domain.AppError)`                  | Paginated job list                                     |
| `ProcessJob` | `(ctx, job, exportDir) -> *domain.AppError`                                             | Generates CSV file (logs or audit), updates job status |

---

### FileService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/file.go`
**Package**: `service`
**Purpose**: Manages file upload metadata (persists file records after upload processing).

**Dependencies**: `repository.FileRepo`

**Handlers that use it**: `UploadFiles`, `ListFiles`

| Method       | Signature                                                                                           | Description                       |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------------------- |
| `CreateFile` | `(ctx, userID, filename, mimeType, storageKey, size) -> (*repository.FileRecord, *domain.AppError)` | Persists file metadata            |
| `ListFiles`  | `(ctx, userID, page, limit) -> ([]repository.FileRecord, total, *domain.AppError)`                  | Paginated file list               |
| `GetFile`    | `(ctx, userID, id) -> (*repository.FileRecord, *domain.AppError)`                                   | Gets file by ID (ownership check) |
| `DeleteFile` | `(ctx, userID, id) -> *domain.AppError`                                                             | Deletes file record               |

---

### RateLimitService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/rate_limit.go`
**Package**: `service`
**Purpose**: Manages rate limit tiers and per-user tier assignments.

**Dependencies**: `repository.RateLimitRepo`

**Handlers that use it**: Admin rate limit handlers and tier management

| Method             | Signature                                                         | Description                                        |
| ------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| `GetUserTier`      | `(ctx, userID) -> (string, *domain.AppError)`                     | Returns user's tier (default `"free"`)             |
| `GetTierLimits`    | `(ctx, tier) -> (*domain.RateLimit, *domain.AppError)`            | Returns RPM, daily, monthly, max_tokens for a tier |
| `SetUserTier`      | `(ctx, userID, tier) -> *domain.AppError`                         | Assigns user to a tier                             |
| `ListTiers`        | `(ctx) -> ([]domain.RateLimit, *domain.AppError)`                 | Lists all configured tiers                         |
| `UpdateTierLimits` | `(ctx, tier, rpm, daily, monthly, maxTokens) -> *domain.AppError` | Updates tier limits                                |

---

### RBACService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/rbac.go`
**Package**: `service`
**Purpose**: Role-based access control -- permission checking, role management, and user-role assignment.

**Dependencies**: `repository.RBACRepo`

**Handlers that use it**: Admin RBAC handlers (`/api/admin/rbac/*`), `MyPermissions`

| Method                 | Signature                                                     | Description                        |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `GetUserPermissions`   | `(ctx, userID) -> ([]domain.Permission, *domain.AppError)`    | Returns all permissions for a user |
| `HasPermission`        | `(ctx, userID, resource, action) -> (bool, *domain.AppError)` | Checks specific permission         |
| `ListRoles`            | `(ctx) -> ([]string, *domain.AppError)`                       | Lists all roles                    |
| `GetRolePermissions`   | `(ctx, role) -> ([]domain.Permission, *domain.AppError)`      | Returns permissions for a role     |
| `AddRolePermission`    | `(ctx, role, permissionName) -> *domain.AppError`             | Adds permission to a role          |
| `RemoveRolePermission` | `(ctx, role, permissionName) -> *domain.AppError`             | Removes permission from a role     |
| `UpdateUserRole`       | `(ctx, userID, role) -> *domain.AppError`                     | Updates a user's role              |
| `ListPermissions`      | `(ctx) -> ([]domain.Permission, *domain.AppError)`            | Lists all available permissions    |

---

### AuditService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/audit.go`
**Package**: `service`
**Purpose**: Buffered, asynchronous audit logging for admin actions. Entries are batched (up to 100 or flushed every 5 seconds) and written to the database in the background.

**Dependencies**: `repository.AdminAuditRepo`

**Used by**: `AdminService` (embedded), admin CRUD operations

| Method     | Signature                                                  | Description                                               |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `Log`      | `(ctx, domain.AuditAction, targetType, targetID, changes)` | Enqueues audit entry (non-blocking, drops if buffer full) |
| `Shutdown` | `()`                                                       | Flushes remaining entries and stops worker                |

**Buffer size**: 1000 entries (configurable in constructor)

---

### SandboxService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/sandbox.go`
**Package**: `service`
**Purpose**: Thin wrapper around `ProviderService` for sandbox mode (`X-Sandbox: true` header), which bypasses quota/cost/logging.

**Dependencies**: `ProviderService`, `CreditService`

**Handlers that use it**: OpenAI proxy handlers (sandbox path)

| Method            | Signature                                                                         | Description                                  |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| `Chat`            | `(ctx, domain.ChatRequest, userID) -> (*llm.ChatResponse, *domain.AppError)`      | Delegates to ProviderService without billing |
| `ChatStream`      | `(ctx, domain.ChatRequest, userID) -> (<-chan llm.StreamChunk, *domain.AppError)` | Delegates streaming to ProviderService       |
| `ValidateRequest` | `(domain.ChatRequest) -> *domain.AppError`                                        | Validates model, messages, roles             |
| `EstimateTokens`  | `(model, messages) -> (inputTokens, outputTokens int)`                            | Delegates to ProviderService                 |
| `ListModels`      | `(ctx) -> ([]llm.ModelInfo, *domain.AppError)`                                    | Delegates to ProviderService                 |

**Utility functions**: `IsSandboxRequest(ctx)`, `WithSandbox(ctx)`, `StripSandboxHeader(headers)`

---

### TokenBlacklistService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/token_blacklist.go`
**Package**: `service`
**Purpose**: Simple wrapper for JWT token blacklist checking, used by middleware for logout/invalidation.

**Dependencies**: `repository.TokenBlacklistRepo`

**Handlers that use it**: Middleware (`TokenBlacklist`)

| Method          | Signature                  | Description                         |
| --------------- | -------------------------- | ----------------------------------- |
| `IsBlacklisted` | `(token) -> (bool, error)` | Checks if token is on the blacklist |

---

### ProviderPluginService

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/provider_plugin.go`
**Package**: `service`
**Purpose**: Manages dynamic provider plugin configuration records.

**Dependencies**: `repository.ProviderPluginRepo`

**Handlers that use it**: `ListProviderPlugins`, `CreateProviderPlugin`, `GetProviderPlugin`, `ToggleProviderPlugin`, `DeleteProviderPlugin`

| Method    | Signature                                                                                         | Description             |
| --------- | ------------------------------------------------------------------------------------------------- | ----------------------- |
| `Create`  | `(ctx, userID, domain.CreateProviderPluginRequest) -> (*domain.ProviderPlugin, *domain.AppError)` | Creates plugin record   |
| `List`    | `(ctx) -> ([]domain.ProviderPlugin, *domain.AppError)`                                            | Lists all plugins       |
| `GetByID` | `(ctx, id) -> (*domain.ProviderPlugin, *domain.AppError)`                                         | Gets plugin by ID       |
| `Toggle`  | `(ctx, id, active) -> *domain.AppError`                                                           | Enables/disables plugin |
| `Delete`  | `(ctx, id) -> *domain.AppError`                                                                   | Deletes plugin          |

---

### ModelRouter (service-level router)

**File**: `/teamspace/studios/this_studio/shinway/apps/backend/internal/service/router.go`
**Package**: `service`
**Purpose**: Rule-based and strategy-based model routing. Routes chat requests to the best provider based on configurable strategy (cost, latency, reliability, capability, random). Supports custom rules with conditions.

**Dependencies**: `*llmprovider.Registry`

**Note**: This is distinct from `pkg/llm/router` which provides the `Router`/`BudgetRouter`/`ABRouter` used at the handler level.

| Method             | Signature                                          | Description                                      |
| ------------------ | -------------------------------------------------- | ------------------------------------------------ |
| `Route`            | `(ctx, *llm.ChatRequest) -> (llm.Provider, error)` | Applies rules, then strategy-based routing       |
| `AddRule`          | `(RouterRule)`                                     | Adds a routing rule                              |
| `RemoveRule`       | `(id)`                                             | Removes a rule                                   |
| `SetStrategy`      | `(RouterStrategy)`                                 | Changes routing strategy                         |
| `RegisterProvider` | `(p llm.Provider)`                                 | Registers provider for latency/error tracking    |
| `RecordLatency`    | `(provider, time.Duration)`                        | Records latency sample                           |
| `RecordResult`     | `(provider, success bool)`                         | Records success/failure for reliability tracking |

**Strategies**: `cost` (default), `latency`, `reliability`, `capability`, `random`

---

## Dependencies Summary

| Service               | Repositories                                       | Other Services                                                   | External                                           |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| UserService           | UserRepo                                           | --                                                               | JWT (token package)                                |
| APIKeyService         | APIKeyRepo                                         | --                                                               | --                                                 |
| CreditService         | CreditsRepo, TransactionRepo, LogRepo              | UserRepo (set), EmailSender                                      | database.DB                                        |
| AnalyticsService      | LogRepo, UserRepo, CreditsRepo, APIKeyRepo         | --                                                               | --                                                 |
| LogService            | LogRepo                                            | --                                                               | --                                                 |
| ProviderService       | --                                                 | --                                                               | llmprovider.Registry, cache.Cache, watcher.Watcher |
| WebhookService        | WebhookRepo                                        | --                                                               | webhook.Dispatcher                                 |
| OrganizationService   | OrganizationRepo                                   | UserRepo                                                         | --                                                 |
| ConversationService   | ConversationRepo                                   | --                                                               | --                                                 |
| PromptService         | PromptRepo                                         | --                                                               | --                                                 |
| BatchService          | BatchJobRepo                                       | chatFn (from handler)                                            | --                                                 |
| StripeService         | StripeRepo, UserRepo, CreditsRepo, TransactionRepo | --                                                               | Stripe SDK                                         |
| AdminService          | 8 admin repos                                      | AuditService, llmprovider.Registry, cache.Cache, watcher.Watcher | --                                                 |
| FineTuningService     | FineTuningRepo                                     | --                                                               | --                                                 |
| BudgetService         | BudgetRepo                                         | --                                                               | --                                                 |
| ComparisonService     | ComparisonRepo                                     | --                                                               | --                                                 |
| ExportService         | ExportRepo, LogRepo                                | --                                                               | OS filesystem                                      |
| FileService           | FileRepo                                           | --                                                               | --                                                 |
| RateLimitService      | RateLimitRepo                                      | --                                                               | --                                                 |
| RBACService           | RBACRepo                                           | --                                                               | --                                                 |
| AuditService          | AdminAuditRepo                                     | --                                                               | --                                                 |
| SandboxService        | --                                                 | ProviderService, CreditService                                   | --                                                 |
| TokenBlacklistService | TokenBlacklistRepo                                 | --                                                               | --                                                 |
| ProviderPluginService | ProviderPluginRepo                                 | --                                                               | --                                                 |
| ModelRouter           | --                                                 | llmprovider.Registry                                             | --                                                 |

---

## Error Handling Convention

All service methods return `*domain.AppError` which includes:

- `Code`: Error code constant (string)
- `Status`: HTTP status code (int)
- `Message`: User-facing message (string)
- `Err`: Wrapped original error (optional)

Common error codes:

- `ErrInternal` (500)
- `ErrBadRequest` (400)
- `ErrUnauthorized` (401)
- `ErrForbidden` (403)
- `ErrNotFound` (404)
- `ErrNoCredits` (402)
- `ErrEmailExists` (409)
- `ErrServiceUnavailable` (503)

---

## Handler to Service Mapping

The `Handler` struct (`internal/handler/handler.go`) holds all service references and exposes HTTP handler methods. Services are set either at construction (`New()`) or via setter methods:

```go
// Constructed in New():
userSvc, keySvc, creditSvc, analyticsSvc, logSvc, providerSvc,
webhookSvc, orgSvc, conversationSvc, promptSvc, fileSvc, rbacSvc,
rateLimitSvc, budgetSvc, comparisonSvc, exportSvc, tokenBlacklistRepo

// Set via setters after construction:
modelRouter, budgetRouter, batchSvc, fineTuningSvc,
abRouter, llmCache, adminSvc, adminSessionRepo, emailSender, stripeSvc
```
