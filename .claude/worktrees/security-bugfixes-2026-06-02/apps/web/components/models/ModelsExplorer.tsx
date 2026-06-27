"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Sparkles,
  Zap,
  Star,
  Brain,
  Activity,
} from "lucide-react";
import { useState, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { ModelCard } from "./ModelCard";
import { getProviderLogo } from "@/lib/provider-logos";
import type { OpenRouterModelData } from "@/types/model";

interface Model {
  id: string;
  name: string;
  provider: string;
  inputPrice: string;
  outputPrice: string;
  context: string;
  logo: string | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  popular: boolean;
  speed: string;
  description?: string;
}

const providerConfig: Record<
  string,
  { icon: typeof Cpu; color: string; gradient: string }
> = {
  openai: {
    icon: Sparkles,
    color: "text-green-400",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  anthropic: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  google: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  moonshot: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  moonshotai: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  zhipu: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
  },
  zhipuai: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
  },
  meta: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  mistral: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
  },
  mistralai: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
  },
  deepseek: {
    icon: Cpu,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-500/20",
  },
  "deepseek-ai": {
    icon: Cpu,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-500/20",
  },
  xai: {
    icon: Cpu,
    color: "text-red-400",
    gradient: "from-red-500/20 to-orange-500/20",
  },
  alibaba: {
    icon: Cpu,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
  },
  qwen: {
    icon: Cpu,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
  },
  qw: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  gpt: {
    icon: Sparkles,
    color: "text-green-400",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  claude: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  gemini: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  llama: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  minimax: {
    icon: Activity,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  minimaxai: {
    icon: Activity,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  glm: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
  },
};

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
    map[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1)
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

export function ModelsExplorer({ initialModels }: ModelsExplorerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All");

  const deferredQuery = useDeferredValue(searchQuery);
  const deferredProvider = useDeferredValue(selectedProvider);
  const isSearchStale = searchQuery !== deferredQuery;

  const models = useMemo(() => {
    return initialModels.map((model) => {
      const providerId = getProviderFromId(model.id);
      const config = providerConfig[providerId] || {
        icon: Cpu,
        color: "text-gray-400",
        gradient: "from-gray-500/20 to-gray-500/20",
      };

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
        ...model,
        id: model.id,
        name: model.name,
        provider: getProviderDisplayName(providerId),
        inputPrice,
        outputPrice,
        context,
        icon: config.icon,
        color: config.color,
        gradient: config.gradient,
        logo,
        popular: model.created > 1743465600,
        speed: model.context_length > 500000 ? "Fast" : "Very Fast",
      };
    });
  }, []);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
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
  }, [models, deferredQuery, deferredProvider]);

  const featuredModels = useMemo(() => {
    return models.filter((m) => m.popular).slice(0, 3);
  }, [models]);

  const hasActiveFilters = searchQuery !== "" || selectedProvider !== "All";

  const handleModelClick = (modelId: string) => {
    router.push(`/models/${encodeURIComponent(modelId)}`);
  };

  return (
    <section className="relative w-full pt-8 pb-24 md:pt-12 md:pb-32 px-4 bg-[#000000] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] animate-glow-pulse" />
        <div
          className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[140px] animate-glow-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-mono font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Browse Models
            <div
              className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-6 leading-[0.95]"
          >
            Every Model,{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
              One Bill
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto font-light"
          >
            Search and filter through{" "}
            <span className="text-white font-medium">100+ AI models</span> from
            leading providers. Compare pricing, context windows, and
            capabilities.
          </motion.p>
        </div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-16 space-y-6"
        >
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 focus-within:border-blue-500/30 transition-all shadow-2xl">
              <Search className="w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Search by name, provider, or model ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-600 font-mono text-sm"
              />
              {(searchQuery || isSearchStale) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border ${
                    isSearchStale
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}
                >
                  {isSearchStale ? "..." : filteredModels.length}
                </motion.div>
              )}
            </div>
          </div>

          {/* Provider Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {providers.map((provider) => {
              const isActive = selectedProvider === provider;
              const ProviderIcon = providerIcons[provider] || Cpu;
              return (
                <motion.button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all overflow-hidden ${
                    isActive ? "text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-gradient"
                        : "bg-white/5 hover:bg-white/10 border border-white/10"
                    }`}
                  />
                  {isActive && (
                    <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] animate-shimmer" />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {isActive && <CheckCircle className="w-3.5 h-3.5" />}
                    {provider}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Featured Bento (only when no filters active) */}
        <AnimatePresence>
          {!hasActiveFilters && featuredModels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-20"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Featured Models
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {featuredModels.map((model, i) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    index={i}
                    onClick={() => handleModelClick(model.id)}
                    featured={i === 0}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Models Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                {hasActiveFilters ? "Results" : "All Models"}
              </h3>
            </div>
            <span className="text-xs font-mono text-gray-500">
              {filteredModels.length} model
              {filteredModels.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredModels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredModels.map((model, i) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  index={i}
                  onClick={() => handleModelClick(model.id)}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No models found
              </h3>
              <p className="text-gray-500 font-mono text-sm mb-8">
                Try adjusting your search or filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProvider("All");
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-mono transition-all"
              >
                Clear Filters
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Bottom Stats */}
        {filteredModels.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
          >
            {[
              { label: "Total Models", value: models.length },
              {
                label: "Providers",
                value: new Set(models.map((m) => m.provider)).size,
              },
              {
                label: "Popular Picks",
                value: models.filter((m) => m.popular).length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 text-xs text-gray-500 font-mono"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                {stat.label}:{" "}
                <span className="text-white font-bold">{stat.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
