"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Menu,
  BookOpen,
  ChevronDown,
  Sparkles,
  Activity,
  Rocket,
  Building2,
  Mail,
  Newspaper,
  Scale,
  ArrowUpRight,
  FileText,
  Library,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DocsNavbarProps {
  onSearchOpen: () => void;
  onMobileMenuClick: () => void;
  currentSectionLabel?: string;
}

const productLinks = [
  { label: "Models", href: "/models", desc: "Browse 100+ AI models" },
  { label: "Playground", href: "/playground", desc: "Test models in-browser" },
  { label: "Pricing", href: "/pricing", desc: "Credit-based billing" },
  { label: "Dashboard", href: "/dashboard", desc: "Usage analytics & keys" },
];

const resourcesLinks = [
  { label: "Changelog", href: "/changelog", desc: "Every release, every fix", icon: FileText },
  { label: "Blog", href: "/blog", desc: "Engineering deep dives", icon: Newspaper },
  { label: "Status", href: "/status", desc: "Live system availability", icon: Activity },
  { label: "Roadmap", href: "/roadmap", desc: "What we're building next", icon: Rocket },
  { label: "About", href: "/about", desc: "Our team, story, investors", icon: Building2 },
  { label: "Enterprise", href: "/enterprise", desc: "Dedicated, compliant, 24/7", icon: Sparkles },
  { label: "Contact", href: "/contact", desc: "Talk to a human", icon: Mail },
  { label: "Legal", href: "/legal", desc: "Terms, privacy, cookies", icon: Scale },
];

