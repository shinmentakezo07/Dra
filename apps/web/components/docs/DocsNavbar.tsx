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
      {/* Accent strip with animated shimmer */}
      <div className="relative h-[2px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ backgroundColor: accentHex }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ opacity: scrolled ? 0.7 : 0.35 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentHex}40 50%, transparent 100%)`,
            opacity: scrolled ? 0.6 : 0,
          }}
          animate={{ x: scrolled ? ["-100%", "200%"] : "-100%" }}
          transition={{
            duration: 2.5,
            repeat: scrolled ? Infinity : 0,
            repeatDelay: 3,
            ease: "linear",
          }}
        />
      </div>

      {/* Navbar body */}
      <div
        className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled
            ? "bg-[#08080a]/97 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.4)]"
            : "bg-[#08080a]/60 backdrop-blur-xl"
        }`}
      >
        <header className="mx-auto max-w-6xl flex items-center h-[56px] px-4 sm:px-6">
          {/* ── Left cluster: logo + section badge ── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={onMobileMenuClick}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-1 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <div className="relative w-9 h-9 rounded-[10px] bg-black border border-white/[0.08] overflow-hidden flex items-center justify-center group-hover:border-white/[0.18] transition-all duration-500 shadow-[0_0_0_0_transparent] group-hover:shadow-[0_0_16px_-2px_rgba(255,255,255,0.06)]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:6px_6px]" />
                <div
                  className="absolute inset-0 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: `inset 0 0 12px -4px ${accentHex}15` }}
                />
                <Image
                  src="/nervous-cat.jpg"
                  alt="Yapapa"
                  width={26}
                  height={26}
                  className="rounded-[6px] object-cover relative z-10"
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[15px] font-extrabold tracking-[-0.04em] text-white/70 group-hover:text-white transition-colors duration-300"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  YAPAPA
                </span>
                <span className="hidden sm:block text-[8px] font-mono uppercase tracking-[0.2em] text-white/[0.12] -mt-0.5 group-hover:text-white/[0.18] transition-colors duration-300">
                  LLM Gateway
                </span>
              </div>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

            {/* Section indicator */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border relative overflow-hidden"
                style={{
                  borderColor: `${accentHex}18`,
                  backgroundColor: `${accentHex}08`,
                }}
                initial={false}
                animate={{
                  borderColor: `${accentHex}18`,
                  backgroundColor: `${accentHex}08`,
                }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="absolute inset-0 opacity-20 rounded-lg"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${accentHex}15, transparent 70%)` }}
                />
                <BookOpen
                  className="w-3 h-3 relative z-10"
                  style={{ color: accentHex, opacity: 0.7 }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 relative z-10">
                  Docs
                </span>
              </motion.div>

              {currentSectionLabel && (
                <>
                  <motion.span
                    className="text-white/[0.06] text-[11px] font-light select-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    /
                  </motion.span>
                  <motion.span
                    key={currentSectionLabel}
                    initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 4, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium truncate max-w-[160px]"
                    style={{ color: `${accentHex}90` }}
                  >
                    {currentSectionLabel}
                  </motion.span>
                </>
              )}
            </div>
          </div>

          {/* ── Right cluster: nav + actions ── */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Desktop nav links */}
            <nav
              className="hidden lg:flex items-center mr-1"
              aria-label="Platform navigation"
            >
              {productLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/35 hover:text-white/70 transition-all duration-200 cursor-pointer group"
                >
                  <span className="relative z-10">{link.label}</span>
                  <div className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="absolute bottom-0.5 left-3 right-3 h-px bg-white/[0.12] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left" />
                </Link>
              ))}
            </nav>

            {/* Product dropdown */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setProductOpen((v) => !v)}
                aria-expanded={productOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                  productOpen
                    ? "text-white/70 bg-white/[0.06]"
                    : "text-white/35 hover:text-white/65 hover:bg-white/[0.04]"
                }`}
              >
                Product
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    productOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-[260px] rounded-xl bg-[#0b0b0d]/97 backdrop-blur-2xl border border-white/[0.06] overflow-hidden z-50"
                    style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 8px 40px -8px rgba(0,0,0,0.7), 0 0 24px -4px ${accentHex}08` }}
                  >
                    {/* Top accent glow */}
                    <div
                      className="absolute top-0 left-0 right-0 h-12 opacity-30 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 50% -20%, ${accentHex}12, transparent 70%)` }}
                    />

                    {/* Panel header */}
                    <div className="px-4 pt-4 pb-2.5 border-b border-white/[0.04] relative z-10">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-white/[0.13]">
                        Platform
                      </span>
                    </div>

                    {/* Links */}
                    <div className="p-2 relative z-10">
                      {productLinks.map((link, i) => (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.2 }}
                        >
                          <Link
                            href={link.href}
                            onClick={() => setProductOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group"
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border border-white/[0.04] group-hover:border-white/[0.08] transition-all duration-200`}
                              style={{
                                backgroundColor: `${ACCENT_MAP[link.accent.replace("bg-", "").replace("-500", "")] ?? "#60a5fa"}0a`,
                                color: ACCENT_MAP[link.accent.replace("bg-", "").replace("-500", "")] ?? "#60a5fa",
                                opacity: 0.5,
                              }}
                            >
                              <span className={`w-2 h-2 rounded-full ${link.accent} opacity-60`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white/[0.45] group-hover:text-white/85 transition-colors leading-tight">
                                {link.label}
                              </p>
                              <p className="text-[11px] text-white/[0.15] mt-0.5 leading-snug group-hover:text-white/25 transition-colors">
                                {link.desc}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/70 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-white/50 transition-colors" />
              <span className="hidden sm:inline text-[12px] font-medium">Search</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-[2px] rounded-[4px] bg-white/[0.03] border border-white/[0.04] text-[9px] font-mono text-white/[0.12] leading-none">
                <span className="text-[10px]">&#8984;</span>K
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="p-2 rounded-lg text-white/[0.15] hover:text-white/50 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer ml-0.5"
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
