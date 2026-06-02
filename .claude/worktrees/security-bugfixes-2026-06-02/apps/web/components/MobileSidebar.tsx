"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, Settings, LogOut, LogIn, UserPlus } from "lucide-react";
import { signOutAction } from "@/app/lib/actions";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  user?: any;
}

const navItems = [
  { label: "Home", href: "/", kana: "ホーム" },
  { label: "Models", href: "/models", kana: "モデル" },
  { label: "Playground", href: "/playground", kana: "遊び場" },
  { label: "Docs", href: "/docs", kana: "文書" },
  { label: "Pricing", href: "/pricing", kana: "価格" },
  { label: "Dashboard", href: "/dashboard", kana: "制御盤", authRequired: true },
];

const panelVariants = {
  closed: {
    clipPath: "inset(0 100% 0 0)",
    transition: { duration: 0.35, ease: [0.76, 0, 0.24, 1] as const },
  },
  open: {
    clipPath: "inset(0 0 0 0)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.05,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  closed: { x: -16, opacity: 0 },
  open: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeUp = {
  closed: { y: 8, opacity: 0 },
  open: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
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
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] md:hidden"
            style={{ background: "rgba(2,2,6,0.85)" }}
          />

          {/* Panel */}
          <motion.aside
            initial="closed"
            animate="open"
            exit="closed"
            variants={panelVariants}
            role="navigation"
            aria-label="Mobile navigation"
            className="fixed inset-y-0 left-0 w-[85vw] max-w-[340px] z-[70] md:hidden flex flex-col overflow-hidden"
          >
            {/* Background layers */}
            <div className="absolute inset-0 bg-[#04040a]" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.4) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
            {/* Vertical accent line */}
            <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent" />

            <div className="relative flex flex-col h-full">
              {/* ── HEADER ── */}
              <motion.header variants={fadeUp} className="px-6 pt-7 pb-6">
                <div className="flex items-start justify-between">
                  <Link href="/" onClick={onClose} className="group block">
                    <div className="flex items-center gap-3.5">
                      {/* Logo mark */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] group-hover:border-white/[0.2] transition-colors duration-500">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:4px_4px]" />
                        <motion.div
                          className="absolute inset-0.5 border border-[#3b82f6]/20 rounded-[7px] border-t-transparent border-l-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        />
                        <Image
                          src="/nervous-cat.jpg"
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover relative z-10"
                        />
                      </div>

                      {/* Wordmark */}
                      <div>
                        <div className="text-[18px] font-black tracking-[-0.06em] text-white/90 leading-none">
                          YAPAPA
                        </div>
                        <div className="mt-1 text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase">
                          Universal LLM Gateway
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={onClose}
                    aria-label="Close menu"
                    className="p-2 -mr-2 -mt-1 text-white/25 hover:text-white/70 transition-colors duration-200"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Status */}
                <div className="mt-5 flex items-center gap-2">
                  <span className="relative flex h-[5px] w-[5px]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-emerald-500" />
                  </span>
                  <span className="text-[9px] font-mono text-white/25 tracking-[0.15em] uppercase">
                    Operational
                  </span>
                </div>
              </motion.header>

              {/* ── NAVIGATION ── */}
              <nav className="flex-1 overflow-y-auto px-3 hero-scroll">
                <div className="space-y-0.5">
                  {navItems
                    .filter((item) => !item.authRequired || user)
                    .map((item) => {
                      const active = isActive(item.href);
                      return (
                        <motion.div key={item.label} variants={itemVariants}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex items-baseline gap-x-4 px-5 py-3.5 rounded-lg transition-colors duration-200 group outline-none focus-visible:ring-1 focus-visible:ring-[#3b82f6]/50 ${
                              active ? "text-white" : "text-white/35 hover:text-white/80"
                            }`}
                          >
                            {/* Active bar */}
                            {active && (
                              <motion.div
                                layoutId="sidebar-active-bar"
                                className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-[#3b82f6] to-[#7c3aed]"
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                              />
                            )}

                            {/* Label */}
                            <span
                              className={`text-[17px] leading-none tracking-[-0.02em] transition-all duration-200 ${
                                active ? "font-semibold" : "font-medium group-hover:font-semibold"
                              }`}
                            >
                              {item.label}
                            </span>

                            {/* Kana */}
                            <span
                              className={`text-[10px] font-mono tracking-[0.05em] transition-colors duration-200 ${
                                active ? "text-white/25" : "text-white/10 group-hover:text-white/20"
                              }`}
                            >
                              {item.kana}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                </div>
              </nav>

              {/* ── FOOTER ── */}
              <motion.footer
                variants={fadeUp}
                className="px-6 pb-7 pt-4 border-t border-white/[0.04]"
              >
                {!user ? (
                  <div className="flex gap-3">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200"
                    >
                      <LogIn className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={onClose}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-semibold text-[#60a5fa] bg-[#3b82f6]/[0.08] hover:bg-[#3b82f6]/[0.15] transition-all duration-200"
                    >
                      <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Sign up
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* User strip */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/[0.1]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/30 to-[#7c3aed]/30" />
                        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white/90">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-white/90 truncate leading-tight">
                          {user.name}
                        </div>
                        <div className="text-[11px] font-mono text-white/20 truncate mt-0.5">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href="/dashboard/settings"
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-white/35 hover:text-white/70 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200"
                      >
                        <Settings className="w-3 h-3" strokeWidth={1.5} />
                        Settings
                      </Link>
                      <button
                        onClick={() => { onClose(); signOutAction(); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-white/25 hover:text-red-400/80 rounded-md bg-white/[0.02] hover:bg-red-500/[0.06] transition-all duration-200"
                      >
                        <LogOut className="w-3 h-3" strokeWidth={1.5} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}

                {/* Brand footer */}
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[8px] font-mono text-white/[0.07] tracking-[0.3em] uppercase select-none">
                    SYS.V.2.04
                  </span>
                  <span className="text-[8px] font-mono text-white/[0.07] tracking-[0.3em] uppercase select-none">
                    Yapapa &mdash; 2026
                  </span>
                </div>
              </motion.footer>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
