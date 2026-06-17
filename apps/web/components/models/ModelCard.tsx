"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  Cpu,
  Hash,
  Layers,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
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
    gradient?: string;
    accent?: string;
    popular?: boolean;
    speed?: string;
    description?: string;
    maxOutput?: string;
    paramCount?: number;
    inputPriceNum?: number;
    outputPriceNum?: number;
  };
  index: number;
  onClick: () => void;
  featured?: boolean;
  viewMode?: "grid" | "list";
  priceMax?: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Proportional bar width (4–100%) so even free models render a visible nub. */
function barWidth(value: number | undefined, max: number | undefined): string {
  const v = value ?? 0;
  const m = max ?? 0;
  if (m <= 0) return "0%";
  return `${Math.max(4, Math.min(100, (v / m) * 100))}%`;
}

function PriceRow({
  label,
  value,
  hex,
  width,
}: {
  label: string;
  value: string;
  hex: string;
  width: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-[10px] font-mono uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width,
            backgroundColor: hex,
            boxShadow: `0 0 8px ${hex}66`,
          }}
        />
      </div>
      <span className="w-[68px] shrink-0 text-right font-mono text-xs font-bold tabular-nums text-white">
        {value}
        <span className="ml-0.5 text-[10px] font-normal text-gray-600">
          /1M
        </span>
      </span>
    </div>
  );
}

