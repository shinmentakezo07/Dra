"use client";

import { Lightbulb } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tip / Callout Box                                                  */
/* ------------------------------------------------------------------ */

export const TipBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/[0.04] border border-primary/[0.1] text-sm text-blue-400/80">
    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400/60" />
    <span>{children}</span>
  </div>
);
