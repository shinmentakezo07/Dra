"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Menu, BookOpen, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DocsNavbarProps {
  onSearchOpen: () => void;
  onMobileMenuClick: () => void;
  currentSectionLabel?: string;
  currentColor?: {
    accent: string;
    ring: string;
    text: string;
    bg: string;
    border: string;
    gradient: string;
  };
}

const productLinks = [
  {
    label: "Models",
    href: "/models",
    desc: "Browse 100+ AI models",
    accent: "bg-emerald-500",
  },
  {
    label: "Playground",
    href: "/playground",
    desc: "Test models in-browser",
    accent: "bg-blue-500",
  },
  {
    label: "Pricing",
    href: "/pricing",
    desc: "Credit-based billing",
    accent: "bg-amber-500",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    desc: "Usage analytics & keys",
    accent: "bg-violet-500",
  },
];

const ACCENT_MAP: Record<string, string> = {
  emerald: "#34d399",
  blue: "#60a5fa",
  amber: "#fbbf24",
  violet: "#a78bfa",
};

export function DocsNavbar({
  onSearchOpen,
  onMobileMenuClick,
  currentSectionLabel,
  currentColor,
}: DocsNavbarProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const accentHex =
    ACCENT_MAP[currentColor?.accent ?? "blue"] ?? ACCENT_MAP.blue;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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
      {/* Accent strip — shifts color with section */}
      <motion.div
        className="h-[2px] w-full"
        initial={false}
        animate={{ backgroundColor: accentHex }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ opacity: scrolled ? 0.6 : 0.3 }}
      />

      {/* Navbar body */}
      <div
        className={`pointer-events-auto transition-all duration-300 ${
          scrolled
            ? "bg-[#08080a]/95 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.03)]"
            : "bg-[#08080a]/70 backdrop-blur-xl"
        }`}
      >
        <header className="mx-auto max-w-6xl flex items-center h-[52px] px-4 sm:px-6">
          {/* ── Left cluster: logo + section badge ── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={onMobileMenuClick}
              aria-label="Open navigation"
              className="lg:hidden p-1.5 -ml-1.5 text-white/30 hover:text-white/60 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <div className="relative w-8 h-8 rounded-xl bg-black border border-white/[0.1] overflow-hidden flex items-center justify-center group-hover:border-white/[0.2] transition-all duration-300 shadow-sm shadow-black/20">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:5px_5px]" />
                <Image
                  src="/nervous-cat.jpg"
                  alt="Yapapa"
                  width={24}
                  height={24}
                  className="rounded-[5px] object-cover relative z-10"
                />
              </div>
              <span
                className="text-[16px] font-extrabold tracking-[-0.03em] text-white/75 group-hover:text-white transition-colors duration-300"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                YAPAPA
              </span>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-white/[0.08]" />

            {/* Section indicator — asymmetric badge */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                style={{
                  borderColor: `${accentHex}20`,
                  backgroundColor: `${accentHex}0a`,
                }}
                initial={false}
                animate={{
                  borderColor: `${accentHex}20`,
                  backgroundColor: `${accentHex}0a`,
                }}
                transition={{ duration: 0.4 }}
              >
                <BookOpen
                  className="w-3 h-3"
                  style={{ color: accentHex, opacity: 0.8 }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  Docs
                </span>
              </motion.div>

              {currentSectionLabel && (
                <>
                  <span className="text-white/[0.08] text-[11px] font-light select-none">
                    /
                  </span>
                  <motion.span
                    key={currentSectionLabel}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[12px] text-white/50 font-medium truncate max-w-[160px]"
                  >
                    {currentSectionLabel}
                  </motion.span>
                </>
              )}
            </div>
          </div>

          {/* ── Right cluster: nav + actions ── */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Desktop nav links */}
            <nav
              className="hidden lg:flex items-center mr-1"
              aria-label="Platform navigation"
            >
              {productLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Product dropdown */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setProductOpen((v) => !v)}
                aria-expanded={productOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/55 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
              >
                Product
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ease-out ${
                    productOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-1.5 w-[240px] rounded-xl bg-[#0d0d0f]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/60 overflow-hidden z-50"
                  >
                    {/* Panel header */}
                    <div className="px-4 pt-3.5 pb-2 border-b border-white/[0.04]">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-white/15">
                        Platform
                      </span>
                    </div>

                    {/* Links */}
                    <div className="p-1.5">
                      {productLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setProductOpen(false)}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${link.accent} opacity-50 group-hover:opacity-80 transition-opacity mt-[5px] flex-shrink-0`}
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-white/[0.55] group-hover:text-white/85 transition-colors leading-tight">
                              {link.label}
                            </p>
                            <p className="text-[11px] text-white/20 mt-0.5 leading-snug">
                              {link.desc}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search trigger */}
            <button
              onClick={onSearchOpen}
              aria-label="Search documentation (Ctrl+K)"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-white/50 transition-colors" />
              <span className="hidden sm:inline text-[12px] font-medium">
                Search
              </span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-[2px] rounded-[4px] bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-white/15 leading-none">
                <span className="text-[10px]">&#8984;</span>K
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="p-1.5 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer ml-0.5"
            >
              <svg
                className="w-4 h-4"
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
