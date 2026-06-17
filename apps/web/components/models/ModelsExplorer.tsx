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

// ---- Provider display config ----
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
    () => models.reduce((max, m) => Math.max(max, m.context_length ?? 0), 0),
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
