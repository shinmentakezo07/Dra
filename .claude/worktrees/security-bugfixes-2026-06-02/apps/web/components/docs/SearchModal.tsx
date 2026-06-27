"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Command } from "lucide-react";
import { useState, useEffect } from "react";
import type { NavItem } from "./types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (id: string) => void;
}

const CATEGORIES: Record<string, string> = {
  quickstart: "Getting Started",
  authentication: "Getting Started",
  "api-reference": "Getting Started",
  chat: "Core Features",
  embeddings: "Core Features",
  conversations: "Core Features",
  prompts: "Core Features",
  batch: "Platform",
  files: "Platform",
  webhooks: "Platform",
  "rate-limits": "Platform",
  "error-handling": "Platform",
  organizations: "Platform",
  models: "Reference",
  pricing: "Reference",
  dashboard: "Reference",
  security: "Reference",
  examples: "Reference",
};

const CAT_COLORS: Record<string, string> = {
  "Getting Started": "text-emerald-400",
  "Core Features": "text-blue-400",
  Platform: "text-amber-400",
  Reference: "text-violet-400",
};

export const SearchModal = ({
  open,
  onClose,
  items,
  onNavigate,
}: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const filteredNav = items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            className="w-full max-w-lg rounded-2xl bg-[#0c0c0e] border border-white/[0.1] shadow-2xl shadow-black/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <Search className="w-4.5 h-4.5 text-white/40" />
              <input
                autoFocus
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search documentation"
                className="flex-1 bg-transparent border-none outline-none text-white/90 placeholder:text-white/30 text-sm"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.06]">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredNav.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-white/25">No matching pages</p>
                </div>
              ) : (
                filteredNav.map((item) => {
                  const cat = CATEGORIES[item.id] || "";
                  const catColor = CAT_COLORS[cat] || "text-white/20";
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/[0.06] text-left text-sm text-white/50 hover:text-white/90 transition-all duration-150 cursor-pointer group"
                    >
                      <FileText className="w-4 h-4 text-white/25 group-hover:text-white/40 transition-colors flex-shrink-0" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {cat && (
                        <span
                          className={`text-[9px] font-mono font-semibold uppercase tracking-wider ${catColor} opacity-50 group-hover:opacity-80 transition-opacity`}
                        >
                          {cat}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
