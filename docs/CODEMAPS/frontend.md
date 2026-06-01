<!-- Generated: 2026-05-29 | Files scanned: ~273 TS/TSX + 40 docs | Token estimate: ~900 -->

# Frontend Architecture Codemap — Next.js 16

**Location**: `apps/web/`
**Framework**: Next.js 16.3.0-canary (App Router)
**React**: 19.2.5
**TypeScript**: 5.9.3
**Styling**: Tailwind CSS v4.2.2 (CSS-first, no `tailwind.config.ts`)

---

## Route Tree (App Router)

```
app/
├── layout.tsx                    # Root layout, providers, theme, metadata
├── page.tsx                      # Landing page (hero, features, CTA)
│
├── login/page.tsx                # Login (GitHub + Google OAuth + email)
├── signup/page.tsx               # Registration
├── forgot-password/page.tsx      # Password reset request
│
├── pricing/page.tsx              # Pricing tiers + credit packages
├── gateway/page.tsx              # AI Gateway marketing/explainer
├── playground/page.tsx           # Multi-model chat playground (public)
├── models/page.tsx               # Model catalog browser
├── models/[id]/page.tsx          # Model detail + comparison
│
├── docs/                         # 17 documentation pages
│   ├── layout.tsx                # Docs sidebar + navigation
│   ├── page.tsx                  # Docs index
│   ├── quickstart/page.tsx
│   ├── authentication/page.tsx
│   ├── chat/page.tsx
│   ├── models/page.tsx
│   ├── embeddings/page.tsx
│   ├── batch/page.tsx
│   ├── files/page.tsx
│   ├── conversations/page.tsx
│   ├── prompts/page.tsx
│   ├── webhooks/page.tsx
│   ├── organizations/page.tsx
│   ├── rate-limits/page.tsx
│   ├── security/page.tsx
│   ├── error-handling/page.tsx
│   ├── api-reference/page.tsx
│   ├── dashboard/page.tsx
│   ├── examples/page.tsx
│   └── self-hosting/page.tsx
│
├── dashboard/                    # Protected (auth middleware)
│   ├── layout.tsx                # Dashboard shell (sidebar, header, user menu)
│   ├── page.tsx                  # Overview (metrics, recent activity)
│   ├── analytics/page.tsx        # Usage charts (Recharts)
│   ├── keys/page.tsx             # API key management
│   ├── logs/page.tsx             # Request history + detail drawer
│   ├── billing/page.tsx          # Credit balance, purchases, invoices
│   ├── settings/page.tsx         # Profile, password, preferences
│   ├── chat/page.tsx             # In-dashboard chat
│   ├── notifications/page.tsx    # Notification preferences + history
│   ├── organization/page.tsx     # Team management, invites
│   ├── webhooks/page.tsx         # Outbound webhook config
│   ├── exports/page.tsx          # Async export requests
│   ├── fine-tuning/page.tsx      # Fine-tuning job management
│   ├── battle/page.tsx           # Side-by-side model comparison
│   ├── inbox/page.tsx            # Messages / support
│   ├── provider-health/page.tsx  # Provider status dashboard
│   └── admin/page.tsx            # User-facing admin data (if applicable)
│
├── admin/                        # Admin-only (separate from /dashboard/admin)
│   ├── login/layout.tsx          # Admin login (no sidebar)
│   ├── login/page.tsx
│   └── (protected)/              # Protected by admin role check
│       ├── layout.tsx            # Admin shell (different from user dashboard)
│       ├── page.tsx              # Admin overview
│       ├── dashboard/page.tsx    # Admin analytics
│       ├── users/page.tsx        # User management
│       ├── providers/page.tsx    # LLM provider CRUD
│       ├── models/page.tsx       # Model catalog admin
│       ├── billing/page.tsx      # Revenue, refunds, disputes
│       ├── settings/page.tsx     # Platform config
│       ├── security/page.tsx     # Security events, IP blocks
│       ├── audit/page.tsx        # Audit log viewer
│       ├── logs/page.tsx         # System logs
│       ├── operations/page.tsx   # Operational dashboards
│       ├── admins/page.tsx       # Admin user management
│       ├── announcements/page.tsx # Platform announcements
│       ├── changelog/page.tsx    # Changelog management
│       ├── cost/page.tsx         # Cost intelligence
│       ├── promos/page.tsx       # Promo code management
│       ├── reports/page.tsx      # Scheduled reports
│       ├── sso/page.tsx          # SSO configuration
│       └── ip/page.tsx           # IP management
│
└── api/                          # Server-side proxy routes (65 files)
    ├── auth/[...nextauth]/route.ts   # NextAuth handler
    ├── auth/password/route.ts
    ├── auth/profile/route.ts
    ├── chat/route.ts
    ├── embeddings/route.ts
    ├── models/route.ts
    ├── validate/route.ts
    ├── keys/route.ts
    ├── keys/[id]/route.ts
    ├── keys/[id]/revoke/route.ts
    ├── credits/route.ts
    ├── credits/budget/route.ts
    ├── credits/purchase/route.ts
    ├── transactions/route.ts
    ├── logs/route.ts
    ├── analytics/route.ts
    ├── conversations/route.ts
    ├── conversations/[id]/route.ts
    ├── conversations/[id]/messages/route.ts
    ├── prompts/route.ts
    ├── prompts/[name]/route.ts
    ├── prompts/[name]/render/route.ts
    ├── webhooks/route.ts
    ├── webhooks/[id]/route.ts
    ├── organizations/route.ts
    ├── organizations/[id]/route.ts
    ├── organizations/[id]/invite/route.ts
    ├── organizations/[id]/members/route.ts
    ├── batch/route.ts
    ├── batch/[id]/route.ts
    ├── files/upload/route.ts
    ├── files/route.ts
    ├── notifications/stream/route.ts
    ├── invites/accept/route.ts
    ├── providers/health/route.ts
    ├── promos/redeem/route.ts
    └── admin/* (catch-all + specific admin proxy routes)
```

