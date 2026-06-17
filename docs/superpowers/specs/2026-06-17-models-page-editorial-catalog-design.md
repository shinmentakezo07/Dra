# Models Page — "Editorial Catalog" Redesign

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation
**Scope:** `app/models/page.tsx`, `components/models/ModelsExplorer.tsx`, `components/models/ModelCard.tsx`, new leaderboard + spotlight components, `globals.css` token additions.

## Thesis

Treat the model registry like a financial broadsheet: **pricing is the hero data, typography carries the personality, one amber accent does all the work.** Distinctive and attractive while staying true to a dark developer audience. Replaces the current generic neon-blue/violet/cyan glow aesthetic.

## Subject & audience

- **Subject:** Yapapa's Universal LLM Gateway model registry — 300+ models with transparent per-token pricing from multiple providers.
- **Audience:** developers and teams choosing models by price and capability.
- **The page's single job:** let a developer quickly find the right model by price, context, or provider — and feel that pricing is the point.

## Hard constraints (from user)

- Stay dark (no light mode, no major palette inversion).
- Keep motion (Framer Motion entrance + hover); refine, don't strip.
- Do not touch the data layer — data stays from `openrouter-models-2026.json`, existing filter/sort logic is preserved. Pure visual/layout work + one derived `useMemo`.
- No new dependencies — work with what's installed (Tailwind v4, Framer Motion, lucide-react).

## Design token system

### Color

Warm-shifted dark surface (not pure `#000`), one amber accent tied to money. Current blue/violet/cyan glows are retired.

| Token | Value | Role |
| --- | --- | --- |
| `--ink-950` | `#0a0a0c` | page base |
| `--ink-900` | `#111114` | card surface |
| `--ink-800` | `#18181b` | raised / hover surface |
| `--bone` | `#e8e4dc` | primary text (warm off-white) |
| `--ash` | `#8a8a8f` | secondary text |
| `--hair` | `rgba(255,255,255,0.08)` | all hairline rules / borders |
| `--amber` | `#f5a524` | the single accent — active states, output price, rank numerals |

Pricing color rule: **input price = `bone`, output price = `amber`.** No competing green/violet. Provider logos retain their original brand colors (they are images, not themed).

### Typography

Three voices, all already loaded via `next/font/google` in `layout.tsx` (`--font-inter`, `--font-space`, `--font-instrument`). Instrument Serif is currently **unused** — this design puts it to work.

- **Instrument Serif** — hero headline only. The one deliberate aesthetic risk (a serif on a dark dev catalog).
- **Inter** — body, card names, labels, section headers.
- **Space Mono** — *every* number and ID: prices, context values, counts, model IDs, sort labels, leaderboard rows. `font-variant-numeric: tabular-nums`. This is the "catalog" voice.

Type scale (display): hero serif ~ `clamp(2.75rem, 7vw, 5.5rem)`, section headers Inter 1rem/600 with mono eyebrow, card name Inter 0.95rem/600.

### Layout

All sections sit inside `max-w-7xl`, left-aligned rhythm with hairline dividers (no centered glass stacks).

1. **Editorial hero** (left-aligned, not centered):
   - Mono eyebrow: `MODEL REGISTRY · {n} MODELS` (ash, tracked).
   - Huge serif headline: `Every model, one bill.` — `bone`, tight leading.
   - Hairline rule.
   - Inter supporting line: `Transparent per-token pricing across {providers} providers.`
   - **No** floating glow blobs, **no** quick-stat pills (the stats move into the eyebrow + leaderboard).

2. **Toolbar** — one hairline-divided bar (replaces stacked glass panels):
   - Search field (left, expands).
   - Provider filter pills (horizontal, with counts; active = amber fill + black text; inactive = transparent + ash).
   - Sort dropdown + grid/list toggle (right).
   - All in `--ink-900` with `--hair` borders.

