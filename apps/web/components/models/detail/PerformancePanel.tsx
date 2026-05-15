"use client";

import { motion } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";
import { formatContextLabel, getContextPercentage, getMaxOutputTokens } from "@/lib/model-utils";

interface PerformancePanelProps {
  model: OpenRouterModelData
}

function MetricCard({ label, value, sub, percentage, color, delay }: {
  label: string; value: string; sub: string; percentage: number; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className="group"
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em]">{label}</span>
        <div className="text-right">
          <span className="text-white font-mono text-xl font-bold tracking-tight">{value}</span>
          <span className="text-gray-600 font-mono text-[10px] ml-1">{sub}</span>
        </div>
      </div>
      <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(percentage, 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

export function PerformancePanel({ model }: PerformancePanelProps) {
  const contextPct = getContextPercentage(model.context_length);
  const maxTokens = model.top_provider?.max_completion_tokens || 0;
  const outputPct = maxTokens ? Math.min((maxTokens / 100000) * 100, 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Performance specifications"
      id="performance"
    >
      <h2 className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-6 flex items-center gap-3">
        <span className="w-4 h-px bg-gray-600" />
        Performance
      </h2>

      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-6 space-y-6">
        <MetricCard
          label="Context Window"
          value={formatContextLabel(model.context_length)}
          sub="tokens"
          percentage={contextPct}
          color="#818cf8"
          delay={0.1}
        />
        <MetricCard
          label="Max Output"
          value={getMaxOutputTokens(model)}
          sub="tokens"
          percentage={outputPct}
          color="#c084fc"
          delay={0.2}
        />
        {model.top_provider?.is_moderated && (
          <div className="flex items-center gap-2 pt-4 border-t border-white/[0.04]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-mono text-gray-400">Content moderation enabled</span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
