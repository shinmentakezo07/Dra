"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  Bot,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  Hash,
  MousePointerClick,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
import { EnrichedModel } from "./types";
import { getProviderColor, getAllProviders } from "./ProviderColors";

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  models: EnrichedModel[];
  selectedModels: EnrichedModel[];
  onConfirm: (models: EnrichedModel[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPrice(p?: string): string {
  if (!p) return "—";
  const n = Number(p);
  if (Number.isNaN(n)) return "—";
  if (n >= 0.001) return `$${n.toFixed(3)}`;
  return `$${n.toExponential(1)}`;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${q})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-blue-500/20 text-blue-300 rounded px-0.5 font-semibold"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ProviderSidebar({
  providers,
  models,
  active,
  onSelect,
}: {
  providers: string[];
  models: EnrichedModel[];
  active: string | null;
  onSelect: (p: string | null) => void;
}) {
  return (
    <div className="w-full lg:w-56 shrink-0 flex flex-col gap-1 p-4 lg:border-r border-white/[0.06] overflow-y-auto playground-scroll">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all border ${
          active === null
            ? "bg-white/[0.07] border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/[0.03]"
        }`}
      >
        <Hash className="w-4 h-4 shrink-0 opacity-60" />
        <span className="text-sm font-medium">All Providers</span>
        <span className="ml-auto text-[10px] font-mono text-gray-500 bg-white/[0.05] px-1.5 py-0.5 rounded-md">
          {models.length}
        </span>
      </button>

      <div className="h-px bg-white/[0.04] my-1" />

      {providers.map((provider) => {
        const count = models.filter(
          (m) => m.provider.toLowerCase() === provider
        ).length;
        const color = getProviderColor(`${provider}/model`);
        const isActive = active === provider;

        return (
          <button
            key={provider}
            onClick={() => onSelect(isActive ? null : provider)}
            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all border ${
              isActive
                ? "bg-white/[0.07] border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                : "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-[#060606] transition-all"
              style={{
                backgroundColor: color,
                boxShadow: isActive ? `0 0 0 2px ${color}40` : "none",
              }}
            />
            <span className="text-sm font-medium capitalize truncate">
              {provider}
            </span>
            <span className="ml-auto text-[10px] font-mono text-gray-500 bg-white/[0.05] px-1.5 py-0.5 rounded-md">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ModelCard({
  model,
  isSelected,
  isAtLimit,
  onToggle,
  query,
  index,
}: {
  model: EnrichedModel;
  isSelected: boolean;
  isAtLimit: boolean;
  onToggle: () => void;
  query: string;
  index: number;
}) {
  const color = getProviderColor(model.id);
  const ctx = model.context_length
    ? `${(model.context_length / 1000).toFixed(0)}k`
    : "—";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 350, damping: 28, delay: index * 0.02 }}
      onClick={() => !isAtLimit && onToggle()}
      disabled={isAtLimit}
      className={`group relative flex flex-col p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden ${
        isSelected
          ? "bg-white/[0.04] border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          : isAtLimit
          ? "bg-white/[0.015] border-white/[0.04] cursor-not-allowed opacity-35"
          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/12 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer"
      }`}
    >
      {/* Ambient provider tint */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-[0.06] pointer-events-none transition-opacity duration-500"
        style={{ backgroundColor: color, opacity: isSelected ? 0.12 : 0.06 }}
      />

      {/* Selection border glow */}
      {isSelected && (
        <motion.div
          layoutId={`glow-${model.id}`}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${color}30, 0 0 20px ${color}10`,
          }}
        />
      )}

      {/* Top row: logo + name + checkbox */}
      <div className="relative z-10 flex items-start gap-4">
        {/* Logo */}
        <div
          className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 ${
            isSelected
              ? "bg-white/[0.08] ring-1 ring-white/15"
              : "bg-white/[0.03] ring-1 ring-white/[0.06]"
          }`}
        >
          {model.logo ? (
            <Image
              src={model.logo}
              alt=""
              width={28}
              height={28}
              className="object-contain"
              unoptimized
            />
          ) : (
            <Bot className="w-6 h-6 text-gray-500" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-white leading-snug">
            {highlightMatch(model.name, query)}
          </h3>
          <p
            className="text-[11px] font-mono mt-1 uppercase tracking-wider"
            style={{ color }}
          >
            {model.provider}
          </p>
        </div>

        {/* Checkbox */}
        <div
          className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            isSelected
              ? "border-white/30 bg-white/10"
              : "border-white/[0.08] bg-transparent group-hover:border-white/20"
          }`}
        >
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Description */}
      {model.description && (
        <p className="relative z-10 mt-3 text-[11px] text-gray-500 leading-relaxed line-clamp-2">
          {model.description}
        </p>
      )}

      {/* Data pills */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-gray-400">
          <Sparkles className="w-3 h-3" />
          {ctx} context
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-gray-400">
          In {formatPrice(model.pricing?.prompt)}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-gray-400">
          Out {formatPrice(model.pricing?.completion)}
        </span>
      </div>

      {/* Hover instruction */}
      {!isSelected && !isAtLimit && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <MousePointerClick className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </motion.button>
  );
}

