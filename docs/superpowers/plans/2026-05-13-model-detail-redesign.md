# Model Detail Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Redesign the model ID detail page with an avant-garde, industrial-luxe aesthetic with extracted reusable components, animated radial gauges, and narrative information flow.

**Architecture:** Extract the monolithic 528-line page into typed, focused components under `components/models/detail/`. Type definitions go into `types/model.ts`. Utility functions extracted to `lib/model-utils.ts`. The page orchestrates these components with staggered entrance animations.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, Tailwind CSS v4, Lucide React, existing `GlassCard`/`Button` UI primitives.

---

### File Structure

```
apps/web/
  types/
    model.ts                         # ModelData interface, ProviderConfig type
  lib/
    model-utils.ts                   # getProviderConfig, formatPrice, getModality from providerConfig map
  components/models/detail/
    AmbientBackground.tsx             # Extracted animated background (reused from original)
    RadialGauge.tsx                   # SVG-based animated gauge for context/max tokens
    ModelIdentity.tsx                 # Hero section: logo, name, model ID, provider badge
    PerformancePanel.tsx              # Context + max output radial gauges side by side
    ArchitecturePanel.tsx             # Architecture details with modality tags
    PricingPanel.tsx                  # Pricing breakdown with cache pricing
    ParametersPanel.tsx               # Supported parameter chips
    QuickStartCard.tsx                # CTA card for getting started
    ModelDetailLayout.tsx             # Orchestrator layout component (manages grid, sections)
  app/models/[id]/page.tsx            # Simplified to use ModelDetailLayout
```

### Task Breakdown

---

### Task 1: Extract shared types

**Files:**

- Create: `apps/web/types/model.ts`

**Responsibility:** Single source of truth for model data shape, provider config, and all prop types used by detail components.

- [ ] **Step 1: Define OpenRouterModelData interface**

```typescript
// apps/web/types/model.ts

export interface ModelPricing {
  prompt: string | null;
  completion: string | null;
  input_cache_read: string | null;
  input_cache_write: string | null;
  web_search: string | null;
}

export interface ModelArchitecture {
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
}

export interface TopProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

export interface OpenRouterModelData {
  id: string;
  name: string;
  created: number;
  created_date: string | null;
  description: string | null;
  context_length: number | null;
  pricing: ModelPricing;
  architecture: ModelArchitecture | null;
  top_provider: TopProvider | null;
  supported_parameters: string[];
  knowledge_cutoff: string | null;
}

export interface ProviderTheme {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  accent: string;
}

export interface GaugeData {
  label: string;
  value: string;
  max: string;
  percentage: number;
  color: string;
}
```

---

### Task 2: Extract utility functions

**Files:**

- Create: `apps/web/lib/model-utils.ts`

- [ ] **Step 1: Create the utility module**

```typescript
// apps/web/lib/model-utils.ts
import { Sparkles, Zap, Star, Brain, Activity, Cpu } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";

export const providerConfig: Record<string, ProviderTheme> = {
  openai: {
    icon: Sparkles,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-green-500/20",
    accent: "#34d399",
  },
  anthropic: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
    accent: "#fb923c",
  },
  google: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    accent: "#60a5fa",
  },
  meta: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
    accent: "#818cf8",
  },
  mistral: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
    accent: "#fb7185",
  },
  mistralai: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
    accent: "#fb7185",
  },
  deepseek: {
    icon: Cpu,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-500/20",
    accent: "#2dd4bf",
  },
  xai: {
    icon: Cpu,
    color: "text-red-400",
    gradient: "from-red-500/20 to-orange-500/20",
    accent: "#f87171",
  },
  qwen: {
    icon: Cpu,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
    accent: "#fb923c",
  },
  claude: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
    accent: "#fb923c",
  },
  gemini: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    accent: "#60a5fa",
  },
  llama: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
    accent: "#818cf8",
  },
};

export function getProviderId(modelId: string): string {
  return modelId.split("/")[0].toLowerCase();
}

export function getProviderTheme(modelId: string): ProviderTheme {
  const pid = getProviderId(modelId);
  return (
    providerConfig[pid] || {
      icon: Cpu,
      color: "text-gray-400",
      gradient: "from-gray-500/20 to-gray-500/20",
      accent: "#9ca3af",
    }
  );
}

export function formatPricePerM(
  model: OpenRouterModelData,
  field: "prompt" | "completion",
): string {
  const val = model.pricing?.[field];
  if (!val) return "0.00";
  return (parseFloat(val) * 1000000).toFixed(2);
}

export function formatContextLabel(context: number | null): string {
  return context ? `${(context / 1000).toFixed(0)}K` : "N/A";
}

export function getContextPercentage(context: number | null): number {
  if (!context) return 0;
  return Math.min((context / 1000000) * 100, 100);
}

export function getMaxOutputTokens(model: OpenRouterModelData): string {
  const max = model.top_provider?.max_completion_tokens;
  return max ? `${(max / 1000).toFixed(0)}K` : "N/A";
}

export function getModality(model: OpenRouterModelData): string {
  return model.architecture?.modality || "Text";
}
```

