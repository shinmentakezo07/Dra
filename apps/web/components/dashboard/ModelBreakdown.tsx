"use client";

import { motion } from "framer-motion";
import type { APILog } from "@/lib/api/sdk";

interface ModelBreakdownProps {
  logs: APILog[];
  maxItems?: number;
}

const barColors = [
  "from-blue-500 to-blue-400",
  "from-purple-500 to-purple-400",
  "from-cyan-500 to-cyan-400",
  "from-emerald-500 to-emerald-400",
  "from-amber-500 to-amber-400",
  "from-pink-500 to-pink-400",
  "from-indigo-500 to-indigo-400",
  "from-teal-500 to-teal-400",
];

export function ModelBreakdown({ logs, maxItems = 6 }: ModelBreakdownProps) {
  const modelCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.model] = (acc[log.model] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      {sorted.map(([model, count], i) => {
        const pct = Math.round((count / maxCount) * 100);
        return (
          <div key={model} className="flex items-center gap-3 group">
            <span
              className="text-xs text-gray-400 font-mono w-32 truncate text-right shrink-0"
              title={model}
            >
              {model}
            </span>
            <div className="flex-1 h-5 bg-white/[0.03] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${barColors[i % barColors.length]} opacity-80 group-hover:opacity-100 transition-opacity`}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono w-8 shrink-0 tabular-nums">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