export function ModelCard({
  model,
  index,
  onClick,
  featured = false,
  viewMode = "grid",
  priceMax = 0,
}: ModelCardProps) {
  const IconComponent = model.icon || Cpu;
  const accent = model.accent || "#3b82f6";
  const maxOutput = model.maxOutput || "—";
  const paramCount = model.paramCount ?? 0;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  // ── LIST VIEW ──────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-32px" }}
        transition={{
          delay: Math.min(index * 0.02, 0.3),
          duration: 0.4,
          ease: EASE,
        }}
        role="button"
        tabIndex={0}
        aria-label={`${model.name} by ${model.provider}`}
        onKeyDown={handleKey}
        onClick={onClick}
        className="group relative cursor-pointer outline-none focus-visible:z-10"
        style={{ ["--accent" as string]: accent } as React.CSSProperties}
      >
        {/* hover edge + spotlight */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 bg-gradient-to-r from-[var(--accent)]/15 via-transparent to-transparent blur-sm" />

        <div className="relative flex items-center gap-5 overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A]/70 px-5 py-3.5 backdrop-blur-xl transition-colors duration-300 group-hover:border-[var(--accent)]/30">
          {/* spotlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), ${accent}10, transparent 60%)`,
            }}
          />

          {/* logo */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-transform duration-500 group-hover:scale-105">
            {model.logo ? (
              <Image
                src={model.logo}
                alt={`${model.provider} logo`}
                width={26}
                height={26}
                className="object-contain"
                unoptimized
              />
            ) : (
              <IconComponent className="h-5 w-5" style={{ color: accent }} />
            )}
          </div>

          {/* name + provider */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-bold tracking-tight text-white transition-colors group-hover:text-[var(--accent)]">
                {model.name}
              </h3>
              {model.popular && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest text-blue-400">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Hot
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
              {model.provider}
            </p>
          </div>

          {/* spec chips */}
          <div className="hidden items-center gap-2 sm:flex">
            <SpecChip icon={Hash} label={model.context} />
            <SpecChip icon={Layers} label={maxOutput} />
          </div>

          {/* pricing */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right">
              <p className="text-[9px] font-mono uppercase tracking-wider text-gray-600">
                In
              </p>
              <p
                className="font-mono text-xs font-bold tabular-nums"
                style={{ color: "#34d399" }}
              >
                {model.inputPrice}
              </p>
            </div>
            <div className="h-7 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[9px] font-mono uppercase tracking-wider text-gray-600">
                Out
              </p>
              <p
                className="font-mono text-xs font-bold tabular-nums"
                style={{ color: "#a78bfa" }}
              >
                {model.outputPrice}
              </p>
            </div>
          </div>

          {/* affordance */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all duration-300 group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10">
            <ArrowRight className="h-4 w-4 text-gray-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── FEATURED BENTO (2×2) ───────────────────────────────────────────
  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px" }}
        transition={{ duration: 0.6, ease: EASE }}
        role="button"
        tabIndex={0}
        aria-label={`${model.name} by ${model.provider}`}
        onKeyDown={handleKey}
        onClick={onClick}
        className="group relative cursor-pointer overflow-hidden rounded-[24px] p-[1px] outline-none focus-visible:z-10 md:col-span-2 md:row-span-2"
        style={{ ["--accent" as string]: accent } as React.CSSProperties}
      >
        {/* animated gradient border */}
        <div
          className="absolute inset-0 rounded-[24px] opacity-40 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${accent}, transparent 40%, transparent 60%, ${accent}88)`,
          }}
        />
        {/* hover spotlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), ${accent}14, transparent 60%)`,
          }}
        />

        <div className="relative flex h-full flex-col overflow-hidden rounded-[23px] border border-white/5 bg-[#080808] p-7">
          {/* ambient corner glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl transition-opacity duration-700 group-hover:opacity-40"
            style={{ backgroundColor: accent }}
          />

          {/* header */}
          <div className="relative mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                {model.logo ? (
                  <Image
                    src={model.logo}
                    alt={`${model.provider} logo`}
                    width={38}
                    height={38}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <IconComponent
                    className="h-8 w-8"
                    style={{ color: accent }}
                  />
                )}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 20px ${accent}33` }}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                    style={{ backgroundColor: `${accent}1a`, color: accent }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Featured
                  </span>
                  {model.popular && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-blue-400">
                      <TrendingUp className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white transition-colors group-hover:text-[var(--accent)] md:text-3xl">
                  {model.name}
                </h3>
                <p className="mt-1 font-mono text-xs text-gray-500">
                  {model.provider}
                </p>
              </div>
            </div>
          </div>

          {/* description */}
          {model.description && (
            <p className="relative mb-6 line-clamp-2 max-w-xl text-sm leading-relaxed text-gray-400">
              {model.description}
            </p>
          )}

          {/* spec strip */}
          <div className="relative mb-6 flex flex-wrap gap-2">
            <SpecChip
              icon={Hash}
              label={`${model.context} ctx`}
              accent={accent}
            />
            <SpecChip
              icon={Layers}
              label={`${maxOutput} out`}
              accent={accent}
            />
            <SpecChip
              icon={SlidersHorizontal}
              label={`${paramCount} params`}
              accent={accent}
            />
          </div>

          {/* price viz */}
          <div className="relative mt-auto space-y-3 rounded-2xl border border-white/5 bg-black/30 p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600">
                Pricing · per 1M tokens
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <PriceRow
              label="In"
              value={model.inputPrice}
              hex="#34d399"
              width={barWidth(model.inputPriceNum, priceMax)}
            />
            <PriceRow
              label="Out"
              value={model.outputPrice}
              hex="#a78bfa"
              width={barWidth(model.outputPriceNum, priceMax)}
            />
          </div>

          {/* affordance */}
          <div className="relative mt-5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
              View full spec
            </span>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors group-hover:text-[var(--accent)]">
              Open
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  // ── GRID VIEW (default) ────────────────────────────────────────────
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{
        delay: Math.min(index * 0.04, 0.4),
        duration: 0.5,
        ease: EASE,
      }}
      role="button"
      tabIndex={0}
      aria-label={`${model.name} by ${model.provider}`}
      onKeyDown={handleKey}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl p-[1px] outline-none focus-visible:z-10"
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
    >
      {/* edge glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `0 0 0 1px ${accent}55, 0 12px 40px -12px ${accent}55`,
        }}
      />
      {/* hover spotlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), ${accent}12, transparent 60%)`,
        }}
      />

      <div className="relative flex h-full flex-col overflow-hidden rounded-[15px] border border-white/5 bg-[#0A0A0A] p-5 transition-colors duration-300 group-hover:border-[var(--accent)]/20">
        {/* header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-transform duration-500 group-hover:scale-105">
              {model.logo ? (
                <Image
                  src={model.logo}
                  alt={`${model.provider} logo`}
                  width={24}
                  height={24}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <IconComponent className="h-5 w-5" style={{ color: accent }} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold tracking-tight text-white transition-colors group-hover:text-[var(--accent)]">
                {model.name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
                {model.provider}
              </p>
            </div>
          </div>
          {model.popular && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-blue-400">
              <TrendingUp className="h-2.5 w-2.5" />
              Hot
            </span>
          )}
        </div>

        {/* spec strip */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <SpecChip icon={Hash} label={model.context} />
          <SpecChip icon={Layers} label={maxOutput} />
          <SpecChip icon={SlidersHorizontal} label={`${paramCount}`} />
        </div>

        {/* price viz */}
        <div className="mt-auto space-y-2.5 rounded-xl border border-white/5 bg-black/30 p-3.5">
          <PriceRow
            label="In"
            value={model.inputPrice}
            hex="#34d399"
            width={barWidth(model.inputPriceNum, priceMax)}
          />
          <PriceRow
            label="Out"
            value={model.outputPrice}
            hex="#a78bfa"
            width={barWidth(model.outputPriceNum, priceMax)}
          />
        </div>

        {/* affordance */}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">
            Details
          </span>
          <ArrowRight className="h-4 w-4 text-gray-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
        </div>
      </div>
    </motion.article>
  );
}

// ── spec chip ───────────────────────────────────────────────────────
function SpecChip({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  accent?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors duration-300 group-hover:border-white/10">
      <Icon
        className="h-3 w-3"
        style={accent ? { color: accent } : undefined}
      />
      {label}
    </span>
  );
}
