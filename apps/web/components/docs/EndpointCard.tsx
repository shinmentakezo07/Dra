"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Lock, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MethodBadge                                                        */
/* ------------------------------------------------------------------ */

export const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/8 text-emerald-400 border-emerald-500/15",
    POST: "bg-blue-500/8 text-blue-400 border-blue-500/15",
    PUT: "bg-amber-500/8 text-amber-400 border-amber-500/15",
    PATCH: "bg-orange-500/8 text-orange-400 border-orange-500/15",
    DELETE: "bg-red-500/8 text-red-400 border-red-500/15",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
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
      className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden transition-all duration-200 hover:border-white/[0.12]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left group"
      >
        <MethodBadge method={method} />
        <code className="text-white/80 font-mono text-sm tracking-tight group-hover:text-white transition-colors">
          {path}
        </code>
        <span className="hidden sm:block flex-1 text-right text-[12px] text-white/15 truncate pl-4">{description}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {auth && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-[10px] font-medium text-white/20">
              <Lock className="w-2.5 h-2.5" />
              Auth
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/35 transition-colors" />
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
              <p className="text-sm text-white/40 flex items-start gap-2">
                <span className="text-blue-400/40 mt-px text-[10px]">●</span>
                <span>{description}</span>
              </p>
              <div className="pl-4 border-l-2 border-blue-500/[0.12]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
