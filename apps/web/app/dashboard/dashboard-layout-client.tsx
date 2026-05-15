"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Key, Activity, BarChart3, Menu, X, Home, Settings, LogOut, Shield, Bell, Building2, CreditCard, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOutAction } from "@/app/lib/auth-actions";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/logs", label: "Logs", icon: Activity },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const adminNavItems = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

const bottomNavItems = [
  { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/organization", label: "Organization", icon: Building2 },
];

function DashboardLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 group select-none">
      {/* Icon Container */}
      <div className="relative w-10 h-10 flex items-center justify-center bg-black border border-[#3b82f6]/30 rounded-lg overflow-hidden shrink-0">
        {/* Scanline */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7c3aed]/20 to-transparent h-[30%]"
          animate={{ top: ["-30%", "130%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:4px_4px]" />
        {/* Rotating Tech Rings */}
        <motion.div
          className="absolute inset-1 border border-[#3b82f6]/50 rounded border-t-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 border border-[#a855f7]/50 rounded border-b-transparent border-r-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        {/* Center Logo Image */}
        <div className="relative z-10">
          <Image src="/nervous-cat.jpg" alt="Yapapa Logo" width={32} height={32} className="rounded object-cover" />
        </div>
        {/* Corner accents */}
        <div className="absolute top-1 left-1 w-1.5 h-[1px] bg-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-1 right-1 w-2 h-[1px] bg-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Text Section */}
      <div className="flex flex-col relative">
        <div className="relative">
          <h1
            className="text-xl font-black tracking-tighter text-white uppercase italic leading-none"
            style={{ textShadow: "2px 2px 0px rgba(59, 130, 246, 0.3)" }}
          >
            YAPAPA
          </h1>
          {/* Glitch Layers on hover */}
          <motion.h1
            className="absolute top-0 left-0 text-xl font-black tracking-tighter text-[#a855f7] opacity-0 group-hover:opacity-70 mix-blend-screen uppercase italic leading-none"
            animate={{ x: [-2, 2, -1, 0], y: [1, -1, 0] }}
            transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 0.5 }}
          >
            YAPAPA
          </motion.h1>
          <motion.h1
            className="absolute top-0 left-0 text-xl font-black tracking-tighter text-[#3b82f6] opacity-0 group-hover:opacity-70 mix-blend-screen uppercase italic leading-none"
            animate={{ x: [2, -2, 1, 0], y: [-1, 1, 0] }}
            transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 0.3 }}
          >
            YAPAPA
          </motion.h1>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="h-1 w-1 bg-[#3b82f6] rounded-sm animate-pulse" />
          <div className="h-[1px] w-8 bg-gradient-to-r from-[#3b82f6] via-[#7c3aed] to-transparent" />
          <span className="text-[9px] font-mono text-[#7c3aed] tracking-widest uppercase">
            Netrunner
          </span>
        </div>
      </div>
    </Link>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive ? "text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="activeNavIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-[#3b82f6] via-[#a855f7] to-[#3b82f6]"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span
        className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 ${
          isActive
            ? "bg-white/[0.08] shadow-[0_0_12px_rgba(59,130,246,0.12)]"
            : "bg-transparent group-hover:bg-white/[0.04]"
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] transition-colors ${
            isActive
              ? "text-[#3b82f6]"
              : "text-gray-500 group-hover:text-gray-300"
          }`}
        />
      </span>
      <span className="relative">
        {label}
        {isActive && (
          <span className="absolute -bottom-0.5 left-0 w-2/3 h-[1px] bg-gradient-to-r from-[#3b82f6]/50 to-transparent" />
        )}
      </span>
    </Link>
  );
}

function SidebarContent({
  pathname,
  isAdmin,
  onNavClick,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavClick?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 px-3 py-6 space-y-0.5 overflow-y-auto hero-scroll">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
              onClick={onNavClick}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="pt-5 mt-5 border-t border-white/[0.06]">
            <p className="px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em] mb-2">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-5 mt-5 border-t border-white/[0.06]">
          <p className="px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em] mb-2">
            Account
          </p>
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
                onClick={onNavClick}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-0.5">
        <Link
          href="/"
          className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent group-hover:bg-white/[0.04] transition-colors">
            <Home className="w-[18px] h-[18px] text-gray-600 group-hover:text-gray-300 transition-colors" />
          </span>
          Back to Home
        </Link>
        <Link
          href="/dashboard/settings"
          className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent group-hover:bg-white/[0.04] transition-colors">
            <Settings className="w-[18px] h-[18px] text-gray-600 group-hover:text-gray-300 transition-colors" />
          </span>
          Settings
        </Link>
        <button
          onClick={() => signOutAction()}
          className="w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent group-hover:bg-red-500/5 transition-colors">
            <LogOut className="w-[18px] h-[18px] text-gray-600 group-hover:text-red-400 transition-colors" />
          </span>
          Sign Out
        </button>
      </div>
    </>
  );
}

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export default function DashboardLayoutClient({ children, isAdmin }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#060606]/95 backdrop-blur-xl border-r border-white/[0.06] relative">
        {/* Subtle right-edge glow */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#3b82f6]/10 to-transparent pointer-events-none" />
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] relative">
          <DashboardLogo />
        </div>

        <SidebarContent pathname={pathname} isAdmin={isAdmin} />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-[#060606]/95 backdrop-blur-xl border-r border-white/[0.06] z-50 flex flex-col"
            >
              {/* Logo */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
                <DashboardLogo />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <SidebarContent pathname={pathname} isAdmin={isAdmin} onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 h-screen overflow-y-auto hero-scroll">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 h-16 bg-[#060606]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="relative w-7 h-7 flex items-center justify-center bg-black border border-[#3b82f6]/30 rounded overflow-hidden shrink-0">
              <Image src="/nervous-cat.jpg" alt="Yapapa Logo" width={24} height={24} className="rounded object-cover" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Dashboard</span>
          </div>
        </div>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
