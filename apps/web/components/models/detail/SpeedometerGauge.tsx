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
          <motion.span
            className="text-white font-mono text-lg font-bold tracking-tight"
            initial={{ opacity: 0, y: 6 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.5, delay: delay + 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {value}
          </motion.span>
          <span className="text-gray-600 font-mono text-[10px] ml-1.5">{sublabel}</span>
        </div>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden" role="meter" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${value}`}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: accentColor }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {/* SVG tick marks */}
      <svg className="w-full mt-1" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={tick} y1="0" x2={tick} y2="4" stroke="rgb(75,85,99)" strokeWidth="0.5" />
            <text x={tick} y="10" textAnchor="middle" fill="rgb(55,65,81)" fontSize="4" fontFamily="monospace">{tick}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
