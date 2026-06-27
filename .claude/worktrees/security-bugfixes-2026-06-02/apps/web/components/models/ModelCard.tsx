"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Cpu } from "lucide-react";
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
    popular?: boolean;
    speed?: string;
    description?: string;
  };
  index: number;
  onClick: () => void;
  featured?: boolean;
}

export function ModelCard({
  model,
  index,
  onClick,
  featured = false,
}: ModelCardProps) {
  const IconComponent = model.icon || Cpu;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        delay: index * 0.06,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      className={`relative group cursor-pointer ${featured ? "md:col-span-2 md:row-span-2" : ""}`}
      onClick={onClick}
    >
      {/* Glow effect on hover */}
      <div
        className={`absolute -inset-[1px] rounded-[24px] opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-500 ${
          model.popular
            ? "bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-fuchsia-500/30"
            : "bg-gradient-to-br from-white/10 via-white/5 to-transparent"
        }`}
      />

      {/* Card outer — glass pattern */}
      <div className="glass-card rounded-[24px] p-1 relative overflow-hidden group h-full">
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/[0.07] via-transparent to-violet-500/[0.05]" />

        {/* Inner content */}
        <div className="relative h-full bg-[#0A0A0A] rounded-[20px] p-6 flex flex-col border border-white/5 z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              {/* Logo / Icon */}
              <div className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                {model.logo ? (
                  <Image
                    src={model.logo}
                    alt={`${model.provider} logo`}
                    width={28}
                    height={28}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <IconComponent
                    className={`w-6 h-6 ${model.color || "text-gray-400"}`}
                  />
                )}
              </div>

              <div>
                <h3
                  className={`font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors line-clamp-1 ${featured ? "text-xl md:text-2xl" : "text-base"}`}
                >
                  {model.name}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {model.provider}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {model.popular && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[9px] font-mono font-bold tracking-widest uppercase">
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </span>
              )}
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 py-1 bg-white/[0.03] rounded-lg border border-white/5">
                {model.context}
              </span>
            </div>
          </div>

          {/* Description (featured only) */}
          {featured && model.description && (
            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-lg">
              {model.description}
            </p>
          )}

          {/* Pricing */}
          <div className="space-y-2.5 pt-4 border-t border-white/5 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                  Input
                </span>
              </div>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                {model.inputPrice}/1M
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                  Output
                </span>
              </div>
              <span className="text-violet-400 font-mono font-bold text-sm">
                {model.outputPrice}/1M
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto">
            <button className="relative w-full py-2.5 font-mono text-xs font-bold tracking-wider uppercase transition-all overflow-hidden group/btn text-white rounded-xl">
              <div className="absolute inset-0 bg-white/5 border border-white/10 group-hover/btn:bg-white/10 group-hover/btn:border-white/20 transition-all duration-300 rounded-xl" />
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-30 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                View Details
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
