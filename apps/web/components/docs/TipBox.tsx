"use client";

import { Lightbulb, AlertTriangle, OctagonAlert, Info } from "lucide-react";
import type { TipVariant } from "./types";

const variantConfig: Record<
  TipVariant,
  {
    icon: typeof Lightbulb;
    iconColor: string;
    bg: string;
    border: string;
    glow: string;
    label: string;
  }
> = {
  tip: {
    icon: Lightbulb,
    iconColor: "text-violet-400/70",
    bg: "bg-violet-500/[0.03]",
    border: "border-l-violet-500/40",
    glow: "from-violet-500/8",
    label: "Tip",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400/70",
    bg: "bg-amber-500/[0.03]",
    border: "border-l-amber-500/40",
    glow: "from-amber-500/8",
    label: "Warning",
  },
  critical: {
    icon: OctagonAlert,
    iconColor: "text-red-400/70",
    bg: "bg-red-500/[0.03]",
    border: "border-l-red-500/40",
    glow: "from-red-500/8",
    label: "Critical",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-400/70",
    bg: "bg-blue-500/[0.03]",
    border: "border-l-blue-500/40",
    glow: "from-blue-500/8",
    label: "Info",
  },
};

export function TipBox({
  children,
  variant = "tip",
}: {
  children: React.ReactNode;
  variant?: TipVariant;
}) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <div
      className={`group relative rounded-r-xl rounded-l-sm border-l-[3px] ${cfg.border} ${cfg.bg} text-sm text-white/[0.55] my-8 overflow-hidden backdrop-blur-sm`}
    >
      {/* Subtle glow on hover */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${cfg.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent" />
      <div className="relative flex items-start gap-4 p-5">
        <div
          className={`w-8 h-8 rounded-lg ${cfg.bg} border border-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5`}
        >
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-white/30 block mb-1.5">
            {cfg.label}
          </span>
          <span className="leading-relaxed">{children}</span>
        </div>
      </div>
    </div>
  );
}
