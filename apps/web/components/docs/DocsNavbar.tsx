"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Menu, BookOpen, ChevronDown, Sparkles, Zap, Layout, BarChart3 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DocsNavbarProps {
  onSearchOpen: () => void;
  onMobileMenuClick: () => void;
  currentSectionLabel?: string;
}

const productLinks = [
  { label: "Models", href: "/models", desc: "Browse 100+ AI models", icon: Sparkles },
  { label: "Playground", href: "/playground", desc: "Test models in-browser", icon: Zap },
  { label: "Pricing", href: "/pricing", desc: "Credit-based billing", icon: BarChart3 },
  { label: "Dashboard", href: "/dashboard", desc: "Usage analytics & keys", icon: Layout },
];

export function DocsNavbar({
  onSearchOpen,
  onMobileMenuClick,
  currentSectionLabel,
}: DocsNavbarProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [productOpen]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Enhanced accent strip with gradient shimmer */}
      <div className="relative h-[2px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/70 via-violet-400/50 to-indigo-400/40"
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0.6 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(165,180,252,0.7) 50%, transparent 100%)",
          }}
          animate={{ x: scrolled ? ["-100%", "200%"] : "-100%" }}
          transition={{
            duration: 2.5,
            repeat: scrolled ? Infinity : 0,
            repeatDelay: 3,
            ease: "linear",
          }}
        />
        {/* Secondary shimmer for depth */}
        <motion.div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 50%, transparent 100%)",
          }}
          animate={{ x: scrolled ? ["-150%", "250%"] : "-150%" }}
          transition={{
            duration: 3.5,
            repeat: scrolled ? Infinity : 0,
            repeatDelay: 5,
            ease: "linear",
          }}
        />
      </div>

      {/* Navbar body with enhanced backdrop */}
      <div
        className={cn(
          "pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "bg-[#06060a]/98 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_32px_-8px_rgba(99,102,241,0.12),0_4px_24px_rgba(0,0,0,0.5)] border-b border-white/[0.03]"
            : "bg-[#06060a]/60 backdrop-blur-xl"
        )}
      >
        <header className="mx-auto max-w-6xl flex items-center h-[58px] px-4 sm:px-6">
          {/* ── Left cluster ── */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMobileMenuClick}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-1 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group"
            >
              <Menu className="w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-200" />
            </button>

            {/* Enhanced Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative w-9 h-9 rounded-[11px] bg-black border border-white/[0.08] overflow-hidden flex items-center justify-center group-hover:border-indigo-500/40 transition-all duration-500 group-hover:shadow-[0_0_20px_-2px_rgba(99,102,241,0.5)]">
                {/* Animated grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:6px_6px]" />
                {/* Hover glow overlay */}
                <div className="absolute inset-0 rounded-[11px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[inset_0_0_16px_-3px_rgba(165,180,252,0.35)]" />
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-gradient-to-br from-indigo-400/30 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image
                  src="/nervous-cat.jpg"
                  alt="Yapapa"
                  width={26}
                  height={26}
                  className="rounded-[7px] object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[15px] font-extrabold tracking-[-0.04em] text-white/80 group-hover:text-white transition-colors duration-300"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  YAPAPA
                </span>
                <span className="hidden sm:block text-[8px] font-mono uppercase tracking-[0.2em] text-white/[0.15] -mt-0.5 group-hover:text-indigo-200/70 transition-colors duration-300">
                  LLM Gateway
                </span>
              </div>
            </Link>

            <div className="hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-white/[0.1] to-transparent" />

            {/* Enhanced Section indicator */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-500/25 bg-indigo-500/[0.08] relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_12px_-4px_rgba(99,102,241,0.3)]"
                initial={false}
                animate={{ borderColor: "rgba(99,102,241,0.25)" }}
                transition={{ duration: 0.4 }}
              >
                {/* Animated background glow */}
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background:
                      "radial-gradient(ellipse at 0% 50%, rgba(99,102,241,0.2), transparent 70%)",
                  }}
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <BookOpen className="w-3 h-3 text-indigo-200 relative z-10" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-200/90 relative z-10">
                  Docs
                </span>
              </motion.div>

              {currentSectionLabel && (
                <>
                  <span className="text-white/[0.1] text-[11px] font-light select-none">/</span>
                  <motion.span
                    key={currentSectionLabel}
                    initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 4, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium text-white/60 truncate max-w-[160px]"
                  >
                    {currentSectionLabel}
                  </motion.span>
                </>
              )}
            </div>
          </div>

          {/* ── Right cluster ── */}
          <div className="flex items-center gap-1.5 ml-auto">
            <nav className="hidden lg:flex items-center mr-1" aria-label="Platform navigation">
              {productLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/80 transition-all duration-200 cursor-pointer group"
                >
                  <span className="relative z-10">{link.label}</span>
                  <div className="absolute inset-0 rounded-lg bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="absolute bottom-0.5 left-3 right-3 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left" />
                </Link>
              ))}
            </nav>

            {/* Enhanced Product dropdown */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setProductOpen((v) => !v)}
                aria-expanded={productOpen}
                aria-haspopup="true"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer",
                  productOpen
                    ? "text-white/80 bg-white/[0.07] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06]"
                )}
              >
                Product
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    productOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-[280px] rounded-xl bg-[#0a0a0d]/98 backdrop-blur-2xl border border-white/[0.08] overflow-hidden z-50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_-8px_rgba(0,0,0,0.8),0_0_50px_-8px_rgba(99,102,241,0.2)]"
                  >
                    {/* Top glow */}
                    <div
                      className="absolute top-0 left-0 right-0 h-16 opacity-50 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.25), transparent 70%)",
                      }}
                    />
                    <div className="px-4 pt-4 pb-2.5 border-b border-white/[0.05] relative z-10">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-white/20">
                        Platform
                      </span>
                    </div>
                    <div className="p-2 relative z-10">
                      {productLinks.map((link, i) => {
                        const Icon = link.icon;
                        return (
                          <motion.div
                            key={link.href}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                          >
                            <Link
                              href={link.href}
                              onClick={() => setProductOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 cursor-pointer group relative overflow-hidden"
                            >
                              {/* Hover spotlight */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.08] to-transparent" />
                              </div>
                              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.05] group-hover:border-indigo-500/30 bg-indigo-500/[0.05] group-hover:bg-indigo-500/[0.1] transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                                <Icon className="w-4 h-4 text-indigo-200/70 group-hover:text-indigo-200 transition-colors duration-200" />
                              </div>
                              <div className="relative min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-white/60 group-hover:text-white/95 transition-colors leading-tight">
                                  {link.label}
                                </p>
                                <p className="text-[11px] text-white/25 mt-0.5 leading-snug group-hover:text-white/40 transition-colors">
                                  {link.desc}
                                </p>
                              </div>
                              <div className="relative opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <svg
                                  className="w-3.5 h-3.5 text-indigo-200/60"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                    {/* Bottom accent line */}
                    <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Enhanced Search trigger */}
            <button
              onClick={onSearchOpen}
              aria-label="Search documentation (Ctrl+K)"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-white/40 hover:text-white/80 hover:border-indigo-500/25 hover:bg-indigo-500/[0.05] transition-all duration-300 cursor-pointer group relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12), transparent 70%)",
                  }}
                />
              </div>
              <Search className="w-3.5 h-3.5 group-hover:text-indigo-200 transition-colors relative z-10" />
              <span className="hidden sm:inline text-[12px] font-medium relative z-10">Search</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-[2px] rounded-[4px] bg-white/[0.05] border border-white/[0.06] text-[9px] font-mono text-white/20 leading-none relative z-10 group-hover:border-indigo-500/20 group-hover:text-indigo-200/70 transition-all duration-200">
                <span className="text-[10px]">&#8984;</span>K
              </kbd>
            </button>

            {/* Enhanced GitHub */}
            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="p-2 rounded-lg text-white/20 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer ml-0.5 group relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.1), transparent 70%)",
                  }}
                />
              </div>
              <svg
                className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-200"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
          </div>
        </header>
      </div>
    </div>
  );
}