export function DocsNavbar({
  onSearchOpen,
  onMobileMenuClick,
  currentSectionLabel,
}: DocsNavbarProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productOpen && !resourcesOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (productRef.current && !productRef.current.contains(target)) {
        setProductOpen(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(target)) {
        setResourcesOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProductOpen(false);
        setResourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [productOpen, resourcesOpen]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Single indigo accent strip */}
      <div className="relative h-[2px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-400/60 via-violet-400/40 to-indigo-300/30"
          initial={false}
          animate={{ opacity: scrolled ? 0.85 : 0.5 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(165,180,252,0.5) 50%, transparent 100%)",
          }}
          animate={{ x: scrolled ? ["-100%", "200%"] : "-100%" }}
          transition={{
            duration: 3,
            repeat: scrolled ? Infinity : 0,
            repeatDelay: 4,
            ease: "linear",
          }}
        />
      </div>

      {/* Navbar body */}
      <div
        className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled
            ? "bg-[#06060a]/96 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.05),0_8px_32px_-8px_rgba(99,102,241,0.08),0_4px_24px_rgba(0,0,0,0.4)]"
            : "bg-[#06060a]/55 backdrop-blur-xl"
        }`}
      >
        <header className="mx-auto max-w-6xl flex items-center h-[56px] px-4 sm:px-6">
          {/* ── Left cluster ── */}
          <div className="flex items-center gap-3 min-w-0">
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
              <div className="relative w-9 h-9 rounded-[10px] bg-black border border-white/[0.08] overflow-hidden flex items-center justify-center group-hover:border-indigo-500/30 transition-all duration-500 group-hover:shadow-[0_0_18px_-2px_rgba(99,102,241,0.4)]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:6px_6px]" />
                <div className="absolute inset-0 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[inset_0_0_14px_-3px_rgba(165,180,252,0.25)]" />
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
                  className="text-[15px] font-extrabold tracking-[-0.04em] text-white/75 group-hover:text-white transition-colors duration-300"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  YAPAPA
                </span>
                <span className="hidden sm:block text-[8px] font-mono uppercase tracking-[0.2em] text-white/[0.12] -mt-0.5 group-hover:text-indigo-200/60 transition-colors duration-300">
                  LLM Gateway
                </span>
              </div>
            </Link>

            <div className="hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

            {/* Section indicator — unified indigo */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.06] relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                initial={false}
                animate={{ borderColor: "rgba(99,102,241,0.2)" }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="absolute inset-0 opacity-30 rounded-lg"
                  style={{
                    background:
                      "radial-gradient(ellipse at 0% 50%, rgba(99,102,241,0.18), transparent 70%)",
                  }}
                />
                <BookOpen className="w-3 h-3 text-indigo-200 relative z-10" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80 relative z-10">
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
                    initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 4, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium text-white/55 truncate max-w-[160px]"
                  >
                    {currentSectionLabel}
                  </motion.span>
                </>
              )}
            </div>
          </div>

          {/* ── Right cluster ── */}
          <div className="flex items-center gap-1.5 ml-auto">
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
                  <div className="absolute bottom-0.5 left-3 right-3 h-px bg-indigo-400/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left" />
                </Link>
              ))}
            </nav>

            <div className="relative hidden md:block" ref={productRef}>
              <button
                onClick={() => {
                  setProductOpen((v) => !v);
                  setResourcesOpen(false);
                }}
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
                    className="absolute right-0 top-full mt-2 w-[260px] rounded-xl bg-[#0a0a0d]/97 backdrop-blur-2xl border border-white/[0.07] overflow-hidden z-50 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_40px_-8px_rgba(0,0,0,0.7),0_0_40px_-8px_rgba(99,102,241,0.18)]"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-12 opacity-40 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.18), transparent 70%)",
                      }}
                    />
                    <div className="px-4 pt-4 pb-2.5 border-b border-white/[0.04] relative z-10">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-white/15">
                        Platform
                      </span>
                    </div>
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
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/[0.04] group-hover:border-indigo-500/25 bg-indigo-500/[0.04] group-hover:bg-indigo-500/[0.08] transition-all duration-200">
                              <span className="w-2 h-2 rounded-full bg-indigo-300/60 group-hover:bg-indigo-200 transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white/50 group-hover:text-white/90 transition-colors leading-tight">
                                {link.label}
                              </p>
                              <p className="text-[11px] text-white/20 mt-0.5 leading-snug group-hover:text-white/35 transition-colors">
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

            {/* Resources dropdown */}
            <div className="relative hidden md:block" ref={resourcesRef}>
              <button
                onClick={() => {
                  setResourcesOpen((v) => !v);
                  setProductOpen(false);
                }}
                aria-expanded={resourcesOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                  resourcesOpen
                    ? "text-white/70 bg-white/[0.06]"
                    : "text-white/35 hover:text-white/65 hover:bg-white/[0.04]"
                }`}
              >
                <Library className="w-3 h-3" />
                Resources
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    resourcesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {resourcesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-[420px] rounded-xl bg-[#0a0a0d]/97 backdrop-blur-2xl border border-white/[0.07] overflow-hidden z-50 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_40px_-8px_rgba(0,0,0,0.7),0_0_40px_-8px_rgba(99,102,241,0.18)]"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-16 opacity-50 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.22), transparent 70%)",
                      }}
                    />
                    <div className="grid grid-cols-2 relative z-10">
                      {resourcesLinks.map((link, i) => (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.2 }}
                        >
                          <Link
                            href={link.href}
                            onClick={() => setResourcesOpen(false)}
                            className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer border-b border-r border-white/[0.03] last:border-r-0 [&:nth-last-child(-n+2)]:border-b-0"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/[0.04] group-hover:border-indigo-500/25 bg-indigo-500/[0.04] group-hover:bg-indigo-500/[0.08] transition-all duration-200 flex-shrink-0 mt-0.5">
                              <link.icon className="w-3.5 h-3.5 text-indigo-200/70 group-hover:text-indigo-200 transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-medium text-white/55 group-hover:text-white/95 transition-colors leading-tight flex items-center gap-1">
                                {link.label}
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                              </p>
                              <p className="text-[10.5px] text-white/25 mt-0.5 leading-snug group-hover:text-white/40 transition-colors">
                                {link.desc}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-between relative z-10">
                      <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.15em]">
                        {resourcesLinks.length} pages
                      </span>
                      <a
                        href="https://github.com/shinmentakezo07/owsiwa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-white/30 hover:text-indigo-200 flex items-center gap-1 transition-colors"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        Star on GitHub
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search trigger */}
            <button
              onClick={onSearchOpen}
              aria-label="Search documentation (Ctrl+K)"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/70 hover:border-indigo-500/20 hover:bg-indigo-500/[0.04] transition-all duration-300 cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-indigo-200 transition-colors" />
              <span className="hidden sm:inline text-[12px] font-medium">
                Search
              </span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-[2px] rounded-[4px] bg-white/[0.04] border border-white/[0.05] text-[9px] font-mono text-white/15 leading-none">
                <span className="text-[10px]">&#8984;</span>K
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="p-2 rounded-lg text-white/15 hover:text-white/55 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer ml-0.5"
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
