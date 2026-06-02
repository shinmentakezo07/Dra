"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Coins } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";
import { formatPricePerM } from "@/lib/model-utils";
import { getProviderTheme } from "@/lib/model-utils";

interface PricingPanelProps {
  model: OpenRouterModelData;
}

const ease = [0.16, 1, 0.3, 1] as const;

function PriceRow({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  delay?: number;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease, delay: delay ?? 0 }}
      className="flex items-baseline justify-between py-2.5 first:pt-0 last:pb-0"
      style={{ borderBottomColor: `${accent}08` }}
    >
      <span className="text-[11px] font-mono text-gray-500">{label}</span>
      <div className="text-right">
        <span
          className="text-base font-bold font-mono tracking-tight"
          style={{
            color: accent || "#fff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${value}
        </span>
        <span className="text-[10px] font-mono text-gray-700 ml-1.5">
          {sub}
        </span>
      </div>
    </motion.div>
  );
}

export function PricingPanel({ model }: PricingPanelProps) {
  const inputPrice = parseFloat(formatPricePerM(model, "prompt"));
  const outputPrice = parseFloat(formatPricePerM(model, "completion"));
  const isFree = inputPrice === 0 && outputPrice === 0;
  const cacheRead = model.pricing?.input_cache_read;
  const cacheWrite = model.pricing?.input_cache_write;
  const hasCache = !!cacheRead || !!cacheWrite;
  const theme = getProviderTheme(model.id);
  const accent = theme?.accent || "#6366f1";
  const prefersReduced = useReducedMotion();

  return (
    <motion.section
      initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      aria-label="Pricing"
      id="pricing"
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: accent }}
        >
          04
        </span>
        <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">
          Pricing
        </h2>
        <span
          className="flex-1 h-px"
          style={{ backgroundColor: `${accent}12` }}
        />
      </div>

      <div
        className="rounded-2xl border relative overflow-hidden"
        style={{ borderColor: `${accent}12`, backgroundColor: `${accent}04` }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${accent}30, transparent)`,
          }}
        />

        {isFree && (
          <div
            className="px-5 py-3"
            style={{
              backgroundColor: `${accent}0a`,
              borderBottomColor: `${accent}10`,
              borderBottomWidth: 1,
            }}
          >
            <span
              className="font-mono text-xs font-bold"
              style={{ color: accent }}
            >
              Free to use
            </span>
            <span
              className="font-mono text-[10px] ml-2"
              style={{ color: `${accent}60` }}
            >
              No per-token charges
            </span>
          </div>
        )}

        <div className="p-5 space-y-px">
          <PriceRow
            label="Input"
            value={formatPricePerM(model, "prompt")}
            sub="/1M tokens"
            accent={accent}
            delay={0}
          />
          <PriceRow
            label="Output"
            value={formatPricePerM(model, "completion")}
            sub="/1M tokens"
            accent={shiftBrightness(accent, 30)}
            delay={0.05}
          />
        </div>

        {hasCache && (
          <div className="px-5 pb-5">
            <div
              className="pt-4"
              style={{ borderTopColor: `${accent}08`, borderTopWidth: 1 }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Coins className="w-3 h-3" style={{ color: `${accent}50` }} />
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.15em]">
                  Context Caching
                </span>
              </div>
              <div className="space-y-px">
                {cacheRead && (
                  <PriceRow
                    label="Cache Read"
                    value={(parseFloat(cacheRead) * 1000000).toFixed(2)}
                    sub="/1M tokens"
                    accent={`${accent}aa`}
                    delay={0.1}
                  />
                )}
                {cacheWrite && (
                  <PriceRow
                    label="Cache Write"
                    value={(parseFloat(cacheWrite) * 1000000).toFixed(2)}
                    sub="/1M tokens"
                    accent={`${accent}aa`}
                    delay={0.15}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {model.pricing?.web_search && (
          <div className="px-5 pb-5">
            <div
              className="pt-4"
              style={{ borderTopColor: `${accent}08`, borderTopWidth: 1 }}
            >
              <PriceRow
                label="Web Search"
                value={(parseFloat(model.pricing.web_search) * 1000).toFixed(2)}
                sub="/1K searches"
                accent={`${accent}aa`}
                delay={0.2}
              />
            </div>
          </div>
        )}

        {!isFree && (
          <div
            className="px-5 py-3"
            style={{
              backgroundColor: `${accent}06`,
              borderTopColor: `${accent}08`,
              borderTopWidth: 1,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500">
                Est. 1K tokens
              </span>
              <span
                className="font-mono text-sm font-bold text-white"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                ${((inputPrice + outputPrice) / 1000).toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      {model.knowledge_cutoff && (
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex-1 h-px"
              style={{ backgroundColor: `${accent}08` }}
            />
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.15em]">
              Knowledge Cutoff
            </span>
          </div>
          <div
            className="rounded-2xl border px-5 py-3"
            style={{
              borderColor: `${accent}08`,
              backgroundColor: `${accent}02`,
            }}
          >
            <span className="text-white font-mono text-sm tracking-tight">
              {model.knowledge_cutoff}
            </span>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function shiftBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
