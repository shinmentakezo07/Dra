"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Key, Activity, BarChart3, Menu, X, Home, Settings, LogOut, Shield, Bell, Building2, CreditCard, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOutAction } from "@/app/lib/auth-actions";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Nav data                                                          */
/* ------------------------------------------------------------------ */

type NavGroup = { label: string; items: NavItem[] };
type NavItem = { href: string; label: string; icon: LucideIcon };

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/logs", label: "Logs", icon: Activity },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

const accountNav: NavItem[] = [
  { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/organization", label: "Organization", icon: Building2 },
];

/* ------------------------------------------------------------------ */
/*  Logo                                                              */
/* ------------------------------------------------------------------ */

function DashboardLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 group select-none">
      <div className="relative w-9 h-9 flex items-center justify-center bg-black border border-white/10 rounded-lg overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3px_3px]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-1/3"
          animate={{ top: ["-33%", "133%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative z-10">
          <Image src="/nervous-cat.jpg" alt="Yapapa" width={28} height={28} className="rounded object-cover" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold tracking-tight text-white leading-none">Yapapa</span>
        <span className="text-[9px] font-mono text-gray-600 tracking-widest uppercase leading-tight mt-0.5">Netrunner</span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav link                                                          */
/* ------------------------------------------------------------------ */

function NavLink({ href, icon: Icon, label, isActive, onClick }: NavItem & { isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive ? "text-white" : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-blue-500 to-purple-500"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span
        className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 ${
          isActive ? "bg-white/[0.07]" : "group-hover:bg-white/[0.03]"
        }`}
      >
        <Icon className={`w-[17px] h-[17px] transition-colors ${isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`} />
      </span>
      <span className="relative">{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                           */
/* ------------------------------------------------------------------ */

function SidebarContent({ pathname, isAdmin, onNavClick }: { pathname: string; isAdmin: boolean; onNavClick?: () => void }) {
  const groups: NavGroup[] = [
    { label: "Main", items: primaryNav },
    ...(isAdmin ? [{ label: "Admin", items: adminNav }] : []),
    { label: "Account", items: accountNav },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto hero-scroll">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-4 pb-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} isActive={pathname === item.href} onClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-0.5">
        <Link
          href="/"
          className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md">
            <Home className="w-[17px] h-[17px] text-gray-500 group-hover:text-gray-300 transition-colors" />
          </span>
          Back to Home
        </Link>
        <Link
          href="/dashboard/settings"
          className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md">
            <Settings className="w-[17px] h-[17px] text-gray-500 group-hover:text-gray-300 transition-colors" />
          </span>
          Settings
        </Link>
        <button
          onClick={() => signOutAction()}
          className="w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md">
            <LogOut className="w-[17px] h-[17px] text-gray-500 group-hover:text-red-400 transition-colors" />
          </span>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                            */
/* ------------------------------------------------------------------ */

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export default function DashboardLayoutClient({ children, isAdmin }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-[#050505] border-r border-white/[0.06] relative z-30">
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/8 to-transparent pointer-events-none" />
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
          <DashboardLogo />
        </div>
        <SidebarContent pathname={pathname} isAdmin={isAdmin} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-60 bg-[#050505] border-r border-white/[0.06] z-50 flex flex-col"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
                <DashboardLogo />
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent pathname={pathname} isAdmin={isAdmin} onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 lg:pl-60 min-h-screen flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 h-14 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center overflow-hidden">
            <Image src="/nervous-cat.jpg" alt="" width={20} height={20} className="object-cover" />
          </div>
          <span className="text-sm font-semibold text-white">Dashboard</span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