---

### Task 3: AmbientBackground component

**Files:**

- Create: `apps/web/components/models/detail/AmbientBackground.tsx`

Extract the ambient background from the original page into its own component.

- [ ] **Step 1: Create AmbientBackground component**

```tsx
// apps/web/components/models/detail/AmbientBackground.tsx
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]">
      <div className="absolute inset-0 mesh-gradient animate-mesh-shift" />
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-blue-600/8 rounded-full blur-[140px] animate-glow-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px] animate-glow-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] animate-glow-pulse"
        style={{ animationDelay: "4s" }}
      />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
    </div>
  );
}
```

---

### Task 4: RadialGauge component

**Files:**

- Create: `apps/web/components/models/detail/RadialGauge.tsx`

Animated SVG radial gauge showing percentage fill. Used for context length and max output tokens.

- [ ] **Step 1: Create RadialGauge component**

```tsx
// apps/web/components/models/detail/RadialGauge.tsx
"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface RadialGaugeProps {
  label: string;
  value: string;
  sublabel: string;
  percentage: number;
  accentColor?: string;
  delay?: number;
}

export function RadialGauge({
  label,
  value,
  sublabel,
  percentage,
  accentColor = "#818cf8",
  delay = 0,
}: RadialGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const r = 58;
  const circumference = 2 * Math.PI * r;
  const offset =
    circumference - (isInView ? percentage / 100 : 0) * circumference;

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <div className="relative w-[140px] h-[140px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="6"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={accentColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {value}
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            {sublabel}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-gray-400 font-mono font-bold tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}
```

---

### Task 5: ModelIdentity component (Hero)

**Files:**

- Create: `apps/web/components/models/detail/ModelIdentity.tsx`

Asymmetrical hero layout: provider logo floats left with glow, model name cascades right, stats grid below.

- [ ] **Step 1: Create ModelIdentity component**

