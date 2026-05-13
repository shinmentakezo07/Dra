"use client";

import { motion } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";
import { formatContextLabel, getContextPercentage, getMaxOutputTokens } from "@/lib/model-utils";
import { SpeedometerGauge } from "./SpeedometerGauge";

interface PerformancePanelProps {
  model: OpenRouterModelData
}

export function PerformancePanel({ model }: PerformancePanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Performance specifications"
    >
      <h2 className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-6">Performance</h2>
      <div className="space-y-5">
        <div className="p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A]">
          <SpeedometerGauge
            label="Context Window"
            value={formatContextLabel(model.context_length)}
            sublabel="tokens"
            percentage={getContextPercentage(model.context_length)}
            accentColor="#818cf8"
            delay={0.2}
          />
        </div>
        <div className="p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A]">
          <SpeedometerGauge
            label="Max Output Tokens"
            value={getMaxOutputTokens(model)}
            sublabel="tokens"
            percentage={model.top_provider?.max_completion_tokens ? Math.min((model.top_provider.max_completion_tokens / 100000) * 100, 100) : 0}
            accentColor="#c084fc"
            delay={0.35}
          />
        </div>
      </div>
    </motion.section>
  );
}
