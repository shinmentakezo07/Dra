"use client";

/* ------------------------------------------------------------------ */
/*  Dashboard Layout — Intentional Minimalism                          */
/*  Purpose: Navigational chassis with zero redundant elements.        */
/*  Philosophy: The sidebar earns its space by being the single source */
/*  of truth for hierarchy. Every pixel justifies itself.              */
/* ------------------------------------------------------------------ */

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  Activity,
  BarChart3,
  Menu,
  X,
  Home,
  Settings,
  LogOut,
  Shield,
  Bell,
  Building2,
  CreditCard,
  Mail,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOutAction } from "@/app/lib/auth-actions";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type NavItem = { href: string; label: string; icon: LucideIcon };

interface NavGroupDef {
  label: string;
  items: NavItem[];
}

interface UserProps {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

/* ------------------------------------------------------------------ */
/*  Nav data — flat, composable.                                      */
/*  Order signals priority: Main actions first, account mgmt after.   */
/* ------------------------------------------------------------------ */

const GROUPS: NavGroupDef[] = [
  {
    label: "Navigate",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/logs", label: "Logs", icon: Activity },
      { href: "/dashboard/keys", label: "API Keys", icon: Key },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      {
        href: "/dashboard/organization",
        label: "Organization",
        icon: Building2,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Logo — brand anchor, always links home.                           */
/*  Removed "Netrunner" subtitle: it's decorative noise that isn't    */
/*  established anywhere else in the product.                         */
/* ------------------------------------------------------------------ */

function DashboardLogo() {
  return (
    <Link
      href="/"
      className="relative flex items-center gap-3 group select-none"
      aria-label="Yapapa — back to home"
    >
      <div className="relative w-8 h-8 flex items-center justify-center bg-black border border-white/[0.07] rounded-[10px] overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-[1.04]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:3px_3px]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.07] to-transparent h-1/3"
          animate={{ top: ["-33%", "133%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <Image
          src="/nervous-cat.jpg"
          alt=""
          width={24}
          height={24}
          className="relative z-10 rounded object-cover"
          priority
        />
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        Yapapa
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav link — the atomic unit.                                       */
/*  Indicator is a thin bar, not a blob. The icon container only      */
/*  lights up on active — hover uses a subtler glow.                  */
/* ------------------------------------------------------------------ */

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed = false,
  onClick,
}: NavItem & {
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? "text-white bg-white/[0.06]"
          : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {/* Active indicator — a clean bar, left-aligned */}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-r-full bg-gradient-to-b from-blue-400 to-purple-400"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <span
        className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
          isActive ? "bg-white/[0.06]" : "group-hover:bg-white/[0.03]"
        }`}
      >
        <Icon
          className={`w-[15px] h-[15px] transition-all duration-150 ${
            isActive
              ? "text-blue-400"
              : "text-gray-500 group-hover:text-gray-300"
          }`}
        />
      </span>

      {!collapsed && (
        <span className="transition-all duration-150 group-hover:translate-x-[1px]">
          {label}
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  User profile — three states: loading, signed-in, signed-out.      */
/*  Uses a stacked layout instead of cramped side-by-side row.        */
/* ------------------------------------------------------------------ */

function UserProfile({ user }: { user: UserProps | null }) {
  const [signingOut, setSigningOut] = useState(false);

  if (!user) {
    return (
      <div className="px-3 py-2.5">
        <p className="text-xs text-gray-600">Not signed in</p>
      </div>
    );
  }

  return (
    <div className="group">
      {/* Profile row */}
      <Link
        href="/dashboard/settings"
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 hover:bg-white/[0.03]"
      >
        <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-white/[0.06]">
          {user.image ? (
            <Image src={user.image} alt="" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <span className="text-[10px] font-semibold text-gray-500">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/80 truncate leading-tight group-hover:text-white transition-colors duration-150">
            {user.name ?? "User"}
          </p>
          <p className="text-[11px] text-gray-600 truncate leading-tight mt-[1px]">
            {user.email ?? ""}
          </p>
        </div>
      </Link>

      {/* Actions — only visible on hover/focus-within to reduce cognitive load */}
      <div className="flex border-t border-white/[0.04] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
        <Link
          href="/dashboard/settings"
          className="flex items-center justify-center flex-1 gap-1.5 py-1.5 text-[11px] font-medium text-gray-600 hover:text-white transition-colors duration-150"
        >
          <Settings className="w-3 h-3" />
          Settings
        </Link>
        <div className="w-px bg-white/[0.04]" />
        <button
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await signOutAction();
          }}
          className="flex items-center justify-center flex-1 gap-1.5 py-1.5 text-[11px] font-medium text-gray-600 hover:text-red-400 transition-colors duration-150 disabled:opacity-40"
        >
          <LogOut className="w-3 h-3" />
          {signingOut ? "Leaving..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar content — the navigational core.                         */
/*  Auto-expands the group containing the active route.               */
/* ------------------------------------------------------------------ */

function SidebarContent({
  isAdmin,
  user,
  onNavClick,
}: {
  isAdmin: boolean;
  user: UserProps | null;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const groups = isAdmin
    ? [
        ...GROUPS.slice(0, 1),
        {
          label: "Admin",
          items: [
            {
              href: "/dashboard/admin",
              label: "Admin",
              icon: Shield,
            } as NavItem,
          ],
        },
        ...GROUPS.slice(1),
      ]
    : GROUPS;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Primary nav — scrolls if overflow */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto hero-scroll">
        {groups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            currentPath={pathname}
            onNavClick={onNavClick}
          />
        ))}
      </nav>

      {/* Bottom area: home link + profile */}
      <div className="px-2 py-3 border-t border-white/[0.04] space-y-2">
        <Link
          href="/"
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all duration-150"
        >
          <Home className="w-[15px] h-[15px] text-gray-500 group-hover:text-gray-300 transition-colors duration-150" />
          <span className="transition-all duration-150 group-hover:translate-x-[1px]">
            Home
          </span>
        </Link>
        <UserProfile user={user} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible nav group — auto-expands when a child is active.      */
/*  Uses max-height for GPU-compatible animation (no layout thrash).  */
/*  Chevron points right when collapsed, down when open.              */
/* ------------------------------------------------------------------ */

function NavGroupSection({
  group,
  currentPath,
  onNavClick,
}: {
  group: NavGroupDef;
  currentPath: string;
  onNavClick?: () => void;
}) {
  const isActive = group.items.some((item) => currentPath === item.href);
  const [open, setOpen] = useState(isActive);

  // Auto-expand when a child becomes active
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (isActive && !prevActive.current) {
      setOpen(true);
    }
    prevActive.current = isActive;
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between w-full px-3 pb-1 group"
        aria-expanded={open}
        aria-label={`${group.label} section`}
      >
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.12em] transition-colors duration-150 group-hover:text-gray-400">
          {group.label}
        </span>
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </motion.div>
      </button>

      {/* Animate via max-height — avoids Framer Motion's height:auto jank */}
      <motion.div
        initial={false}
        animate={{
          maxHeight: open ? 240 : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="space-y-[1px] px-1">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isActive={currentPath === item.href}
              onClick={onNavClick}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full layout shell                                                 */
/* ------------------------------------------------------------------ */

interface DashboardLayoutClientProps {
  children: ReactNode;
  isAdmin: boolean;
  user: UserProps | null;
}

export default function DashboardLayoutClient({
  children,
  isAdmin,
  user,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 bg-[#050505]/90 backdrop-blur-xl border-r border-white/[0.05] z-30">
        {/* Decorative edge glow */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/[0.06] to-transparent pointer-events-none" />

        <div className="h-14 flex items-center px-4 border-b border-white/[0.04]">
          <DashboardLogo />
        </div>

        <SidebarContent isAdmin={isAdmin} user={user} />
      </aside>

      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="lg:hidden fixed inset-y-0 left-0 w-56 bg-[#050505]/95 backdrop-blur-xl border-r border-white/[0.05] z-50 flex flex-col"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.04]">
                <DashboardLogo />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent
                isAdmin={isAdmin}
                user={user}
                onNavClick={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 lg:pl-56 min-h-screen flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 h-14 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center overflow-hidden">
            <Image
              src="/nervous-cat.jpg"
              alt=""
              width={20}
              height={20}
              className="object-cover"
            />
          </div>
          <span className="text-sm font-semibold text-white">Dashboard</span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
