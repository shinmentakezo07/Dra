"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Command, Settings } from "lucide-react";
import { signOutAction } from "@/app/lib/actions";
import { useState, useEffect } from "react";

import { CyberpunkLogo } from "./CyberpunkLogo";

interface HeaderProps {
  user?: any;
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export function Header({ user, onMenuClick, sidebarOpen }: HeaderProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 md:pt-4 px-3 md:px-4">
        {/* Mobile: compact header with logo + auth only */}
        <div className="relative w-full max-w-6xl h-14 md:h-16 px-3 md:px-4 flex items-center justify-between rounded-xl md:rounded-2xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-[#3b82f6]/10 shadow-2xl shadow-black/50 ring-1 ring-white/5">
          <div className="flex items-center gap-3 md:gap-6 relative z-10">
            <button className="md:hidden relative p-2 text-cyan-400 hover:text-white rounded-xl transition-colors border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/10">
              <div className="flex flex-col gap-[5px] w-5">
                <span className="block h-[2px] w-5 bg-current rounded-full" />
                <span className="block h-[2px] w-3.5 bg-current rounded-full" />
                <span className="block h-[2px] w-5 bg-current rounded-full" />
              </div>
            </button>
            <Link href="/" className="flex items-center space-x-3 group">
              <CyberpunkLogo />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: "Models", path: "/models" },
                { label: "Playground", path: "/playground" },
                { label: "Pricing", path: "/pricing" },
              ].map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-sm w-64">
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="bg-transparent border-none outline-none w-full placeholder:text-gray-600"
              />
              <div className="flex items-center gap-1 text-[10px] font-bold font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-gray-500">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
            {!user && (
              <Link
                href="/signup"
                className="md:hidden relative inline-flex items-center justify-center h-8 px-3.5 rounded-lg text-[11px] font-bold tracking-wide text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 uppercase"
              >
                Get Started
              </Link>
            )}
            {user && (
              <Link
                href="/dashboard"
                className="md:hidden flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20"
              >
                <div className="relative w-7 h-7 rounded-full flex items-center justify-center overflow-hidden border border-cyan-500/30">
                  <div className="absolute inset-0 bg-cyan-500/20" />
                  <span className="relative z-10 text-[10px] font-bold text-cyan-400">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </span>
                </div>
              </Link>
            )}
            <div className="flex gap-3">
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full bg-[#3b82f6]/5 border border-[#3b82f6]/20"
                  >
                    <div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-[#3b82f6]/30">
                      <div className="absolute inset-0 bg-[#3b82f6]/20" />
                      <span className="relative z-10 text-xs font-bold text-[#3b82f6]">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-200 max-w-[100px] truncate mr-1">
                      {user.name}
                    </span>
                  </Link>
                  <div className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-medium text-gray-500 hover:text-red-400">
                    Sign Out
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex gap-3">
                  <div className="text-sm font-medium text-gray-400 px-3 py-2">
                    Log in
                  </div>
                  <div className="relative inline-flex items-center justify-center h-9 px-5 rounded-lg text-sm font-medium text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                    Get Started
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 md:pt-4 px-3 md:px-4"
      suppressHydrationWarning
    >
      <div
        className="relative w-full max-w-6xl h-14 md:h-16 px-3 md:px-4 flex items-center justify-between rounded-xl md:rounded-2xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-[#3b82f6]/10 shadow-2xl shadow-black/50 ring-1 ring-white/5"
        suppressHydrationWarning
      >
        <div
          className="flex items-center gap-3 md:gap-6 relative z-10"
          suppressHydrationWarning
        >
          <button
            onClick={onMenuClick}
            className="md:hidden relative p-2 text-cyan-400 hover:text-white rounded-xl transition-colors border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/10"
          >
            <div className="relative w-5 h-4 flex flex-col justify-center">
              <motion.span
                className="absolute left-0 h-[2px] w-5 bg-current rounded-full origin-center"
                animate={
                  sidebarOpen
                    ? { top: "50%", rotate: 45, y: "-50%", width: 20 }
                    : { top: "0%", rotate: 0, y: "0%", width: 20 }
                }
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-current rounded-full origin-center"
                animate={
                  sidebarOpen
                    ? { width: 0, opacity: 0, x: 4 }
                    : { width: 14, opacity: 1, x: 0 }
                }
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="absolute left-0 h-[2px] w-5 bg-current rounded-full origin-center"
                animate={
                  sidebarOpen
                    ? { bottom: "50%", rotate: -45, y: "50%", width: 20 }
                    : { bottom: "0%", rotate: 0, y: "0%", width: 20 }
                }
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </button>
          <Link href="/" className="flex items-center space-x-3 group">
            <CyberpunkLogo />
          </Link>

          <nav
            className="hidden md:flex items-center gap-1"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {[
              { label: "Models", path: "/models" },
              { label: "Playground", path: "/playground" },
              { label: "Docs", path: "/docs" },
              { label: "Pricing", path: "/pricing" },
            ].map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onMouseEnter={() => setHoveredPath(item.path)}
                className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg"
              >
                {hoveredPath === item.path && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-white/10 rounded-lg -z-10"
                    transition={{
                      type: "spring" as const,
                      bounce: 0.2,
                      duration: 0.6,
                    }}
                  />
                )}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className="flex items-center gap-3 relative z-10"
          suppressHydrationWarning
        >
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-sm hover:bg-white/10 hover:border-white/10 hover:text-gray-300 focus-within:border-blue-500/50 focus-within:bg-black/40 focus-within:text-white transition-all duration-300 group w-64"
            suppressHydrationWarning
          >
            <Search className="h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="bg-transparent border-none outline-none w-full placeholder:text-gray-600"
            />
            <div className="flex items-center gap-1 text-[10px] font-bold font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-gray-500 group-focus-within:text-blue-400 group-focus-within:border-blue-500/30 transition-colors">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>

          {/* Mobile CTA - compact on phones */}
          {!user && (
            <Link
              href="/signup"
              className="md:hidden relative inline-flex items-center justify-center h-8 px-3.5 rounded-lg text-[11px] font-bold tracking-wide text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] transition-all duration-300 uppercase"
            >
              Get Started
            </Link>
          )}

          {/* Mobile user avatar */}
          {user && (
            <Link
              href="/dashboard"
              className="md:hidden flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all"
            >
              <div className="relative w-7 h-7 rounded-full flex items-center justify-center overflow-hidden border border-cyan-500/30">
                <div className="absolute inset-0 bg-cyan-500/20" />
                <span className="relative z-10 text-[10px] font-bold text-cyan-400">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </span>
              </div>
            </Link>
          )}

          <div className="flex gap-3" suppressHydrationWarning>
            {user ? (
              <div
                className="hidden md:flex items-center gap-3"
                suppressHydrationWarning
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full bg-[#3b82f6]/5 border border-[#3b82f6]/20 hover:bg-[#3b82f6]/10 transition-all cursor-pointer group"
                >
                  <div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-[#3b82f6]/30 group-hover:border-[#3b82f6] transition-colors">
                    <div className="absolute inset-0 bg-[#3b82f6]/20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/50 to-purple-600/50 mix-blend-overlay" />
                    <span className="relative z-10 text-xs font-bold text-[#3b82f6] text-shadow-neon">
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-200 max-w-[100px] truncate mr-1 group-hover:text-[#3b82f6] transition-colors">
                    {user.name}
                  </span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => signOutAction()}
                  className="text-xs font-medium text-gray-500 hover:text-red-400 transition-colors"
                  suppressHydrationWarning
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden md:flex gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="relative inline-flex items-center justify-center h-9 px-5 rounded-lg text-sm font-medium text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 overflow-hidden group"
                >
                  <span className="relative">Get Started</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
