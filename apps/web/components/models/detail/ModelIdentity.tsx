"use client";

import { useState, useId } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, Copy } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";
import { formatPricePerM, formatContextLabel, getMaxOutputTokens, getContextPercentage } from "@/lib/model-utils";
import { getProviderLogo } from "@/lib/provider-logos";
import { SpeedometerGauge } from "./SpeedometerGauge";

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
  const uid = useId();

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = model.name.split(":")[0];
  const nameVariant = model.name.includes(":") ? model.name.split(":").slice(1).join(":") : null;

  return (
    <section aria-label="Model identity">
      {/* Back — minimal, no icon */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="mb-12 text-[10px] font-mono text-gray-600 hover:text-gray-300 tracking-[0.2em] uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
      >
        ← Models
      </motion.button>

      <div className="relative">
        {/* Provider marque — tiny, technical */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-[10px] font-mono text-gray-600 tracking-[0.3em] uppercase mb-4"
        >
          {providerName}
        </motion.div>

        <div className="relative flex items-start justify-between gap-8">
          {/* Name — typographic monument */}
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="text-[clamp(3rem,8vw,9rem)] font-black tracking-[-0.04em] text-white leading-[0.88] mb-0.5"
            >
              {displayName}
              {nameVariant && (
                <span className="block text-gray-800 text-[clamp(1.5rem,4vw,4.5rem)] font-bold tracking-[-0.02em] mt-0.5">
                  {nameVariant}
                </span>
              )}
            </motion.h1>

            {/* Accent line — the ONLY place provider color appears structurally */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="h-px origin-left mb-6"
              style={{ backgroundColor: theme.accent }}
            />
          </div>

          {/* Logo — positioned at the top right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative shrink-0 mt-1 group"
          >
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-white/[0.06] transition-all duration-300 group-hover:border-white/[0.15] group-hover:shadow-lg"
              style={{ backgroundColor: `${theme.accent}08` }}
            >
              {logo ? (
                <div className="w-full h-full flex items-center justify-center p-4 transition-transform duration-300 group-hover:scale-105">
                  <Image src={logo} alt={`${providerName} logo`} width={48} height={48} className="object-contain" unoptimized />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${theme.color} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="w-10 h-10 md:w-12 md:h-12" />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Meta row — ID, status, date */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap items-center gap-3 mb-10"
        >
          <button
            onClick={copyId}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg font-mono text-[11px] font-bold transition-all duration-200 cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ backgroundColor: `${theme.accent}0d`, color: theme.accent, borderColor: `${theme.accent}20`, borderWidth: 1 }}
            aria-label={`Copy model ID: ${model.id}`}
          >
            <span className="truncate max-w-[200px]">{model.id}</span>
            {copied ? (
              <CheckCircle className="w-3 h-3 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0 opacity-50" />
            )}
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            ACTIVE
          </span>

          {model.created_date && (
            <span className="text-[11px] font-mono text-gray-600">{model.created_date}</span>
          )}
        </motion.div>

        {/* Instrument cluster — 4 speedometers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6"
        >
          <SpeedometerGauge
            label="Input Cost"
            value={`$${formatPricePerM(model, "prompt")}`}
            sublabel="/1M tokens"
            percentage={Math.min(parseFloat(formatPricePerM(model, "prompt")) / 10 * 100, 100)}
            accentColor="#34d399"
            delay={0.4}
          />
          <SpeedometerGauge
            label="Output Cost"
            value={`$${formatPricePerM(model, "completion")}`}
            sublabel="/1M tokens"
            percentage={Math.min(parseFloat(formatPricePerM(model, "completion")) / 20 * 100, 100)}
            accentColor="#22d3ee"
            delay={0.5}
          />
          <SpeedometerGauge
            label="Context"
            value={formatContextLabel(model.context_length)}
            sublabel="tokens"
            percentage={getContextPercentage(model.context_length)}
            accentColor="#818cf8"
            delay={0.6}
          />
          <SpeedometerGauge
            label="Max Output"
            value={getMaxOutputTokens(model)}
            sublabel="tokens"
            percentage={model.top_provider?.max_completion_tokens ? Math.min((model.top_provider.max_completion_tokens / 100000) * 100, 100) : 0}
            accentColor="#c084fc"
            delay={0.7}
          />
        </motion.div>
      </div>
    </section>
  );
}
