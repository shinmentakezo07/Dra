"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-blue-400",
  iconBg = "bg-blue-500/10",
}: MetricCardProps) {
  const changeColors = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-gray-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative bg-[#0A0A0A] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300 overflow-hidden"
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${iconBg}`}
      />
      <div className="relative flex items-center justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${iconBg} ${iconColor} group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span
            className={`text-xs font-mono font-bold ${changeColors[changeType]}`}
          >
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-white mb-1 font-mono">
        <AnimatedCounter target={value} />
      </h3>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
        {title}
      </p>
    </motion.div>
  );
}
