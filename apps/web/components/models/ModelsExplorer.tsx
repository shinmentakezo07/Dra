"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  TrendingUp,
  Cpu,
  Grid3x3,
  List,
  SlidersHorizontal,
  X,
  Hash,
  CornerDownLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { useState, useMemo, useDeferredValue, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ModelCard } from "./ModelCard";
import { getProviderLogo } from "@/lib/provider-logos";
import { providerConfig } from "@/lib/model-utils";
import type { OpenRouterModelData } from "@/types/model";

// ── types ───────────────────────────────────────────────────────────
interface Model {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  inputPrice: string;
  outputPrice: string;
  inputPriceNum: number;
  outputPriceNum: number;
  context: string;
  logo: string | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  accent: string;
  popular: boolean;
  speed: string;
  description?: string;
  maxOutput: string;
  paramCount: number;
}

interface ModelsExplorerProps {
  initialModels: OpenRouterModelData[];
}

type SortOption = "popular" | "name" | "price-low" | "price-high" | "context";
type ViewMode = "grid" | "list";

const EASE = [0.16, 1, 0.3, 1] as const;

// ── sort menu config ────────────────────────────────────────────────
interface SortItem {
  value: SortOption;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}
const SORT_ITEMS: SortItem[] = [
  {
    value: "popular",
    label: "Popular",
    hint: "Trending first",
    icon: TrendingUp,
  },
  { value: "name", label: "Name", hint: "A → Z", icon: Hash },
  {
    value: "price-low",
    label: "Price ↑",
    hint: "Cheapest first",
    icon: ChevronDown,
  },
  {
    value: "price-high",
    label: "Price ↓",
    hint: "Premium first",
    icon: ChevronDown,
  },
  { value: "context", label: "Context", hint: "Largest window", icon: Cpu },
];

