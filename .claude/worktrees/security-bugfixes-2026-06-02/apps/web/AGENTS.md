<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Route conventions

- **App Router** — all routes in `app/`. Each route group has a `page.tsx` (UI) and/or `route.ts` (API). API routes in `app/api/` proxy to Go backend via `proxyToBackend()`.
- **Dashboard routes** — `app/dashboard/{feature}/page.tsx`. Protected by NextAuth middleware in `proxy.ts`.
- **Dynamic segments** — use `[param]` syntax (`app/api/keys/[id]/route.ts`).

## Component layers

| Layer                | Dir                                               | Pattern                              |
| -------------------- | ------------------------------------------------- | ------------------------------------ |
| Shared UI primitives | `components/ui/`                                  | Reusable: Button, Input, Modal, Card |
| Feature components   | `components/dashboard/`, `components/playground/` | Uses `getSDK()` — never mock data    |
| Page-level           | `app/dashboard/analytics/page.tsx`                | Server components where possible     |

## SDK rule (enforced)

All dashboard components MUST import from `@/lib/api/sdk` (`getSDK()` / `DraSDK`). No mock data. Enforced by `tests/wiring-verification.test.ts`.

## State & data fetching

- Server state: `@tanstack/react-query`
- AI streaming: `@ai-sdk/react`
- No direct fetch in components — always through SDK

## Styling

- Tailwind CSS v4 (`@tailwindcss/postcss`) — NOT v3 `tailwind.config.js` approach
- `cva` for variant components, `tailwind-merge` for class merging
- Zod v4 for validation schemas

## Key files

| Path                | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `auth.ts`           | NextAuth v5 config (credentials + OAuth) |
| `db/schema.ts`      | Drizzle ORM schema (shared types)        |
| `lib/api/sdk.ts`    | `DraSDK` typed client                    |
| `lib/api/proxy.ts`  | `proxyToBackend()` server-side proxy     |
| `lib/api/errors.ts` | Typed API errors                         |
| `lib/api/hooks.ts`  | React Query hooks wrapping SDK           |
