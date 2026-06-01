"use client";

import { Lightbulb, AlertTriangle, OctagonAlert, Info } from "lucide-react";
import type { TipVariant } from "./types";
import { cn } from "@/lib/utils";

/* ── Glass Atelier callouts — single indigo with semantic accents ── */
const variantConfig: Record<
  TipVariant,
  {
    icon: typeof Lightbulb;
    iconColor: string;
    iconBg: string;
    accent: string;
    label: string;
  }
> = {
  tip: {
    icon: Lightbulb,
    iconColor: "text-indigo-200",
    iconBg: "border-indigo-500/15 bg-indigo-500/[0.06]",
    accent: "from-indigo-500/12",
    label: "Tip",
  },
  info: {
    icon: Info,
    iconColor: "text-sky-200",
    iconBg: "border-sky-500/15 bg-sky-500/[0.06]",
    accent: "from-sky-500/12",
    label: "Info",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-200",
    iconBg: "border-amber-500/15 bg-amber-500/[0.06]",
    accent: "from-amber-500/12",
    label: "Warning",
  },
  critical: {
    icon: OctagonAlert,
    iconColor: "text-rose-200",
    iconBg: "border-rose-500/15 bg-rose-500/[0.06]",
    accent: "from-rose-500/12",
    label: "Critical",
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
      className={cn(
        "group relative my-8 overflow-hidden rounded-2xl",
        "border border-white/[0.07] bg-white/[0.015]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.5)]",
      )}
    >
      {/* Side accent bar */}
      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b",
          cfg.accent,
          "to-transparent",
        )}
      />

      {/* Hover glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-r opacity-40 group-hover:opacity-100 transition-opacity duration-700",
          cfg.accent,
          "via-transparent to-transparent",
        )}
      />

      <div className="relative flex items-start gap-4 p-5">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border",
            cfg.iconBg,
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          )}
        >
          <Icon className={cn("w-4 h-4", cfg.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/35 block mb-1.5">
            {cfg.label}
          </span>
          <span className="text-sm leading-[1.75] text-white/70">
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}
