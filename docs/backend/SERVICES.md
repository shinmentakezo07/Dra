# Backend Services

This document details all business logic services in `internal/service/`.

---

## UserService

**File**: `internal/service/user.go`

Handles all user-related operations.

| Method | Description |
|--------|-------------|
| `Register(ctx, req)` | Creates user with bcrypt-hashed password, initializes credit balance, returns AuthResponse |
| `Authenticate(ctx, req)` | Validates email/password, returns AuthResponse with JWT |
| `OAuthLogin(ctx, email, name, provider)` | Creates or finds user by email for OAuth providers |
| `GetByID(ctx, id)` | Returns user by ID |
| `UpdateProfile(ctx, id, name, email)` | Updates name and email |
| `ChangePassword(ctx, id, current, new)` | Validates current password, updates to new |
| `RequestPasswordReset(ctx, email)` | Generates reset token, returns it (sending email is handled by handler) |
| `ResetPassword(ctx, token, newPassword)` | Validates token, updates password |

**Dependencies**: UserRepo

---

## APIKeyService

**File**: `internal/service/apikey.go`

Manages the API key lifecycle.

| Method | Description |
|--------|-------------|
| `Create(ctx, userID, req)` | Generates new key (`dra_<32 bytes hex>`), stores with name |
| `List(ctx, userID)` | Lists all keys for user (masks key values) |
| `Delete(ctx, userID, keyID)` | Soft-deletes an API key |
| `Revoke(ctx, userID, keyID)` | Revokes key by setting `revoked_at` |

**Dependencies**: APIKeyRepo (uses pepper from AuthSecret for hashing)

---

## CreditService

**File**: `internal/service/credits.go`

Manages user credits and billing.

| Method | Description |
|--------|-------------|
| `GetBalance(ctx, userID)` | Returns UserCredits (balance, totals, budgets) |
| `Purchase(ctx, userID, req)` | Direct credit purchase (non-Stripe path) |
| `CheckBalance(ctx, userID, estimatedCost)` | Verifies sufficient balance |
| `LogAndDeduct(ctx, userID, apiKeyID, model, inputTokens, outputTokens, cost, latency)` | Creates API log and deducts credits atomically |
| `SetBudget(ctx, userID, daily, monthly)` | Sets spending limits |
| `ListTransactions(ctx, userID, page, limit)` | Paginated transaction history |

**Dependencies**: CreditsRepo, TransactionRepo, LogRepo, UserRepo, EmailSender

---

## AnalyticsService

**File**: `internal/service/analytics.go`

Generates usage analytics.

| Method | Description |
|--------|-------------|
| `UserAnalytics(ctx, userID)` | Returns summary (total/success/error requests), recent logs, model breakdown, daily usage |
| `PlatformStats(ctx)` | Returns total users, keys, logs, credits stats |

**Dependencies**: LogRepo, UserRepo, CreditsRepo, KeyRepo

---

## LogService

**File**: `internal/service/log.go`

| Method | Description |
|--------|-------------|
| `ListLogs(ctx, userID, page, limit)` | Paginated request log entries |

**Dependencies**: LogRepo

---

## ProviderService

**File**: `internal/service/provider.go`

Manages LLM providers and handles chat requests.

| Method | Description |
|--------|-------------|
| `ListModels(ctx)` | Returns models from all configured providers |
| `Chat(ctx, req)` | Non-streaming chat via a single provider |
| `ChatStream(ctx, req)` | Streaming chat, returns `<-chan StreamChunk` |
| `DefaultModel()` | Returns default model name |
| `EstimateTokens(model, messages)` | Rough token estimation |
| `ProviderHealthStatuses()` | Health check results for all providers |
| `ListProviderNames(ctx)` | Lists registered provider names |

**Dependencies**: LLM Registry, Cache, Watcher

---

## WebhookService

**File**: `internal/service/webhook.go`

Manages webhook configuration and event dispatch.

| Method | Description |
|--------|-------------|
| `ListWebhooks(ctx, userID)` | List user's webhooks |
| `CreateWebhook(ctx, userID, req)` | Create webhook |
| `UpdateWebhook(ctx, userID, webhookID, req)` | Update webhook |
| `DeleteWebhook(ctx, userID, webhookID)` | Delete webhook |
| `Dispatch(ctx, userID, event)` | Dispatch event to matching webhooks |

**Dependencies**: WebhookRepo

---

## BatchService

**File**: `internal/service/batch.go`

| Method | Description |
|--------|-------------|
| `SubmitBatch(ctx, userID, requests)` | Creates batch job |
| `GetBatchJob(ctx, userID, jobID)` | Returns job status |

**Dependencies**: BatchRepo, chat function from handler

---

## OrganizationService

**File**: `internal/service/organization.go`

| Method | Description |
|--------|-------------|
| `CreateOrg(ctx, ownerID, req)` | Create organization |
| `ListOrgs(ctx, userID)` | List user's organizations |
| `GetOrg(ctx, orgID)` | Get organization details |
| `InviteMember(ctx, orgID, req)` | Invite user by email |
| `RemoveMember(ctx, orgID, userID)` | Remove member |
| `ListMembers(ctx, orgID)` | List organization members |
| `AcceptInvite(ctx, token)` | Accept invitation |

**Dependencies**: OrganizationRepo, UserRepo

---

## AdminService

**File**: `internal/service/admin.go`

Full admin operations covering all management areas.

| Area | Operations |
|------|------------|
| Users | List, get details, update status/role, delete, impersonate, bulk suspend, list keys/usage |
| Providers | List, create, update, toggle status, manage keys |
| Models | List, create, toggle status, manage aliases |
| Billing | Revenue summary, transactions, adjust credits, daily usage |
| Settings | List and update platform settings |
| Feature Flags | List, create, toggle |
| Security | List/review suspicious activity, manage IP allow/block |
| Audit | View audit logs |
| Announcements | Create and list |
| Promo Codes | Create (with random code), toggle, list redemptions |
| Groups | List and create |
| Reports | List scheduled reports |
| Changelog | List, create, publish |
| Admins | List, create, remove |
| SSO | List configurations |
| Cost | Cost optimizations, forecast, breakdown |
| Operations | Cache stats, cache clear, webhook logs, retry |

**Dependencies**: Multiple admin repositories, AuditService

---

## StripeService

**File**: `internal/service/stripe.go`

| Method | Description |
|--------|-------------|
| `CreateCheckoutSession(ctx, userID, amount, successURL, cancelURL)` | Creates Stripe checkout session |
| `HandleWebhook(ctx, payload, signature)` | Verifies and processes Stripe webhook events |
| `IsConfigured()` | Returns true if Stripe keys are configured |

**Dependencies**: StripeRepo, UserRepo, CreditsRepo, TransactionRepo

---

## Supporting Services

| Service | File | Purpose |
|---------|------|---------|
| AuditService | `service/audit.go` | Admin audit trail with configurable retention |
| SandboxService | `service/sandbox.go` | Sandbox mode (X-Sandbox header) to skip quota/cost/logging |
| ExperimentService | `service/experiment.go` | A/B experiments routing between providers |
