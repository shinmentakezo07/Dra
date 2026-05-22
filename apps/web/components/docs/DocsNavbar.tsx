"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Menu, BookOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  { label: "Models", href: "/models", desc: "Browse 100+ AI models" },
  { label: "Playground", href: "/playground", desc: "Test models in-browser" },
  { label: "Pricing", href: "/pricing", desc: "Credit-based billing" },
  { label: "Dashboard", href: "/dashboard", desc: "Usage analytics & keys" },
];

const SECTION_DOTS: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

export function DocsNavbar({ onSearchOpen, onMobileMenuClick, currentSectionLabel, currentColor }: DocsNavbarProps) {
  const [productOpen, setProductOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const dotColor = currentColor?.accent ? SECTION_DOTS[currentColor.accent] : "bg-blue-500";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 pointer-events-none">
      <header className="pointer-events-auto mx-auto max-w-6xl rounded-xl border border-white/[0.08] bg-[#08080a]/80 backdrop-blur-xl shadow-lg shadow-black/20">
        <div className="flex items-center justify-between h-12 px-4 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMobileMenuClick}
              aria-label="Open navigation"
              className="lg:hidden p-1.5 -ml-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-lg transition-colors duration-200 cursor-pointer"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative w-6 h-6 rounded-md bg-black border border-blue-500/20 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:4px_4px]" />
                <Image src="/nervous-cat.jpg" alt="Yapapa" width={20} height={20} className="rounded object-cover relative z-10" />
              </div>
              <span className="text-[14px] font-black tracking-tight text-white/80 group-hover:text-white uppercase italic" style={{ textShadow: "1px 1px 0px rgba(59, 130, 246, 0.2)" }}>
                YAPAPA
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-2 ml-2 border-l border-white/[0.06]">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-70`} />
              <BookOpen className={`w-3 h-3 ${currentColor?.text || "text-blue-400/50"}`} />
              <span className="text-[11px] font-mono text-white/25 uppercase tracking-wider">Docs</span>
              {currentSectionLabel && (
                <>
                  <span className="text-white/[0.08] text-[10px]">/</span>
                  <span className="text-[12px] text-white/50 font-medium truncate max-w-[140px]">
                    {currentSectionLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Documentation navigation">
            {productLinks.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors duration-200 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setProductOpen(!productOpen)}
                aria-expanded={productOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/55 hover:bg-white/[0.04] transition-colors duration-200 cursor-pointer"
              >
                Product
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${productOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </button>

              {productOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0c0c0e] border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="p-1.5">
                    {productLinks.map((link, i) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setProductOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            i === 0 ? "bg-emerald-500/50" :
                            i === 1 ? "bg-blue-500/50" :
                            i === 2 ? "bg-amber-500/50" :
                            "bg-violet-500/50"
                          }`} />
                          <div>
                            <p className="text-[13px] font-medium text-white/60 group-hover:text-white/90 transition-colors">{link.label}</p>
                            <p className="text-[11px] text-white/20 mt-0.5">{link.desc}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onSearchOpen}
              aria-label="Search documentation (Ctrl+K)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/30 hover:text-white/50 hover:border-white/[0.1] hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search docs</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[9px] font-mono text-white/20">
                <span>&#8984;</span>K
              </kbd>
            </button>

            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
          </div>
        </div>
      </header>
    </div>
  );
}
