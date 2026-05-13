"use client";

import { Lightbulb } from "lucide-react";

export function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.1] text-sm text-blue-400/80">
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400/60" />
      <span>{children}</span>
    </div>
  );
}
