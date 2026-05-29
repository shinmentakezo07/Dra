"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Search,
  Command,
  ArrowRight,
  Shield,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
import AdminSearchBar from "./AdminSearchBar";

/* ─── Page metadata ─── */

interface PageMeta {
  title: string;
  section: string;
}

const PAGE_META: Record<string, PageMeta> = {
  "/admin/dashboard": { title: "Dashboard", section: "Overview" },
  "/admin/users": { title: "Users", section: "Management" },
  "/admin/providers": { title: "Providers", section: "Management" },
  "/admin/models": { title: "Models", section: "Management" },
  "/admin/billing": { title: "Billing", section: "Financial" },
  "/admin/cost": { title: "Cost Intelligence", section: "Financial" },
  "/admin/promos": { title: "Promo Codes", section: "Financial" },
  "/admin/security": { title: "Security", section: "Security" },
  "/admin/audit": { title: "Audit Log", section: "Security" },
  "/admin/ip": { title: "IP Lists", section: "Security" },
  "/admin/logs": { title: "Request Logs", section: "Monitoring" },
  "/admin/operations": { title: "Operations", section: "Monitoring" },
  "/admin/messages": { title: "Messages", section: "Content" },
  "/admin/announcements": { title: "Announcements", section: "Content" },
  "/admin/changelog": { title: "Changelog", section: "Content" },
  "/admin/reports": { title: "Reports", section: "Content" },
  "/admin/admins": { title: "Admin Users", section: "Admin" },
  "/admin/settings": { title: "Settings", section: "Admin" },
  "/admin/sso": { title: "SSO Configuration", section: "Admin" },
};

/* ─── Live Clock ─── */

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[10px] font-mono text-[var(--admin-text-dim)] tracking-wider tabular-nums">
      {time}
    </span>
  );
}

/* ─── Quick Nav Items ─── */

const QUICK_NAV = [
  { href: "/admin/users", label: "Users", icon: User },
  { href: "/admin/providers", label: "Providers", icon: Activity },
  { href: "/admin/logs", label: "Logs", icon: Zap },
  { href: "/admin/security", label: "Security", icon: Shield },
];

/* ─── Main Component ─── */

export default function AdminTopBar() {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const page = PAGE_META[pathname] || { title: "Admin", section: "Admin" };

  /* Click outside handler */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setShowNotif(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* Close menus on navigation */
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotif(false);
    setShowSearch(false);
  }, [pathname]);

  /* Keyboard shortcut: Cmd/Ctrl + K to focus search */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => {
          const input = searchRef.current?.querySelector("input");
          input?.focus();
        }, 50);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowUserMenu(false);
        setShowNotif(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeAll = useCallback(() => {
    setShowUserMenu(false);
    setShowNotif(false);
    setShowSearch(false);
  }, []);

  return (
    <header className="admin-topbar relative z-30">
      <div className="flex items-center gap-4 px-6 h-[64px]">
        {/* ── Left: Page Identity ── */}
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          {/* Section + Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tracking-[0.16em] uppercase text-[var(--admin-accent)] opacity-60">
                {page.section}
              </span>
            </div>
            <h1 className="text-[17px] font-semibold text-[var(--admin-text)] tracking-[-0.02em] leading-tight mt-0.5">
              {page.title}
            </h1>
          </div>
        </div>

        {/* ── Center: Quick Nav Pills ── */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {QUICK_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-500/[0.06] text-blue-400 border border-blue-500/10"
                    : "text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search Trigger */}
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="admin-search-trigger flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200"
            >
              <Search className="w-3.5 h-3.5 text-[var(--admin-text-dim)]" />
              <span className="text-[12px] text-[var(--admin-text-dim)] hidden sm:inline">
                Search
              </span>
              <kbd className="admin-kbd ml-1 hidden sm:inline-flex">
                <Command className="w-2.5 h-2.5 mr-0.5" />K
              </kbd>
            </button>

            {/* Search Dropdown */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-[400px] max-w-[90vw] rounded-2xl border border-white/[0.06] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/60 overflow-hidden"
                >
                  <div className="p-3">
                    <AdminSearchBar />
                  </div>
                  <div className="border-t border-white/[0.03] px-3 py-2 flex items-center gap-3">
                    <span className="text-[10px] text-[var(--admin-text-dim)]">
                      Navigate:
                    </span>
                    {QUICK_NAV.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeAll}
                          className="flex items-center gap-1 text-[10px] text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] transition-colors"
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.04] mx-1" />

          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2">
            <Clock className="w-3 h-3 text-[var(--admin-text-dim)] opacity-40" />
            <LiveClock />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowUserMenu(false);
              }}
              className="admin-icon-btn relative p-2 rounded-xl text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.03] transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="w-[16px] h-[16px]" />
              <span className="admin-notif-dot absolute top-1.5 right-1.5 w-[5px] h-[5px] rounded-full bg-blue-400" />
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="admin-dropdown absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/[0.06] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/[0.04]">
                    <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--admin-text-dim)]">
                      Notifications
                    </p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-4 h-4 text-[var(--admin-text-dim)] opacity-40" />
                    </div>
                    <p className="text-[12px] text-[var(--admin-text-muted)]">
                      All caught up
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-dim)] mt-1">
                      No new notifications
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.04]" />

          {/* User Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotif(false);
              }}
              className="admin-user-btn flex items-center gap-2.5 py-1.5 pl-1.5 pr-2.5 rounded-xl hover:bg-white/[0.03] transition-all duration-200"
            >
              <div className="admin-user-avatar w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold">
                A
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-[12px] font-medium text-[var(--admin-text)] leading-none truncate">
                  Admin
                </p>
                <p className="text-[9px] text-[var(--admin-text-dim)] font-mono mt-0.5 truncate">
                  admin@yapapa.io
                </p>
              </div>
              <ChevronDown
                className={`w-3 h-3 text-[var(--admin-text-dim)] transition-transform duration-200 flex-shrink-0 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="admin-dropdown absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/[0.06] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/60 overflow-hidden"
                >
                  {/* User Info Header */}
                  <div className="p-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="admin-user-avatar w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold">
                        A
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--admin-text)]">
                          Admin
                        </p>
                        <p className="text-[10px] text-[var(--admin-text-dim)] font-mono truncate mt-0.5">
                          admin@yapapa.io
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/[0.06] text-[9px] font-semibold tracking-[0.08em] uppercase text-blue-400/70 border border-blue-500/10">
                        <Shield className="w-2.5 h-2.5" />
                        Superadmin
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1.5">
                    <Link
                      href="/admin/settings"
                      className="admin-menu-item flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 opacity-50" />
                      Settings
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-30 transition-opacity" />
                    </Link>
                    <Link
                      href="/admin/admins"
                      className="admin-menu-item flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 opacity-50" />
                      Profile
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-30 transition-opacity" />
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-white/[0.04] py-1.5">
                    <button className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.04] w-full transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom border with gradient */}
      <div className="admin-topbar-border h-px" />
    </header>
  );
}
