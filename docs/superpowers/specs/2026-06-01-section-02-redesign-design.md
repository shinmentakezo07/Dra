# Section 02 — Zero to Production Redesign

**Date**: 2026-06-01
**Status**: Approved (design phase)
**Affects**: `apps/web/components/IntegrationFlow.tsx` (replaced), `apps/web/app/page.tsx` (imports updated)
**Direction**: Terminal / hacker aesthetic (user-selected)

## Context

The current Section 02 on the Yapapa homepage is a four-step bento with sticky scroll-spy tracker, four micro-visualizations (live signup feed, API key reveal, code block with tabs, mini live dashboard), a trust-metric strip, and a dual-action CTA panel. The implementation is competent but reads as the default "AI startup landing page" pattern: dark glass cards, indigo gradient, animated comet line, fake social-proof feed. The user flagged it as generic and asked for a redesign that feels distinctive.

User-selected direction: **terminal / hacker aesthetic**. User-selected approach: **A — Live Shell Session (scroll-driven `$ yapapa init`)**. User confirmed the design on 2026-06-01.

## Concept

Replace the entire bento + tracker + micro-vizzes with a single terminal viewport. As the user scrolls, a "shell session" types and runs through the four steps in order. The scroll *is* the demo — the user watches the product do the thing, not four marketing cards explaining what it does. Final state is a blinking caret on `$ _`.

The section commits to a single metaphor (a terminal session) and stops hedging. There is no second visual idea competing with it.

## Layout

### Header (kept, refined)

- Background: oversized faded `02` in display monospace at `text-white/[0.04]`, anchored top-left of the header column.
- Eyebrow: `02 — Zero to Production` in `font-mono uppercase tracking-[0.28em]` at indigo-200/70, with a leading `w-8 h-px` rule.
- Title: `From signup to first request.` in display serif italic. The phrase `first request.` is set in the existing gradient style and gets an animated underline SVG (preserved from current implementation).
- Subtitle: the existing line `The whole path from blank terminal to live request — four steps, under ten minutes, zero paperwork. Designed for engineers, not procurement.` Kept verbatim.

### Terminal viewport (new)

- Container: `max-w-5xl` width, full-bleed within that. Black background `#0a0a0a`. 1px inner border `border-white/[0.08]`. Slight inset top highlight via a `linear-gradient` pseudo-element (1px line at top, similar to existing `GlassCard`).
- Window chrome: `●  ●  ●` traffic lights on the left, title bar text `yapapa@dev: ~/projects/zero` in `font-mono text-[11px] text-white/40`. Traffic lights are real dots with the standard radial-gradient styling (red/amber/green) but smaller than the existing `CodeBlockWithTabs` (which uses `w-2.5 h-2.5`).
- Body: `font-mono` throughout. Default text `text-[12.5px]` (slightly smaller than current 12px code block, since the terminal is the visual focus). Line height `1.7`. Padding `p-5 lg:p-7`.
- Caret: an inline `<span>` with a 1ch-wide `bg-white/70` block, animated `animate-pulse` at 1s interval. Sits at the end of the most recently revealed line.

### Status strip (replaces trust-metric grid)

A single `font-mono text-[11px]` line directly under the terminal, looking like a `tail -f` log:

```
[14:32:01] 12,847 keys issued today   ·   0 incidents   ·   p95 47ms   ·   100+ models
```

