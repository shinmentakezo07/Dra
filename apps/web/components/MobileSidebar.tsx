"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  BookOpen,
  Code2,
  Trophy,
  LogIn,
  UserPlus,
  ArrowRight,
  Settings,
  LogOut,
  Cpu,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { signOutAction } from "@/app/lib/actions";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  user?: any;
}

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Models", href: "/models", icon: Cpu, desc: "100+ AI models" },
  { label: "Playground", href: "/playground", icon: Code2, desc: "Test in-browser" },
  { label: "Docs", href: "/docs", icon: BookOpen, desc: "Guides & API" },
  { label: "Pricing", href: "/pricing", icon: CreditCard, desc: "Credit-based" },
  { label: "Dashboard", href: "/dashboard", icon: Trophy, authRequired: true, desc: "Analytics & keys" },
];

const sidebarVariants = {
  closed: {
    x: "-100%",
    transition: { type: "spring" as const, stiffness: 400, damping: 40 },
  },
  open: {
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  closed: { x: -24, opacity: 0, filter: "blur(4px)" },
  open: { x: 0, opacity: 1, filter: "blur(0px)" },
};

export function MobileSidebar({ open, onClose, user }: MobileSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] md:hidden"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className="fixed top-0 bottom-0 left-0 w-[82%] max-w-[300px] z-[70] md:hidden flex flex-col overflow-hidden"
          >
            {/* Glass panel background */}
            <div className="absolute inset-0 bg-[#060608]/97 backdrop-blur-2xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f606_1px,transparent_1px),linear-gradient(to_bottom,#3b82f606_1px,transparent_1px)] bg-[size:20px_20px]" />

            {/* Right edge accent */}
            <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#3b82f6]/30 via-[#7c3aed]/20 to-[#3b82f6]/10" />

            {/* Top glow */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#3b82f6]/8 to-transparent pointer-events-none" />

            {/* Content wrapper */}
            <div className="relative flex flex-col h-full">
              {/* Header with logo */}
              <motion.div
                variants={itemVariants}
                className="p-4 pb-3 border-b border-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    onClick={onClose}
                    className="flex items-center gap-3 group"
                  >
                    {/* Logo container */}
                    <div className="relative w-10 h-10 flex items-center justify-center bg-black border border-[#3b82f6]/25 rounded-xl overflow-hidden group-hover:border-[#3b82f6]/50 transition-colors duration-300">
                      {/* Grid background */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:3px_3px]" />
                      {/* Rotating ring */}
                      <motion.div
                        className="absolute inset-0.5 border border-[#3b82f6]/30 rounded-[10px] border-t-transparent border-l-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Scanline */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7c3aed]/10 to-transparent h-[30%]"
                        animate={{ top: ["-30%", "130%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      <Image
                        src="/nervous-cat.jpg"
                        alt="Yapapa"
                        width={28}
                        height={28}
                        className="rounded-md object-cover relative z-10"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-extrabold tracking-tight text-white/90">
                        YAPAPA
                      </span>
                      <span className="text-[9px] font-mono text-[#3b82f6]/40 tracking-[0.15em] uppercase">
                        LLM Gateway
                      </span>
                    </div>
                  </Link>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="relative p-2 rounded-xl text-gray-500 hover:text-white transition-colors group"
                  >
                    <div className="absolute inset-0 rounded-xl bg-white/[0.03] border border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <X className="w-4 h-4 relative z-10" />
                  </button>
                </div>
              </motion.div>

              {/* Status indicator */}
              <motion.div
                variants={itemVariants}
                className="px-4 pt-4 pb-2"
              >
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/70 tracking-widest uppercase">
                    All Systems Operational
                  </span>
                </div>
              </motion.div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 hero-scroll">
                {/* Section label */}
                <motion.div
                  variants={itemVariants}
                  className="px-3 pt-3 pb-2"
                >
                  <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                    <span className="w-1 h-1 rounded-full bg-[#3b82f6] shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                    Navigation
                  </div>
                </motion.div>

                {navItems
                  .filter((item) => !item.authRequired || user)
                  .map((item) => {
                    const active = isActive(item.href);
                    return (
                      <motion.div key={item.label} variants={itemVariants}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                            active
                              ? "bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#60a5fa]"
                              : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06] text-gray-400 hover:text-white"
                          }`}
                        >
                          {/* Active indicator bar */}
                          {active && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-[#3b82f6] to-[#7c3aed] rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                          )}

                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                            active
                              ? "bg-[#3b82f6]/15 text-[#60a5fa]"
                              : "bg-white/[0.03] text-gray-500 group-hover:text-gray-300 group-hover:bg-white/[0.06]"
                          }`}>
                            <item.icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block">{item.label}</span>
                            {item.desc && (
                              <span className="text-[10px] text-white/20 group-hover:text-white/30 transition-colors">
                                {item.desc}
                              </span>
                            )}
                          </div>

                          <ArrowRight className={`w-3.5 h-3.5 transition-all duration-200 ${
                            active
                              ? "opacity-100 text-[#3b82f6]"
                              : "opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0 text-gray-500"
                          }`} />
                        </Link>
                      </motion.div>
                    );
                  })}
              </div>

              {/* Decorative divider */}
              <motion.div
                variants={itemVariants}
                className="px-4 py-2"
              >
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[8px] font-mono text-white/10 tracking-[0.25em] uppercase">
                    SYS.V.2.04
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#7c3aed]/30" />
                    <span className="text-[8px] font-mono text-white/10 tracking-[0.25em] uppercase">
                      Yapapa Gateway
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Footer - Auth section */}
              <motion.div
                variants={itemVariants}
                className="p-4 border-t border-white/[0.06] bg-gradient-to-t from-[#3b82f6]/[0.03] to-transparent"
              >
                {!user ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/25 text-[#60a5fa] text-sm font-bold hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign up
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* User card */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-[#3b82f6]/30">
                        <div className="absolute inset-0 bg-[#3b82f6]/15" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/30 to-[#7c3aed]/30 mix-blend-overlay" />
                        <span className="relative z-10 text-sm font-bold text-[#60a5fa]">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate font-mono">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/dashboard/settings"
                        onClick={onClose}
                        className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-[#60a5fa] bg-white/[0.03] hover:bg-[#3b82f6]/10 rounded-lg transition-all border border-transparent hover:border-[#3b82f6]/15"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          onClose();
                          signOutAction();
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/15"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
