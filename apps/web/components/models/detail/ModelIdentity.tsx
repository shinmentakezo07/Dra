"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Copy, ChevronLeft, ExternalLink } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";
import {
  formatPricePerM,
  formatContextLabel,
  getMaxOutputTokens,
} from "@/lib/model-utils";
import { getProviderLogo } from "@/lib/provider-logos";

interface ModelIdentityProps {
  model: OpenRouterModelData;
  theme: ProviderTheme;
  onBack: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const stagger = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease, delay: 0.45 + i * 0.06 },
  }),
};

export function ModelIdentity({ model, theme, onBack }: ModelIdentityProps) {
  const [copied, setCopied] = useState(false);
  const prefersReduced = useReducedMotion();
  const logo = getProviderLogo(model.id);
  const Icon = theme.icon;
  const providerName = model.id.split("/")[0];

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = model.name.split(":")[0];
  const nameVariant = model.name.includes(":")
    ? model.name.split(":").slice(1).join(":")
    : null;
  const isFree =
    parseFloat(formatPricePerM(model, "prompt")) === 0 &&
    parseFloat(formatPricePerM(model, "completion")) === 0;
  const inputPrice = parseFloat(formatPricePerM(model, "prompt"));
  const outputPrice = parseFloat(formatPricePerM(model, "completion"));

  const specs = [
    {
      label: "Context",
      value: formatContextLabel(model.context_length),
      sub: "tokens",
    },
    { label: "Max Output", value: getMaxOutputTokens(model), sub: "tokens" },
    { label: "Input", value: `$${inputPrice.toFixed(2)}`, sub: "/1M tokens" },
    { label: "Output", value: `$${outputPrice.toFixed(2)}`, sub: "/1M tokens" },
  ];

  return (
    <section aria-label="Model identity">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="group mb-10 flex items-center gap-1.5 text-[10px] font-mono text-gray-600 hover:text-gray-300 tracking-[0.2em] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
        aria-label="Back to model registry"
      >
        <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
        Models
      </motion.button>

      <div className="relative">
        {/* Provider + badges row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center gap-3 mb-5"
        >
          <span
            className="text-[10px] font-mono tracking-[0.3em] uppercase font-semibold"
            style={{ color: `${theme.accent}90` }}
          >
            {providerName}
          </span>
          {isFree && (
            <span
              className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase"
              style={{
                backgroundColor: `${theme.accent}15`,
                borderColor: `${theme.accent}25`,
                color: theme.accent,
                borderWidth: 1,
              }}
            >
              Free
            </span>
          )}
        </motion.div>

        {/* Hero: name + logo badge */}
        <div className="flex items-start justify-between gap-8 mb-8">
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.05 }}
              className="text-[clamp(2.5rem,7vw,6.5rem)] font-black tracking-[-0.05em] leading-[0.85]"
            >
              <span className="text-white">{displayName}</span>
              {nameVariant && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease, delay: 0.2 }}
                  className="block text-gray-700 text-[clamp(1.1rem,3vw,3rem)] font-bold tracking-[-0.02em] mt-2"
                >
                  {nameVariant}
                </motion.span>
              )}
            </motion.h1>
          </div>

          {/* Logo badge — with accent glow on hover */}
          <motion.div
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.85, rotate: -3 }
            }
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="relative shrink-0 mt-1 group"
          >
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden relative transition-shadow duration-500"
              style={{
                borderColor: `${theme.accent}20`,
                backgroundColor: `${theme.accent}06`,
                borderWidth: 1,
                boxShadow: `0 0 0 0px ${theme.accent}00`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${theme.accent}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0px ${theme.accent}00`;
              }}
            >
              {logo ? (
                <div className="w-full h-full flex items-center justify-center p-3">
                  <Image
                    src={logo}
                    alt={`${providerName} logo`}
                    width={40}
                    height={40}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center ${theme.color}`}
                >
                  <Icon className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
            </div>
            {/* Ambient glow behind logo */}
            <div
              className="absolute -inset-3 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10"
              style={{
                background: `radial-gradient(circle, ${theme.accent}12, transparent 70%)`,
              }}
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Accent divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="h-px origin-left mb-8"
          style={{ backgroundColor: theme.accent, opacity: 0.2 }}
        />

        {/* ID pill + status + date */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center gap-2.5 mb-10"
        >
          <button
            onClick={copyId}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg font-mono text-[11px] font-bold transition-all duration-200 cursor-pointer hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{
              backgroundColor: `${theme.accent}0d`,
              color: theme.accent,
            }}
            aria-label={`Copy model ID: ${model.id}`}
          >
            <span className="truncate max-w-[200px]">{model.id}</span>
            {copied ? (
              <CheckCircle className="w-3 h-3 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0 opacity-50" />
            )}
          </button>

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg text-[10px] font-mono font-bold border"
            style={{
              backgroundColor: `${theme.accent}0a`,
              borderColor: `${theme.accent}15`,
              color: theme.accent,
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: theme.accent }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: theme.accent }}
              />
            </span>
            ACTIVE
          </span>

          {model.created_date && (
            <span className="text-[10px] font-mono text-gray-600">
              {model.created_date}
            </span>
          )}

          <a
            href={`https://openrouter.ai/models/${model.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-lg text-[10px] font-mono text-gray-600 hover:text-gray-400 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 cursor-pointer"
            aria-label="View on OpenRouter"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            OpenRouter
          </a>
        </motion.div>

        {/* Spec cards — bento-style stat grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border"
          style={{
            borderColor: `${theme.accent}10`,
            backgroundColor: `${theme.accent}08`,
          }}
        >
          {specs.map((spec, i) => (
            <motion.div
              key={spec.label}
              custom={i}
              variants={stagger}
              initial="initial"
              animate="animate"
              className="p-5 group relative overflow-hidden"
              style={{ backgroundColor: "#060608" }}
            >
              {/* Corner accent on first card */}
              {i === 0 && (
                <div
                  className="absolute top-0 left-0 w-8 h-8"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}08, transparent)`,
                  }}
                  aria-hidden="true"
                />
              )}
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em] mb-2">
                {spec.label}
              </div>
              <div
                className="text-white font-mono text-xl font-bold tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {spec.value}
              </div>
              <div className="text-gray-600 font-mono text-[9px] mt-1">
                {spec.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
