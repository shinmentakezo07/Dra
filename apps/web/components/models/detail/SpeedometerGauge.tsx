"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface SpeedometerGaugeProps {
  label: string
  value: string
  sublabel: string
  percentage: number
  accentColor?: string
  delay?: number
}

export function SpeedometerGauge({ label, value, sublabel, percentage, accentColor = "#818cf8", delay = 0 }: SpeedometerGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-end justify-between mb-2">
        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.15em] font-medium">{label}</span>
        <div className="text-right">
          <span className="text-white font-mono text-lg font-bold tracking-tight">{value}</span>
          <span className="text-gray-600 font-mono text-[10px] ml-1.5">{sublabel}</span>
        </div>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: accentColor }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {/* Tick marks */}
      <div className="flex justify-between mt-1">
        {[0, 25, 50, 75, 100].map((tick) => (
          <span key={tick} className="text-[8px] text-gray-700 font-mono">{tick}%</span>
        ))}
      </div>
    </div>
  );
}
