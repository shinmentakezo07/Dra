# Frontend Pages Reference

> Comprehensive documentation of all frontend pages in the DRA Platform (Yapapa).
> Generated from source code analysis.

---

## Table of Contents

1. [Route Structure Overview](#route-structure-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Public Pages](#public-pages)
4. [Dashboard Pages](#dashboard-pages)
5. [Admin Pages](#admin-pages)
6. [Shared Components & Layouts](#shared-components--layouts)

---

## Route Structure Overview

```
app/
  page.tsx                              # Landing page
  playground/page.tsx                   # Multi-model chat playground
  gateway/page.tsx                      # Gateway overview dashboard
  pricing/page.tsx                      # Pricing plans + calculator
  models/page.tsx                       # Model explorer
  models/[id]/page.tsx                  # Model detail
  docs/layout.tsx                       # Docs layout (sidebar + navbar)
  docs/page.tsx                         # Docs index
  docs/[...slug]/page.tsx               # Dynamic doc pages
  login/page.tsx                        # User login
  signup/page.tsx                       # User signup
  forgot-password/page.tsx              # Password reset
  dashboard/
    layout.tsx                          # Dashboard layout (auth-protected)
    dashboard-layout-client.tsx         # Client layout chassis (sidebar + topbar)
    DashboardOverviewClient.tsx         # Overview content
    loading.tsx                         # Loading skeleton
    error.tsx                           # Error boundary
    page.tsx                            # Overview wrapper
    analytics/page.tsx                  # Analytics + charts
    keys/page.tsx                       # API key management
    logs/page.tsx                       # Request logs
    billing/page.tsx                    # Billing & credits
    chat/page.tsx                       # Chat playground (dashboard)
    settings/page.tsx                   # User settings
    organization/page.tsx               # Organization management
    webhooks/page.tsx                   # Webhook configuration
    inbox/page.tsx                      # User inbox
    notifications/page.tsx              # Real-time notifications
    battle/page.tsx                     # Model battle
    fine-tuning/page.tsx                # Fine-tuning jobs
    provider-health/page.tsx            # Provider health monitoring
    exports/page.tsx                    # Data export jobs
  admin/
    login/page.tsx                      # Admin login
    AdminLayoutClient.tsx               # Admin layout chassis
    AdminSidebar.tsx                    # Admin sidebar navigation
    AdminTopBar.tsx                     # Admin top bar
    AdminPageHeader.tsx                 # Admin page header wrapper
    AdminSearchBar.tsx                  # Admin search bar
    (protected)/
      layout.tsx                        # Admin auth guard
      dashboard/page.tsx                # Admin overview dashboard
      users/page.tsx                    # User management
      providers/page.tsx                # Provider management
      models/page.tsx                   # Model registry + aliases
      billing/page.tsx                  # Billing admin
      cost-intel/page.tsx               # Cost intelligence
      promos/page.tsx                   # Promo codes
      security/page.tsx                 # Security incidents
      audit/page.tsx                    # Audit logs
      ip-lists/page.tsx                 # IP allow/block lists
      logs/page.tsx                     # Transaction logs
      operations/page.tsx               # Operations dashboard
      messages/page.tsx                 # System messages
      announcements/page.tsx            # Announcements
      changelog/page.tsx                # Changelog
      reports/page.tsx                  # Reports
      admins/page.tsx                   # Admin management
      settings/page.tsx                 # System settings
      sso/page.tsx                      # SSO configuration
```

---

## Architecture Patterns

### Server/Client Component Split

Most dashboard and admin pages follow this pattern:

```
page.tsx (Server Component)             # Auth check + metadata export
  └─ wraps Client Component              # All interactive logic
```

Server components check authentication and render a loading shell, delegating all interactive rendering to client components.

### Data Fetching Layers

| Layer             | Location               | Purpose                            |
| ----------------- | ---------------------- | ---------------------------------- |
| SDK (TypeScript)  | `lib/api/sdk.ts`       | Typed API client (~1060 lines)     |
| Admin SDK         | `lib/api/admin-sdk.ts` | Admin-specific endpoints           |
| React Query Hooks | `lib/api/hooks.ts`     | Query/mutation wrappers            |
| Direct `useQuery` | Dashboard pages        | Custom queries outside hooks layer |

### State Management

| Concern      | Approach                                          |
| ------------ | ------------------------------------------------- |
| Server state | `@tanstack/react-query` (via hooks or direct)     |
| Real-time    | SSE streams (`chatStream`, `notificationsStream`) |
| Local UI     | `useState`, `useReducer`                          |
| Form state   | Server actions + `useActionState`                 |

### Auth Requirements

| Route Group                                                 | Auth Required    | Auth Mechanism                             |
| ----------------------------------------------------------- | ---------------- | ------------------------------------------ |
| Public (`/`, `/pricing`, `/models`, `/docs`, `/playground`) | No               | N/A                                        |
| Gateway (`/gateway`)                                        | Yes (redirect)   | NextAuth session check in server component |
| Dashboard (`/dashboard/*`)                                  | Yes              | NextAuth middleware (`proxy.ts`)           |
| Admin (`/admin/*`)                                          | Yes + Admin role | Server component role check + middleware   |

---

## Public Pages

### 1. Landing Page

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| **Path**           | `/`                                  |
| **File**           | `app/page.tsx`                       |
| **Component Type** | Server Component (exported function) |
| **Auth Required**  | No                                   |

**Sections (in order):**

- Hero - headline with gradient text effects, animated tagline
- GatewayFeatures - feature grid highlighting platform capabilities
- IntegrationFlow - 4-step bento layout (Sign Up, Get API Key, Integrate, Scale) with staggered scroll animations
- CTA - call-to-action section with animated entrance
- Footer - site footer with links

**Animation Dependencies:** framer-motion (scroll-triggered reveals, staggered children)
**Styling:** Dark theme, gradient text effects, code block display in hero
**States:** Static presentation -- no loading/error states (no data fetching)

---

### 2. Playground

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| **Path**           | `/playground`                        |
| **File**           | `app/playground/page.tsx`            |
| **Component Type** | Client Component (fully interactive) |
| **Auth Required**  | No (client-side only)                |
| **Dependencies**   | framer-motion, `@/lib/api/sdk`       |

**Structure (~600 lines):**

- Sidebar with chat history list (localStorage-persisted, max 50 chats)
- Main chat area with message bubbles per model
- ModelSelector modal for selecting 1-4 models
- Streaming content display with per-model columns

**Data Fetching:**

- `getSDK().chatStream()` - parallel SSE streaming to selected models
- `getSDK().getModels()` - model list for selector
- localStorage for chat history persistence (no server persistence)

**Key State:**

- `sessions` - chat history from localStorage
- `sharedMessages` - current chat messages
- `streamingContent` - per-model streaming text
- `streamErrors` - per-model error tracking
- `selectedModels` - 1-4 model selections
- `showModelSelector` - modal visibility

**Interactions:**

- New chat, delete chat, rename chat
- Send message to all selected models simultaneously
- Cancel streaming mid-response
- Copy message content
- Regenerate responses

**States:**

- Empty: welcome message with "Select models to get started" prompt
- Loading: "Thinking..." per model card
- Streaming: Real-time content append per model
- Error: Per-model error message (non-blocking to other models)
- Edge Cases: Selected model becomes unavailable (warning toast)

---

### 3. Gateway Dashboard

| Field                   | Value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Path**                | `/gateway`                                                                           |
| **File**                | `app/gateway/page.tsx` (server wrapper) + `components/GatewayDashboard.tsx` (client) |
| **Auth Required**       | Yes (redirects to `/login` if no session)                                            |
| **Component Hierarchy** | `page.tsx` (auth check) > `GatewayDashboard` (all UI)                                |

**GatewayDashboard Component (~400 lines):**

| Section          | Content                                  | Data Source                 |
| ---------------- | ---------------------------------------- | --------------------------- |
| Stats Overview   | Total Requests, Success Rate, Total Cost | `useAnalytics()`            |
| Additional Stats | Avg Latency, Total Tokens, Top Model     | `useAnalytics()`            |
| Model Catalog    | Filterable model grid by category        | `useModels()`               |
| Provider Status  | Provider health sidebar                  | `usePublicProviderHealth()` |
| Quick Actions    | Playground, Analytics, API Keys links    | Static                      |

**Categories Filter:** All / Flagship / Balanced / Budget
**States:** Loading (skeleton), Error (error message), Empty (no models available message)

---

### 4. Pricing Page

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Path**           | `/pricing`                            |
| **File**           | `app/pricing/page.tsx`                |
| **Component Type** | Server Component with metadata export |
| **Auth Required**  | No                                    |

**Child Components:**

- `ModelShowcase` - featured model cards with pricing
- `CostCalculator` - interactive cost estimation tool
- `CreditPackages` - credit bundle options (Starter/Pro/Enterprise)
- `PricingFAQ` - accordion FAQ section
- `PricingCTA` - bottom call-to-action

**States:** Static page -- no loading/error states (no data fetching)

---

### 5. Models Explorer

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| **Path**           | `/models`                                   |
| **File**           | `app/models/page.tsx`                       |
| **Component Type** | Server Component with Suspense boundary     |
| **Auth Required**  | No                                          |
| **Data Source**    | `openrouter-models-2026.json` (static JSON) |

**Structure:**

- `ModelsExplorer` client component rendered inside Suspense fallback
- Model cards in a grid layout with search/filter

**States:**

- Loading: Suspense fallback
- Empty: "No models found" when filter returns no results

---

### 6. Model Detail

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| **Path**           | `/models/[id]`                              |
| **File**           | `app/models/[id]/page.tsx`                  |
| **Component Type** | Dynamic route with `generateStaticParams()` |
| **Auth Required**  | No                                          |
| **Data Source**    | `openrouter-models-2026.json` (static JSON) |
| **Utility**        | `getProviderId()` from `@/lib/model-utils`  |

**Structure:**

- `ModelDetailClient` component with full model information
- Provider info, pricing, capabilities, context window

---

### 7. Documentation

#### Layout

| Field              | Value                 |
| ------------------ | --------------------- |
| **Path**           | `/docs/*`             |
| **File**           | `app/docs/layout.tsx` |
| **Component Type** | Client Component      |
| **Auth Required**  | No                    |

**Layout Structure:**

- ScrollProgress - top-of-page scroll progress indicator
- SearchModal - Cmd+K keyboard shortcut search
- DocsNavbar - top navigation bar
- Desktop sidebar (fixed, 260px width) with:
  - 17 nav items across 4 color-coded sections
  - Active indicator with `layoutId="sidebar-active"` spring animation
  - Sidebar filter/search input
- Mobile sidebar: slide-in overlay with backdrop
- Main content area

**Navigation Sections:**

| Section         | Color   | Items                                                              |
| --------------- | ------- | ------------------------------------------------------------------ |
| Getting Started | Emerald | Overview, Quickstart, Installation, Authentication, Core Concepts  |
| Core Features   | Blue    | Chat Completions, Streaming, API Keys, Models, Rate Limits         |
| Platform        | Amber   | Billing, Organizations, Webhooks, Error Handling, SDKs & Libraries |
| Reference       | Violet  | API Reference, Changelog, Migration Guides, Status Page            |

#### Index Page

| Field             | Value               |
| ----------------- | ------------------- |
| **Path**          | `/docs`             |
| **File**          | `app/docs/page.tsx` |
| **Auth Required** | No                  |

**Structure:**

- Hero section with title and description
- 3-step Quick Start rail
- 4 categorized sections matching layout groups
- Clickable cards linking to each doc section
- Staggered entrance animations

#### Dynamic Pages

| Field             | Value                         |
| ----------------- | ----------------------------- |
| **Path**          | `/docs/[...slug]`             |
| **File**          | `app/docs/[...slug]/page.tsx` |
| **Auth Required** | No                            |
| **Data Source**   | Markdown content files        |

---

## Dashboard Pages

### Layout

| Field     | Value                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| **Path**  | `/dashboard/*`                                                               |
| **Files** | `app/dashboard/layout.tsx` (server) + `dashboard-layout-client.tsx` (client) |
| **Auth**  | NextAuth middleware (`proxy.ts`) + server session check                      |

**Layout Structure (~460 lines):**

| Region           | Content                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Desktop Sidebar  | Hidden on mobile, 56px collapsed / 14rem expanded                                                            |
| Mobile Sidebar   | Spring slide-in overlay with backdrop                                                                        |
| Nav Groups       | "Navigate" (Overview, Logs, API Keys, Analytics) and "Account" (Inbox, Notifications, Billing, Organization) |
| Admin Link       | Injected conditionally if `isAdmin=true`                                                                     |
| User Profile     | Avatar/initials, settings link, sign-out button                                                              |
| Active Indicator | `layoutId="nav-indicator"` spring animation                                                                  |
| Mobile Header    | Hamburger menu toggle                                                                                        |

**States:**

- Loading: `app/dashboard/loading.tsx` - animated pulse skeleton (header, stats grid, sections)
- Error: `app/dashboard/error.tsx` - "Something went wrong" with "Try again" button (fires `reset()`)
- Edge Cases: Mobile responsive breakpoints, auth session missing (redirect)

---

### 1. Overview

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **Path**         | `/dashboard`                                                 |
| **Files**        | `page.tsx` (server) + `DashboardOverviewClient.tsx` (client) |
| **Data Sources** | `useAnalytics()`, `useCredits()`, `useKeys()`                |

**Child Components:**

- MetricCards (7 cards): Total Requests, Total Spent, Credits Left, Avg Latency, Success Rate, Requests/min, Active Keys
- AreaChart: Requests per Hour
- LineChart: Latency Trend
- Recent Activity feed: 5 most recent log entries
- Top Models: horizontal bar chart
- Quick Actions: 3 cards linking to keys/logs/analytics

**States:**

- Loading: Full-page spinner
- Error: Red error banner with message
- Empty: Contextual empty states per section with CTA
- Edge Cases: Zero usage (show "no data yet" with getting-started guidance), credits depleted (warning banner)

---

### 2. Analytics

| Field           | Value                                                |
| --------------- | ---------------------------------------------------- |
| **Path**        | `/dashboard/analytics`                               |
| **Files**       | `page.tsx` (server) + `AnalyticsClient.tsx`          |
| **Data Source** | `getSDK().getAnalytics()` (direct call in useEffect) |
| **Hooks Used**  | `useAnalytics()` from `@/lib/api/hooks`              |

**Components:**

- Time Range Selector: 7d / 30d / 90d
- MetricCards: Total Requests, Total Cost, Avg Latency, Success Rate, Total Tokens
- BarChart: Daily requests + cost (dual-axis)
- PieChart: Usage by model
- AreaChart: Hourly request volume
- LineChart: Latency over time
- Model Performance Breakdown: sortable table

**States:**

- Loading: Skeleton cards
- Error: "Failed to load analytics" with retry
- Empty: "No analytics data in selected range"
- Edge Cases: Switching time range triggers new fetch, single model usage (pie chart handles single slice)

---

### 3. API Keys

| Field            | Value                                           |
| ---------------- | ----------------------------------------------- |
| **Path**         | `/dashboard/keys`                               |
| **Files**        | `page.tsx` (server) + `KeysClient.tsx`          |
| **Data Sources** | `useKeys()`, `useCreateKey()`, `useDeleteKey()` |

**Components:**

- Create Key Modal: name input, generates masked key + raw display
- Key List Table: name, masked key, created date, last used, actions
- Key Visibility Toggle: Eye/EyeOff icon shows/hides masked key
- Copy to Clipboard: click to copy full key
- Delete Confirmation Dialog: "Are you sure?" with key name

**States:**

- Loading: Table skeleton
- Error: Red error banner
- Empty: "No API keys yet" with "Create your first key" CTA
- Key Created: Inline success banner with warning: "Make sure to copy your key now. You won't be able to see it again."
- Edge Cases: Maximum keys reached (disable create), deleted key still in-use (no cascade warning)

---

### 4. Request Logs

| Field            | Value                                                |
| ---------------- | ---------------------------------------------------- |
| **Path**         | `/dashboard/logs`                                    |
| **Files**        | `page.tsx` (server) + `LogsClient.tsx`               |
| **Data Sources** | `useLogs(page, limit)` with pagination (20 per page) |

**Components:**

- Search Bar: keyboard shortcut "/" to focus
- Status Filter: All / Success / Error
- MetricCards: Total Requests, Successful, Errors, Avg Latency
- Log Table: timestamp, model, status, tokens, cost, duration, method
- Pagination Controls: Previous/Next with page indicator
- Log Detail Drawer: slide-in panel on row click with full request/response details
- ModelBreakdown: sidebar component

**States:**

- Loading: Table skeleton rows
- Error: "Failed to load logs"
- Empty: "No matching logs found" (contextual to search/filter)
- Empty (no filter): "No requests yet" with getting-started guidance
- Edge Cases: Search with no results (clear search suggestion), page boundary (disable prev on page 1, disable next on last page)

---

### 5. Billing

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| **Path**        | `/dashboard/billing`                         |
| **Files**       | `page.tsx` (server) + inline `BillingPage()` |
| **Data Source** | Stripe Checkout integration                  |

**Components:**

- Credit Packages: Starter ($10 / 10K credits), Pro ($45 / 50K credits), Enterprise ($160 / 200K credits)
- Stripe Checkout: validates URLs are `stripe.com` before redirect
- Promo Code Section: uppercase input, Enter to submit
- Payment Methods Section: Stripe-managed payment info display

**States:**

- Loading: Package cards skeleton
- Error: "Failed to load checkout" if Stripe URL generation fails
- Empty: N/A (always shows packages)
- Promo Invalid: Red error message
- Promo Applied: Green success message with discount amount
- Edge Cases: Checkout cancellation (return to billing page), promo code case-insensitive normalization

---

### 6. Chat

| Field         | Value                                 |
| ------------- | ------------------------------------- |
| **Path**      | `/dashboard/chat`                     |
| **File**      | `page.tsx`                            |
| **Component** | Renders `ChatPlayground` component    |
| **Features**  | Ambient background with gradient orbs |

Similar to `/playground` but within the dashboard layout and auth context. See [Playground](#2-playground) for detail.

---

### 7. Settings

| Field     | Value                                                           |
| --------- | --------------------------------------------------------------- |
| **Path**  | `/dashboard/settings`                                           |
| **Files** | `page.tsx` (server) + `SettingsForm.tsx` + `BudgetSettings.tsx` |
| **Auth**  | Server component queries DB for user data                       |

**SettingsForm Component:**

- Profile Information: name, email (pre-filled)
- Change Password: current password, new password, confirm password
- Uses `useActionState` with server actions `updateProfile`, `changePassword`

**BudgetSettings Component:**

- Spending Budget: daily limit, monthly limit
- Budget Alerts: threshold percentage, email notification toggle
- Hard Spending Cap: limit amount, action on exceed (block / warn / notify)

**States:**

- Loading: Form skeleton
- Profile Save Success: "Profile updated" green toast
- Password Change Success: "Password changed" green toast
- Password Error: "Current password is incorrect" or validation errors
- Budget Save: Confirmation on save
- Edge Cases: Email already in use, password too short, budget limits lower than current spend

---

### 8. Organization

| Field            | Value                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Path**         | `/dashboard/organization`                                                                                    |
| **File**         | `page.tsx`                                                                                                   |
| **Data Sources** | `useOrganizations()`, `useCreateOrganization()`, `useOrgMembers()`, `useInviteMember()`, `useRemoveMember()` |

**Components:**

- Organization Selector: dropdown with create organization form
- Create Organization Form: name input
- Member List: table with avatars, names, emails, role badges
- Role Badges: owner (gold) / admin (blue) / member (gray)
- Invite Form: email input + invite button
- Remove Member Button: with confirmation (disabled for owner)

**States:**

- Loading: Skeleton list
- Error: "Failed to load organizations"
- Empty (no orgs): "Create your first organization"
- Empty (org with no members): "No members yet" with invite CTA
- Invite Sent: Green success toast
- Remove Complete: Member removed from list
- Edge Cases: Cannot remove self as last owner, cannot change own role from owner, duplicate invite email (error message)

---

### 9. Webhooks

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Path**         | `/dashboard/webhooks`                            |
| **File**         | `page.tsx`                                       |
| **Data Sources** | Raw `useQuery` + `useMutation` (not hooks layer) |

**Components:**

- WebhookForm: URL input, signing secret, event selection (10 event types)
- WebhookCard: active/inactive toggle, copy URL, show/hide secret, edit/delete

**Event Types:** 10 event checkboxes (e.g., request.completed, request.failed, credit.depleted, key.created, etc.)

**States:**

- Loading: Spinner
- Error: "Failed to load webhooks"
- Empty: "No webhooks configured" with "Create Webhook" button
- Created: New card appears in list
- Deleted: Card removed with animation
- Edge Cases: Invalid URL format (validation), duplicate URL, secret visibility toggle, toggle webhook while request in-flight

---

### 10. Inbox

| Field            | Value                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Path**         | `/dashboard/inbox`                                                                                                 |
| **File**         | `page.tsx`                                                                                                         |
| **Data Sources** | `getSDK().getUserMessages()`, `getSDK().getUserMessageUnreadCount()`, `markMessageRead()`, `markAllMessagesRead()` |

**Priority System:**

| Priority | Icon          | Color  | Example                                  |
| -------- | ------------- | ------ | ---------------------------------------- |
| Critical | Shield        | Red    | Account suspended, security breach       |
| Warning  | AlertTriangle | Yellow | Quota exceeded, payment failed           |
| Info     | Info          | Blue   | Rate limit changes, feature announcement |
| Low      | Bell          | Gray   | General notifications                    |

**Components:**

- Message List: sorted by date, clickable rows
- Unread Indicator: blue dot on unread messages
- Mark All Read: header button
- Message Expiration: older messages auto-archived

**States:**

- Loading: Message list skeleton
- Error: "Failed to load messages"
- Empty: "No messages yet" with inbox icon illustration
- All Read: No unread indicators visible
- Edge Cases: Message expiration timer, mark-all-read with no unread (disabled state)

---

### 11. Notifications

| Field           | Value                                  |
| --------------- | -------------------------------------- |
| **Path**        | `/dashboard/notifications`             |
| **File**        | `page.tsx`                             |
| **Data Source** | `getSDK().notificationsStream()` (SSE) |

**Real-time Features:**

- SSE-based live notifications
- Browser Notification API support
- Auto-reconnect on disconnect (5s delay)
- Notification types: info, warning, success, error

**Components:**

- Notification List: real-time appended items
- Type-based styling (color, icon per type)
- Mark Read / Mark All Read / Clear All buttons
- Timestamp display

**States:**

- Loading: "Connecting to notification stream..."
- Connected: Live feed active
- Disconnected: "Reconnecting..." with 5s countdown
- Empty: "No notifications yet"
- Error: SSE connection failure with retry button
- Edge Cases: Browser notification permission denied (graceful fallback to in-app only), multiple tabs (duplicate connections handled), connection drop during active notifications (queue on reconnect)

---

### 12. Model Battle

| Field           | Value                                              |
| --------------- | -------------------------------------------------- |
| **Path**        | `/dashboard/battle`                                |
| **File**        | `page.tsx`                                         |
| **Data Source** | Parallel SSE streaming via `getSDK().chatStream()` |
| **Key Utility** | `AbortController` via `abortRef`                   |

**Components:**

- Model Selection: pick 2-4 models from dropdown
- Prompt Input: text area for battle prompt
- Run Battle: triggers parallel streaming
- Results Grid: per-model column showing:
  - Streaming response content
  - Latency display
  - Cost estimate
- 5-Star Rating: per-model rating input
- Winner Banner: trophy icon on highest-rated model
- Cancel Button: aborts all in-flight streams

**States:**

- Loading (running): Streaming content per column, pulsing indicators
- Error: Per-model error (non-blocking), other columns unaffected
- Empty (pre-battle): Model selection + prompt with "Run Battle" CTA
- Complete: All responses rendered, rating enabled, winner declared
- Canceled: Partial results shown with "Battle canceled" label
- Edge Cases: All models fail (show "Battle failed" with retry), single model finishes early (wait for all), rating before all complete (prevented)

---

### 13. Fine-tuning

| Field           | Value                       |
| --------------- | --------------------------- |
| **Path**        | `/dashboard/fine-tuning`    |
| **File**        | `page.tsx`                  |
| **Data Source** | SDK methods for fine-tuning |

**Components:**

- Create Job Form:
  - Base Model Selector
  - Dataset Upload (JSONL file via hidden input)
  - File size display
  - Submit button
- Jobs List: table/job cards with:
  - Status badges: queued (gray), running (blue), completed (green), failed (red)
  - Progress bar for running jobs
  - Copy result model ID
  - Dataset file reference
- Auto-refresh: polls every 15s when any job is running

**States:**

- Loading: Jobs list skeleton
- Error: "Failed to load fine-tuning jobs"
- Empty: "No fine-tuning jobs yet" with "Create your first job" CTA
- Job Running: Progress bar + auto-refresh indicator
- Job Complete: Green badge + "Copy Model ID" button
- Job Failed: Red badge + error details
- Form Validation: File format (JSONL only), file size limit, model selection required
- Edge Cases: Upload timeout, invalid JSONL format, concurrent running jobs (multiple progress bars), rate limit on API

---

### 14. Provider Health

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| **Path**         | `/dashboard/provider-health`                           |
| **File**         | `page.tsx`                                             |
| **Data Sources** | Admin health, circuit breakers, public provider health |

**Data Sources (3 endpoints):**

1. `getSDK().getAdminProviderHealth()` - auto-refresh 30s
2. `getSDK().getCircuitBreakers()` - auto-refresh 30s
3. `getSDK().getPublicProviderHealth()` - auto-refresh 60s

**Components:**

- Summary Cards: Total Providers, Healthy, Unhealthy, Avg Latency
- Provider Health Table: provider name, status (healthy/degraded/down), latency, last check time, circuit state, failure count
- Circuit Breaker States: closed (green) / halfopen (yellow) / open (red) with color coding
- Public Provider Summary: grid of public provider statuses

**States:**

- Loading: All cards/table skeleton
- Error per source: Individual error messages per data source
- Empty: "No providers configured" (unlikely in production)
- Auto-refresh: Visual indicator when refreshing, avoid layout shift
- Edge Cases: One data source fails while others succeed (partial data), circuit breaker transitions mid-view, stale data indicator, provider removed from registry

---

### 15. Exports

| Field           | Value                   |
| --------------- | ----------------------- |
| **Path**        | `/dashboard/exports`    |
| **File**        | `page.tsx`              |
| **Data Source** | SDK methods for exports |

**Components:**

- Create Export Form (toggleable):
  - Export Type: logs / usage / audit
  - Format: CSV / JSON
  - Date Range: 7d / 30d / 90d / custom
- Export Job History: list of past export jobs with:
  - Status badges: processing / completed / failed
  - Download link (when completed)
  - Delete button

**States:**

- Loading: Export history skeleton
- Error: "Failed to load exports"
- Empty: "No exports yet" with "Create Export" CTA
- Form Hidden: "Create Export" button (toggles form open)
- Form Visible: Export configuration inputs + "Start Export" + "Cancel"
- Processing: Spinning indicator, estimated time
- Complete: Download link enabled, green badge
- Failed: Red badge with error details
- Edge Cases: Custom date range validation (end > start), very large export (timeout handling), concurrent exports (queue management), file expiration (download link expired message)

---

## Admin Pages

### Layout

| Field    | Value                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| **Path** | `/admin/*`                                                                        |
| **Auth** | Server component role check: `role === "admin"`, redirects to `/dashboard` if not |

**Admin Layout Files:**

- `AdminLayoutClient.tsx` - layout chassis with sidebar + topbar
- `AdminSidebar.tsx` - 22 nav items across 7 sections
- `AdminTopBar.tsx` - dynamic title from PATH_TITLES map, breadcrumb, search, notifications, user menu
- `AdminPageHeader.tsx` - reusable title/subtitle/action wrapper
- `AdminSearchBar.tsx` - search input component

**Admin Sidebar Sections (7 sections, 22 items):**

| Section    | Items                                       |
| ---------- | ------------------------------------------- |
| Overview   | Dashboard                                   |
| Management | Users, Providers, Models                    |
| Financial  | Billing, Cost Intel, Promos                 |
| Security   | Security, Audit, IP Lists                   |
| Monitoring | Logs, Operations                            |
| Content    | Messages, Announcements, Changelog, Reports |
| Admin      | Admins, Settings, SSO                       |

**Styling:** Ambient glow layers (blue, violet, purple), custom CSS variables (`--admin-bg`, `--admin-surface`, `--admin-text`, `--admin-border`, etc.), collapsible sidebar (72px collapsed, 260px expanded)

---

### 1. Admin Dashboard

| Field            | Value                            |
| ---------------- | -------------------------------- |
| **Path**         | `/admin/dashboard`               |
| **File**         | `(protected)/dashboard/page.tsx` |
| **Data Source**  | `getAdminSDK()` calls            |
| **Auto-refresh** | 30s refetch                      |

**Components:**

- StatCards:
  - Total Users + "new today" subtitle
  - Requests Today + avg latency subtitle
  - Revenue Today + monthly subtitle
  - Providers Online + degraded count subtitle
- Recent Users Table: 5 most recently created users
- Quick Actions Panel: links to common admin tasks

**States:**

- Loading: Stat card skeletons + table skeleton
- Error: "Failed to load admin dashboard"
- Empty: N/A (aggregate stats always return values)
- Edge Cases: Zero new users/requests today (show "0"), all providers degraded (red warning banner)

---

### 2. Users Management

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Path**        | `/admin/users`               |
| **File**        | `(protected)/users/page.tsx` |
| **Data Source** | `getAdminSDK().listUsers()`  |

**Components:**

- Search Input: debounced 400ms
- Status Filter: All / Active / Suspended / Disabled
- Paginated User Table: name, email, role, status badge, last login timestamp
- Action Buttons: view details, toggle status (suspend/activate), delete
- Delete Confirmation Dialog: user name + email, "This cannot be undone" warning
- Empty State: contextual message based on search/filter criteria

**States:**

- Loading: Table skeleton rows
- Error: "Failed to load users"
- Empty (no filter): "No users registered yet"
- Empty (filter active): "No users match your search/filter" with clear filter suggestion
- Suspend: User row updates to suspended styling
- Activate: User row updates to active styling
- Delete: Row animates out, success toast
- Edge Cases: Cannot suspend self, delete cascading cleanup, search while typing (debounce), very large user base (pagination)

---

### 3. Providers Management

| Field           | Value                                                               |
| --------------- | ------------------------------------------------------------------- |
| **Path**        | `/admin/providers`                                                  |
| **File**        | `(protected)/providers/page.tsx`                                    |
| **Data Source** | `getAdminSDK().listProviders()`, `getAdminSDK().listProviderKeys()` |

**Components:**

- Provider Cards: with inline editing (display name, base URL, priority, timeout)
- ProviderKeysPanel: per-provider key management:
  - Add key with strategy: round-robin / fill-first / weighted / latency-optimized / quota-aware
  - Weight field (for weighted strategies)
  - List/delete existing keys
- FetchModelsPanel: fetch models from provider API with optional override API key
- Create Provider Form: new provider configuration
- Pagination: 10 per page
- Delete Provider: confirmation dialog

**States:**

- Loading: Card skeletons
- Error: "Failed to load providers"
- Empty: "No providers configured" with "Add Provider" CTA
- Inline Edit: Field becomes input on click, save/cancel controls
- Key Added: Key appears in list (masked)
- Fetching Models: "Fetching..." spinner on button
- Fetch Complete: Success count toast
- Edge Cases: Provider becomes unreachable (health check failed badge), duplicate provider name, key strategy change requires rebalancing, fetch models timeout

---

### 4. Models Registry

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Path**        | `/admin/models`               |
| **File**        | `(protected)/models/page.tsx` |
| **Data Source** | `getAdminSDK()` methods       |

**Tabs:**

1. **Model Registry** - search, add, edit, delete models
2. **Aliases** - add, edit, delete model aliases

**Model Form Fields:** model ID, display name, provider, status, context window, max output, prices (in micro-dollars), capabilities (vision/tools/thinking checkboxes)

**Model Status System:** active / beta / deprecated / sunset / disabled

**Alias Form Fields:** alias name, target model, RPM override, monthly budget

**Helper:** `formatPrice()` for micro-dollar display

**States:**

- Loading: Table skeleton, form inputs skeleton
- Error: "Failed to load model registry"
- Empty (registry): "No models registered" with "Add Model" CTA
- Empty (aliases): "No aliases configured" with "Create Alias" CTA
- Form Validation: Required fields, unique model ID, valid prices
- Saved: Success toast
- Deleted: Row removal with animation
- Edge Cases: Model ID conflicts, alias target points to deleted model, circular alias references, price format validation

---

### 5. Billing Admin

| Field           | Value                             |
| --------------- | --------------------------------- |
| **Path**        | `/admin/billing`                  |
| **File**        | `(protected)/billing/page.tsx`    |
| **Data Source** | SDK methods + session-local state |

**Components:**

- Revenue Summary: "Coming Soon" placeholder
- Manual Credit Adjustment Form:
  - User ID input
  - Amount (+/-)
  - Reason text
- Recent Adjustments Table: session-local state, shows user, amount, reason, timestamp

**States:**

- Loading: Form skeleton
- Error: "Failed to adjust credits" red error
- Empty: "No recent adjustments"
- Adjustment Applied: Green success, row appears in table
- Edge Cases: Negative amount exceeds user's current balance, user ID not found, SQL injection prevention (validated), adjustment reversals (negative amount another adjustment)

---

### 6. Settings

| Field           | Value                           |
| --------------- | ------------------------------- |
| **Path**        | `/admin/settings`               |
| **File**        | `(protected)/settings/page.tsx` |
| **Data Source** | `getAdminSDK().listSettings()`  |

**Tabs:**

1. **System Settings** - grouped setting cards (grouped by `groupName`)
   - Encrypted values hidden (show "Encrypted" placeholder)
   - Docs Base URL editor
2. **Feature Flags** - toggle switches

**States:**

- Loading: Setting cards skeleton
- Error: "Failed to load settings"
- Empty: "No settings configured"
- Saved: Success toast on each card
- Edge Cases: Encrypted values require re-entry to update, feature flag toggles immediately effective, group names with no settings (hidden)

---

### 7-22. Remaining Admin Pages

These pages follow similar patterns and are documented together:

| #   | Page          | Path                   | Data Source     | Key Features                                                                                                                  |
| --- | ------------- | ---------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 7   | Security      | `/admin/security`      | `getAdminSDK()` | Suspicious activity table, severity badges (high/medium/low), status (pending/reviewed/resolved), categories, user IDs, dates |
| 8   | Audit         | `/admin/audit`         | `getAdminSDK()` | Audit log table: action, actor (email + ID), target type, severity, timestamp; severity badges (info/warning/error/critical)  |
| 9   | IP Lists      | `/admin/ip-lists`      | `getAdminSDK()` | IP allow/block list management                                                                                                |
| 10  | Logs          | `/admin/logs`          | `getAdminSDK()` | Transaction/usage records table: status codes, cost, duration; pagination with prev/next                                      |
| 11  | Operations    | `/admin/operations`    | `getAdminSDK()` | Operations monitoring dashboard                                                                                               |
| 12  | Messages      | `/admin/messages`      | `getAdminSDK()` | System message management                                                                                                     |
| 13  | Announcements | `/admin/announcements` | `getAdminSDK()` | Create/edit/delete announcements                                                                                              |
| 14  | Changelog     | `/admin/changelog`     | `getAdminSDK()` | Changelog management                                                                                                          |
| 15  | Reports       | `/admin/reports`       | `getAdminSDK()` | Generated reports viewer                                                                                                      |
| 16  | Admins        | `/admin/admins`        | `getAdminSDK()` | Admin user management                                                                                                         |
| 17  | Settings      | `/admin/settings`      | `getAdminSDK()` | System settings + feature flags                                                                                               |
| 18  | SSO           | `/admin/sso`           | `getAdminSDK()` | SSO configuration                                                                                                             |
| 19  | Cost Intel    | `/admin/cost-intel`    | `getAdminSDK()` | Cost intelligence dashboard                                                                                                   |
| 20  | Promos        | `/admin/promos`        | `getAdminSDK()` | Promo code management                                                                                                         |

**Common States (all admin pages):**

- Loading: Skeleton matching page layout
- Error: "Failed to load data" with retry button
- Empty: Contextual empty state with action CTA
- CRUD operations: Success toast on create/update/delete, confirmation on delete
- Edge Cases: Permission errors (non-admin access blocked at layout level), pagination boundaries, optimistic updates on mutations

---

## Shared Components & Layouts

### Admin Pages Header (`AdminPageHeader.tsx`)

Reusable wrapper for all admin content pages:

- Title (h1)
- Subtitle (description text)
- Optional action button slot (e.g., "Create", "Add", "Export")

### Admin Search Bar (`AdminSearchBar.tsx`)

- Text input with search icon
- Used in `AdminTopBar.tsx`

### Admin Login

| Field             | Value                            |
| ----------------- | -------------------------------- |
| **Path**          | `/admin/login`                   |
| **File**          | `app/admin/login/page.tsx`       |
| **Auth Required** | No (public entry point to admin) |

**Layout (~400 lines):**

- Two-panel layout:
  - Left brand panel: logo, status indicator, feature list, footer
  - Right form panel: email + password inputs, login button
- Password visibility toggle (eye icon)
- Animated particles + grid background
- `useActionState(authenticateAdmin, undefined)` for form handling

**States:**

- Initial: Login form ready
- Loading: Button shows "Signing in..." with spinner
- Error: Red alert card with error message (invalid credentials / server error)
- Success: Redirect to `/admin/dashboard`

---

## Styling Constants

### Dashboard Theme

- Background: `#000000`, `#050505`, `#0A0A0A`, `#020202`
- Dark theme across all pages

### Admin Theme CSS Variables

```css
--admin-bg
--admin-surface
--admin-text
--admin-border
--admin-accent
--admin-hover
--admin-muted
```

### Animation Libraries

| Library       | Used For                                                                |
| ------------- | ----------------------------------------------------------------------- |
| framer-motion | Page transitions, layout animations, scroll reveals, sidebar indicators |
| GSAP          | Scroll-triggered animations (docs, landing)                             |

### Data Visualization (Recharts)

| Chart Type | Used In                                         |
| ---------- | ----------------------------------------------- |
| BarChart   | Analytics, Dashboard Overview (Top Models)      |
| LineChart  | Analytics (latency trend), Dashboard Overview   |
| AreaChart  | Analytics (hourly requests), Dashboard Overview |
| PieChart   | Analytics (usage by model)                      |
