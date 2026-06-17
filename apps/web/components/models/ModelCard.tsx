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