// ── sort menu component ─────────────────────────────────────────────
interface SortMenuProps {
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  sortRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function SortMenu({
  sortBy,
  setSortBy,
  open,
  setOpen,
  sortRef,
  onKeyDown,
}: SortMenuProps) {
  const active = SORT_ITEMS.find((s) => s.value === sortBy) ?? SORT_ITEMS[0];
  const ActiveIcon = active.icon;

  return (
    <div ref={sortRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort models, currently ${active.label}`}
        className="group flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 transition-all duration-300 hover:border-blue-500/30 hover:bg-black/50"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-blue-400" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500">
          Sort
        </span>
        <span className="h-3 w-px bg-white/10" />
        <ActiveIcon className="h-3.5 w-3.5 text-blue-400" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-white">
          {active.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ${
            open ? "rotate-180 text-blue-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Sort options"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute left-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {/* menu header */}
            <li className="flex items-center gap-2 px-2.5 py-1.5" aria-hidden>
              <SlidersHorizontal className="h-3 w-3 text-gray-600" />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-gray-600">
                Sort Registry
              </span>
            </li>
            <li className="mx-1.5 mb-1 h-px bg-white/5" aria-hidden />

            {SORT_ITEMS.map((item) => {
              const isActive = sortBy === item.value;
              const Icon = item.icon;
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setSortBy(item.value);
                      setOpen(false);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-200 ${
                      isActive ? "bg-blue-500/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isActive
                          ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                          : "border-white/5 bg-white/[0.02] text-gray-500 group-hover:text-gray-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-white">
                        {item.label}
                      </span>
                      <span className="block font-mono text-[9px] lowercase tracking-wide text-gray-500">
                        {item.hint}
                      </span>
                    </span>
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── provider resolution ─────────────────────────────────────────────
/**
 * Resolve a clean provider display name from a raw model id.
 *
 * Many ids in the dataset are single-segment (no `/`) — e.g. `gpt-5.4`,
 * `gemini-3-pro-preview`, `glm-4.7`, `grok-4.1-fast-reasoning`,
 * `deepseek-v3.2`, `llama3.3-70b-instruct`, `o3-mini`. The first `/`-segment
 * alone is therefore not a reliable provider key. We match against a set of
 * known provider keywords (checked in priority order) so the right label and
 * accent are attached regardless of id shape.
 */
const PROVIDER_KEYWORDS: { match: RegExp; name: string }[] = [
  { match: /\b(gpt|o3|o4|openai|oss)\b/i, name: "OpenAI" },
  { match: /\bclaude\b/i, name: "Anthropic" },
  { match: /\b(gemini|gemma)\b/i, name: "Google" },
  { match: /\bgrok\b/i, name: "xAI" },
  { match: /\bqwen\b/i, name: "Alibaba" },
  { match: /\bdeepseek\b/i, name: "DeepSeek" },
  { match: /\b(llama|meta)\b/i, name: "Meta" },
  { match: /\b(mistral|nemotron)\b/i, name: "Mistral" },
  { match: /\bglm\b/i, name: "Zhipu" },
  { match: /\b(moonshot|kimi)\b/i, name: "Moonshot" },
  { match: /\bminimax\b/i, name: "MiniMax" },
];

function resolveProvider(modelId: string): { name: string; id: string } {
  const raw = modelId.split("/")[0].toLowerCase();
  // Exact-segment lookup first (covers `moonshotai/...`, `deepseek-ai/...`, etc.).
  const exact: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    moonshot: "Moonshot",
    moonshotai: "Moonshot",
    meta: "Meta",
    mistral: "Mistral",
    mistralai: "Mistral",
    deepseek: "DeepSeek",
    "deepseek-ai": "DeepSeek",
    xai: "xAI",
    alibaba: "Alibaba",
    qwen: "Alibaba",
    zhipu: "Zhipu",
    zhipuai: "Zhipu",
    minimax: "MiniMax",
    minimaxai: "MiniMax",
    "meta-llama": "Meta",
  };
  if (exact[raw]) return { name: exact[raw], id: raw };

  // Keyword fallback — scan the full id so single-segment ids resolve correctly.
  for (const { match, name } of PROVIDER_KEYWORDS) {
    if (match.test(modelId)) return { name, id: raw };
  }

  return {
    name: raw.charAt(0).toUpperCase() + raw.slice(1),
    id: raw,
  };
}

function formatPrice(val: string | null | undefined): {
  label: string;
  num: number;
} {
  if (!val) return { label: "$0.00", num: 0 };
  const num = parseFloat(val) * 1_000_000;
  return { label: `$${num.toFixed(2)}`, num: Number.isFinite(num) ? num : 0 };
}

function formatMaxOut(model: OpenRouterModelData): string {
  const max = model.top_provider?.max_completion_tokens;
  return max ? `${(max / 1000).toFixed(0)}K` : "—";
}

// ── HUD: animated count-up ──────────────────────────────────────────
function AnimatedCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  // Respect reduced motion: jump straight to value, no animation.
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced || display === value) return;
    let frame = 0;
    const ticks = 32;
    const animate = () => {
      frame++;
      const t = frame / ticks;
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(eased * value));
      if (frame < ticks) {
        id = window.setTimeout(animate, 18);
      }
    };
    let id = window.setTimeout(animate, 18);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefersReduced]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

// ── HUD: price-distribution bar ─────────────────────────────────────
function PriceDistributionBar({ models }: { models: Model[] }) {
  const buckets = useMemo(() => {
    const tiers = [
      { label: "Free", max: 0.01, count: 0, color: "#34d399" },
      { label: "≤$1", max: 1, count: 0, color: "#22d3ee" },
      { label: "≤$3", max: 3, count: 0, color: "#60a5fa" },
      { label: "≤$5", max: 5, count: 0, color: "#a78bfa" },
      { label: "$5+", max: Infinity, count: 0, color: "#f472b6" },
    ];
    models.forEach((m) => {
      const v = m.inputPriceNum;
      for (const t of tiers)
        if (v <= t.max) {
          t.count++;
          break;
        }
    });
    return tiers.filter((t) => t.count > 0);
  }, [models]);

  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
          Price Distribution
        </span>
        <span className="font-mono text-[10px] text-gray-700">$/1M in</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.03]">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="h-full transition-all duration-700"
            style={{
              width: `${(b.count / total) * 100}%`,
              backgroundColor: b.color,
            }}
            title={`${b.label}: ${b.count} models`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {buckets.map((b) => (
          <span
            key={b.label}
            className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            {b.label}
            <span className="text-gray-700">{b.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── HUD: provider ticker ────────────────────────────────────────────
function ProviderTicker({
  providers,
}: {
  providers: { name: string; count: number; accent: string }[];
}) {
  const row = [...providers, ...providers];
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex gap-3"
        style={{ animation: "registry-marquee 40s linear infinite" }}
      >
        {row.map((p, i) => (
          <span
            key={`${p.name}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-400"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: p.accent }}
            />
            {p.name}
            <span className="text-gray-700">{p.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── corner brackets ─────────────────────────────────────────────────
function CornerBrackets() {
  return (
    <>
      <div className="absolute left-0 top-0 h-5 w-5 border-l border-t border-white/10" />
      <div className="absolute right-0 top-0 h-5 w-5 border-r border-t border-white/10" />
      <div className="absolute bottom-0 left-0 h-5 w-5 border-b border-l border-white/10" />
      <div className="absolute bottom-0 right-0 h-5 w-5 border-b border-r border-white/10" />
    </>
  );
}

// ── main ────────────────────────────────────────────────────────────
export function ModelsExplorer({ initialModels }: ModelsExplorerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(
    null,
  );

  const deferredQuery = useDeferredValue(searchQuery);
  const deferredProvider = useDeferredValue(selectedProvider);
  const isSearchStale = searchQuery !== deferredQuery;

  // ── normalize models ──────────────────────────────────────────────
  const models = useMemo<Model[]>(() => {
    return initialModels.map((model) => {
      const { name: providerName, id: providerId } = resolveProvider(model.id);
      const theme = providerConfig[providerId] || {
        icon: Cpu,
        color: "text-gray-400",
        gradient: "from-gray-500/20 to-gray-500/20",
        accent: "#9ca3af",
      };

      const inP = formatPrice(model.pricing?.prompt);
      const outP = formatPrice(model.pricing?.completion);
      const context = model.context_length
        ? `${(model.context_length / 1000).toFixed(0)}K`
        : "N/A";

      return {
        ...model,
        id: model.id,
        name: model.name,
        provider: providerName,
        providerId,
        inputPrice: inP.label,
        outputPrice: outP.label,
        inputPriceNum: inP.num,
        outputPriceNum: outP.num,
        context,
        icon: theme.icon,
        color: theme.color,
        gradient: theme.gradient,
        accent: theme.accent,
        logo: getProviderLogo(model.id),
        popular: model.created > 1_743_465_600,
        speed: (model.context_length || 0) > 500_000 ? "Fast" : "Very Fast",
        maxOutput: formatMaxOut(model),
        paramCount: (model.supported_parameters || []).length,
      } as Model;
    });
  }, [initialModels]);

  // ── price max for bar scaling ─────────────────────────────────────
  const priceMax = useMemo(
    () =>
      Math.max(
        1,
        ...models.map((m) => Math.max(m.inputPriceNum, m.outputPriceNum)),
      ),
    [models],
  );

  // ── provider distribution (real) ──────────────────────────────────
  const providerAgg = useMemo(() => {
    const counts: Record<string, number> = {};
    const accents: Record<string, string> = {};
    models.forEach((m) => {
      counts[m.provider] = (counts[m.provider] || 0) + 1;
      accents[m.provider] = m.accent;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        accent: accents[name] || "#3b82f6",
      }))
      .sort((a, b) => b.count - a.count);
  }, [models]);

  // Use real distribution; cap the visible rail to keep it scannable.
  const providers = useMemo(() => {
    const top = providerAgg.slice(0, 11).map((p) => p.name);
    return ["All", ...top];
  }, [providerAgg]);

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = { All: models.length };
    providerAgg.forEach((p) => (counts[p.name] = p.count));
    return counts;
  }, [models, providerAgg]);

  // ── filter + sort ─────────────────────────────────────────────────
  const filteredAndSortedModels = useMemo(() => {
    const filtered = models.filter((model) => {
      const q = deferredQuery.toLowerCase();
      const matchesSearch =
        !q ||
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        model.id.toLowerCase().includes(q);
      const matchesProvider =
        deferredProvider === "All" || model.provider === deferredProvider;
      return matchesSearch && matchesProvider;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return a.inputPriceNum - b.inputPriceNum;
        case "price-high":
          return b.inputPriceNum - a.inputPriceNum;
        case "context":
          return (
            (parseInt(b.context.replace("K", "")) || 0) -
            (parseInt(a.context.replace("K", "")) || 0)
          );
        case "popular":
        default:
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.name.localeCompare(b.name);
      }
    });
  }, [models, deferredQuery, deferredProvider, sortBy]);

  const featuredModels = useMemo(() => {
    // Highest-value, highest-context models surface the platform breadth.
    return [...models]
      .sort((a, b) => {
        const aCtx = parseInt(a.context.replace("K", "")) || 0;
        const bCtx = parseInt(b.context.replace("K", "")) || 0;
        if (bCtx !== aCtx) return bCtx - aCtx;
        return b.inputPriceNum - a.inputPriceNum;
      })
      .slice(0, 2);
  }, [models]);

  const hasActiveFilters = searchQuery !== "" || selectedProvider !== "All";

  const handleModelClick = (modelId: string) => {
    router.push(`/models/${encodeURIComponent(modelId)}`);
  };

  // ⌘K focuses search
  const handleGlobalKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInputRef?.focus();
    }
    if (e.key === "Escape") {
      if (document.activeElement === searchInputRef) searchInputRef?.blur();
    }
  };

  // Close sort menu on outside click / Escape (effect-based → robust on touch)
  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const node = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(node))
        setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  // Keyboard nav inside the sort menu (Arrow Up/Down, Enter, Home/End)
  const handleSortMenuKey = (e: React.KeyboardEvent) => {
    const idx = SORT_ITEMS.findIndex((s) => s.value === sortBy);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSortBy(SORT_ITEMS[(idx + 1) % SORT_ITEMS.length].value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSortBy(
        SORT_ITEMS[(idx - 1 + SORT_ITEMS.length) % SORT_ITEMS.length].value,
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSortOpen(false);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSortBy(SORT_ITEMS[0].value);
    } else if (e.key === "End") {
      e.preventDefault();
      setSortBy(SORT_ITEMS[SORT_ITEMS.length - 1].value);
    }
  };

  // ── derived stats ─────────────────────────────────────────────────
  const stats = useMemo(
    () => [
      { label: "Models", value: models.length, accent: "#60a5fa" },
      {
        label: "Providers",
        value: new Set(models.map((m) => m.provider)).size,
        accent: "#a78bfa",
      },
      {
        label: "Max Context",
        value: Math.max(
          ...models.map((m) => parseInt(m.context.replace("K", "")) || 0),
        ),
        suffix: "K",
        accent: "#34d399",
      },
      {
        label: "Cheapest",
        value: Math.min(...models.map((m) => m.inputPriceNum)).toFixed(2),
        prefix: "$",
        accent: "#22d3ee",
      },
    ],
    [models],
  );

  return (
    <section
      onKeyDown={handleGlobalKey}
      className="relative w-full overflow-x-clip bg-[#050505] px-4 pb-28 pt-10 md:pt-16"
    >
      {/* ── background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[150px] animate-glow-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/[0.05] blur-[150px] animate-glow-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_85%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ════════════════════════════════════════════════════════ */}
        {/* HERO — editorial split + metrics HUD                       */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          {/* left: headline */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
                Model Registry
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
                Live · {models.length} indexed
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
              className="text-5xl font-black leading-[0.92] tracking-tighter text-white sm:text-6xl md:text-7xl"
            >
              Every model.
              <br />
              <span
                className="glitch bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
                data-text="One gateway."
              >
                One gateway.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className="mt-6 max-w-md text-base font-light leading-relaxed text-gray-400 md:text-lg"
            >
              Browse{" "}
              <span className="font-medium text-white">
                {models.length} frontier models
              </span>{" "}
              across{" "}
              <span className="font-medium text-white">
                {new Set(models.map((m) => m.provider)).size} providers
              </span>
              . Transparent per-token pricing, real context windows, unified
              access.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <a
                href="#registry"
                className="clip-path-slant group relative overflow-hidden bg-white px-7 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition-colors"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Browse Registry
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
              <span className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                <CornerDownLeft className="h-3.5 w-3.5" />
                Press
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-300">
                  ⌘K
                </kbd>
                to search
              </span>
            </motion.div>
          </div>

          {/* right: metrics HUD */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
            className="relative rounded-2xl border border-white/8 bg-[#0A0A0A]/60 p-5 backdrop-blur-xl md:p-6"
          >
            <CornerBrackets />
            <div
              className="absolute -right-px top-5 hidden font-mono text-[8px] uppercase tracking-[0.3em] text-gray-700 md:block"
              style={{ writingMode: "vertical-rl" }}
            >
              ◂ SYSTEM.METRICS ▸
            </div>

            {/* stat grid */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div
                    className="absolute right-0 top-0 h-12 w-12 rounded-full opacity-10 blur-2xl"
                    style={{ backgroundColor: s.accent }}
                  />
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: s.accent }}
                    />
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500">
                      {s.label}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-black tabular-nums text-white">
                    {"prefix" in s && s.prefix}
                    {typeof s.value === "number" ? (
                      <AnimatedCounter value={s.value} />
                    ) : (
                      s.value
                    )}
                    {"suffix" in s && s.suffix}
                  </div>
                </div>
              ))}
            </div>

            {/* price distribution */}
            <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <PriceDistributionBar models={models} />
            </div>

            {/* provider ticker */}
            <div className="mt-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">
                Provider Ticker
              </div>
              <ProviderTicker providers={providerAgg.slice(0, 8)} />
            </div>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* CONTROL DECK                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.div
          id="registry"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-20 space-y-5 scroll-mt-24"
        >
          {/* search */}
          <div className="group relative mx-auto max-w-2xl">
            <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-blue-500/20 opacity-0 blur-lg transition-opacity duration-500 group-focus-within:opacity-100" />
            <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A]/80 px-5 py-4 backdrop-blur-xl transition-colors focus-within:border-blue-500/30">
              <Search className="h-5 w-5 shrink-0 text-gray-500 transition-colors group-focus-within:text-blue-400" />
              <input
                ref={setSearchInputRef}
                type="text"
                placeholder="Search models, providers, IDs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search models"
                className="min-w-0 flex-1 border-none bg-transparent font-mono text-sm text-white outline-none placeholder:text-gray-600"
              />
              {(searchQuery || isSearchStale) && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold ${
                    isSearchStale
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                      : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {isSearchStale ? "···" : filteredAndSortedModels.length}
                </motion.span>
              )}
              <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 sm:block">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* provider rail */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {providers.map((provider) => {
              const isActive = selectedProvider === provider;
              const count = providerCounts[provider] || 0;
              return (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  aria-pressed={isActive}
                  className={`relative overflow-hidden rounded-xl px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    isActive ? "text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-gradient"
                        : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    {provider}
                    <span
                      className={`text-[9px] ${isActive ? "text-black/50" : "text-gray-600"}`}
                    >
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* sort + view row */}
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
            {/* ── sort: custom dropdown ── */}
            <SortMenu
              sortBy={sortBy}
              setSortBy={setSortBy}
              open={sortOpen}
              setOpen={setSortOpen}
              sortRef={sortRef}
              onKeyDown={handleSortMenuKey}
            />

            {/* ── view: segmented toggle ── */}
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600 sm:inline">
                View
              </span>
              <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Grid3x3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                    viewMode === "list"
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* FEATURED BENTO                                            */}
        {/* ════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {!hasActiveFilters && featuredModels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-16"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Frontier Picks
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  Highest context · value
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {featuredModels.map((model, i) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    index={i}
                    onClick={() => handleModelClick(model.id)}
                    featured
                    priceMax={priceMax}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════ */}
        {/* REGISTRY GRID / LIST                                       */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="mt-16">
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-400">
                <Hash className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {hasActiveFilters ? "Results" : "Full Registry"}
              </h2>
            </div>
            <span className="font-mono text-[11px] text-gray-500">
              {filteredAndSortedModels.length} model
              {filteredAndSortedModels.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredAndSortedModels.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-2.5"
              }
            >
              {filteredAndSortedModels.map((model, i) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  index={i}
                  onClick={() => handleModelClick(model.id)}
                  viewMode={viewMode}
                  priceMax={priceMax}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-24 text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Search className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">
                No models found
              </h3>
              <p className="mb-8 font-mono text-sm text-gray-500">
                Adjust your search or clear filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProvider("All");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-mono text-sm transition-all hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Clear Filters
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
