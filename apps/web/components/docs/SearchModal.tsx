"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText } from "lucide-react";
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-xl bg-[#0c0c0e] border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
              <Search className="w-4 h-4 text-white/25" />
              <input
                autoFocus
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search documentation"
                className="flex-1 bg-transparent border-none outline-none text-white/80 placeholder:text-white/20 text-sm"
              />
              <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.06]">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredNav.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-white/20">No matching pages</p>
                </div>
              ) : (
                filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] text-left text-sm text-white/40 hover:text-white/80 transition-all duration-150 cursor-pointer group"
                  >
                    <FileText className="w-3.5 h-3.5 text-white/15 group-hover:text-white/30 transition-colors flex-shrink-0" />
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
