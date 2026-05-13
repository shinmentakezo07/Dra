"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Lock, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MethodBadge                                                        */
/* ------------------------------------------------------------------ */

export const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5",
    PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
    PATCH: "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border shadow-sm ${
        colors[method] || colors.GET
      }`}
    >
      {method}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  EndpointCard (Accordion)                                           */
/* ------------------------------------------------------------------ */

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
      className="rounded-xl border border-white/[0.08] bg-[#0A0A0A] overflow-hidden transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.01]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left group"
      >
        <MethodBadge method={method} />
        <code className="text-white font-mono text-sm tracking-tight group-hover:text-white/90 transition-colors">
          {path}
        </code>
        <div className="ml-auto flex items-center gap-2">
          {auth && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-medium text-white/20">
              <Lock className="w-2.5 h-2.5" />
              Auth
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-white/20 mt-px">▸</span>
                <span>{description}</span>
              </p>
              <div className="pl-3 border-l border-white/[0.06]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
