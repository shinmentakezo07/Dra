# Frontend — Next.js 16 Application

The frontend lives in `apps/web/` and is a **Next.js 16 canary** application using the **App Router** with **React 19**, **TypeScript 5.9**, and **Tailwind CSS v4**.

---

## Tech Stack

| Technology      | Purpose                           | Version       |
| --------------- | --------------------------------- | ------------- |
| Next.js         | React Framework (App Router, RSC) | 16.3.0-canary |
| React           | UI Library                        | 19.2.5        |
| TypeScript      | Type Safety                       | 5.9.3         |
| Tailwind CSS    | Utility-first Styling             | v4.2.2        |
| Framer Motion   | Animations & Gestures             | 12.38.0       |
| GSAP            | Advanced Scroll Animations        | 3.15.0        |
| Recharts        | Data Visualization                | 3.8.1         |
| NextAuth        | Authentication                    | 5.0.0-beta    |
| Drizzle ORM     | Database ORM + Migrations         | 0.45.2        |
| Zod             | Schema Validation                 | v4            |
| AI SDK          | AI/LLM Integration                | 6.0.x         |
| TanStack Query  | Server State Management           | 5.71.0        |
| React Hook Form | Form Management                   | 7.74.0        |
| Lucide React    | Icon Library                      | 1.14.0        |
| Monaco Editor   | Code Editing                      | 4.7.0         |
| Mermaid         | Diagram Rendering                 | 11.14.0       |
| Xterm           | Terminal Emulator                 | 5.5.0         |

---

## Configuration Files

| File                 | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `next.config.ts`     | Next.js config (standalone output, images, webpack)         |
| `vitest.config.ts`   | Vitest with jsdom, `@/` path alias                          |
| `tsconfig.json`      | Path aliases, type checking exclusions                      |
| `drizzle.config.ts`  | Drizzle DB connection config                                |
| `postcss.config.cjs` | Tailwind v4 PostCSS plugin                                  |
| `.eslintrc.json`     | ESLint configuration                                        |
| `auth.ts`            | NextAuth v5 main config                                     |
| `auth.config.ts`     | Auth providers and callbacks                                |
| `proxy.ts`           | NextAuth middleware (protects dashboard routes)             |
| `tailwind.config.ts` | NOT USED (Tailwind v4 uses CSS-based config in globals.css) |

---

## Page Routes

### Public Pages

| Path               | File                           | Description                      |
| ------------------ | ------------------------------ | -------------------------------- |
| `/`                | `app/page.tsx`                 | Landing page with hero           |
| `/login`           | `app/login/page.tsx`           | Login page                       |
| `/signup`          | `app/signup/page.tsx`          | Registration page                |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset                   |
| `/pricing`         | `app/pricing/page.tsx`         | Pricing & credit plans           |
| `/gateway`         | `app/gateway/page.tsx`         | AI Gateway interface             |
| `/playground`      | `app/playground/page.tsx`      | AI Playground (multi-model chat) |
| `/models`          | `app/models/page.tsx`          | Model browser                    |
| `/models/[id]`     | `app/models/[id]/page.tsx`     | Model detail page                |
| `/docs/*`          | `app/docs/`                    | API documentation (17 subpages)  |

### Dashboard Pages (protected by auth middleware)

| Path                       | Description                 |
| -------------------------- | --------------------------- |
| `/dashboard`               | Dashboard overview          |
| `/dashboard/analytics`     | Usage analytics with charts |
| `/dashboard/keys`          | API key management          |
| `/dashboard/logs`          | Request logs                |
| `/dashboard/billing`       | Credit billing & purchases  |
| `/dashboard/settings`      | User profile settings       |
| `/dashboard/chat`          | In-dashboard chat           |
| `/dashboard/notifications` | Notification management     |
| `/dashboard/organization`  | Team/organization settings  |
| `/dashboard/admin`         | Admin data dashboard        |

### Admin Pages (22 subpages)

| Path                   | Description               |
| ---------------------- | ------------------------- |
| `/admin`               | Admin overview            |
| `/admin/dashboard`     | Admin analytics dashboard |
| `/admin/users`         | User management           |
| `/admin/providers`     | LLM provider management   |
| `/admin/models`        | Model management          |
| `/admin/billing`       | Billing administration    |
| `/admin/settings`      | Platform settings         |
| `/admin/security`      | Security management       |
| `/admin/audit`         | Audit log viewer          |
| `/admin/logs`          | System logs               |
| `/admin/operations`    | Operations dashboard      |
| `/admin/admins`        | Admin user management     |
| `/admin/announcements` | Platform announcements    |
| `/admin/changelog`     | Changelog management      |
| `/admin/cost`          | Cost intelligence         |
| `/admin/promos`        | Promo code management     |
| `/admin/reports`       | Scheduled reports         |
| `/admin/sso`           | SSO configuration         |
| `/admin/ip`            | IP management             |
| `/admin/cost`          | Cost analytics            |

---

## API Routes (Proxy Layer)

All `app/api/*` routes proxy to the Go backend via `proxyToBackend()` from `lib/api/proxy.ts`. Approximately **65 API route files** organized by resource:

