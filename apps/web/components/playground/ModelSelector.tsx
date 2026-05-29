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
  Sparkles,
  BrainCircuit,
  LayoutGrid,
  Layers,
  Plus,
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

const MAX_MODELS = 4;

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
        className="bg-indigo-500/30 text-indigo-200 rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const categoryFilters = [
  { id: null as string | null, label: "All Models", icon: LayoutGrid },
  { id: "latest" as string | null, label: "Latest", icon: Sparkles },
] as const;

function ProviderSidebar({
  providers,
  models,
  active,
  onSelect,
  modelCount,
}: {
  providers: string[];
  models: EnrichedModel[];
  active: string | null;
  onSelect: (p: string | null) => void;
  modelCount: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-2 pb-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="relative w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
            <Layers className="w-3.5 h-3.5 text-white/25" />
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-white/60 tracking-[0.15em] uppercase leading-tight">
              Providers
            </h2>
            <p className="text-[8px] text-white/15 font-mono leading-tight">
              {modelCount} models
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto playground-scroll min-h-0 space-y-0.5">
        <button
          onClick={() => onSelect(null)}
          onMouseEnter={() => setHovered("__all__")}
          onMouseLeave={() => setHovered(null)}
          className="relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-200 group"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
              active === null
                ? "bg-white/[0.12] text-white shadow-[0_0_12px_-2px_rgba(255,255,255,0.15)]"
                : "bg-white/[0.03] text-gray-600 group-hover:bg-white/[0.06]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white/80 leading-tight">
              All Models
            </div>
            <div className="text-[9px] text-white/20 font-mono">
              {models.length} available
            </div>
          </div>
          {active === null && (
            <motion.div
              layoutId="providerActive"
              className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>

        <div className="h-px bg-white/[0.04] mx-2 my-1.5" />

        {providers.map((provider) => {
          const count = models.filter(
            (m) => m.provider.toLowerCase() === provider,
          ).length;
          const color = getProviderColor(`${provider}/model`);
          const isActive = active === provider;
          const isHovered = hovered === provider;

          return (
            <button
              key={provider}
              onClick={() => onSelect(isActive ? null : provider)}
              onMouseEnter={() => setHovered(provider)}
              onMouseLeave={() => setHovered(null)}
              className="relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-200 group"
            >
              {isHovered && !isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-lg bg-white/[0.02]"
                  transition={{ duration: 0.15 }}
                />
              )}

              {isActive && (
                <motion.div
                  layoutId="providerBg"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${color}12, transparent)`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}

              <div
                className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300"
                style={{
                  backgroundColor: isActive
                    ? `${color}20`
                    : "rgba(255,255,255,0.03)",
                  boxShadow: isActive ? `0 0 12px ${color}25` : "none",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full transition-transform duration-300"
                  style={{
                    backgroundColor: color,
                    transform: isActive ? "scale(1.2)" : "scale(1)",
                    boxShadow: isActive ? `0 0 8px ${color}` : "none",
                  }}
                />
              </div>

              <div className="relative flex-1 min-w-0">
                <div className="text-[11px] font-medium capitalize truncate text-white/80 leading-tight">
                  {provider}
                </div>
                <div
                  className="text-[9px] font-mono transition-colors duration-200 leading-tight"
                  style={{ color: isActive ? color : "rgba(255,255,255,0.2)" }}
                >
                  {count} model{count !== 1 ? "s" : ""}
                </div>
              </div>

              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="relative w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}25` }}
                >
                  <ChevronRight className="w-2.5 h-2.5" style={{ color }} />
                </motion.div>
              )}
            </button>
          );
        })}

        {providers.length === 0 && (
          <div className="text-center py-6 text-gray-600">
            <p className="text-[11px] font-mono">No providers</p>
          </div>
        )}
      </div>
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 28,
        delay: Math.min((index % 6) * 0.03, 0.15),
      }}
      onClick={() => !isAtLimit && onToggle()}
      disabled={isAtLimit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative w-full text-left rounded-2xl p-5 transition-all duration-500 ${
        isAtLimit && !isSelected
          ? "cursor-not-allowed opacity-20"
          : "cursor-pointer"
      }`}
    >
      {/* Surface glow */}
      <div
        className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
          isSelected || isHovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: isSelected
            ? `radial-gradient(145% 100% at 20% 0%, ${color}18, transparent 70%), rgba(255,255,255,0.02)`
            : `rgba(255,255,255,0.02)`,
        }}
      />

      {/* Selected glow + corner accents */}
      {isSelected && (
        <motion.div
          layoutId={`card-aurora-${model.id}`}
          className="absolute inset-0 rounded-2xl overflow-hidden"
          initial={false}
        >
          <div
            className="absolute inset-0"
            style={{
              border: `1px solid ${color}30`,
              boxShadow: `0 0 40px ${color}12, inset 0 1px 0 ${color}15`,
            }}
          />
          <div
            className="absolute -top-px -left-px w-8 h-8 rounded-tl-2xl"
            style={{
              borderTop: `2px solid ${color}50`,
              borderLeft: `2px solid ${color}50`,
            }}
          />
          <div
            className="absolute -bottom-px -right-px w-8 h-8 rounded-br-2xl"
            style={{
              borderBottom: `2px solid ${color}50`,
              borderRight: `2px solid ${color}50`,
            }}
          />
        </motion.div>
      )}

      {/* Default border */}
      {!isSelected && (
        <div
          className={`absolute inset-0 rounded-2xl border transition-all duration-300 ${
            isHovered
              ? "border-white/[0.08] bg-white/[0.015]"
              : "border-white/[0.04] bg-transparent"
          }`}
        />
      )}

      <div className="relative space-y-3">
        {/* Top row: icon + name + check */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`relative w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500 ${
                isSelected ? "scale-100" : "scale-100 group-hover:scale-[1.04]"
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${color}25, ${color}08)`
                  : "rgba(255,255,255,0.025)",
                boxShadow: isSelected
                  ? `0 0 24px -4px ${color}25, inset 0 1px 0 ${color}20`
                  : "none",
              }}
            >
              {model.logo ? (
                <Image
                  src={model.logo}
                  alt=""
                  width={24}
                  height={24}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Bot className="w-5 h-5 text-gray-600" />
              )}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-xl ring-1 ring-inset"
                  style={{ borderColor: `${color}30` }}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90 truncate leading-tight flex items-center gap-2">
                {highlightMatch(model.name, query)}
              </div>
              <div
                className="text-[10px] font-mono uppercase tracking-[0.12em] mt-1 transition-colors duration-300"
                style={{
                  color: isSelected ? color : "rgba(255,255,255,0.25)",
                }}
              >
                {model.provider}
              </div>
            </div>
          </div>

          {/* Check indicator */}
          <div
            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 ${
              isSelected
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
            }`}
            style={{
              backgroundColor: isSelected
                ? `${color}25`
                : "rgba(255,255,255,0.04)",
              boxShadow: isSelected ? `0 0 12px ${color}15` : "none",
            }}
          >
            <AnimatePresence mode="wait">
              {isSelected ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 45 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <Check
                    className="w-4 h-4"
                    style={{ color }}
                    strokeWidth={3}
                  />
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

        {/* Description */}
        {model.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
            {model.description}
          </p>
        )}

        {/* Metrics bar */}
        <div className="flex items-center gap-4 pt-3 border-t border-white/[0.03]">
          <div className="flex items-center gap-1.5 text-white/30">
            <Cpu className="w-3.5 h-3.5 opacity-40" />
            <span className="text-[10px] font-mono tracking-tight">{ctx}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/20">
            <DollarSign className="w-3.5 h-3.5 opacity-30" />
            <span className="text-[10px] font-mono tracking-tight">
              {formatPrice(model.pricing?.prompt)}
            </span>
          </div>

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto"
            >
              <div
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: `${color}60` }}
              >
                Selected
              </div>
            </motion.div>
          )}
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [pending, setPending] = useState<EnrichedModel[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPending(selectedModels);
      setSearchQuery("");
      setActiveFilter(null);
      setCategoryFilter(null);
    }
  }, [isOpen, selectedModels]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const providers = useMemo(() => getAllProviders(models), [models]);

  const filteredModels = useMemo(() => {
    let filtered = models;

    if (activeFilter) {
      filtered = filtered.filter(
        (m) => m.provider.toLowerCase() === activeFilter,
      );
    }

    if (categoryFilter === "latest") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = parseInt(String(a?.created || "0"));
        const dateB = parseInt(String(b?.created || "0"));
        return dateB - dateA;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [models, activeFilter, categoryFilter, searchQuery]);

  const toggleModel = useCallback((model: EnrichedModel) => {
    setPending((prev) => {
      const exists = prev.find((m) => m.id === model.id);
      if (exists) return prev.filter((m) => m.id !== model.id);
      if (prev.length >= MAX_MODELS) return prev;
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='6' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
            <motion.div
              className="absolute top-1/4 -left-24 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.04] blur-[150px]"
              animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/3 -right-24 w-[350px] h-[350px] rounded-full bg-blue-500/[0.04] blur-[120px]"
              animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 sm:inset-6 lg:inset-8 z-50 flex flex-col rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, rgba(12,12,18,0.98), rgba(6,6,12,0.99))",
              boxShadow:
                "0 0 80px rgba(0,0,0,0.5), 0 0 200px rgba(99,102,241,0.03)",
            }}
          >
            {/* Top accent strip */}
            <div className="shrink-0 h-[2px] w-full bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            {/* Header bar */}
            <div className="shrink-0 relative border-b border-white/[0.05] bg-[#08080e]/80 backdrop-blur-2xl">
              <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />

              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCategoryFilter(null);
                      }}
                      placeholder="Search models..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-indigo-500/30 rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-white/90 placeholder:text-gray-600 outline-none transition-all duration-300 focus:bg-white/[0.05] focus:shadow-[0_0_24px_-4px_rgba(99,102,241,0.08)]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-600 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Selection count badge */}
                  {selectedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[11px] font-medium text-indigo-300 font-mono tabular-nums">
                        {selectedCount}/{MAX_MODELS}
                      </span>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick confirm */}
                  {selectedCount > 0 && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600/80 to-blue-600/80 hover:from-indigo-500 hover:to-blue-500 text-xs font-semibold text-white border border-white/[0.06] transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Compare
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </motion.button>
                  )}

                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <X className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Provider sidebar - desktop */}
              <div className="hidden lg:flex flex-col w-[230px] min-w-0 shrink-0 border-r border-white/[0.04] bg-[#08080e]/40 p-2 min-h-0">
                <ProviderSidebar
                  providers={providers}
                  models={models}
                  active={activeFilter}
                  onSelect={setActiveFilter}
                  modelCount={filteredModels.length}
                />
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Category pills + mobile provider pills */}
                <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-white/[0.03] bg-[#08080e]/20">
                  <div className="flex items-center gap-2 overflow-x-auto playground-scroll">
                    {/* Category filters */}
                    {categoryFilters.map((cat) => {
                      const Icon = cat.icon;
                      const isActive =
                        categoryFilter === cat.id && !activeFilter;
                      return (
                        <button
                          key={cat.label}
                          onClick={() => {
                            setCategoryFilter(cat.id);
                            setActiveFilter(null);
                            setSearchQuery("");
                          }}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-white/[0.07] text-white/90 shadow-[0_0_12px_-4px_rgba(255,255,255,0.1)]"
                              : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cat.label}
                        </button>
                      );
                    })}

                    <div className="w-px h-5 bg-white/[0.06]" />

                    {/* Mobile provider pills */}
                    <div className="flex lg:hidden items-center gap-1.5">
                      <button
                        onClick={() => setActiveFilter(null)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          activeFilter === null && categoryFilter === null
                            ? "bg-white/[0.08] text-white ring-1 ring-white/10"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        All
                      </button>
                      {providers.slice(0, 8).map((p) => {
                        const color = getProviderColor(`${p}/model`);
                        const isActive = activeFilter === p;
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              setActiveFilter(isActive ? null : p);
                              setCategoryFilter(null);
                            }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              isActive
                                ? "text-white"
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                            style={
                              isActive
                                ? {
                                    backgroundColor: `${color}20`,
                                    boxShadow: `0 0 12px ${color}15`,
                                  }
                                : {}
                            }
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: color,
                                boxShadow: isActive
                                  ? `0 0 6px ${color}`
                                  : "none",
                              }}
                            />
                            <span className="capitalize">{p}</span>
                          </button>
                        );
                      })}
                      {providers.length > 8 && (
                        <span className="text-[10px] text-gray-600 font-mono px-1">
                          +{providers.length - 8}
                        </span>
                      )}
                    </div>

                    {/* Desktop: results count */}
                    <div className="hidden lg:flex items-center ml-auto text-[10px] text-gray-600 font-mono">
                      {filteredModels.length} result
                      {filteredModels.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Model grid */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto playground-scroll"
                >
                  <div className="px-4 sm:px-5 py-4">
                    {filteredModels.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        <AnimatePresence mode="popLayout">
                          {filteredModels.map((model, i) => (
                            <ModelCard
                              key={model.id}
                              model={model}
                              isSelected={pending.some(
                                (m) => m.id === model.id,
                              )}
                              isAtLimit={
                                pending.length >= MAX_MODELS &&
                                !pending.some((m) => m.id === model.id)
                              }
                              onToggle={() => toggleModel(model)}
                              query={searchQuery}
                              index={i}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                        >
                          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-gradient-to-br from-indigo-500/[0.06] to-blue-500/[0.04] border border-indigo-500/[0.08]">
                            <BrainCircuit className="w-10 h-10 text-white/15" />
                          </div>
                        </motion.div>
                        <p className="text-base text-gray-400 font-semibold mb-1">
                          No models found
                        </p>
                        <p className="text-[12px] text-gray-600 max-w-xs leading-relaxed">
                          {searchQuery
                            ? `No models match "${searchQuery}". Try a different search term or clear the filter.`
                            : "Try adjusting your filters or selecting a different category."}
                        </p>
                        {(searchQuery || activeFilter || categoryFilter) && (
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setActiveFilter(null);
                              setCategoryFilter(null);
                            }}
                            className="mt-4 text-[11px] text-indigo-400/70 hover:text-indigo-300 font-medium transition-colors"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="shrink-0 border-t border-white/[0.06] bg-[#08080e]/90 backdrop-blur-2xl">
              <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4">
                {/* Selected collection */}
                <div className="flex items-center gap-2 overflow-x-auto playground-scroll flex-1 min-w-0">
                  {pending.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2.5 text-white/20"
                    >
                      <div className="w-5 h-5 rounded-md border border-dashed border-white/[0.06] flex items-center justify-center">
                        <span className="text-[9px] opacity-50">✦</span>
                      </div>
                      <span className="text-[11px] font-mono">
                        Select up to {MAX_MODELS} models to compare
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="popLayout">
                        {pending.map((model, idx) => {
                          const color = getProviderColor(model.id);
                          return (
                            <motion.div
                              layout
                              key={model.id}
                              initial={{ opacity: 0, scale: 0.85, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 8 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                                delay: idx * 0.04,
                              }}
                              className="group relative flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-xl overflow-hidden shrink-0"
                            >
                              <div
                                className="absolute inset-0 rounded-xl transition-all duration-300"
                                style={{
                                  background: `linear-gradient(135deg, ${color}15, transparent)`,
                                  border: `1px solid ${color}25`,
                                }}
                              />

                              <div className="relative flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-mono"
                                  style={{
                                    backgroundColor: `${color}25`,
                                    color: color,
                                  }}
                                >
                                  {idx + 1}
                                </div>

                                <div className="relative w-6 h-6 rounded-md bg-white/[0.04] overflow-hidden flex items-center justify-center">
                                  {model.logo ? (
                                    <Image
                                      src={model.logo}
                                      alt=""
                                      width={14}
                                      height={14}
                                      className="object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <Bot className="w-3.5 h-3.5 text-gray-600" />
                                  )}
                                </div>

                                <span className="text-[11px] font-medium text-white/80 truncate max-w-[90px]">
                                  {model.name.split(":")[0]}
                                </span>

                                <button
                                  onClick={() =>
                                    setPending((prev) =>
                                      prev.filter((m) => m.id !== model.id),
                                    )
                                  }
                                  className="p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-gray-600 hover:text-white transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {pending.length < MAX_MODELS && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-dashed border-white/[0.06] text-gray-600"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="text-[10px] font-mono">
                            {MAX_MODELS - pending.length} slot
                            {MAX_MODELS - pending.length !== 1 ? "s" : ""}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={pending.length === 0}
                  className="relative flex items-center gap-2.5 px-5 sm:px-6 py-2.5 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl text-[13px] font-semibold overflow-hidden shrink-0 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 transition-all duration-500 group-hover:from-indigo-500 group-hover:via-blue-500 group-hover:to-violet-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent)]" />
                  <div className="absolute inset-[1px] rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600" />
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: "0 0 24px -4px rgba(99,102,241,0.25)" }} />
                  <Zap className="w-4 h-4 relative z-10 text-white" />
                  <span className="relative z-10 text-white whitespace-nowrap">
                    {pending.length > 0
                      ? `Compare ${pending.length} Model${pending.length > 1 ? "s" : ""}`
                      : "Select Models"}
                  </span>
                  {pending.length > 0 && (
                    <ArrowRight className="w-4 h-4 relative z-10 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