3. **Spotlight + Leaderboard** (replaces "Featured" bento — the signature):
   - **Left (~60%) — Spotlight:** one large card for the most popular model. Serif name (Instrument Serif), large amber output price, mono input price, a context-window bar (mono label + filled bar). Subtle ambient amber pulse on the price.
   - **Right (~40%) — Leaderboard rail:** three stacked ranked lists, each a hairline-divided block with a mono header:
     - `CHEAPEST OUTPUT` — top 3 by lowest output price.
     - `LARGEST CONTEXT` — top 3 by context length.
     - `MOST POPULAR` — top 3 popular (by `created`, then name).
     Each row: amber rank numeral `01/02/03`, model name (Inter), provider (ash), value (mono). Rows are clickable → `/models/{id}`.
   - Computed via `useMemo` from the existing `models` array — no data-layer changes.

4. **Catalog grid** (4-up on lg, denser than current 3-up):
   - Refined card (see Card spec below). Hover = hairline → amber + subtle lift + logo scale.
   - Staggered Framer Motion entrance (tighter delays than current).

5. **List view** — a dense spec sheet:
   - Hairline rows, aligned mono columns: `ID · PROVIDER · CONTEXT · IN · OUT`.
   - Header row in ash mono. Row hover = `--ink-800` + amber left hairline.

6. **Empty / loading states:**
   - Empty: editorial mono message ("No models match.") + `Clear filters` action in amber.
   - Loading fallback (`page.tsx`): warm-shifted surface, mono "Loading registry", amber skeleton pulse (no bouncing dots, no glow orbs).

### Card spec (grid)

- Container: `--ink-900`, `--hair` border, `rounded-xl`, `p-5`, hover lifts `-translate-y-0.5` + border→amber.
- Header: logo (in a `--ink-800` rounded tile) + name (Inter 0.95rem/600, `bone`) + provider (mono, ash). Popular badge = amber dot + "Popular" (mono), not the current blue pill.
- Middle: model id in mono ash, truncated.
- Hairline divider.
- Footer: two-column pricing — `INPUT` (`bone`, mono, tabular) / `OUTPUT` (`amber`, mono, tabular), each with `/1M` suffix in ash. Context badge as a small mono chip.
- CTA: full-width hairline-bordered "View details" → hover fills amber, black text. Removes the shimmer sweep.

## Signature

The **leaderboard rail** — three ranked mini-lists derived from existing data. Turns a flat catalog into a scannable index for finding deals. No generic models page has this; it embodies the brief ("pricing is the point") by surfacing the cheapest/largest/most-wanted models at a glance.

## Motion

Kept but disciplined (respects `prefers-reduced-motion`):
- Framer Motion entrance: section reveals + staggered card list (opacity/translateY), delays ≤ current, `ease [0.16,1,0.3,1]`.
- Hover micro-interactions: card lift + amber hairline + logo scale.
- One ambient animation: amber pulse on spotlight price (`animate-glow-pulse` reuse, amber-tinted).
- **Removed:** shimmer sweep, multi-blob glow background, gradient-text headline, bouncing loader dots.

## Components

| Component | Status | Responsibility |
| --- | --- | --- |
| `ModelsExplorer` | modified | hero, toolbar, layout orchestration, leaderboard/spotlight `useMemo`, grid/list |
| `ModelCard` | modified | refined grid card + dense list row per spec |
| `ModelSpotlight` | new | large spotlight card |
| `ModelLeaderboard` | new | three ranked lists |
| `page.tsx` | modified | warm-shifted base + refined loading fallback |
| `globals.css` | modified | add `--ink-*`, `--bone`, `--ash`, `--hair`, `--amber` tokens + any small utilities |

## Out of scope

- Per-model detail page `/models/[id]`.
- Data schema, fetching, or filter/sort logic changes (logic preserved; only presentation changes).
- New npm dependencies.
- Light mode.

## Verification

- `npx tsc --noEmit -p apps/web/tsconfig.json` passes (no `as any`/`@ts-ignore`).
- `npm run test:web` — existing tests pass (esp. any in `tests/` touching models).
- Visual: dev server, check grid + list + empty + leaderboard at desktop and mobile widths; confirm `prefers-reduced-motion` kills ambient animation.
- UPDATE.md entry appended per project rules.
