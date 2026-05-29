"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  X,
  Home,
  BookOpen,
  Code2,
  Trophy,
  LogIn,
  UserPlus,
  Zap,
  ArrowRight,
  Settings,
  LogOut,
  Cpu,
  CreditCard,
} from "lucide-react";
import { signOutAction } from "@/app/lib/actions";

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  authRequired?: boolean;
}

export function MainLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: any;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Check if we're on a dashboard route, auth route, or playground (full-screen)
  const isDashboardRoute = pathname?.startsWith("/dashboard");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const isFullScreenRoute = pathname === "/playground";
  const isAdminRoute = pathname?.startsWith("/admin");
  const isDocsRoute = pathname?.startsWith("/docs");

  const menuItems = [
    { label: "Models", href: "/models", icon: Cpu },
    { label: "Playground", href: "/playground", icon: Code2 },
    { label: "Docs", href: "/docs", icon: BookOpen },
    { label: "Pricing", href: "/pricing", icon: CreditCard },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Trophy,
      authRequired: true,
    },
  ];

  const sidebarVariants = {
    closed: { x: "-100%", opacity: 0 },
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { x: -20, opacity: 0 },
    open: { x: 0, opacity: 1 },
  };

  return (
    <div
      className="min-h-screen bg-background font-sans antialiased selection:bg-primary/30"
      suppressHydrationWarning
    >
      {!isDashboardRoute &&
        !isAuthRoute &&
        !isFullScreenRoute &&
        !isAdminRoute &&
        !isDocsRoute && (
          <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        )}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              className="fixed top-0 bottom-0 left-0 w-[85%] max-w-[320px] bg-[#050505]/95 backdrop-blur-2xl border-r border-cyan-500/20 z-[70] md:hidden shadow-2xl shadow-cyan-500/5 flex flex-col"
            >
              {/* Decorative top glow */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

              {/* Sidebar Header */}
              <div className="relative p-5 flex items-center justify-between border-b border-cyan-500/10">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/20">
                    <Zap className="h-4 w-4 text-white fill-white" />
                  </div>
                  <span className="font-bold text-lg tracking-tight text-white">
                    Yapapa
                  </span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-cyan-500/10 rounded-xl text-cyan-400 hover:text-white transition-colors border border-transparent hover:border-cyan-500/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="relative flex-1 overflow-y-auto py-6 px-4 space-y-6 hero-scroll">
                {/* System status indicator */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/60 tracking-widest uppercase">
                    All Systems Operational
                  </span>
                </div>

                <nav className="space-y-1">
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors border border-transparent hover:border-cyan-500/20 group"
                    >
                      <Home className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      Home
                    </Link>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="pt-4 pb-2 px-4"
                  >
                    <div className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"></span>
                      Navigation
                    </div>
                  </motion.div>

                  {menuItems
                    .filter((item) => !item.authRequired || user)
                    .map((item) => (
                      <motion.div key={item.label} variants={itemVariants}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors border border-transparent hover:border-cyan-500/20 group"
                        >
                          <item.icon className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                          {item.label}
                          <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-cyan-400" />
                        </Link>
                      </motion.div>
                    ))}
                </nav>

                {/* Decorative HUD element */}
                <div className="px-4 pt-4 border-t border-white/5">
                  <div className="text-[9px] font-mono text-white/15 tracking-[0.3em] uppercase">
                    SYS.V.2.04 // YAPAPA GATEWAY
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="relative p-5 border-t border-cyan-500/10 bg-gradient-to-t from-cyan-500/5 to-transparent">
                {!user ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-sm font-medium text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign up
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                      <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-cyan-500/30">
                        <div className="absolute inset-0 bg-cyan-500/20 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/40 to-blue-600/40 mix-blend-overlay" />
                        <span className="relative z-10 text-sm font-bold text-cyan-400">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        signOutAction();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className={`flex ${isDashboardRoute || isAuthRoute || isFullScreenRoute || isDocsRoute ? "" : "pt-20"}`}
      >
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}