```tsx
// apps/web/components/models/detail/ModelIdentity.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Hash, CheckCircle, Copy, Cpu, Database, Sparkles } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";
import { formatContextLabel } from "@/lib/model-utils";
import { getProviderLogo } from "@/lib/provider-logos";
import { RadialGauge } from "./RadialGauge";
import {
  getContextPercentage,
  formatPricePerM,
  getMaxOutputTokens,
  getModality,
} from "@/lib/model-utils";

interface ModelIdentityProps {
  model: OpenRouterModelData;
  theme: ProviderTheme;
  onBack: () => void;
}

export function ModelIdentity({ model, theme, onBack }: ModelIdentityProps) {
  const [copied, setCopied] = useState(false);
  const logo = getProviderLogo(model.id);
  const Icon = theme.icon;
  const providerName = model.id.split("/")[0];

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all mb-10"
      >
        <svg
          className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-mono text-xs font-bold tracking-wider">
          Models
        </span>
      </button>

      <div className="relative">
        {/* Ambient glow behind logo */}
        <div
          className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: theme.accent }}
        />

        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Logo — larger, more prominent */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative shrink-0"
          >
            <div
              className="relative w-28 h-28 rounded-3xl overflow-hidden"
              style={{ borderColor: `${theme.accent}33`, borderWidth: 1 }}
            >
              {logo ? (
                <div className="w-full h-full bg-white/5 flex items-center justify-center p-4">
                  <Image
                    src={logo}
                    alt=""
                    width={56}
                    height={56}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={`w-full h-full bg-white/5 flex items-center justify-center ${theme.color}`}
                >
                  <Icon className="w-14 h-14" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Title area */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-gray-500 text-[10px] font-mono font-bold tracking-wider uppercase mb-4">
              <Hash className="w-3 h-3" />
              {providerName}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[0.9] mb-5">
              {model.name.split(":")[0]}
              {model.name.includes(":") && (
                <span className="text-gray-600">
                  :{model.name.split(":").slice(1).join(":")}
                </span>
              )}
            </h1>

            {/* Model ID badge + tags */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button
                onClick={copyId}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold text-xs transition-all"
                style={{
                  backgroundColor: `${theme.accent}15`,
                  borderColor: `${theme.accent}30`,
                  borderWidth: 1,
                  color: theme.accent,
                }}
              >
                <span className="truncate max-w-[220px]">{model.id}</span>
                {copied ? (
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
              {model.context_length && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono font-bold">
                  <Database className="w-3 h-3" />
                  {formatContextLabel(model.context_length)}
                </span>
              )}
              {model.created_date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                  <Sparkles className="w-3 h-3" />
                  {model.created_date}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                ACTIVE
              </span>
            </div>

            {/* Stats row — radial gauges + pricing snapshot */}
            <div className="grid grid-cols-4 gap-4">
              <RadialGauge
                label="Context"
                value={formatContextLabel(model.context_length)}
                sublabel="tokens"
                percentage={getContextPercentage(model.context_length)}
                accentColor="#818cf8"
                delay={0.3}
              />
              <RadialGauge
                label="Max Output"
                value={getMaxOutputTokens(model)}
                sublabel="tokens"
                percentage={
                  model.top_provider?.max_completion_tokens
                    ? Math.min(
                        (model.top_provider.max_completion_tokens / 100000) *
                          100,
                        100,
                      )
                    : 0
                }
                accentColor="#c084fc"
                delay={0.5}
              />
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                  Input
                </span>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
                  ${formatPricePerM(model, "prompt")}
                </span>
                <span className="text-[10px] text-gray-600 font-mono">
                  /1M tokens
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                  Output
                </span>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
                  ${formatPricePerM(model, "completion")}
                </span>
                <span className="text-[10px] text-gray-600 font-mono">
                  /1M tokens
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

---

### Task 6: PerformancePanel component

**Files:**

- Create: `apps/web/components/models/detail/PerformancePanel.tsx`

- [ ] **Step 1: Create PerformancePanel**

```tsx
// apps/web/components/models/detail/PerformancePanel.tsx
"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";
import {
  formatContextLabel,
  getContextPercentage,
  getMaxOutputTokens,
} from "@/lib/model-utils";
import { RadialGauge } from "./RadialGauge";

interface PerformancePanelProps {
  model: OpenRouterModelData;
}

export function PerformancePanel({ model }: PerformancePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Layers className="w-4 h-4 text-blue-400" />
        </div>
        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
          Performance
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/5 bg-[#0A0A0A] p-6 flex flex-col items-center">
          <RadialGauge
            label="Context Window"
            value={formatContextLabel(model.context_length)}
            sublabel="tokens"
            percentage={getContextPercentage(model.context_length)}
            accentColor="#818cf8"
            delay={0.2}
          />
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0A0A0A] p-6 flex flex-col items-center">
          <RadialGauge
            label="Max Output"
            value={getMaxOutputTokens(model)}
            sublabel="tokens"
            percentage={
              model.top_provider?.max_completion_tokens
                ? Math.min(
                    (model.top_provider.max_completion_tokens / 100000) * 100,
                    100,
                  )
                : 0
            }
            accentColor="#c084fc"
            delay={0.4}
          />
        </div>
      </div>
    </motion.div>
  );
}
```

---

### Task 7: ArchitecturePanel component

**Files:**

- Create: `apps/web/components/models/detail/ArchitecturePanel.tsx`

- [ ] **Step 1: Create ArchitecturePanel**

```tsx
// apps/web/components/models/detail/ArchitecturePanel.tsx
"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface ArchitecturePanelProps {
  model: OpenRouterModelData;
}

