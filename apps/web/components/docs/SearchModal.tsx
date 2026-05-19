"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import type { NavItem } from "./types";

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
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-lg bg-zinc-950 border border-white/[0.06] shadow-2xl shadow-black/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
              <Search className="w-4 h-4 text-white/20" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
              />
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.06]">
                ⌘K
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              {filteredNav.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-white/25">No results</p>
                </div>
              ) : (
                filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04] text-left text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    <span>{item.label}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
