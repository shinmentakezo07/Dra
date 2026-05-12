"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

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
      className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={`text-xs font-mono font-bold ${changeColors[changeType]}`}>
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-white mb-1 font-mono">
        {value}
      </h3>
      <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">{title}</p>
    </motion.div>
  );
}
