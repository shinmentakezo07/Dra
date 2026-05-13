"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import type { NavItem } from "./types";

/* ------------------------------------------------------------------ */
/*  Search Modal                                                       */
/* ------------------------------------------------------------------ */

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (id: string) => void;
}

export const SearchModal = ({ open, onClose, items, onNavigate }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const filteredNav = items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-xl bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <Search className="w-5 h-5 text-white/25" />
              <input
                autoFocus
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/30">
                <span className="text-white/20">⌘</span>K
              </kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2 hero-scroll">
              {filteredNav.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Search className="w-6 h-6 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">No results for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredNav.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] text-left transition-all duration-150 group"
                    >
                      <item.icon className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                      <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                      <span className="ml-auto text-[10px] text-white/15 font-mono group-hover:text-white/30 transition-colors">
                        Jump to <ArrowRight className="w-2.5 h-2.5 inline ml-0.5" />
                      </span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
            <div className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">ESC</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
