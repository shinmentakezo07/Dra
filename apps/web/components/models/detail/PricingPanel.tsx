"use client";

import type { OpenRouterModelData } from "@/types/model";
import { formatPricePerM } from "@/lib/model-utils";

interface PricingPanelProps {
  model: OpenRouterModelData
}

function PriceRow({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] font-mono text-gray-500">{label}</span>
      <div>
        <span className="text-base font-bold font-mono tracking-tight" style={{ color: accent || "#fff" }}>${value}</span>
        <span className="text-[10px] font-mono text-gray-700 ml-1.5">{sub}</span>
      </div>
    </div>
  );
}

export function PricingPanel({ model }: PricingPanelProps) {
  const inputPrice = parseFloat(formatPricePerM(model, "prompt"));
  const outputPrice = parseFloat(formatPricePerM(model, "completion"));
  const isFree = inputPrice === 0 && outputPrice === 0;
  const cacheRead = model.pricing?.input_cache_read;
  const cacheWrite = model.pricing?.input_cache_write;
  const hasCache = !!cacheRead || !!cacheWrite;

  return (
    <section aria-label="Pricing" id="pricing">
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-4 flex items-center gap-3">
        <span className="w-4 h-px bg-gray-600" />
        Pricing
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
        {isFree && (
          <div className="px-4 py-3 bg-emerald-500/[0.06] border-b border-emerald-500/10">
            <span className="text-emerald-400 font-mono text-xs font-bold">Free to use</span>
            <span className="text-emerald-400/60 font-mono text-[10px] ml-2">No per-token charges</span>
          </div>
        )}

        <div className="p-4">
          <PriceRow label="Input" value={formatPricePerM(model, "prompt")} sub="/1M tokens" accent="#34d399" />
          <PriceRow label="Output" value={formatPricePerM(model, "completion")} sub="/1M tokens" accent="#818cf8" />

          {hasCache && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <div className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2">Context Caching</div>
              {cacheRead && (
                <PriceRow label="Cache Read" value={(parseFloat(cacheRead) * 1000000).toFixed(2)} sub="/1M tokens" />
              )}
              {cacheWrite && (
                <PriceRow label="Cache Write" value={(parseFloat(cacheWrite) * 1000000).toFixed(2)} sub="/1M tokens" />
              )}
            </div>
          )}

          {model.pricing?.web_search && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <PriceRow label="Web Search" value={(parseFloat(model.pricing.web_search) * 1000).toFixed(2)} sub="/1K searches" />
            </div>
          )}
        </div>

        {!isFree && (
          <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500">Est. 1K tokens</span>
              <span className="text-white font-mono text-sm font-bold">
                ${((inputPrice + outputPrice) / 1000).toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      {model.knowledge_cutoff && (
        <>
          <div className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-4 mt-8 flex items-center gap-3">
            <span className="w-4 h-px bg-gray-600" />
            Knowledge Cutoff
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-4 py-3">
            <span className="text-white font-mono text-sm tracking-tight">{model.knowledge_cutoff}</span>
          </div>
        </>
      )}
    </section>
  );
}
