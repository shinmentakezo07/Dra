# Docs Page Visual Redesign

**Date:** 2026-05-14  
**Status:** Design Spec

## Overview

Redesign the `/docs` page to match the project's dark cyber/tech visual identity — glassmorphism surfaces, animated grid background, categorized bento-style card layout, hero search, and refined content page styling. The current docs page uses flat pure-black backgrounds, uniform cards, and lacks the project's design DNA.

## Current Problems

- `bg-[#000000]` flat background instead of project's `#050505`/`#0A0A0A` depth
- 18 identical cards in a uniform 3-column grid — no hierarchy, no visual weight
- No categorized groupings — all sections treated equally
- Sidebar is transparent text on background — no surface distinction
- Content pages have no visual rhythm or character
- No connection to the project's glassmorphism/cyber aesthetic
- Search is hidden behind a button instead of always visible

## Visual System

### Colors

| Token            | Value                                | Usage                         |
| ---------------- | ------------------------------------ | ----------------------------- |
| Page base        | `#050505`                            | Main background               |
| Surface          | `#0A0A0A`                            | Cards, sidebar, panels        |
| Surface glass    | `#0A0A0A / 80%` + `backdrop-blur-md` | Glass panels                  |
| Primary accent   | `#3b82f6` (blue-500)                 | Active states, icons, buttons |
| Secondary accent | `#8b5cf6` (violet-500)               | Gradient blends, decorative   |
| Border subtle    | `white/[0.05]`                       | Default card borders          |
| Border medium    | `white/[0.06]`                       | Sidebar, panels               |
| Border hover     | `white/[0.1]`                        | Hover states                  |
| Text primary     | white                                | Headings                      |
| Text secondary   | `white/40` or `white/60`             | Body text                     |
| Text muted       | `white/20` or `white/30`             | Labels, metadata              |
| Glow blue        | `rgba(59,130,246,0.3)`               | Active indicator glow         |

### Typography

- **Headings:** `font-bold tracking-tight`
- **Category labels (index):** `text-[10px] uppercase tracking-widest font-mono text-white/20`
- **Card titles:** `text-sm font-semibold text-white`
- **Card descriptions:** `text-xs text-white/40`
- **Doc body content:** `text-base text-white/80 leading-relaxed`
- **Code:** `font-mono text-xs` or `text-[13px]` with syntax highlighting
- **Inline code:** `px-1.5 py-0.5 rounded bg-blue-500/[0.08] text-blue-400 font-mono text-xs border border-blue-500/[0.1]`

### Layout Grid

```
Desktop (lg+):       sidebar w-64 | content flex-1 (within max-w-7xl)
Tablet (md):         sidebar hidden | content full
Mobile:              sidebar drawer | content full

Index page grid:     sm:2-col | xl:3-col gap-3
Featured cards:      sm:col-span-2 (prominent placement)
Category gap:        mb-16 between groups
```

## Design Components

### 1. Background System

Replace `bg-[#000000]` with the project's atmospheric background:

- **Base:** `bg-[#050505]`
- **Animated grid overlay:** Slow-scrolling grid pattern at `opacity-[0.015]`, matching features section
- **Ambient orbs:** 3 blur orbs with different sizes (800px/700px/600px) and animation durations (8s/10s/12s) — blue/violet colors at `0.02-0.04` opacity
- **Vignette:** `bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.03)_0%,_transparent_50%)]`
- All wrapped in `fixed inset-0 pointer-events-none overflow-hidden`

### 2. Hero Search Zone (Index Page Top)

