"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, Copy, ArrowUpRight } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";
import { formatPricePerM, formatContextLabel, getMaxOutputTokens, getContextPercentage } from "@/lib/model-utils";
import { getProviderLogo } from "@/lib/provider-logos";

interface ModelIdentityProps {
  model: OpenRouterModelData
  theme: ProviderTheme
  onBack: () => void
}

export function ModelIdentity({ model, theme, onBack }: ModelIdentityProps) {
  const [copied, setCopied] = useState(false);
  const logo = getProviderLogo(model.id);
  const Icon = theme.icon;
  const providerName = model.id.split("/")[0];

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = model.name.split(":")[0];
  const nameVariant = model.name.includes(":") ? model.name.split(":").slice(1).join(":") : null;
  const isFree = parseFloat(formatPricePerM(model, "prompt")) === 0 && parseFloat(formatPricePerM(model, "completion")) === 0;
  const inputPrice = parseFloat(formatPricePerM(model, "prompt"));
  const outputPrice = parseFloat(formatPricePerM(model, "completion"));

  const specs = [
    { label: "Context", value: formatContextLabel(model.context_length), sub: "tokens" },
    { label: "Max Output", value: getMaxOutputTokens(model), sub: "tokens" },
    { label: "Input", value: `$${inputPrice.toFixed(2)}`, sub: "/1M tokens" },
    { label: "Output", value: `$${outputPrice.toFixed(2)}`, sub: "/1M tokens" },
  ];

  return (
    <section aria-label="Model identity">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="mb-10 text-[10px] font-mono text-gray-600 hover:text-gray-300 tracking-[0.2em] uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
      >
        ← Models
      </motion.button>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-5"
        >
          <span className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase">
            {providerName}
          </span>
          {isFree && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold tracking-widest uppercase">
              Free
            </span>
          )}
        </motion.div>

        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="text-[clamp(2.5rem,7vw,7rem)] font-black tracking-[-0.04em] text-white leading-[0.88]"
            >
              {displayName}
            </motion.h1>
            {nameVariant && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="text-[clamp(1.2rem,3vw,3rem)] font-bold tracking-[-0.02em] text-gray-600 mt-1"
              >
                {nameVariant}
              </motion.p>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative shrink-0 mt-2 group"
          >
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-white/[0.06] transition-all duration-300 group-hover:border-white/[0.12]"
              style={{ backgroundColor: `${theme.accent}06` }}
            >
              {logo ? (
                <div className="w-full h-full flex items-center justify-center p-3 transition-transform duration-300 group-hover:scale-105">
                  <Image src={logo} alt={`${providerName} logo`} width={40} height={40} className="object-contain" unoptimized />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${theme.color} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="h-px origin-left mb-8"
          style={{ backgroundColor: theme.accent, opacity: 0.3 }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 mb-10"
        >
          <button
            onClick={copyId}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg font-mono text-[11px] font-bold transition-all duration-200 cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ backgroundColor: `${theme.accent}0d`, color: theme.accent }}
            aria-label={`Copy model ID: ${model.id}`}
          >
            <span className="truncate max-w-[180px]">{model.id}</span>
            {copied ? (
              <CheckCircle className="w-3 h-3 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0 opacity-50" />
            )}
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            ACTIVE
          </span>

          {model.created_date && (
            <span className="text-[10px] font-mono text-gray-600">{model.created_date}</span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]"
        >
          {specs.map((spec, i) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.08 }}
              className="bg-[#0A0A0A] p-4 group hover:bg-white/[0.02] transition-colors duration-200"
            >
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em] mb-1.5">{spec.label}</div>
              <div className="text-white font-mono text-lg font-bold tracking-tight">{spec.value}</div>
              <div className="text-gray-600 font-mono text-[9px] mt-0.5">{spec.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
