"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ─── Animation Presets ─── */

export const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─── Loading Skeleton ─── */

export function AdminLoading({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div key={i} variants={fadeUp} className="admin-card p-4">
          <div className="flex items-center gap-4">
            <div className="admin-skeleton w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="admin-skeleton h-3.5 w-48" />
              <div className="admin-skeleton h-2.5 w-72" />
            </div>
            <div className="admin-skeleton h-6 w-16 rounded-md" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function AdminTableLoading({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="p-4 border-b border-white/[0.02]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="admin-skeleton h-2.5 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.015] last:border-0">
          <div className="admin-skeleton h-3 flex-1" />
          <div className="admin-skeleton h-3 w-24" />
          <div className="admin-skeleton h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function AdminCenterLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
          <div className="absolute inset-0 rounded-full border-t-blue-400/50 border-2 border-transparent animate-spin" />
        </div>
        <p className="text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--admin-text-dim)]">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ─── Error State ─── */

export function AdminError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="admin-card p-8 text-center max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-red-500/[0.06] border border-red-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400/60 text-lg">!</span>
        </div>
        <p className="text-[13px] font-medium text-[var(--admin-text)] mb-1">
          Something went wrong
        </p>
        <p className="text-[11px] text-[var(--admin-text-dim)] mb-4">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="admin-btn admin-btn-ghost text-[11px]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-card admin-empty-state flex items-center justify-center min-h-[280px]">
      <div className="text-center px-6">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <Icon className="w-5 h-5 text-[var(--admin-text-dim)] opacity-50" />
          </div>
        )}
        <p className="text-[13px] font-medium text-[var(--admin-text-muted)]">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-[11px] text-[var(--admin-text-dim)] max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

export function AdminStat({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = "var(--admin-accent)",
  variant = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  accentColor?: string;
  variant?: "default" | "highlight";
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "admin-card p-5 group relative overflow-hidden transition-all duration-200",
        variant === "highlight" && "admin-stat-highlight"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          {Icon && (
            <Icon
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: accentColor, opacity: 0.5 }}
            />
          )}
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--admin-text-muted)]">
            {label}
          </span>
        </div>
        <p className={cn(
          "font-bold font-mono tracking-[-0.02em] leading-none text-[var(--admin-text)]",
          variant === "highlight" ? "text-[28px]" : "text-[22px]"
        )}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-[var(--admin-text-dim)] mt-2 font-mono">
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Section Wrapper ─── */

export function AdminSection({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={cn("admin-card p-6", className)}>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-[var(--admin-text-dim)] mt-0.5 font-mono tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

/* ─── Tab Navigation ─── */

export function AdminTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number; icon?: LucideIcon }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="admin-tab-nav flex items-center gap-1 rounded-[12px] border border-white/[0.04] bg-white/[0.008] p-1 w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "admin-tab-btn flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12px] font-medium transition-all duration-200",
              isActive
                ? "admin-tab-active bg-blue-500/[0.06] text-blue-400 border border-blue-500/10"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-transparent"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-[5px] px-1.5 py-[1px] text-[10px] font-semibold",
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-white/[0.03] text-[var(--admin-text-dim)]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── View All Link ─── */

export function AdminViewAll({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="admin-view-all-link text-[10px] font-semibold tracking-[0.1em] uppercase flex items-center gap-1.5 transition-colors"
    >
      View all
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </a>
  );
}

/* ─── Page Shell ─── */

export function AdminPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className={cn("space-y-5", className)}
    >
      {children}
    </motion.div>
  );
}

/* ─── Status Dot ─── */

export function AdminStatusDot({
  status,
  size = "sm",
}: {
  status: "healthy" | "degraded" | "critical" | "active" | "inactive";
  size?: "xs" | "sm" | "md";
}) {
  const colors: Record<string, string> = {
    healthy: "#34d399",
    active: "#34d399",
    degraded: "#fbbf24",
    critical: "#f87171",
    inactive: "#6b7280",
  };

  const sizes: Record<string, string> = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        sizes[size],
        (status === "healthy" || status === "active") && "animate-pulse"
      )}
      style={{ backgroundColor: colors[status] || colors.inactive }}
    />
  );
}