---

## Component Hierarchy

```
app/layout.tsx (Root)
├── ThemeProvider, QueryClientProvider, AuthProvider, ToastProvider
│
├── app/page.tsx (Landing)
│   ├── Hero, Features, PricingPreview, Footer
│
├── app/login/page.tsx, signup/page.tsx, etc. (Auth Pages)
│   └── AuthForm (shared)
│
├── app/dashboard/layout.tsx (Dashboard Shell)
│   ├── Sidebar (nav links, user info)
│   ├── Header (search, notifications, profile menu)
│   └── {children} → dashboard pages
│       ├── MetricCard, DataTable, ModelBreakdown, LogDetailDrawer
│       └── Recharts charts (analytics)
│
├── app/admin/(protected)/layout.tsx (Admin Shell — different from dashboard)
│   ├── AdminSidebar
│   ├── AdminHeader
│   └── {children} → admin pages
│       └── AdminUI.tsx (shared admin primitives)
│
├── app/docs/layout.tsx (Docs Shell)
│   ├── DocsSidebar (17-section nav)
│   └── {children} → doc pages
│       └── Mermaid diagrams, code blocks, API examples
│
└── app/playground/page.tsx, models/page.tsx (Public Product Pages)
    └── PlaygroundChat, ModelCard, ModelDetail
```

### UI Primitives (`components/ui/`)

| Component | Purpose |
|-----------|---------|
| `button.tsx` | cva-based button with variants (primary, secondary, ghost, danger) |
| `glass-card.tsx` | Glassmorphism container with backdrop blur |
| `loading-spinner.tsx` | Animated loading indicator |
| `toast.tsx` | Toast notification system (success, error, info) |

### Dashboard Components (`components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `MetricCard.tsx` | KPI display (number + label + trend) |
| `DataTable.tsx` | Generic table with sorting, pagination, row actions |
| `StatusBadge.tsx` | Color-coded status pills (success, error, pending, etc.) |
| `LogDetailDrawer.tsx` | Slide-in drawer for request log details |
| `ModelBreakdown.tsx` | Usage by model pie/bar chart data |
| `AnimatedCounter.tsx` | Number animation for metrics |