export function ArchitecturePanel({ model }: ArchitecturePanelProps) {
  const arch = model.architecture;
  if (!arch) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-violet-400" />
        </div>
        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
          Architecture
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="rounded-2xl border border-white/5 bg-[#0A0A0A] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {arch.input_modalities && arch.input_modalities.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-wider">
                Input Modalities
              </div>
              <div className="flex flex-wrap gap-2">
                {arch.input_modalities.map((mod) => (
                  <span
                    key={mod}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[11px] font-bold"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          )}
          {arch.output_modalities && arch.output_modalities.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-wider">
                Output Modalities
              </div>
              <div className="flex flex-wrap gap-2">
                {arch.output_modalities.map((mod) => (
                  <span
                    key={mod}
                    className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono text-[11px] font-bold"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          )}
          {arch.tokenizer && (
            <div>
              <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-wider">
                Tokenizer
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[11px] font-bold">
                {arch.tokenizer}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

---

### Task 8: PricingPanel component

**Files:**

- Create: `apps/web/components/models/detail/PricingPanel.tsx`

- [ ] **Step 1: Create PricingPanel**

```tsx
// apps/web/components/models/detail/PricingPanel.tsx
"use client";

import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";
import { formatPricePerM } from "@/lib/model-utils";

interface PricingPanelProps {
  model: OpenRouterModelData;
}

function PriceRow({
  label,
  value,
  sub,
  accentColor,
}: {
  label: string;
  value: string;
  sub: string;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 font-mono">{label}</span>
      <div className="text-right">
        <span className="text-lg font-bold font-mono tracking-tight text-white">
          ${value}
        </span>
        <span className="text-[10px] text-gray-600 font-mono ml-1.5">
          {sub}
        </span>
      </div>
    </div>
  );
}

export function PricingPanel({ model }: PricingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
          Pricing
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="rounded-2xl border border-white/5 bg-[#0A0A0A] p-5">
        <PriceRow
          label="Input"
          value={formatPricePerM(model, "prompt")}
          sub="/1M tokens"
        />
        <PriceRow
          label="Output"
          value={formatPricePerM(model, "completion")}
          sub="/1M tokens"
        />
        {model.pricing?.input_cache_read && (
          <PriceRow
            label="Cache Read"
            value={(
              parseFloat(model.pricing.input_cache_read) * 1000000
            ).toFixed(2)}
            sub="/1M tokens"
          />
        )}
        {model.pricing?.input_cache_write && (
          <PriceRow
            label="Cache Write"
            value={(
              parseFloat(model.pricing.input_cache_write) * 1000000
            ).toFixed(2)}
            sub="/1M tokens"
          />
        )}
      </div>
    </motion.div>
  );
}
```

---

### Task 9: ParametersPanel + QuickStartCard components

**Files:**

- Create: `apps/web/components/models/detail/ParametersPanel.tsx`
- Create: `apps/web/components/models/detail/QuickStartCard.tsx`

- [ ] **Step 1: Create ParametersPanel**

```tsx
// apps/web/components/models/detail/ParametersPanel.tsx
"use client";

import { motion } from "framer-motion";
import { Code } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface ParametersPanelProps {
  params: string[];
}

export function ParametersPanel({ params }: ParametersPanelProps) {
  if (!params || params.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Code className="w-4 h-4 text-cyan-400" />
        </div>
        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
          Parameters
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="rounded-2xl border border-white/5 bg-[#0A0A0A] p-5">
        <div className="flex flex-wrap gap-2">
          {params.map((param) => (
            <span
              key={param}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-mono text-xs hover:border-blue-500/30 hover:text-white transition-all cursor-default"
            >
              {param}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create QuickStartCard**

```tsx
// apps/web/components/models/detail/QuickStartCard.tsx
"use client";

import { motion } from "framer-motion";
import { Terminal, ExternalLink } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface QuickStartCardProps {
  model: OpenRouterModelData;
}

export function QuickStartCard({ model }: QuickStartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative group">
        <div className="absolute -inset-[1px] rounded-[24px] bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-blue-500/30 opacity-50 group-hover:opacity-80 transition-opacity blur-sm" />
        <div className="relative p-6 rounded-[24px] bg-[#0A0A0A] border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Quick Start
            </span>
          </div>
          <p className="text-gray-500 text-xs mb-5 leading-relaxed">
            Get your API key and start building in minutes.
          </p>
          <button
            onClick={() => window.open("https://openrouter.ai/keys", "_blank")}
            className="relative w-full py-3.5 font-mono text-xs font-bold tracking-wider uppercase transition-all overflow-hidden group/btn text-black rounded-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-100 to-white group-hover/btn:from-blue-400 group-hover/btn:via-violet-400 group-hover/btn:to-blue-400 transition-all duration-500" />
            <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-30 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Using {model.name.split(":")[0]}{" "}
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

### Task 10: Rewrite the model detail page

**Files:**

- Modify: `apps/web/app/models/[id]/page.tsx`

The page becomes a thin orchestrator that delegates to the extracted components.

- [ ] **Step 1: Rewrite the page**

```tsx
// apps/web/app/models/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Info, ArrowLeft } from "lucide-react";
import openRouterModels from "../openrouter-models-2026.json";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme, getMaxOutputTokens } from "@/lib/model-utils";
import { AmbientBackground } from "@/components/models/detail/AmbientBackground";
import { ModelIdentity } from "@/components/models/detail/ModelIdentity";
import { PerformancePanel } from "@/components/models/detail/PerformancePanel";
import { ArchitecturePanel } from "@/components/models/detail/ArchitecturePanel";
import { PricingPanel } from "@/components/models/detail/PricingPanel";
import { ParametersPanel } from "@/components/models/detail/ParametersPanel";
import { QuickStartCard } from "@/components/models/detail/QuickStartCard";

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = decodeURIComponent(params.id as string);
  const model = (openRouterModels as OpenRouterModelData[]).find(
    (m) => m.id === modelId,
  );
  const theme = model ? getProviderTheme(model.id) : null;

  if (!model || !theme) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center relative overflow-hidden">
        <AmbientBackground />
        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"
          >
            <Info className="w-10 h-10 text-gray-500" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">
            Model Not Found
          </h1>
          <p className="text-gray-400 mb-8 font-light">
            The model you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/models")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-mono transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Models
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
      <AmbientBackground />

      {/* HUD corners — editorial framing */}
      <div className="absolute top-24 left-10 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-2xl pointer-events-none z-10 hidden lg:block" />
      <div className="absolute top-24 right-10 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-2xl pointer-events-none z-10 hidden lg:block" />
      <div className="absolute bottom-32 left-10 w-16 h-16 border-l-2 border-b-2 border-white/10 rounded-bl-2xl pointer-events-none z-10 hidden lg:block" />
      <div className="absolute bottom-32 right-10 w-16 h-16 border-r-2 border-b-2 border-white/10 rounded-br-2xl pointer-events-none z-10 hidden lg:block" />

      <div className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ModelIdentity
            model={model}
            theme={theme}
            onBack={() => router.push("/models")}
          />

          {/* Main content grid: 3/5 left, 2/5 right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-16">
            <div className="lg:col-span-3 space-y-10">
              {model.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
                      About
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {model.description}
                  </p>
                </motion.div>
              )}
              <PerformancePanel model={model} />
              <ArchitecturePanel model={model} />
            </div>

            <div className="lg:col-span-2 space-y-8">
              <PricingPanel model={model} />
              {model.knowledge_cutoff && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">
                      Knowledge Cutoff
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <p className="text-white font-mono text-lg tracking-tight">
                    {model.knowledge_cutoff}
                  </p>
                </motion.div>
              )}
              <ParametersPanel params={model.supported_parameters} />
              <QuickStartCard model={model} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 11: Build verification

- [ ] **Step 1: Run the build**

Run: `cd /teamspace/studios/this_studio/osiwa/apps/web && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Fix any build errors**

If errors exist, fix them incrementally and re-run build.
