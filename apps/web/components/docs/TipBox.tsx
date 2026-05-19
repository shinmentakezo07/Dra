"use client";

import { Lightbulb, AlertTriangle, OctagonAlert, Info } from "lucide-react";
import type { TipVariant } from "./types";

const variantConfig: Record<TipVariant, {
  icon: typeof Lightbulb;
  iconColor: string;
  bg: string;
  border: string;
  label: string;
}> = {
  tip: {
    icon: Lightbulb,
    iconColor: "text-violet-400/70",
    bg: "bg-violet-500/[0.03]",
    border: "border-l-violet-500/40",
    label: "Tip",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400/70",
    bg: "bg-amber-500/[0.03]",
    border: "border-l-amber-500/40",
    label: "Warning",
  },
  critical: {
    icon: OctagonAlert,
    iconColor: "text-red-400/70",
    bg: "bg-red-500/[0.03]",
    border: "border-l-red-500/40",
    label: "Critical",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-400/70",
    bg: "bg-blue-500/[0.03]",
    border: "border-l-blue-500/40",
    label: "Info",
  },
};

export function TipBox({ children, variant = "tip" }: { children: React.ReactNode; variant?: TipVariant }) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3.5 p-4 rounded-r-lg rounded-l-sm border-l-[3px] ${cfg.border} ${cfg.bg} text-sm text-white/50 my-6`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
      <div className="min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/25 block mb-1">{cfg.label}</span>
        <span>{children}</span>
      </div>
    </div>
  );
}
