"use client";

import { Lightbulb, AlertTriangle, OctagonAlert } from "lucide-react";
import type { TipVariant } from "./types";

const variantConfig: Record<TipVariant, {
  icon: typeof Lightbulb;
  color: string;
  bg: string;
  border: string;
}> = {
  tip: {
    icon: Lightbulb,
    color: "text-violet-400/60",
    bg: "bg-violet-500/[0.03]",
    border: "border-l-violet-500/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400/60",
    bg: "bg-amber-500/[0.03]",
    border: "border-l-amber-500/30",
  },
  critical: {
    icon: OctagonAlert,
    color: "text-red-400/60",
    bg: "bg-red-500/[0.03]",
    border: "border-l-red-500/30",
  },
};

export function TipBox({ children, variant = "tip" }: { children: React.ReactNode; variant?: TipVariant }) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-l border-l-2 ${cfg.border} ${cfg.bg} text-sm text-white/50`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
      <span>{children}</span>
    </div>
  );
}
