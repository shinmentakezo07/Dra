"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Lock, ChevronRight } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/[0.1] text-emerald-400 border-emerald-500/[0.2] shadow-emerald-500/[0.05]",
  POST: "bg-blue-500/[0.1] text-blue-400 border-blue-500/[0.2] shadow-blue-500/[0.05]",
  PUT: "bg-amber-500/[0.1] text-amber-400 border-amber-500/[0.2] shadow-amber-500/[0.05]",
  PATCH:
    "bg-orange-500/[0.1] text-orange-400 border-orange-500/[0.2] shadow-orange-500/[0.05]",
  DELETE:
    "bg-red-500/[0.1] text-red-400 border-red-500/[0.2] shadow-red-500/[0.05]",
};

export const MethodBadge = ({ method }: { method: string }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold tracking-wider border shadow-sm ${
      METHOD_COLORS[method] || METHOD_COLORS.GET
    }`}
  >
    {method}
  </span>
);

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
      className="rounded-xl border border-white/[0.06] bg-[#0a0a0c] overflow-hidden transition-all duration-200 hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/10"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 text-left group cursor-pointer"
      >
        <MethodBadge method={method} />
        <code className="text-white/80 font-mono text-sm tracking-tight group-hover:text-white transition-colors flex-shrink min-w-0 truncate">
          {path}
        </code>
        <span className="hidden sm:block flex-1 text-right text-[12px] text-white/30 truncate pl-4">
          {description}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {auth && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium text-white/35">
              <Lock className="w-2.5 h-2.5" />
              Auth
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors" />
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
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
              <p className="text-sm text-white/50 flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{description}</span>
              </p>
              <div className="pl-4 border-l-2 border-white/[0.08]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
