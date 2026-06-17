# Models Page "Editorial Catalog" Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/models` listing into an "editorial catalog" — warm-dark surface, Instrument Serif hero, one amber accent, mono tabular data, and a ranked leaderboard rail as the signature.

**Architecture:** Pure presentation layer. Data stays from `openrouter-models-2026.json`; existing filter/sort logic is preserved. One new derived `useMemo` feeds a `ModelSpotlight` + `ModelLeaderboard`. Refined `ModelCard` (grid + list). New design tokens added to `globals.css`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (CSS-first `@theme`), Framer Motion, lucide-react. Fonts already loaded: Inter (`--font-inter`), Space Grotesk (`--font-space`), Instrument Serif (`--font-instrument`).

**Spec:** `docs/superpowers/specs/2026-06-17-models-page-editorial-catalog-design.md`

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `apps/web/app/globals.css` | modify | Add `--ink-*`, `--bone`, `--ash`, `--hair`, `--amber` tokens to `@theme inline`; add small utilities |
| `apps/web/app/models/page.tsx` | modify | Warm-shifted page base + refined loading fallback |
| `apps/web/components/models/ModelsExplorer.tsx` | modify | Editorial hero, toolbar, spotlight/leaderboard `useMemo`, layout orchestration, grid/list |
| `apps/web/components/models/ModelCard.tsx` | modify | Refined grid card + dense list row |
| `apps/web/components/models/ModelSpotlight.tsx` | create | Large spotlight card for the #1 popular model |
| `apps/web/components/models/ModelLeaderboard.tsx` | create | Three ranked lists (cheapest output / largest context / most popular) |
| `apps/web/components/models/model-rankings.ts` | create | Pure `useMemo`-friendly ranking functions + shared `RankedList` type |
| `apps/web/tests/models/rankings.test.ts` | create | Unit tests for ranking functions |

**Note on the `Model` type:** The internal shape used by the explorer (id, name, provider, inputPrice, outputPrice, context, logo, popular, created, context_length) is currently inlined in `ModelsExplorer.tsx`. To share it with the new components without a big refactor, define a `CatalogModel` interface in `model-rankings.ts` and have `ModelsExplorer` reuse it (its `models` array already matches). This keeps the new components decoupled and testable.

---

## Task 1: Add design tokens to globals.css

**Files:**
- Modify: `apps/web/app/globals.css` (inside the existing `@theme inline { }` block, after the `--color-neon-*` lines around L24-26)

- [ ] **Step 1: Add tokens to `@theme inline`**

In `apps/web/app/globals.css`, find the `@theme inline { ... }` block. After the `--color-neon-green: #00ff00;` line, add:

```css
    --color-ink-950: #0a0a0c;
    --color-ink-900: #111114;
    --color-ink-800: #18181b;
    --color-bone: #e8e4dc;
    --color-ash: #8a8a8f;
    --color-hair: rgba(255, 255, 255, 0.08);
    --color-amber: #f5a524;
```

This makes `bg-ink-950`, `text-bone`, `text-amber`, `border-hair`, etc. available as Tailwind utilities (Tailwind v4 derives utilities from `@theme` color tokens).

- [ ] **Step 2: Verify build picks up tokens**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -5`
Expected: no new errors (CSS change doesn't affect TS, this just confirms we didn't break parsing).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(models): add editorial catalog design tokens

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create the ranking module + tests (TDD)

**Files:**
- Create: `apps/web/components/models/model-rankings.ts`
- Create: `apps/web/tests/models/rankings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/models/rankings.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  type CatalogModel,
  cheapestOutput,
  largestContext,
  mostPopular,
} from "@/components/models/model-rankings";

const base: CatalogModel = {
  id: "openai/gpt-4o",
  name: "GPT-4o",
  provider: "OpenAI",
  inputPrice: "$2.50",
  outputPrice: "$10.00",
  context: "128K",
  context_length: 128000,
  logo: null,
  popular: false,
  created: 1700000000,
};

function withOver(over: Partial<CatalogModel>): CatalogModel {
  return { ...base, ...over };
}