### Domain-Specific Component Groups

| Group | Location | Purpose |
|-------|----------|---------|
| **Admin** | `components/admin/` | Admin-specific UI (tables, forms, modals) |
| **Docs** | `components/docs/` | Documentation page primitives |
| **Models** | `components/models/` + `components/models/detail/` | Model cards, comparison, detail views |
| **Playground** | `components/playground/` | Multi-model chat, parameter controls |
| **Pricing** | `components/pricing/` | Pricing tiers, credit packages, checkout |

---

## Data Fetching Architecture

### 1. SDK Layer (`lib/api/sdk.ts` — 2144 lines)

**DraSDK class** — typed client for ALL backend endpoints (~40 methods).

```ts
class DraSDK {
  // Auth
  async login(email, password): Promise<AuthResponse>
  async signup(email, password, name): Promise<AuthResponse>
  async getCurrentUser(): Promise<User>

  // Keys
  async createApiKey(name, scopes): Promise<ApiKey>
  async listApiKeys(): Promise<ApiKey[]>
  async revokeApiKey(id): Promise<void>

  // Chat / LLM
  async chatCompletions(req): Promise<ChatResponse>
  async streamChat(req): AsyncIterable<StreamChunk>

  // Admin (separate admin-sdk.ts)
  async adminListUsers(filters): Promise<Paginated<User>>
  async adminUpdateProvider(id, config): Promise<Provider>
  // ... 30+ more
}
```

**Singleton**: `getSDK()` returns cached instance with auth headers injected.

### 2. React Query Hooks Layer (`lib/api/hooks.ts` — 889 lines)

**Purpose**: Wrap SDK methods in `useQuery` / `useMutation` with automatic caching, invalidation, retries.

```ts
// Example pattern
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => getSDK().listApiKeys(),
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name) => getSDK().createApiKey(name),
    onSuccess: () => queryClient.invalidateQueries(['api-keys']),
  })
}
```

**Hook Categories**:
- Auth: `useCurrentUser`, `useLogin`, `useLogout`
- Keys: `useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`
- Credits: `useCredits`, `usePurchaseCredits`
- Logs: `useLogs`, `useLogDetail`
- Admin: `useAdminUsers`, `useAdminProviders`, `useAdminAuditLogs`, etc. (40+ hooks)
- Analytics: `useUsageAnalytics`, `useCostBreakdown`

### 3. Proxy Layer (`lib/api/proxy.ts`)

**Purpose**: Server-side proxy for all `app/api/*` routes.

- Forwards requests to Go backend (`BACKEND_URL` env)
- Injects auth headers (from NextAuth session or API key)
- Handles streaming (SSE passthrough)
- Error normalization

**Why?** Keeps client-side API calls same-origin (avoids CORS), enables server-side session access.

### 4. Direct Fetch (AVOID in dashboard)

Dashboard components **MUST** use `getSDK()` + hooks. Enforced by:
- `tests/wiring-verification.test.ts` (static analysis)
- `scripts/smoke-test.sh` (CI gate)

---

## State Management

| Concern | Tool | Location |
|---------|------|----------|
| **Server State** (API data) | TanStack Query v5 | `lib/api/hooks.ts` |
| **Client State** (UI, modals, forms) | React `useState` + Zustand (if complex) | Component-local or `lib/store/` |
| **URL State** (filters, pagination, tabs) | `useSearchParams()` + Next.js router | Dashboard pages |
| **Form State** | React Hook Form + Zod | Auth forms, admin forms, settings |
| **Auth Session** | NextAuth v5 | `auth.ts`, `proxy.ts`, middleware |

**Rule**: Do NOT duplicate server state into client stores. Derive or re-fetch.

---

## Styling System

### Tailwind CSS v4 (CSS-First)

**Config Location**: `app/globals.css` — `@theme` block (NOT `tailwind.config.ts`)

```css
@theme {
  --color-surface: oklch(98% 0 0);
  --color-text: oklch(18% 0 0);
  --color-accent: oklch(68% 0.21 250);
  --text-base: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
  --space-section: clamp(4rem, 3rem + 5vw, 10rem);
}
```