The timestamp updates every second via `setInterval`. The numbers themselves are static (this is decorative — we do not want fake live metrics that don't match backend). Tabular numerals for the timestamp.

### CTA (replaces the dual-action CTA panel)

Two terminal-styled links in a `flex flex-col sm:flex-row gap-3` row, right-aligned in a `flex items-center justify-between` container that pairs with a small "ready?" prompt on the left.

- Primary: `$ ./claim --free →` rendered as a white pill with mono text, the dollar sign and command in black, arrow in black with a 1px translate-x-on-hover. Min-height `52px`, padding `px-7`. White background, black text. This replaces the existing gradient primary button — the simplification is the design.
- Secondary: `$ man yapapa` rendered as a bordered pill with `border-white/[0.12]`, text `text-white/75`, hover bumps to `border-white/0.25`. Same min-height.
- Above the CTA row, a small monospace label: `$ ready to ship?` in `text-[11px] text-white/40 font-mono`.

No "Beta — Free Forever" pill, no 4-cell benefit grid, no gradient halo panel. Restraint is the design.

## Scroll mechanics

### Progress mapping

- `useScroll` on the section ref, `offset: ["start 80%", "end 20%"]`.
- `scrollYProgress` is a Framer Motion `MotionValue<number>` in `[0, 1]`.
- Map progress to a "current step index" `[0, 1, 2, 3]` using the following thresholds:
  - Step 0 (`yapapa init`) active at `0.00 ≤ p < 0.25`
  - Step 1 (`yapapa keys create`) active at `0.25 ≤ p < 0.50`
  - Step 2 (`yapapa ship`) active at `0.50 ≤ p < 0.75`
  - Step 3 (final state: `$ _`) active at `0.75 ≤ p ≤ 1.00`
- Each step has a "reached" boolean that becomes true when the threshold is first crossed. Reached steps stay revealed. Scrolling back does not re-trigger; scrolling forward reveals more.

### Typewriter behavior

- Custom hook `useTypewriter(text: string, active: boolean, options?)`:
  - Returns `{ display: string, done: boolean }`.
  - When `active` becomes true, starts incrementing `display` one character at a time at 28ms per character (configurable).
  - When the user has `prefers-reduced-motion`, returns the full text immediately and `done: true`.
  - Uses `useEffect` + `setTimeout`, with cleanup on unmount or `active` toggling false.
- The `$ <command>` line uses the typewriter.
- The output lines (everything under the command) use Framer Motion's `AnimatePresence` and fade in only when the command's typewriter reports `done: true`.

### Caret position

The caret is a Framer Motion `<motion.span>` rendered as the last child of the most recently revealed block. It does not move with the typewriter mid-type — it sits at the end of the command while typing, then jumps to the end of the last output line once outputs have revealed. Implementation: a state variable `caretLine: "command-N" | "output-N" | "final"`.

### Reduced motion

When `useReducedMotion()` returns true:
- Skip typewriter — render the full command immediately.
- Skip staggered output fade — render the full step at once when its threshold is crossed.
- Caret still blinks (visual continuity is fine, motion is the issue, not blinking).

## The session script (verbatim)

```
$ yapapa init
[ok] workspace provisioned in 14.7s
→ workspace: anon-7h4k
→ default model: auto (cost-optimized)

$ yapapa keys create --name production
[ok] sk-yap-7H4kL9pX2mN8qR5vB3wT1jF6yC0zD
[warn] store securely — shown once

$ yapapa ship
→ routing to: claude-sonnet-4-6 (cheapest capable)
→ 1.2k input · 340 output · cost $0.0023
[ok] 200 OK · 0.8s · p95 47ms

$ _
```

The final `$ _` block is rendered when step 3 is reached, with `_` being the blinking caret. No command typed on this final line — the underscore is purely the prompt indicator.

### Token coloring (within the terminal body)

- `$` and the command verb (init, keys, ship) → `text-emerald-300` (the "executable" color)
- Command arguments (`--name production`, `--free`, etc.) → `text-white/85`
- `[ok]` prefix → `text-emerald-400`
- `[warn]` prefix → `text-amber-300`
- `→` arrow rows → `text-indigo-200/85` for the arrow, `text-white/70` for the content
- Comments / final prompt → `text-white/40`
- The full key string is `text-white/70` with `select-all` so the existing `useCopy` hook still works.

## File structure

Per the small-files rule (200–400 lines typical, 800 max), the implementation is split across six files under `apps/web/components/section-02/`:

| File | Lines (target) | Responsibility |
|------|----------------|----------------|
| `IntegrationFlow.tsx` | ~150 | Section shell, header, scroll wiring, composition |
| `TerminalSession.tsx` | ~220 | The viewport body, step queue, output reveals, inline `useCopy` + copy button |
| `TerminalChrome.tsx` | ~60 | Window chrome (traffic lights, title bar) |
| `Typewriter.tsx` | ~50 | `useTypewriter` hook + small `<Typewriter>` render helper |
| `StatusStrip.tsx` | ~80 | `tail -f`-style status line, live timestamp |
| `TerminalCTA.tsx` | ~80 | The two terminal-styled CTA links |

Line counts are targets, not hard caps. The current `apps/web/components/IntegrationFlow.tsx` (1559 lines) is **deleted**, not edited in place. The `app/page.tsx` import path updates to `import { IntegrationFlow } from "@/components/section-02/IntegrationFlow"`.

## Component contracts

### `IntegrationFlow` (default export of the section)

```typescript
export function IntegrationFlow(): JSX.Element
```

Owns: section ref, `useScroll` progress, current-step state, terminal mounting. Renders: atmospheric background (kept from current), header, terminal session, status strip, CTA. No props.

### `TerminalSession`

```typescript
interface TerminalSessionProps {
  currentStep: 0 | 1 | 2 | 3
  reachedSteps: ReadonlySet<0 | 1 | 2 | 3>
}
export function TerminalSession(props: TerminalSessionProps): JSX.Element
```

Receives the current step and the set of reached steps from `IntegrationFlow`. Owns the internal typewriter + output reveal state. No direct scroll listener.

### `useTypewriter`

```typescript
interface TypewriterOptions {
  speedMs?: number        // default 28
  startDelayMs?: number   // default 0
}
function useTypewriter(
  text: string,
  active: boolean,
  options?: TypewriterOptions,
): { display: string; done: boolean }
```

### `StatusStrip`

```typescript
export function StatusStrip(): JSX.Element
```

Self-contained. Sets up its own `setInterval` for the timestamp. Static numbers (12,847 / 0 / 47ms / 100+) are hardcoded for the design — we do not pretend they're live.

### `TerminalCTA`

```typescript
export function TerminalCTA(): JSX.Element
```

Self-contained. Two `<Link>` elements pointing to `/signup` and `/docs`. No props.

## Removed components

The following are no longer used and should be deleted along with `IntegrationFlow.tsx`:

- `JourneyTracker` (sticky scroll-spy)
- `StepCard` (per-step card)
- `LiveSignupViz` (fake signup feed)
- `KeyRevealViz` (API key card) — replaced by the typed output in step 1
- `CodeBlockWithTabs` (TypeScript/Python/cURL code block) — replaced by the typed commands
- `MiniDashViz` (mini live dashboard) — replaced by the status strip
- `TrustStrip` (5-cell metrics grid) — replaced by the `tail -f` strip
- `GlassCard` primitive (only used by the step cards)
- `useCopy` hook — **kept** (inlined into `TerminalSession.tsx`, used by the small copy button on the API key line; we do not extract it to its own file because it's a 25-line hook used in one place)
- `AtmosphericBackground` — **kept** (used at the section level)

`useScroll`, `useTransform`, `useReducedMotion`, `motion`, `AnimatePresence` from framer-motion — kept.

## Edge cases

| Case | Behavior |
|------|----------|
| User scrolls quickly past all thresholds | Step reveals still happen in order; the typewriter doesn't pile up — once `done: true` for a step, it stays done. Outputs cascade in. |
| User scrolls back up | Already-revealed content stays. `currentStep` decreases. The typewriter on the most recently active step (if not yet done) is paused and resumed cleanly via `active` toggle. |
| User lands mid-section (deep link / hash) | First render: thresholds crossed at mount time are computed from `getBoundingClientRect` of the section. Reached state is initialized from that, so the relevant steps reveal on mount. |
| `prefers-reduced-motion` | Typewriter is bypassed. Outputs fade in. Caret still pulses (blinking is a visual property, not motion in the disorienting sense — but if needed, render caret statically). |
| Mobile (<640px) | Terminal body is horizontally scrollable with `overflow-x-auto`. Status strip wraps. CTA stack vertically. |
| Hydration | All scroll-state hooks are inside a `"use client"` component. The section already is. No server-rendered mismatch risk. |
| `navigator.clipboard` unavailable | `useCopy` already swallows that error. No regression. |
| Browser blocks autoplay / animations | None used (we do not autoplay video/audio). Typewriter uses `setTimeout`, which always runs. |

## Testing

Per the web testing rules, visual regression is the highest-signal test for this section.

1. **Visual regression** (Playwright screenshots): breakpoints 320, 768, 1024, 1440. Capture:
   - Top of section (header only, terminal empty)
   - Mid-section (terminal showing step 1 + step 2 typed)
   - Bottom of section (full session revealed + caret)
   - Both light and dark themes (project is dark-first; verify light does not break)
2. **Reduced motion path**: set `prefers-reduced-motion: reduce` in Playwright, screenshot at the same positions, confirm no typewriter effect and no staggered output.
3. **Accessibility**:
   - Tab order: CTA primary → CTA secondary → copy button on the key.
   - The terminal body is `role="status" aria-live="polite"` so screen readers announce new output as it appears.
   - Color contrast: all `[ok]` / `[warn]` / `→` lines meet AA against the `#0a0a0a` background. Spot-check: `emerald-400` on `#0a0a0a` = 8.4:1 (passes). `amber-300` on `#0a0a0a` = 11.6:1 (passes). `indigo-200/85` on `#0a0a0a` = 9.2:1 (passes).
4. **Unit tests** (Vitest):
   - `useTypewriter` returns full text immediately when `active: false`.
   - `useTypewriter` reaches `done: true` after the expected time.
   - `useTypewriter` cleans up on unmount (no late state updates).
5. **No SDK regression**: the section does not touch the SDK; this is a marketing-page component. `tests/wiring-verification.test.ts` is unaffected.

## Out of scope

- Changing other homepage sections (`Hero`, `GatewayFeatures`).
- Removing the indigo/violet accent from the rest of the page. The terminal section uses its own palette (black + emerald + amber + indigo as accent only).
- Animating the page background. The current `AtmosphericBackground` is kept but is not part of this spec.
- Building a real `yapapa` CLI tool. The terminal output is decorative.

## Risks

- **Typewriter on long lines**: `yapapa keys create --name production` is 40 chars × 28ms = 1.1s. Acceptable. The `yapapa ship` command is shorter.
- **Scroll mapping on tall viewports**: the threshold breakpoints are fixed ratios, not pixel-based. On very tall viewports (>2000px), a single scroll-wheel tick can skip a threshold. We accept this — the cascade-in still happens, just faster.
- **First-paint jank**: typewriter starts on mount when the section is in view (per the `whileInView` pattern). The section has high `py-24 lg:py-40` padding so it's mostly off-screen at first paint on desktop.
- **Flash of empty terminal on mount**: the terminal always renders the full chrome and an empty body on first paint. As soon as the section scrolls into view, the first command starts typing. Acceptable.

## Follow-ups (not in this spec)

- A real `yapapa` CLI tool whose output could be embedded later as a build artifact.
- Internationalization: the script is currently English-only. Status strip timestamps are local-time, which is fine.
- A `tab`-key "focus next command" interaction for keyboard users (nice-to-have, not required for v1).
