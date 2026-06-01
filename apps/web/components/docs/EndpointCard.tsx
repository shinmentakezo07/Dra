"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Glass Atelier method colors — muted, semantically rich ── */
const METHOD_STYLES: Record<
  string,
  { color: string; bg: string; border: string; glow: string }
> = {
  GET: {
    color: "text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/[0.06]",
  },
  POST: {
    color: "text-indigo-200",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
    glow: "shadow-indigo-500/[0.06]",
  },
  PUT: {
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/[0.06]",
  },
  PATCH: {
    color: "text-orange-200",
    bg: "bg-orange-500/[0.08]",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/[0.06]",
  },
  DELETE: {
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/[0.06]",
  },
};

export const MethodBadge = ({ method }: { method: string }) => {
  const style = METHOD_STYLES[method] || METHOD_STYLES.GET;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold tracking-[0.12em] border",
        "shadow-sm",
        style.color,
        style.bg,
        style.border,
        style.glow,
      )}
    >
      {method}
    </span>
  );
};

export const EndpointCard = ({
  method,
  path,
  description,
  auth = true,
  children,
}: {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className={cn(
        "group rounded-2xl border border-white/[0.07] overflow-hidden",
        "bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        "hover:border-indigo-500/25 hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "transition-all duration-300",
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 text-left cursor-pointer"
      >
        <MethodBadge method={method} />
        <code className="text-white/80 font-mono text-sm tracking-tight group-hover:text-white transition-colors flex-shrink min-w-0 truncate">
          {path}
        </code>
        <span className="hidden sm:block flex-1 text-right text-[12px] text-white/30 truncate pl-4 group-hover:text-white/45 transition-colors">
          {description}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {auth && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium text-white/40">
              <Lock className="w-2.5 h-2.5" />
              Auth
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.02] border border-white/[0.05] group-hover:border-indigo-500/20 group-hover:bg-indigo-500/[0.04] transition-all"
          >
            <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-indigo-200 transition-colors" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/[0.05]">
              <p className="text-sm text-white/55 flex items-start gap-3 pt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <span className="leading-[1.7]">{description}</span>
              </p>
              {children && (
                <div className="pl-5 border-l-2 border-indigo-500/15">
                  {children}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