function SelectedStage({
  pending,
  onRemove,
  onClear,
  onConfirm,
}: {
  pending: EnrichedModel[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/60 to-transparent backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Selected chips */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 playground-scroll">
              {pending.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Select up to 4 models to compare</span>
                </div>
              ) : (
                <>
                  {pending.map((model) => {
                    const color = getProviderColor(model.id);
                    return (
                      <motion.div
                        layout
                        key={model.id}
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="group flex items-center gap-2.5 pl-1 pr-1 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] hover:border-white/20 shrink-0"
                        style={{
                          boxShadow: `0 0 16px ${color}12`,
                        }}
                      >
                        <div className="relative w-7 h-7 rounded-full bg-white/[0.05] overflow-hidden flex items-center justify-center">
                          {model.logo ? (
                            <Image
                              src={model.logo}
                              alt=""
                              width={18}
                              height={18}
                              className="object-contain"
                              unoptimized
                            />
                          ) : (
                            <Bot className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-white/90 truncate max-w-[140px]">
                          {model.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(model.id);
                          }}
                          className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Counter + Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white">{pending.length}</span>
              <span className="text-xs text-gray-500"> /4</span>
            </div>

            {pending.length > 0 && (
              <button
                onClick={onClear}
                className="p-2.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] rounded-xl transition-all"
                title="Clear selection"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={pending.length === 0}
              className="relative flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl font-bold text-sm text-white shadow-[0_0_24px_rgba(59,130,246,0.2)] hover:shadow-[0_0_32px_rgba(59,130,246,0.35)] transition-all overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Zap className="w-4 h-4 relative z-10" />
              <span className="relative z-10 hidden sm:inline">Launch Comparison</span>
              <span className="relative z-10 sm:hidden">Launch</span>
              <ArrowRight className="w-4 h-4 relative z-10" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ModelSelector({
  isOpen,
  onClose,
  models,
  selectedModels,
  onConfirm,
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [pending, setPending] = useState<EnrichedModel[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPending(selectedModels);
      setSearchQuery("");
      setActiveFilter(null);
    }
  }, [isOpen, selectedModels]);

  const providers = useMemo(() => getAllProviders(models), [models]);

  const filteredModels = useMemo(() => {
    let filtered = models;
    if (activeFilter) {
      filtered = filtered.filter(
        (m) => m.provider.toLowerCase() === activeFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [models, activeFilter, searchQuery]);

  const toggleModel = useCallback((model: EnrichedModel) => {
    setPending((prev) => {
      const exists = prev.find((m) => m.id === model.id);
      if (exists) return prev.filter((m) => m.id !== model.id);
      if (prev.length >= 4) return prev;
      return [...prev, model];
    });
  }, []);

  const removeFromPending = useCallback((id: string) => {
    setPending((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(pending);
    onClose();
  }, [pending, onConfirm, onClose]);

  const handleClear = useCallback(() => setPending([]), []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col h-full bg-[#050505]/90 border-b border-white/[0.06]"
          >
            {/* Top bar */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Model Observatory
                  </h2>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {filteredModels.length} models available
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Hero Search */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/[0.04]">
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models, providers, capabilities..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/15 focus:border-blue-500/40 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Main body */}
            <div className="flex-1 flex overflow-hidden">
              <ProviderSidebar
                providers={providers}
                models={filteredModels}
                active={activeFilter}
                onSelect={setActiveFilter}
              />

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 playground-scroll">
                <div className="max-w-5xl mx-auto">
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">
                      {activeFilter ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: getProviderColor(
                                `${activeFilter}/model`
                              ),
                            }}
                          />
                          {activeFilter}
                        </span>
                      ) : (
                        "All Models"
                      )}
                    </h3>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {filteredModels.length} result
                      {filteredModels.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredModels.map((model, i) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isSelected={pending.some((m) => m.id === model.id)}
                          isAtLimit={
                            pending.length >= 4 &&
                            !pending.some((m) => m.id === model.id)
                          }
                          onToggle={() => toggleModel(model)}
                          query={searchQuery}
                          index={i}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Empty state */}
                  {filteredModels.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-24"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                        <Bot className="w-8 h-8 text-gray-700" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium mb-1">
                        No models found
                      </p>
                      <p className="text-xs text-gray-600">
                        Try a different search term or provider filter
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom stage */}
            <SelectedStage
              pending={pending}
              onRemove={removeFromPending}
              onClear={handleClear}
              onConfirm={handleConfirm}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
