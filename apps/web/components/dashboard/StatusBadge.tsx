"use client";

import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: "success" | "error" | "warning" | "info";
  label: string;
  size?: "sm" | "md" | "lg";
}

const statusStyles = {
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const dotColors = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

const sizeStyles = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-bold uppercase tracking-wider ${statusStyles[status]} ${sizeStyles[size]}`}
    >
      <motion.span
        className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`}
        animate={
          status === "success"
            ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }
            : status === "error"
              ? { scale: [1, 1.2, 1] }
              : undefined
        }
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {label}
    </span>
  );
}
