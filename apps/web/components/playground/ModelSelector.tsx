"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  Bot,
  Zap,
  ChevronRight,
  ArrowRight,
  Cpu,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { EnrichedModel } from "./types";
import { getProviderColor, getAllProviders } from "./ProviderColors";

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  models: EnrichedModel[];
  selectedModels: EnrichedModel[];
  onConfirm: (models: EnrichedModel[]) => void;
}

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
      <mark key={i} className="bg-indigo-500/30 text-indigo-200 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

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
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
          active === null
            ? "bg-white/[0.06] text-white"
            : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
            active === null
              ? "bg-white/[0.08] text-white"
              : "bg-white/[0.03] text-gray-600"
          }`}
        >
          ◆
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">All Models</div>
          <div className="text-[10px] text-gray-600 font-mono">{models.length}</div>
        </div>
      </button>

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
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 overflow-hidden ${
              isActive
                ? "text-white"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl"
                style={{ background: `${color}12` }}
                transition={{ type: "spring" as const, stiffness: 400, damping: 28 }}
              />
            )}
            <div
              className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: isActive ? `${color}20` : "rgba(255,255,255,0.03)",
                boxShadow: isActive ? `0 0 12px ${color}30` : "none",
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: isActive ? `0 0 8px ${color}` : "none",
                }}
              />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="text-xs font-medium capitalize truncate">{provider}</div>
              <div className="text-[10px] font-mono opacity-40">{count}</div>
            </div>
            {isActive && (
              <motion.div layoutId="sidebar-chevron" className="relative">
                <ChevronRight className="w-3.5 h-3.5" style={{ color }} />
              </motion.div>
            )}
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        type: "spring" as const,
        stiffness: 350,
        damping: 28,
        delay: (index % 6) * 0.02,
      }}
      onClick={() => !isAtLimit && onToggle()}
      disabled={isAtLimit}
      className={`group relative w-full text-left rounded-2xl p-4 transition-all duration-300 ${
        isSelected
          ? "bg-white/[0.04]"
          : isAtLimit
            ? "cursor-not-allowed opacity-15"
            : "hover:bg-white/[0.02] cursor-pointer"
      }`}
    >
      {isSelected && (
        <motion.div
          layoutId={`card-glow-${model.id}`}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at 30% 0%, ${color}15, transparent 70%)`,
            border: `1px solid ${color}30`,
            boxShadow: `0 0 30px ${color}10, inset 0 1px 0 ${color}20`,
          }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
        />
      )}
      {!isSelected && (
        <div className="absolute inset-0 rounded-2xl bg-white/[0.015] border border-white/[0.05] group-hover:border-white/[0.08] group-hover:bg-white/[0.025] transition-all duration-300" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isSelected
                  ? "bg-white/[0.06]"
                  : "bg-white/[0.03] group-hover:bg-white/[0.05]"
              }`}
              style={{
                boxShadow: isSelected ? `0 0 16px ${color}20` : "none",
              }}
            >
              {model.logo ? (
                <Image
                  src={model.logo}
                  alt=""
                  width={22}
                  height={22}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Bot className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90 truncate leading-tight">
                {highlightMatch(model.name, query)}
              </div>
              <div
                className="text-[10px] font-mono uppercase tracking-widest mt-0.5"
                style={{ color: isSelected ? color : `${color}80` }}
              >
                {model.provider}
              </div>
            </div>
          </div>

          <div
            className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isSelected ? "scale-100" : "scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
            }`}
            style={{
              backgroundColor: isSelected ? `${color}25` : "rgba(255,255,255,0.04)",
            }}
          >
            <AnimatePresence mode="wait">
              {isSelected ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 45 }}
                  transition={{ type: "spring" as const, stiffness: 500, damping: 18 }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color }} strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-600 group-hover:bg-white/60 transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {model.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {model.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Cpu className="w-3 h-3 opacity-50" />
            <span className="text-[10px] font-mono">{ctx}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <DollarSign className="w-3 h-3 opacity-40" />
            <span className="text-[10px] font-mono">{formatPrice(model.pricing?.prompt)}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

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
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPending(selectedModels);
      setSearchQuery("");
      setActiveFilter(null);
    }
  }, [isOpen, selectedModels]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const handleConfirm = useCallback(() => {
    onConfirm(pending);
    onClose();
  }, [pending, onConfirm, onClose]);

  const selectedCount = pending.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/85" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4">
              <div className="hidden lg:flex flex-col w-56 shrink-0">
                <div className="flex items-center gap-3 px-1 mb-5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.15))",
                      boxShadow: "0 0 20px rgba(99,102,241,0.2)",
                    }}
                  >
                    <Zap className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white tracking-wide">MODEL LAB</h2>
                    <p className="text-[9px] text-gray-600 font-mono">
                      {filteredModels.length} models
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto playground-scroll pr-1">
                  <ProviderSidebar
                    providers={providers}
                    models={filteredModels}
                    active={activeFilter}
                    onSelect={setActiveFilter}
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-indigo-500/30 rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder:text-gray-600 outline-none transition-all duration-300"
                      />
                    </div>

                    {selectedCount > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[11px] font-medium text-indigo-300 font-mono">
                          {selectedCount}/4
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <X className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </div>

                <div className="lg:hidden mb-3 overflow-x-auto playground-scroll">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveFilter(null)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        activeFilter === null
                          ? "bg-white/[0.08] text-white ring-1 ring-white/10"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      All
                    </button>
                    {providers.map((p) => {
                      const color = getProviderColor(`${p}/model`);
                      const isActive = activeFilter === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setActiveFilter(isActive ? null : p)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                          }`}
                          style={isActive ? { backgroundColor: `${color}20`, boxShadow: `0 0 8px ${color}20` } : {}}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? color : `${color}60` }} />
                          <span className="capitalize">{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto playground-scroll -mx-1 px-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 pb-4">
                    <AnimatePresence mode="popLayout">
                      {filteredModels.map((model, i) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isSelected={pending.some((m) => m.id === model.id)}
                          isAtLimit={pending.length >= 4 && !pending.some((m) => m.id === model.id)}
                          onToggle={() => toggleModel(model)}
                          query={searchQuery}
                          index={i}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {filteredModels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                        style={{
                          background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.05))",
                          border: "1px solid rgba(99,102,241,0.15)",
                          boxShadow: "0 0 30px rgba(99,102,241,0.1)",
                        }}
                      >
                        <Bot className="w-7 h-7 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">No models found</p>
                      <p className="text-[11px] text-gray-600 mt-1">Try a different search or filter</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.06] bg-[#060608]/95 backdrop-blur-2xl">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto playground-scroll flex-1">
                  {pending.length === 0 ? (
                    <span className="text-[11px] text-gray-600">Click models above to select</span>
                  ) : (
                    pending.map((model) => {
                      const color = getProviderColor(model.id);
                      return (
                        <motion.div
                          layout
                          key={model.id}
                          initial={{ opacity: 0, scale: 0.85, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: 8 }}
                          transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
                          className="group relative flex items-center gap-2 pl-1 pr-1 py-1.5 rounded-xl shrink-0 overflow-hidden"
                        >
                          <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `linear-gradient(135deg, ${color}15, transparent)`,
                              border: `1px solid ${color}25`,
                            }}
                          />
                          <div className="relative flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-lg bg-white/[0.04] overflow-hidden flex items-center justify-center">
                              {model.logo ? (
                                <Image src={model.logo} alt="" width={16} height={16} className="object-contain" unoptimized />
                              ) : (
                                <Bot className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-white/80 truncate max-w-[100px]">
                              {model.name.split(":")[0]}
                            </span>
                            <button
                              onClick={() => setPending((prev) => prev.filter((m) => m.id !== model.id))}
                              className="p-0.5 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={pending.length === 0}
                  className="relative flex items-center gap-2.5 px-6 py-3 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl text-sm font-semibold overflow-hidden shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500 opacity-0 hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-[1px] rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600" />
                  <Zap className="w-4 h-4 relative z-10 text-white" />
                  <span className="relative z-10 text-white">
                    Launch Comparison
                  </span>
                  <ArrowRight className="w-4 h-4 relative z-10 text-white/70" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
