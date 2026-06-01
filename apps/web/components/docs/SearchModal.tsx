"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Command, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import type { NavItem } from "./types";
import { cn } from "@/lib/utils";

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
  "self-hosting": "Getting Started",
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }}
            className={cn(
              "w-full max-w-lg rounded-2xl overflow-hidden",
              "border border-white/[0.08]",
              "bg-gradient-to-b from-white/[0.04] to-white/[0.015]",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-20px_rgba(99,102,241,0.3)]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Atmospheric glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] relative">
              <Search className="w-4 h-4 text-indigo-200/80" />
              <input
                autoFocus
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search documentation"
                className="flex-1 bg-transparent border-none outline-none text-white/90 placeholder:text-white/30 text-sm font-medium"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06]">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filteredNav.length === 0 ? (
                <div className="px-4 py-12 text-center space-y-2">
                  <Sparkles className="w-5 h-5 text-white/15 mx-auto" />
                  <p className="text-sm text-white/30">No matching pages</p>
                </div>
              ) : (
                filteredNav.map((item) => {
                  const cat = CATEGORIES[item.id] || "";
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-sm cursor-pointer group",
                        "text-white/55 hover:text-white/95",
                        "hover:bg-gradient-to-r hover:from-indigo-500/[0.08] hover:to-transparent",
                        "border border-transparent hover:border-indigo-500/15",
                        "transition-all duration-200",
                      )}
                    >
                      <FileText className="w-4 h-4 text-white/30 group-hover:text-indigo-200 transition-colors flex-shrink-0" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {cat && (
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em] text-indigo-200/45 group-hover:text-indigo-200/80 transition-colors">
                          {cat}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05] bg-white/[0.01]">
              <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.15em]">
                {filteredNav.length} pages
              </span>
              <span className="text-[10px] font-mono text-white/20">esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
