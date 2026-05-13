"use client";

import { Lightbulb, AlertTriangle, OctagonAlert } from "lucide-react";
import type { TipVariant } from "./types";

const variantStyles: Record<TipVariant, {
  container: string;
  icon: typeof Lightbulb;
  iconClass: string;
}> = {
  tip: {
    container: "bg-blue-500/[0.04] border-blue-500/[0.1] text-blue-400/80",
    icon: Lightbulb,
    iconClass: "text-blue-400/60",
  },
  warning: {
    container: "bg-amber-500/[0.04] border-amber-500/[0.1] text-amber-400/80",
    icon: AlertTriangle,
    iconClass: "text-amber-400/60",
  },
  critical: {
    container: "bg-red-500/[0.04] border-red-500/[0.1] text-red-400/80",
    icon: OctagonAlert,
    iconClass: "text-red-400/60",
  },
};

export function TipBox({ children, variant = "tip" }: { children: React.ReactNode; variant?: TipVariant }) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles.container}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.iconClass}`} />
      <span>{children}</span>
    </div>
  );
}
