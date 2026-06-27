"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";
import {
  formatContextLabel,
  getContextPercentage,
  getMaxOutputTokens,
} from "@/lib/model-utils";
import { getProviderTheme } from "@/lib/model-utils";

interface PerformancePanelProps {
  model: OpenRouterModelData;
}

const ease = [0.16, 1, 0.3, 1] as const;

function MetricCard({
  label,
  value,
  sub,
  percentage,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  percentage: number;
  color: string;
  delay: number;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease, delay }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-gray-500">
          {label}
        </span>
        <div className="text-right">
          <span
            className="text-white font-mono text-xl font-bold tracking-tight"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          <span className="text-gray-600 font-mono text-[10px] ml-1">
            {sub}
          </span>
        </div>
      </div>
      {/* Progress track with dot indicator */}
      <div
        className="relative h-1 rounded-full overflow-visible"
        style={{ backgroundColor: `${color}10` }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(percentage, 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Glow at bar end */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{
            borderColor: color,
            backgroundColor: "#000",
            boxShadow: `0 0 8px ${color}40`,
          }}
          initial={{ left: 0, opacity: 0 }}
          whileInView={{ left: `${Math.min(percentage, 100)}%`, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 text-right">
        <span className="text-[10px] font-mono" style={{ color: `${color}80` }}>
          {Math.round(percentage)}%
        </span>
      </div>
    </motion.div>
  );
}

export function PerformancePanel({ model }: PerformancePanelProps) {
  const contextPct = getContextPercentage(model.context_length);
  const maxTokens = model.top_provider?.max_completion_tokens || 0;
  const outputPct = maxTokens ? Math.min((maxTokens / 100000) * 100, 100) : 0;
  const theme = getProviderTheme(model.id);
  const accent = theme?.accent || "#818cf8";

  const secondaryColor = shiftHue(accent, 30);

  return (
    <motion.section
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      aria-label="Performance specifications"
      id="performance"
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: accent }}
        >
          02
        </span>
        <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">
          Performance
        </h2>
        <span
          className="flex-1 h-px"
          style={{ backgroundColor: `${accent}12` }}
        />
      </div>

      <div
        className="rounded-2xl border p-6 relative overflow-hidden"
        style={{ borderColor: `${accent}12`, backgroundColor: `${accent}04` }}
      >
        {/* Top highlight line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${accent}30, transparent)`,
          }}
        />
        {/* Corner accent badge */}
        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${accent}10`,
            color: accent,
          }}
        >
          Tokens
        </div>

        <div className="space-y-7 mt-2">
          <MetricCard
            label="Context Window"
            value={formatContextLabel(model.context_length)}
            sub="tokens"
            percentage={contextPct}
            color={accent}
            delay={0.1}
          />
          <MetricCard
            label="Max Output"
            value={getMaxOutputTokens(model)}
            sub="tokens"
            percentage={outputPct}
            color={secondaryColor}
            delay={0.2}
          />
        </div>

        {model.top_provider?.is_moderated && (
          <div
            className="flex items-center gap-2 mt-6 pt-4"
            style={{ borderTopColor: `${accent}08`, borderTopWidth: 1 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-mono text-gray-400">
              Content moderation enabled
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function shiftHue(hex: string, degrees: number): string {
  const hsl = hexToHSL(hex);
  hsl.h = (hsl.h + degrees) % 360;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
