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
  const fillRatio =
    maxContext > 0 && model.context_length
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