- **Auth**: `api/auth/[...nextauth]`, `api/auth/password`, `api/auth/profile`
- **Chat & AI**: `api/chat`, `api/embeddings`, `api/validate`, `api/models`
- **Keys**: `api/keys`, `api/keys/[id]`, `api/keys/[id]/revoke`
- **Credits**: `api/credits`, `api/credits/budget`, `api/credits/purchase`
- **Transactions**: `api/transactions`
- **Logs**: `api/logs`
- **Analytics**: `api/analytics`
- **Conversations**: `api/conversations`, `api/conversations/[id]`, `api/conversations/[id]/messages`
- **Prompts**: `api/prompts`, `api/prompts/[name]`, `api/prompts/[name]/render`
- **Webhooks**: `api/webhooks`, `api/webhooks/[id]`
- **Organizations**: `api/organizations`, `api/organizations/[id]`, `api/organizations/[id]/invite`, `api/organizations/[id]/members`
- **Batch**: `api/batch`, `api/batch/[id]`
- **Files**: `api/files/upload`, `api/files`
- **Notifications**: `api/notifications/stream`
- **Invites**: `api/invites/accept`
- **Providers**: `api/providers/health`
- **Admin**: `api/admin/*` (multiple catch-all and specific routes)
- **Promos**: `api/promos/redeem`

---

## Component Library

### UI Primitives (`components/ui/`)

| Component             | Description                    |
| --------------------- | ------------------------------ |
| `button.tsx`          | cva-based button with variants |
| `glass-card.tsx`      | Glassmorphism card container   |
| `loading-spinner.tsx` | Loading indicator              |
| `toast.tsx`           | Toast notification             |

### Dashboard Components (`components/dashboard/`)

| Component         | Description                                |
| ----------------- | ------------------------------------------ |
| `DataTable.tsx`   | Generic data table with sorting/pagination |
| `MetricCard.tsx`  | Analytics metric display card              |
| `StatusBadge.tsx` | Status indicator badge                     |

### Playground Components (`components/playground/`)

| Component                | Description                       |
| ------------------------ | --------------------------------- |
| `PlaygroundMain.tsx`     | Main orchestrator component       |
| `ChatInterface.tsx`      | Message display and streaming     |
| `ModelSelector.tsx`      | Provider/model selection dropdown |
| `ThemeSelector.tsx`      | Visual theme selector             |
| `LayoutSelector.tsx`     | Layout mode selector              |
| `Terminal.tsx`           | Terminal-style streaming output   |
| `PerformanceMetrics.tsx` | Streaming performance stats       |
| `ShareModal.tsx`         | Share conversation modal          |
| `SnippetsModal.tsx`      | Code snippets modal               |
| `CodeSnippets.tsx`       | Code example snippets             |
| `ProviderColors.ts`      | Consistent provider color theming |

### Model Components (`components/models/`)

| Component                      | Description               |
| ------------------------------ | ------------------------- |
| `ModelCard.tsx`                | Model listing card        |
| `ModelsExplorer.tsx`           | Model browser/explorer    |
| `ModelsHero.tsx`               | Models page hero section  |
| `detail/ModelDetailClient.tsx` | Model detail page client  |
| `detail/ModelIdentity.tsx`     | Model identity card       |
| `detail/ArchitecturePanel.tsx` | Architecture details      |
| `detail/ParametersPanel.tsx`   | Model parameters          |
| `detail/PerformancePanel.tsx`  | Performance metrics       |
| `detail/PricingPanel.tsx`      | Pricing information       |
| `detail/QuickStartCard.tsx`    | Quick start code examples |
| `detail/SpeedometerGauge.tsx`  | Speed visualization       |
| `detail/AmbientBackground.tsx` | Background effects        |

### Docs Components (`components/docs/`)

| Component            | Description                    |
| -------------------- | ------------------------------ |
| `CodeBlock.tsx`      | Syntax-highlighted code blocks |
| `EndpointCard.tsx`   | API endpoint reference card    |
| `ScrollProgress.tsx` | Reading progress indicator     |
| `SearchModal.tsx`    | Documentation search           |
| `Section.tsx`        | Content section wrapper        |
| `TipBox.tsx`         | Tip/info callout box           |

### Pricing Components (`components/pricing/`)

| Component            | Description                |
| -------------------- | -------------------------- |
| `CostCalculator.tsx` | Cost estimation tool       |
| `CreditPackages.tsx` | Credit package cards       |
| `ModelShowcase.tsx`  | Featured models display    |
| `PricingCTA.tsx`     | Call-to-action section     |
| `PricingFAQ.tsx`     | Frequently asked questions |
| `PricingHero.tsx`    | Pricing page hero          |

### Other Notable Components

| Component               | Description               |
| ----------------------- | ------------------------- |
| `Header.tsx`            | Site header/navigation    |
| `Hero.tsx`              | Landing page hero         |
| `ChatPlayground.tsx`    | Chat playground wrapper   |
| `CodeEditor.tsx`        | Monaco-based code editor  |
| `CyberpunkLogo.tsx`     | Animated logo             |
| `GatewayDashboard.tsx`  | Gateway interface         |
| `MainLayout.tsx`        | Main layout shell         |
| `Mermaid.tsx`           | Mermaid diagram renderer  |
| `ModelDetailModal.tsx`  | Model detail modal        |
| `AIThinkingProcess.tsx` | AI thinking visualization |

---

## State & Data Fetching

| Concern      | Solution                                |
| ------------ | --------------------------------------- |
| Server state | `@tanstack/react-query` with SDK hooks  |
| AI streaming | `@ai-sdk/react` for real-time responses |
| Auth state   | NextAuth v5 session via `useSession()`  |
| Form state   | `react-hook-form` with Zod resolvers    |
| Local state  | React `useState` / `useReducer`         |

**Architecture Rule**: Dashboard components use `getSDK()` from `lib/api/sdk.ts`. No mock data. No direct `fetch()` calls.
