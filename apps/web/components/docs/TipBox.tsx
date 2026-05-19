"use client";

import { Lightbulb, AlertTriangle, OctagonAlert } from "lucide-react";
import type { TipVariant } from "./types";

const variantStyles: Record<TipVariant, {
  container: string;
  icon: typeof Lightbulb;
  iconClass: string;
  border: string;
  glow: string;
}> = {
  tip: {
    container: "bg-violet-500/[0.04] text-violet-300/80",
    icon: Lightbulb,
    iconClass: "text-violet-400/70",
    border: "border-violet-500/[0.12]",
    glow: "shadow-[0_0_20px_-6px_rgba(139,92,246,0.1)]",
  },
  warning: {
    container: "bg-amber-500/[0.04] text-amber-300/80",
    icon: AlertTriangle,
    iconClass: "text-amber-400/70",
    border: "border-amber-500/[0.12]",
    glow: "shadow-[0_0_20px_-6px_rgba(245,158,11,0.1)]",
  },
  critical: {
    container: "bg-red-500/[0.04] text-red-300/80",
    icon: OctagonAlert,
    iconClass: "text-red-400/70",
    border: "border-red-500/[0.12]",
    glow: "shadow-[0_0_20px_-6px_rgba(239,68,68,0.1)]",
  },
};

export function TipBox({ children, variant = "tip" }: { children: React.ReactNode; variant?: TipVariant }) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className={`relative rounded-xl overflow-hidden`}>
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          padding: "1px",
          background: `linear-gradient(135deg, ${variant === "tip" ? "rgba(139,92,246,0.25)" : variant === "warning" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}, transparent)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className={`relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm text-sm ${styles.container} ${styles.border} ${styles.glow}`}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.iconClass}`} />
        <span>{children}</span>
      </div>
    </div>
  );
}