describe("cheapestOutput", () => {
  it("returns models sorted by output price ascending, top N", () => {
    const models = [
      withOver({ id: "a", outputPrice: "$15.00" }),
      withOver({ id: "b", outputPrice: "$0.50" }),
      withOver({ id: "c", outputPrice: "$3.00" }),
    ];
    const result = cheapestOutput(models, 3).map((m) => m.id);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("ties break by input price ascending", () => {
    const models = [
      withOver({ id: "a", outputPrice: "$1.00", inputPrice: "$5.00" }),
      withOver({ id: "b", outputPrice: "$1.00", inputPrice: "$2.00" }),
    ];
    const result = cheapestOutput(models, 2).map((m) => m.id);
    expect(result).toEqual(["b", "a"]);
  });
});

describe("largestContext", () => {
  it("returns models sorted by context_length descending, top N", () => {
    const models = [
      withOver({ id: "a", context_length: 128000 }),
      withOver({ id: "b", context_length: 2000000 }),
      withOver({ id: "c", context_length: 500000 }),
    ];
    const result = largestContext(models, 3).map((m) => m.id);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("treats null context_length as 0", () => {
    const models = [
      withOver({ id: "a", context_length: 128000 }),
      withOver({ id: "b", context_length: null }),
    ];
    const result = largestContext(models, 2).map((m) => m.id);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("mostPopular", () => {
  it("puts popular models first, then by created descending, then name", () => {
    const models = [
      withOver({ id: "a", popular: false, created: 1700000000, name: "A" }),
      withOver({ id: "b", popular: true, created: 1700000001, name: "B" }),
      withOver({ id: "c", popular: true, created: 1700000010, name: "C" }),
    ];
    const result = mostPopular(models, 3).map((m) => m.id);
    expect(result).toEqual(["c", "b", "a"]);
  });

  it("respects the limit", () => {
    const models = [
      withOver({ id: "a", popular: true, created: 1, name: "A" }),
      withOver({ id: "b", popular: true, created: 2, name: "B" }),
      withOver({ id: "c", popular: true, created: 3, name: "C" }),
    ];
    expect(mostPopular(models, 2).map((m) => m.id)).toEqual(["c", "b"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npm run test -- --run tests/models/rankings.test.ts`
Expected: FAIL — module `@/components/models/model-rankings` not found.

- [ ] **Step 3: Write the implementation**

Create `apps/web/components/models/model-rankings.ts`:

```typescript
// Pure ranking helpers for the models catalog.
// Derived from the existing models array — no data-layer changes.

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  inputPrice: string;
  outputPrice: string;
  context: string;
  context_length: number | null;
  logo: string | null;
  popular: boolean;
  created: number;
}

/** Parse a price string like "$3.00" into a number. "$0.00" → 0. */
function parsePrice(price: string): number {
  const n = parseFloat(price.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : Infinity;
}

/**
 * Top N models by lowest output price.
 * Ties broken by input price ascending.
 */
export function cheapestOutput(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => {
      const byOutput = parsePrice(a.outputPrice) - parsePrice(b.outputPrice);
      if (byOutput !== 0) return byOutput;
      return parsePrice(a.inputPrice) - parsePrice(b.inputPrice);
    })
    .slice(0, limit);
}

/**
 * Top N models by context_length descending.
 * Null context_length is treated as 0.
 */
export function largestContext(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
    .slice(0, limit);
}

/**
 * Top N most-popular models: popular first, then newest (created desc),
 * then name ascending. Matches the explorer's "popular" sort key.
 */
export function mostPopular(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => {
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      if (b.created !== a.created) return b.created - a.created;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npm run test -- --run tests/models/rankings.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/models/model-rankings.ts apps/web/tests/models/rankings.test.ts
git commit -m "feat(models): add ranking helpers with tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Build the `ModelSpotlight` component

**Files:**
- Create: `apps/web/components/models/ModelSpotlight.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/models/ModelSpotlight.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import type { CatalogModel } from "./model-rankings";

interface ModelSpotlightProps {
  model: CatalogModel;
  /** Largest context_length in the dataset, for the fill ratio. */
  maxContext: number;
  /** Display icon when no logo is present. */
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export function ModelSpotlight({
  model,
  maxContext,
  icon: Icon,
  onClick,
}: ModelSpotlightProps) {
  const fillRatio = maxContext > 0 && model.context_length
    ? Math.min(100, Math.round((model.context_length / maxContext) * 100))
    : 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative w-full text-left rounded-2xl bg-ink-900 border border-hair hover:border-amber/40 transition-colors p-7 md:p-9 overflow-hidden"
    >
      {/* ambient amber glow on the price */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-amber/10 blur-3xl animate-glow-pulse pointer-events-none" />

      {/* eyebrow */}
      <div className="relative flex items-center gap-2 mb-6">
        <TrendingUp className="w-3.5 h-3.5 text-amber" />
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-ash">
          Spotlight · Most popular
        </span>
      </div>

      {/* identity */}
      <div className="relative flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-ink-800 border border-hair flex items-center justify-center shrink-0">
          {model.logo ? (
            <Image
              src={model.logo}
              alt={`${model.provider} logo`}
              width={30}
              height={30}
              className="object-contain"
              unoptimized
            />
          ) : Icon ? (
            <Icon className="w-7 h-7 text-bone" />
          ) : null}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-3xl md:text-4xl leading-tight text-bone truncate">
            {model.name}
          </h3>
          <p className="font-mono text-xs text-ash mt-1 truncate">{model.id}</p>
        </div>
      </div>

      {/* pricing */}
      <div className="relative grid grid-cols-2 gap-4 mb-8">
        <div className="border-l border-hair pl-4">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash mb-1">
            Input / 1M
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-bone">
            {model.inputPrice}
          </p>
        </div>
        <div className="border-l border-amber/40 pl-4">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash mb-1">
            Output / 1M
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-amber">
            {model.outputPrice}
          </p>
        </div>
      </div>

      {/* context bar */}
      <div className="relative mb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash">
            Context window
          </span>
          <span className="font-mono text-xs tabular-nums text-bone">
            {model.context}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-ink-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-amber/70"
            initial={{ width: 0 }}
            whileInView={{ width: `${fillRatio}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="relative flex items-center gap-2 font-mono text-xs tracking-[0.15em] uppercase text-ash group-hover:text-amber transition-colors">
        View model
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ModelSpotlight\|error" | head -20`
Expected: no errors referencing ModelSpotlight.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/models/ModelSpotlight.tsx
git commit -m "feat(models): add ModelSpotlight card

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Build the `ModelLeaderboard` component

**Files:**
- Create: `apps/web/components/models/ModelLeaderboard.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/models/ModelLeaderboard.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import type { CatalogModel } from "./model-rankings";

interface RankedList {
  title: string;
  /** Value to show on the right of each row. */
  accessor: (m: CatalogModel) => string;
  models: CatalogModel[];
}

interface ModelLeaderboardProps {
  cheapest: CatalogModel[];
  largest: CatalogModel[];
  popular: CatalogModel[];
  onSelect: (modelId: string) => void;
}

const RANK_STYLES = ["text-amber", "text-bone", "text-ash"];

export function ModelLeaderboard({
  cheapest,
  largest,
  popular,
  onSelect,
}: ModelLeaderboardProps) {
  const lists: RankedList[] = [
    { title: "Cheapest output", accessor: (m) => m.outputPrice, models: cheapest },
    { title: "Largest context", accessor: (m) => m.context, models: largest },
    { title: "Most popular", accessor: () => "", models: popular },
  ];

  return (
    <div className="flex flex-col gap-6">
      {lists.map((list) => (
        <div
          key={list.title}
          className="rounded-2xl bg-ink-900 border border-hair p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-ash">
              {list.title}
            </h4>
            <span className="h-px flex-1 ml-4 bg-hair" />
          </div>
          <ul className="flex flex-col gap-1">
            {list.models.map((model, i) => (
              <li key={model.id}>
                <motion.button
                  type="button"
                  onClick={() => onSelect(model.id)}
                  whileHover={{ x: 2 }}
                  className="group w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-ink-800 transition-colors"
                >
                  <span
                    className={`font-mono text-xs tabular-nums w-6 ${RANK_STYLES[i] ?? "text-ash"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm text-bone truncate group-hover:text-amber transition-colors">
                      {model.name}
                    </span>
                    <span className="block font-mono text-[10px] text-ash truncate">
                      {model.provider}
                    </span>
                  </span>
                  {list.accessor(model) && (
                    <span className="font-mono text-xs tabular-nums text-bone shrink-0">
                      {list.accessor(model)}
                    </span>
                  )}
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ModelLeaderboard\|error" | head -20`
Expected: no errors referencing ModelLeaderboard.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/models/ModelLeaderboard.tsx
git commit -m "feat(models): add ModelLeaderboard ranked lists

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Rebuild `ModelCard` (grid + list)

**Files:**
- Modify: `apps/web/components/models/ModelCard.tsx` (full rewrite of the component body)

- [ ] **Step 1: Rewrite ModelCard**

Replace the **entire contents** of `apps/web/components/models/ModelCard.tsx` with:

```typescript
"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import Image from "next/image";

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    provider: string;
    inputPrice: string;
    outputPrice: string;
    context: string;
    logo: string | null;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
    popular?: boolean;
    speed?: string;
    description?: string;
  };
  index: number;
  onClick: () => void;
  featured?: boolean;
  viewMode?: "grid" | "list";
}

export function ModelCard({
  model,
  index,
  onClick,
  viewMode = "grid",
}: ModelCardProps) {
  const IconComponent = model.icon;

  // --- List view: dense spec-sheet row ---
  if (viewMode === "list") {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          delay: Math.min(index * 0.025, 0.4),
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1] as const,
        }}
        className="group relative w-full text-left grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:gap-6 px-4 py-3.5 border-l-2 border-transparent hover:border-amber hover:bg-ink-800/60 transition-colors rounded-r-lg"
      >
        {/* id + provider */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-bone truncate group-hover:text-amber transition-colors">
              {model.name}
            </span>
            {model.popular && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase text-amber shrink-0">
                <span className="w-1 h-1 rounded-full bg-amber" />
                Hot
              </span>
            )}
          </div>
          <span className="block font-mono text-[11px] text-ash truncate">
            {model.id}
          </span>
        </div>

        {/* context */}
        <span className="hidden sm:block font-mono text-xs tabular-nums text-ash text-right">
          {model.context}
        </span>

        {/* input */}
        <span className="hidden md:block font-mono text-xs tabular-nums text-bone text-right w-20">
          {model.inputPrice}
        </span>

        {/* output */}
        <span className="font-mono text-xs tabular-nums text-amber text-right w-20">
          {model.outputPrice}
        </span>
      </motion.button>
    );
  }

  // --- Grid view: refined card ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        delay: Math.min(index * 0.05, 0.6),
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      className="group cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="relative h-full rounded-xl bg-ink-900 border border-hair p-5 transition-all duration-300 group-hover:border-amber/40 group-hover:-translate-y-0.5 flex flex-col">
        {/* header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-ink-800 border border-hair flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {model.logo ? (
              <Image
                src={model.logo}
                alt={`${model.provider} logo`}
                width={24}
                height={24}
                className="object-contain"
                unoptimized
              />
            ) : IconComponent ? (
              <IconComponent className={`w-5 h-5 ${model.color ?? "text-bone"}`} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-sans font-semibold text-[0.95rem] text-bone leading-snug truncate group-hover:text-amber transition-colors">
              {model.name}
            </h3>
            <p className="font-mono text-[11px] text-ash truncate mt-0.5">
              {model.id}
            </p>
          </div>
          {model.popular && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase text-amber shrink-0 mt-1">
              <span className="w-1 h-1 rounded-full bg-amber" />
              Hot
            </span>
          )}
        </div>

        {/* pricing */}
        <div className="mt-auto pt-4 border-t border-hair space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-ash">
              In / 1M
            </span>
            <span className="font-mono text-sm tabular-nums text-bone">
              {model.inputPrice}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-ash">
              Out / 1M
            </span>
            <span className="font-mono text-sm tabular-nums text-amber">
              {model.outputPrice}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-ash">
              Context
            </span>
            <span className="font-mono text-xs tabular-nums text-bone">
              {model.context}
            </span>
          </div>
        </div>

        {/* hover CTA hint */}
        <div className="mt-4 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-ash opacity-0 group-hover:opacity-100 group-hover:text-amber transition-all">
          <TrendingUp className="w-3 h-3" />
          View details
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ModelCard\|error" | head -20`
Expected: no errors referencing ModelCard. (Note: `featured` prop is now unused but kept on the interface for callers that still pass it — TS won't error on an unused optional prop.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/models/ModelCard.tsx
git commit -m "feat(models): refine ModelCard grid + list views

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Rebuild `ModelsExplorer` (hero, toolbar, spotlight + leaderboard)

**Files:**
- Modify: `apps/web/components/models/ModelsExplorer.tsx` (full rewrite)

- [ ] **Step 1: Rewrite ModelsExplorer**

Replace the **entire contents** of `apps/web/components/models/ModelsExplorer.tsx` with:

```typescript
"use client";

import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Cpu,
  Sparkles,
  Zap,
  Star,
  Brain,
  Activity,
  Grid3x3,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { ModelCard } from "./ModelCard";
import { ModelSpotlight } from "./ModelSpotlight";
import { ModelLeaderboard } from "./ModelLeaderboard";
import { getProviderLogo } from "@/lib/provider-logos";
import {
  type CatalogModel,
  cheapestOutput,
  largestContext,
  mostPopular,
} from "./model-rankings";
import type { OpenRouterModelData } from "@/types/model";

// ---- Provider display config (logos + names) ----
function getProviderFromId(modelId: string): string {
  return modelId.split("/")[0].toLowerCase();
}

function getProviderDisplayName(providerId: string): string {
  const map: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    moonshotai: "Moonshot",
    moonshot: "Moonshot",
    meta: "Meta",
    mistralai: "Mistral",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    "deepseek-ai": "DeepSeek",
    xai: "xAI",
    alibaba: "Alibaba",
    qwen: "Qwen",
    zhipuai: "Zhipu",
    zhipu: "Zhipu",
    qw: "Moonshot",
    minimax: "MiniMax",
    minimaxai: "MiniMax",
    glm: "GLM",
  };
  return (
    map[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1)
  );
}

const providers = [
  "All",
  "OpenAI",
  "Anthropic",
  "Google",
  "Moonshot",
  "Meta",
  "Mistral",
  "DeepSeek",
  "xAI",
];

const providerIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  OpenAI: Sparkles,
  Anthropic: Zap,
  Google: Star,
  Moonshot: Brain,
  Meta: Cpu,
  Mistral: Activity,
  DeepSeek: Cpu,
  xAI: Cpu,
};

interface ModelsExplorerProps {
  initialModels: OpenRouterModelData[];
}

type SortOption = "popular" | "name" | "price-low" | "price-high" | "context";
type ViewMode = "grid" | "list";

export function ModelsExplorer({ initialModels }: ModelsExplorerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const deferredQuery = useDeferredValue(searchQuery);
  const deferredProvider = useDeferredValue(selectedProvider);
  const isSearchStale = searchQuery !== deferredQuery;

  // ---- Build the catalog models (preserved logic) ----
  const models = useMemo<CatalogModel[]>(() => {
    return initialModels.map((model) => {
      const providerId = getProviderFromId(model.id);
      const inputPrice = model.pricing?.prompt
        ? `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}`
        : "$0.00";
      const outputPrice = model.pricing?.completion
        ? `$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)}`
        : "$0.00";
      const context = model.context_length
        ? `${(model.context_length / 1000).toFixed(0)}K`
        : "N/A";
      const logo = getProviderLogo(model.id);

      return {
        id: model.id,
        name: model.name,
        provider: getProviderDisplayName(providerId),
        inputPrice,
        outputPrice,
        context,
        context_length: model.context_length,
        logo,
        popular: model.created > 1743465600,
        created: model.created,
      };
    });
  }, [initialModels]);

  // ---- Filter + sort (preserved logic) ----
  const filteredAndSortedModels = useMemo(() => {
    const filtered = models.filter((model) => {
      const q = deferredQuery.toLowerCase();
      const matchesSearch =
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        model.id.toLowerCase().includes(q);
      const matchesProvider =
        deferredProvider === "All" ||
        model.provider.toLowerCase().includes(deferredProvider.toLowerCase());
      return matchesSearch && matchesProvider;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low": {
          const aPrice = parseFloat(a.inputPrice.replace("$", ""));
          const bPrice = parseFloat(b.inputPrice.replace("$", ""));
          return aPrice - bPrice;
        }
        case "price-high": {
          const aPriceH = parseFloat(a.inputPrice.replace("$", ""));
          const bPriceH = parseFloat(b.inputPrice.replace("$", ""));
          return bPriceH - aPriceH;
        }
        case "context": {
          const aCtx = parseInt(a.context.replace("K", "")) || 0;
          const bCtx = parseInt(b.context.replace("K", "")) || 0;
          return bCtx - aCtx;
        }
        case "popular":
        default:
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.name.localeCompare(b.name);
      }
    });
  }, [models, deferredQuery, deferredProvider, sortBy]);

  // ---- Leaderboard + spotlight (derived) ----
  const maxContext = useMemo(
    () =>
      models.reduce((max, m) => Math.max(max, m.context_length ?? 0), 0),
    [models],
  );

  const rankings = useMemo(() => {
    return {
      cheapest: cheapestOutput(models, 3),
      largest: largestContext(models, 3),
      popular: mostPopular(models, 3),
    };
  }, [models]);

  const spotlightModel = rankings.popular[0];
  const spotlightIcon = spotlightModel
    ? providerIcons[spotlightModel.provider]
    : undefined;

  const hasActiveFilters = searchQuery !== "" || selectedProvider !== "All";

  const handleModelClick = (modelId: string) => {
    router.push(`/models/${encodeURIComponent(modelId)}`);
  };

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = { All: models.length };
    models.forEach((m) => {
      counts[m.provider] = (counts[m.provider] || 0) + 1;
    });
    return counts;
  }, [models]);

  const providerCount = new Set(models.map((m) => m.provider)).size;

  return (
    <section className="relative w-full pt-10 pb-24 md:pt-16 md:pb-32 px-4 bg-ink-950 overflow-hidden">
      {/* subtle hairline grid backdrop */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.025] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ===== Editorial hero ===== */}
        <div className="mb-14 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[11px] tracking-[0.3em] uppercase text-ash mb-6"
          >
            Model Registry · {models.length} models · {providerCount} providers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="font-display text-bone leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
          >
            Every model, one bill.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="h-px w-full max-w-xs bg-hair my-7 origin-left"
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-ash max-w-xl"
          >
            Transparent per-token pricing across {providerCount} providers.
            Search, compare, and route to the right model.
          </motion.p>
        </div>

        {/* ===== Toolbar ===== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-12 md:mb-16 rounded-2xl bg-ink-900 border border-hair overflow-hidden"
        >
          {/* search row */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-hair">
            <Search className="w-4 h-4 text-ash shrink-0" />
            <input
              type="text"
              placeholder="Search by name, provider, or model ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-bone placeholder:text-ash/60 font-mono text-sm"
            />
            {(searchQuery || isSearchStale) && (
              <span
                className={`font-mono text-xs tabular-nums px-2.5 py-1 rounded-md border ${
                  isSearchStale
                    ? "border-amber/20 text-amber bg-amber/5"
                    : "border-hair text-bone bg-ink-800"
                }`}
              >
                {isSearchStale ? "…" : filteredAndSortedModels.length}
              </span>
            )}
          </div>

          {/* filters row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {providers.map((provider) => {
                const isActive = selectedProvider === provider;
                const count = providerCounts[provider] || 0;
                return (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-[11px] tracking-wider uppercase transition-colors ${
                      isActive
                        ? "bg-amber text-ink-950"
                        : "text-ash hover:text-bone hover:bg-ink-800 border border-hair"
                    }`}
                  >
                    {provider}
                    <span
                      className={`text-[9px] tabular-nums ${
                        isActive ? "text-ink-950/60" : "text-ash/60"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 shrink-0 lg:border-l lg:border-hair lg:pl-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-ash" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-none outline-none text-bone text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  <option value="popular" className="bg-ink-900">
                    Popular
                  </option>
                  <option value="name" className="bg-ink-900">
                    Name
                  </option>
                  <option value="price-low" className="bg-ink-900">
                    Price ↑
                  </option>
                  <option value="price-high" className="bg-ink-900">
                    Price ↓
                  </option>
                  <option value="context" className="bg-ink-900">
                    Context
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1 border border-hair rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-ink-800 text-amber"
                      : "text-ash hover:text-bone"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-ink-800 text-amber"
                      : "text-ash hover:text-bone"
                  }`}
                  aria-label="List view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== Spotlight + Leaderboard (only when no filters active) ===== */}
        {spotlightModel && !hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mb-16 md:mb-20"
          >
            <ModelSpotlight
              model={spotlightModel}
              maxContext={maxContext}
              icon={spotlightIcon}
              onClick={() => handleModelClick(spotlightModel.id)}
            />
            <ModelLeaderboard
              cheapest={rankings.cheapest}
              largest={rankings.largest}
              popular={rankings.popular}
              onSelect={handleModelClick}
            />
          </motion.div>
        )}

        {/* ===== Catalog header ===== */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <h2 className="font-sans text-xl font-semibold tracking-tight text-bone">
              {hasActiveFilters ? "Results" : "All models"}
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-ash">
            {filteredAndSortedModels.length} model
            {filteredAndSortedModels.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ===== Catalog grid/list ===== */}
        {filteredAndSortedModels.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {filteredAndSortedModels.map((model, i) => {
                const Icon = providerIcons[model.provider];
                return (
                  <ModelCard
                    key={model.id}
                    model={{
                      ...model,
                      icon: Icon,
                      color: "text-bone",
                    }}
                    index={i}
                    onClick={() => handleModelClick(model.id)}
                    viewMode="grid"
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-ink-900 border border-hair p-2 md:p-4">
              {/* column header */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:gap-6 px-4 py-2 border-b border-hair mb-1">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash">
                  Model · ID
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash text-right w-auto">
                  Context
                </span>
                <span className="hidden md:block font-mono text-[10px] tracking-[0.2em] uppercase text-ash text-right w-20">
                  In / 1M
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber text-right w-20">
                  Out / 1M
                </span>
              </div>
              {filteredAndSortedModels.map((model, i) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  index={i}
                  onClick={() => handleModelClick(model.id)}
                  viewMode="list"
                />
              ))}
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ink-900 border border-hair mb-6">
              <Search className="w-6 h-6 text-ash" />
            </div>
            <h3 className="font-display text-2xl text-bone mb-2">
              No models match.
            </h3>
            <p className="font-mono text-sm text-ash mb-8">
              Try a different search or provider.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedProvider("All");
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-amber/40 text-amber font-mono text-xs tracking-wider uppercase hover:bg-amber hover:text-ink-950 transition-colors"
            >
              Clear filters
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ModelsExplorer\|error" | head -30`
Expected: no errors referencing ModelsExplorer.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/models/ModelsExplorer.tsx
git commit -m "feat(models): rebuild explorer with editorial hero, toolbar, spotlight + leaderboard

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Refine `page.tsx` base + loading fallback

**Files:**
- Modify: `apps/web/app/models/page.tsx`

- [ ] **Step 1: Update page.tsx**

Replace the **entire contents** of `apps/web/app/models/page.tsx` with:

```typescript
import type { Metadata } from "next";
import modelData from "./openrouter-models-2026.json";
import { ModelsExplorer } from "@/components/models/ModelsExplorer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Model Registry — Yapapa",
  description:
    "Browse 100+ AI models with transparent per-token pricing. Compare capabilities, context windows, and costs.",
};

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center w-full min-h-[80vh] justify-center bg-ink-950 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* amber skeleton pulse */}
        <div className="w-24 h-1.5 rounded-full bg-ink-800 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-amber/60 animate-glow-pulse" />
        </div>
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-ash">
          Loading registry
        </p>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-ink-950 text-bone min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
        <ModelsExplorer initialModels={modelData} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "models/page\|error" | head -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/models/page.tsx
git commit -m "feat(models): warm-shifted page base + refined loading fallback

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Verify and UPDATE.md

**Files:**
- Modify: `UPDATE.md` (append entry following the project template)

- [ ] **Step 1: Run the full verification suite**

Run all of these and confirm green:

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -5
cd apps/web && npm run test -- --run tests/models/rankings.test.ts
bash scripts/smoke-test.sh
```

Expected: tsc clean; rankings tests pass; smoke-test passes (no wiring-verification regression — we only touched presentation files, no SDK/mock changes).

- [ ] **Step 2: Append UPDATE.md entry**

Read the tail of `UPDATE.md` first to continue the numbering and match the format of the latest entry, then append:

````markdown
## [N]. Models Page "Editorial Catalog" Redesign

**Session**: models-editorial-catalog
**Date**: 2026-06-17 [HH:MM]

### Why

The `/models` listing used a generic neon-blue/violet/cyan glass aesthetic that read as templated. Redesigned it as an "editorial catalog" — pricing as the hero data, an Instrument Serif headline (font already loaded but unused), a single amber accent, mono tabular data throughout, and a ranked leaderboard rail as the signature. Pure presentation; data layer untouched.

### Files Changed

| File | Lines | Change Type |
| --- | --- | --- |
| apps/web/app/globals.css | L24-32 | modified (added design tokens) |
| apps/web/components/models/model-rankings.ts | L1-60 | created |
| apps/web/tests/models/rankings.test.ts | L1-80 | created |
| apps/web/components/models/ModelSpotlight.tsx | L1-110 | created |
| apps/web/components/models/ModelLeaderboard.tsx | L1-90 | created |
| apps/web/components/models/ModelCard.tsx | L1-200 | rewritten |
| apps/web/components/models/ModelsExplorer.tsx | L1-450 | rewritten |
| apps/web/app/models/page.tsx | L1-40 | rewritten |

### Before

```tsx
// apps/web/components/models/ModelsExplorer.tsx — centered glass hero with multi-blob glow
<div className="text-center mb-20">
  <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6">
    Every Model, <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">One Bill</span>
  </h2>
  ...
</div>
```

### After

```tsx
// apps/web/components/models/ModelsExplorer.tsx — left-aligned editorial hero, Instrument Serif
<motion.h1
  className="font-display text-bone leading-[0.95] tracking-tight"
  style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
>
  Every model, one bill.
</motion.h1>
```

### Notes

- New ranking helpers (`cheapestOutput`, `largestContext`, `mostPopular`) derived from the existing models array — no data-layer or fetch changes. Covered by unit tests.
- New design tokens in `globals.css` `@theme inline`: `--color-ink-*`, `--color-bone`, `--color-ash`, `--color-hair`, `--color-amber`.
- Spotlight + leaderboard appear only when no filters are active.
- Motion preserved (Framer Motion entrances, hover micro-interactions, one ambient amber pulse); respects `prefers-reduced-motion` via existing globals handling.
- `npx tsc --noEmit` clean; `tests/models/rankings.test.ts` green; smoke-test passes.
````

- [ ] **Step 3: Commit**

```bash
git add UPDATE.md
git commit -m "docs(models): record editorial catalog redesign in UPDATE.md

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Hero ✓ (Task 6), toolbar ✓ (Task 6), spotlight+leaderboard ✓ (Tasks 3+4+6), grid card ✓ (Task 5), list view ✓ (Task 5), empty/loading states ✓ (Tasks 6+7), tokens ✓ (Task 1), signature leaderboard ✓ (Task 4), motion ✓ (all), color ✓ (Task 1+all), typography ✓ (all), verification ✓ (Task 8).
- **Placeholders:** none — every code step has complete code.
- **Type consistency:** `CatalogModel` defined in Task 2, consumed identically in Tasks 3, 4, 6. The `ModelCard` keeps its existing loose `model` prop interface (unchanged shape) so the explorer's call sites stay compatible. `cheapestOutput`/`largestContext`/`mostPopular` signatures match between definition (Task 2) and usage (Task 6).
- **Risk:** `featured` prop on `ModelCard` is now unused but retained on the interface — the old explorer passed `featured={i === 0}`; the new explorer does not pass it, which is fine (optional prop). No other caller of `ModelCard` exists in the repo per the exploration.