Full-width hero area replacing the current header:

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  🔍  Search docs, endpoints, models...       ⌘K  │   │
│  │  glass-surface search bar, rounded-2xl            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────┐    ┌──────┐    ┌──────┐                      │
│  │ 1.   │    │ 2.   │    │ 3.   │                      │
│  │Sign  │ →  │ Key  │ →  │ Req  │                      │
│  │ Up   │    │      │    │      │                      │
│  └──────┘    └──────┘    └──────┘                      │
│  Quick-start pathway (3 horizontal steps)               │
└─────────────────────────────────────────────────────────┘
```

**Search bar:** `rounded-2xl bg-[#0A0A0A] border border-white/10 backdrop-blur-md p-4`. Left: Search icon `w-5 h-5 text-white/30`. Center: placeholder text. Right: `⌘K` kbd badge. Triggers existing SearchModal.

**Quick-start pathway:** 3 horizontal step cards, each `rounded-2xl bg-[#0A0A0A] border border-white/5 p-5`. Steps 1-3 show: Sign Up → Get API Key → First Request. Visual arrow connectors between steps. Matching the landing page's Integration Flow style.

### 3. Categorized Doc Grid

Sections organized into 4 visible categories:

**Category "Getting Started":** Quick Start (featured), Authentication, API Reference
**Category "Core Features":** Chat & Streaming, Embeddings, Conversations, Prompt Templates (featured)
**Category "Platform":** Batch API, File Upload, Webhooks, Organizations, Rate Limits, Error Handling
**Category "Reference":** Available Models, Pricing & Credits, Dashboard, Security, Code Examples

**Featured hero cards:**

```
className="sm:col-span-2 rounded-[28px] p-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 group"
  └─ inner: "bg-[#0A0A0A] rounded-[27px] p-6 md:p-8"
     ├─ Icon: w-12 h-12 rounded-2xl bg-primary/20 ring-1 ring-primary/20
     ├─ Title: text-lg font-bold text-white group-hover:text-blue-400
     ├─ Description
     └─ Mini code preview: rounded-xl bg-black border border-white/5 p-3 font-mono text-xs text-green-400/80
```

**Standard cards:**

```
className="rounded-2xl bg-[#0A0A0A] border border-white/[0.06] p-5
         hover:border-blue-500/[0.2] hover:bg-white/[0.02]
         transition-all duration-300 group"
  ├─ Icon: w-10 h-10 rounded-xl bg-blue-500/[0.08] ring-1 ring-blue-500/[0.15]
  │        group-hover:ring-blue-500/[0.25] text-blue-400
  ├─ Title: text-sm font-semibold text-white group-hover:text-blue-400
  ├─ Description: text-xs text-white/40
  └─ ArrowRight: w-3.5 h-3.5 text-white/10 group-hover:text-blue-400/60
```

**Category headers:**

```
flex items-center gap-4 mb-6
  ├─ text-xs uppercase tracking-widest font-mono text-white/20
  └─ h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent
```

**Stats bar** (bottom of index page):

```
rounded-2xl border border-white/5 bg-[#0A0A0A]/50 p-4 mt-16
text-xs font-mono text-white/30 text-center
Content: "18 sections · 6 code languages · 100+ models · 24/7 support"
```

### 4. Sidebar Navigation

Desktop sidebar gets proper glass surface treatment:

**Surface:** `bg-[#0A0A0A]/40 backdrop-blur-sm border-r border-white/[0.06]`
**Width:** `w-64` (fixed)
**Position:** `sticky top-24 max-h-[calc(100vh-10rem)] overflow-y-auto`

**Inline filter:**

```
rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-2
text-sm text-white/40 placeholder:text-white/20
font-mono
```

**Content:**

- Category group labels: `text-[10px] uppercase tracking-widest text-white/20 font-mono px-3 pt-5 pb-1`
- Items: `flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-all`
- Active item: `text-blue-400 font-medium bg-blue-500/[0.04]` with left gradient glow indicator line + `shadow-[0_0_10px_rgba(59,130,246,0.3)]`
- Icons: `w-4 h-4` (up from `w-3.5 h-3.5`)
- Thin dividers between categories: `h-px bg-white/[0.04] my-2`

**Mobile:** Keep current spring drawer animation but apply glass surface `bg-[#0A0A0A]/95 backdrop-blur-xl`

### 5. Content Page Elements

**Section headers (`Section.tsx`):**

- Icon container: `w-12 h-12 rounded-xl bg-blue-500/[0.08] ring-1 ring-blue-500/[0.15]` (larger)
- Title: `text-3xl md:text-4xl font-bold tracking-tight`
- Decorative full-width gradient line after header: `h-px bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-transparent`
- Section spacing: `mb-16` (up from `mb-8`)

**Alert boxes (`TipBox.tsx`):**

- 3 variants:
  - **Tip** (blue): `bg-blue-500/[0.04] border-blue-500/[0.1] text-blue-400/80` — Lightbulb icon
  - **Warning** (amber): `bg-amber-500/[0.04] border-amber-500/[0.1] text-amber-400/80` — AlertTriangle icon
  - **Critical** (red): `bg-red-500/[0.04] border-red-500/[0.1] text-red-400/80` — OctagonAlert icon
- Each variant: `flex items-start gap-3 p-4 rounded-xl border text-sm`

### 6. Motion & Animation

**Index page entrance:**

- Staggered card reveal: `staggerChildren: 0.03`, each card `{ opacity: 0, y: 12 }` → `{ opacity: 1, y: 0 }` at `duration: 0.4, ease: [0.16, 1, 0.3, 1]`
- Category groups: `whileInView` trigger, base delay offset so groups enter sequentially
- Hero search zone: `initial={{ opacity: 0, y: -8 }}`, no stagger

**Sidebar:**

- Active indicator: keep `layoutId="activeIndicator"` with spring `{ type: "spring", stiffness: 300, damping: 30 }`
- Mobile drawer: keep spring animation

**Hover effects:**

- Featured cards: `hover:scale-[1.01]` with gradient border glow
- Standard cards: `hover:border-blue-500/[0.2]` with subtle glow
- Side items: `hover:bg-white/[0.02] hover:text-white/60`

## Responsive Behavior

| Breakpoint          | Layout                                                   |
| ------------------- | -------------------------------------------------------- |
| < 640px (mobile)    | Single column, sidebar drawer, stacked hero, 1-col cards |
| 640-1023px (tablet) | 2-column card grid, hidden sidebar, FAB menu             |
| 1024px+ (desktop)   | w-64 sidebar + flex content, 3-col cards, featured 2-col |

## Files to Modify

| File                                   | Changes Required                                                          |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `apps/web/app/docs/layout.tsx`         | Background system, sidebar glass surface, header hero area                |
| `apps/web/app/docs/page.tsx`           | Restructure: hero search, quick-start, categorized groups, featured cards |
| `apps/web/components/docs/Section.tsx` | Larger icon/title, decorative gradient line, increased spacing            |
| `apps/web/components/docs/TipBox.tsx`  | Add variant prop: tip (default), warning, critical                        |
| `apps/web/components/docs/types.ts`    | Add `TipVariant` type, `SectionGroup` type                                |

## Files to Keep As-Is

| File                                          | Reason                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/web/components/docs/CodeBlock.tsx`      | Already matches project aesthetic — glass surface, lang tabs, line numbers, copy button |
| `apps/web/components/docs/ScrollProgress.tsx` | Works fine                                                                              |
| `apps/web/components/docs/SearchModal.tsx`    | Works fine, already has glass backdrop                                                  |
| `apps/web/components/docs/EndpointCard.tsx`   | Not used in current docs rendering tree                                                 |
| All sub-pages (`chat/page.tsx`, etc.)         | Content only, no structural changes needed                                              |

## Implementation Order

1. **Background system** — layout.tsx: background, animated grid, ambient orbs, vignette
2. **Sidebar** — layout.tsx: glass surface, grouped categories, inline filter, glow active indicator
3. **Index page** — page.tsx: hero search, quick-start pathway, categorized groups, featured cards, stats bar
4. **Section component** — Section.tsx: larger header, decorative line, spacing
5. **TipBox variants** — TipBox.tsx + types.ts: add variant prop with 3 types
6. **Polish pass** — hover states, entrance animations, responsive testing at all breakpoints
