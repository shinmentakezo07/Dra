"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Menu, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

export function DocsNavbar({ onSearchOpen, onMobileMenuClick, currentSectionLabel }: DocsNavbarProps) {
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

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#08080a]/95 backdrop-blur-xl">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onMobileMenuClick}
            aria-label="Open navigation"
            className="lg:hidden p-2 -ml-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all duration-200 cursor-pointer"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative w-7 h-7 rounded-lg bg-black border border-[#3b82f6]/30 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:4px_4px]" />
              <Image src="/nervous-cat.jpg" alt="Yapapa" width={24} height={24} className="rounded object-cover relative z-10" />
            </div>
            <span className="text-[15px] font-black tracking-tight text-white/80 group-hover:text-white uppercase italic" style={{ textShadow: "1px 1px 0px rgba(59, 130, 246, 0.25)" }}>
              YAPAPA
            </span>
          </Link>

          <span className="text-white/[0.08] flex-shrink-0 text-xs">/</span>

          <Link href="/docs" className="text-[11px] font-mono text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors flex-shrink-0">
            Docs
          </Link>

          {currentSectionLabel && (
            <>
              <span className="text-white/[0.08] flex-shrink-0 text-xs">/</span>
              <span className="text-[13px] text-white/50 font-medium truncate">
                {currentSectionLabel}
              </span>
            </>
          )}
        </div>

        {/* Right: Product dropdown + Search */}
        <div className="flex items-center gap-2">
          {/* Product dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProductOpen(!productOpen)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/55 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
            >
              Product
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${productOpen ? "rotate-180" : ""}`} />
            </button>

            {productOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0c0c0e] border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="p-1.5">
                  {productLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setProductOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all duration-150 cursor-pointer group"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-white/60 group-hover:text-white/90 transition-colors">{link.label}</p>
                        <p className="text-[11px] text-white/20 mt-0.5">{link.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <button
            onClick={onSearchOpen}
            aria-label="Search documentation (Ctrl+K)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs text-white/25 hover:text-white/45 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-white/15">
              <span>&#8984;</span>K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