**Component Variants**: Use `cva` (class-variance-authority) + `tailwind-merge`

```ts
const buttonVariants = cva('base-classes', {
  variants: { variant: { primary: '...', ghost: '...' } }
})
```

### Design Tokens (in globals.css)

- Colors: surface, text, accent, error, warning, success
- Typography: base, heading, mono (clamped for responsive)
- Spacing: section, card, inline (clamp-based)
- Motion: `--duration-fast`, `--duration-normal`, `--ease-out-expo`

---

## Animations

| Library | Use Case |
|---------|----------|
| **Framer Motion** | Component-level (modals, drawers, page transitions, hover states) |
| **GSAP + ScrollTrigger** | Scroll-triggered sequences (landing page, docs, hero reveals) |

**Performance Rule**: Animate only compositor-friendly properties (`transform`, `opacity`, `clip-path`). Use `will-change` narrowly.

---

## Authentication Flow

```
Unauthenticated user → /login
  → NextAuth signIn('github') or signIn('google')
  → OAuth callback → JWT session created
  → Middleware (proxy.ts) redirects /dashboard/* → /login if no session
  → Authenticated → getSDK() uses session cookie for backend calls

API Key flow (for SDKs):
  → User creates key in dashboard → dra_<64 hex> returned once
  → SDK: Authorization: Bearer <key> OR x-api-key: <key>
  → Backend validates hash → injects User + APIKey into context
```

**Session Cookie Names** (checked in order):
1. `authjs.session-token`
2. `__Secure-authjs.session-token`
3. `next-auth.session-token`
4. `__Secure-next-auth.session-token`

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Standalone output, image domains, webpack aliases, security headers |
| `tsconfig.json` | Path aliases (`@/` → `apps/web/`), excludes `db/seed*.ts` + `scripts/**/*` |
| `vitest.config.ts` | jsdom, `@/` alias, coverage thresholds |
| `drizzle.config.ts` | DB connection for Drizzle migrations |
| `postcss.config.cjs` | Tailwind v4 PostCSS plugin |
| `auth.ts` + `auth.config.ts` | NextAuth providers (GitHub, Google), callbacks, JWT config |
| `middleware.ts` | Proxy middleware (auth redirects, API proxy) |

---

## Testing

| Type | Tool | Location | Coverage |
|------|------|----------|----------|
| Unit (SDK, hooks, utils) | Vitest | `tests/lib/api/`, co-located | SDK errors, hook wiring |
| Component (visual) | Playwright screenshots | `e2e/` | Landing, dashboard key flows |
| E2E | Playwright | `e2e/` | Auth, chat, billing purchase |
| Wiring Verification | Custom script | `tests/wiring-verification.test.ts` | **No mock data in dashboard** |
| Smoke Test | Bash | `scripts/smoke-test.sh` | Route coverage, SDK imports, dashboard invariants |

**Known Gaps** (from `ops.md`):
- No component unit tests (React Testing Library)
- No accessibility tests (axe-core)
- No SDK error-handling tests
- No provider failover E2E

---

## Build & Deploy

- **Dev**: `npm run dev` → Turborepo runs both apps in parallel
- **Build**: `npm run build` → Next.js standalone output in `.next/standalone/`
- **Docker**: `apps/web/server.js` is the production entry (inside standalone folder)
- **Env**: `BACKEND_URL` points to Go API (local: `http://localhost:8080`, Docker: `http://backend:8080`)

---

## Critical Rules

1. **Dashboard = SDK-driven** — never `fetch()` directly, never use mock data
2. **No `as any` / `@ts-ignore`** — TypeScript strictness enforced at review
3. **Zod v4 only** — v3 patterns will break
4. **Tailwind v4** — edit `globals.css @theme`, not `tailwind.config.ts`
5. **UPDATE.md mandatory** — append entry after every code change
6. **SDK parity** — if backend changes, update Go SDK first, then TS SDK
7. **Anti-template UI** — no default card grids, no stock hero sections, intentional design required
