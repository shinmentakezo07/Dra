"use client";

import type { OpenRouterModelData } from "@/types/model";
import { formatPricePerM } from "@/lib/model-utils";

interface PricingPanelProps {
  model: OpenRouterModelData
}

function PriceRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-white/[0.04] last:border-0 transition-colors duration-150 hover:bg-white/[0.02] px-4 -mx-4 first:-mt-2.5 last:-mb-2.5 rounded-sm">
      <span className="text-[11px] font-mono text-gray-500">{label}</span>
      <div>
        <span className="text-base font-bold font-mono text-white tracking-tight">${value}</span>
        <span className="text-[10px] font-mono text-gray-700 ml-1.5">{sub}</span>
      </div>
    </div>
  );
}

export function PricingPanel({ model }: PricingPanelProps) {
  return (
    <section aria-label="Pricing">
      <div className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-4">Pricing</div>
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4">
        <PriceRow label="Input" value={formatPricePerM(model, "prompt")} sub="/1M tokens" />
        <PriceRow label="Output" value={formatPricePerM(model, "completion")} sub="/1M tokens" />
        {model.pricing?.input_cache_read && (
          <PriceRow label="Cache Read" value={(parseFloat(model.pricing.input_cache_read) * 1000000).toFixed(2)} sub="/1M tokens" />
        )}
        {model.pricing?.input_cache_write && (
          <PriceRow label="Cache Write" value={(parseFloat(model.pricing.input_cache_write) * 1000000).toFixed(2)} sub="/1M tokens" />
        )}
      </div>

      {model.knowledge_cutoff && (
        <>
          <div className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-4 mt-8">Knowledge Cutoff</div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4">
            <span className="text-white font-mono text-base tracking-tight">{model.knowledge_cutoff}</span>
          </div>
        </>
      )}
    </section>
  );
}
