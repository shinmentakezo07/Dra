"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { DashboardStats, AdminUserDetail } from "@/types/admin";
import {
  Users,
  DollarSign,
  Activity,
  Server,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  UserPlus,
  Zap,
  ShieldCheck,
  Clock,
  Cpu,
  Gauge,
  BarChart3,
  ChevronRight,
  Radio,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

/* ─── Animation Variants ─── */

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─── Shared Components ─── */

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
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
  );
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="admin-view-all-link text-[10px] font-semibold tracking-[0.1em] uppercase flex items-center gap-1.5 transition-colors"
    >
      View
      <ArrowRight className="w-3 h-3" />
    </Link>
  );
}

/* ─── Hero Metric (Dominant) ─── */

function HeroMetric({
  stats,
  isLoading,
}: {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="admin-hero-metric admin-card p-8">
        <div className="admin-skeleton h-[200px] w-full" />
      </div>
    );
  }

  const revenueToday = stats.revenue.todayCents / 100;
  const revenueMonth = stats.revenue.monthCents / 100;

  return (
    <motion.div
      variants={fadeUp}
      className="admin-hero-metric admin-card p-8 relative overflow-hidden"
    >
      {/* Background texture */}
      <div className="absolute inset-0 admin-noise opacity-30 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <DollarSign
                className="w-4 h-4"
                style={{ color: "var(--admin-accent)" }}
              />
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--admin-text-muted)]">
                Revenue Today
              </span>
            </div>
            <p className="admin-hero-value font-mono">
              ${revenueToday.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400/70 bg-emerald-500/[0.06] px-2.5 py-1 rounded-md">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px] font-semibold tracking-wider uppercase font-mono">
              ${revenueMonth.toFixed(2)} mo
            </span>
          </div>
        </div>

        {/* Mini bar visualization */}
        <div className="flex items-end gap-1 h-12 mt-4">
          {Array.from({ length: 24 }).map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${height}%`,
                  background:
                    i === new Date().getHours()
                      ? "var(--admin-accent)"
                      : "rgba(255,255,255,0.04)",
                  opacity: i === new Date().getHours() ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] font-mono text-[var(--admin-text-dim)]">
            00:00
          </span>
          <span className="text-[9px] font-mono text-[var(--admin-text-dim)]">
            12:00
          </span>
          <span className="text-[9px] font-mono text-[var(--admin-text-dim)]">
            23:59
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Compact Stat ─── */

function CompactStat({
  icon: Icon,
  label,
  value,
  sub,
  accentColor = "var(--admin-accent)",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="admin-card admin-compact-stat p-5 group relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor, opacity: 0.6 }}
          />
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--admin-text-muted)]">
            {label}
          </span>
        </div>
        <p className="text-[22px] font-bold text-[var(--admin-text)] font-mono tracking-[-0.02em] leading-none">
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

/* ─── System Status Strip ─── */

function SystemStatusStrip({
  stats,
  isLoading,
}: {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="admin-card p-4">
        <div className="admin-skeleton h-8 w-full" />
      </div>
    );
  }

  const { providers } = stats;
  const healthPercent =
    providers.total > 0
      ? Math.round((providers.healthy / providers.total) * 100)
      : 0;

  const healthStatus =
    providers.down > 0
      ? "critical"
      : providers.degraded > 0
        ? "degraded"
        : "healthy";

  const statusColors = {
    healthy: { bg: "rgba(52,211,153,0.06)", text: "#34d399", dot: "#34d399" },
    degraded: { bg: "rgba(251,191,36,0.06)", text: "#fbbf24", dot: "#fbbf24" },
    critical: { bg: "rgba(248,113,113,0.06)", text: "#f87171", dot: "#f87171" },
  };

  const sc = statusColors[healthStatus];

  return (
    <motion.div
      variants={fadeUp}
      className="admin-card admin-status-strip p-4 flex items-center gap-6 overflow-x-auto"
    >
      {/* Health indicator */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: sc.dot }}
        />
        <span
          className="text-[11px] font-semibold tracking-[0.08em] uppercase font-mono"
          style={{ color: sc.text }}
        >
          {healthStatus === "healthy"
            ? "All Systems Operational"
            : healthStatus === "degraded"
              ? "Degraded Performance"
              : "System Issues Detected"}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.04] flex-shrink-0" />

      {/* Provider stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-[var(--admin-text-dim)]" />
          <span className="text-[12px] font-mono text-[var(--admin-text-muted)]">
            {providers.total} providers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/50" />
          <span className="text-[12px] font-mono text-[var(--admin-text-muted)]">
            {providers.healthy} healthy
          </span>
        </div>
        {providers.degraded > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/50" />
            <span className="text-[12px] font-mono text-amber-400/60">
              {providers.degraded} degraded
            </span>
          </div>
        )}
        {providers.down > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400/50" />
            <span className="text-[12px] font-mono text-red-400/60">
              {providers.down} down
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.04] flex-shrink-0" />

      {/* Health bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${healthPercent}%`,
              backgroundColor: sc.dot,
            }}
          />
        </div>
        <span className="text-[11px] font-mono text-[var(--admin-text-dim)]">
          {healthPercent}%
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Activity Feed ─── */

function ActivityFeed({
  usersData,
  isLoading,
}: {
  usersData: AdminUserDetail[] | undefined;
  isLoading: boolean;
}) {
  const activities = usersData?.slice(0, 6) ?? [];

  return (
    <motion.div variants={fadeUp} className="admin-card p-6">
      <SectionHeading
        title="Activity"
        subtitle="Recent registrations"
        action={<ViewAllLink href="/admin/logs" />}
      />

      <div className="space-y-0">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="admin-skeleton w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="admin-skeleton h-3 w-24" />
                <div className="admin-skeleton h-2.5 w-32" />
              </div>
            </div>
          ))}

        {!isLoading &&
          activities.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
              className="flex items-center gap-3 py-3 border-b border-white/[0.02] last:border-0 group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.04] flex-shrink-0">
                <UserPlus
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--admin-accent)", opacity: 0.5 }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] text-[var(--admin-text)] truncate font-medium">
                    {user.name || "New user"}
                  </p>
                  {user.role !== "user" && (
                    <span className="text-[8px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04]">
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--admin-text-dim)] truncate font-mono">
                  {user.email}
                </p>
              </div>
              <span className="text-[9px] font-mono text-[var(--admin-text-dim)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </motion.div>
          ))}

        {!isLoading && activities.length === 0 && (
          <div className="text-center py-10">
            <Radio className="w-5 h-5 text-[var(--admin-text-dim)] mx-auto mb-2 opacity-40" />
            <p className="text-[12px] text-[var(--admin-text-dim)]">
              No recent activity
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Quick Commands ─── */

function QuickCommands() {
  const commands = [
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      kbd: "U",
    },
    {
      href: "/admin/providers",
      label: "Providers",
      icon: Server,
      kbd: "P",
    },
    {
      href: "/admin/models",
      label: "Models",
      icon: Activity,
      kbd: "M",
    },
    {
      href: "/admin/billing",
      label: "Billing",
      icon: DollarSign,
      kbd: "B",
    },
    {
      href: "/admin/logs",
      label: "Logs",
      icon: Eye,
      kbd: "L",
    },
    {
      href: "/admin/security",
      label: "Security",
      icon: ShieldCheck,
      kbd: "S",
    },
  ];

  return (
    <motion.div variants={fadeUp} className="admin-card p-6">
      <SectionHeading title="Commands" subtitle="Quick navigation" />

      <div className="grid grid-cols-2 gap-2">
        {commands.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <Link
              key={cmd.href}
              href={cmd.href}
              className="admin-command-btn group flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.06] hover:bg-white/[0.02] transition-all duration-200"
            >
              <Icon
                className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                style={{ color: "var(--admin-accent)", opacity: 0.4 }}
              />
              <span className="text-[12px] font-medium text-[var(--admin-text-muted)] group-hover:text-[var(--admin-text)] transition-colors flex-1">
                {cmd.label}
              </span>
              <kbd className="text-[9px] font-mono text-[var(--admin-text-dim)] bg-white/[0.02] border border-white/[0.04] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {cmd.kbd}
              </kbd>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Platform Pulse (Requests + Tokens) ─── */

function PlatformPulse({ stats }: { stats: DashboardStats }) {
  const { requests, tokens } = stats;

  return (
    <motion.div variants={fadeUp} className="admin-card p-6">
      <SectionHeading title="Platform Pulse" subtitle="Request metrics" />

      <div className="space-y-5">
        {/* Requests */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--admin-text-muted)]">
              Requests
            </span>
            <span className="text-[18px] font-bold font-mono text-[var(--admin-text)] tracking-[-0.02em]">
              {requests.totalToday.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.03]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((requests.totalToday / (requests.totalMonth || 1)) * 100 * 30, 100)}%`,
                background: "var(--admin-accent)",
                opacity: 0.6,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-[var(--admin-text-dim)]">
              {requests.totalMonth.toLocaleString()} this month
            </span>
            <span className="text-[9px] font-mono text-[var(--admin-text-dim)]">
              {requests.avgLatencyMs.toFixed(0)}ms avg
            </span>
          </div>
        </div>

        {/* Tokens */}
        <div className="pt-4 border-t border-white/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--admin-text-muted)]">
              Tokens Processed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-mono text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider">
                Input
              </p>
              <p className="text-[16px] font-bold font-mono text-[var(--admin-text)] tracking-[-0.02em]">
                {tokens.inputToday > 1000000
                  ? `${(tokens.inputToday / 1000000).toFixed(1)}M`
                  : tokens.inputToday > 1000
                    ? `${(tokens.inputToday / 1000).toFixed(1)}K`
                    : tokens.inputToday}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider">
                Output
              </p>
              <p className="text-[16px] font-bold font-mono text-[var(--admin-text)] tracking-[-0.02em]">
                {tokens.outputToday > 1000000
                  ? `${(tokens.outputToday / 1000000).toFixed(1)}M`
                  : tokens.outputToday > 1000
                    ? `${(tokens.outputToday / 1000).toFixed(1)}K`
                    : tokens.outputToday}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getAdminSDK().getDashboard(),
    refetchInterval: 30000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users", "recent"],
    queryFn: () => getAdminSDK().listUsers({ limit: 6 }),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="admin-card p-8 text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-red-400/40 mx-auto mb-4" />
          <p className="text-[14px] font-medium text-[var(--admin-text)] mb-1">
            Failed to load dashboard
          </p>
          <p className="text-[12px] text-[var(--admin-text-dim)]">
            Check your connection and try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Row 1: Header ── */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[22px] font-semibold text-[var(--admin-text)] tracking-[-0.025em]">
              Dashboard
            </h1>
            <span className="admin-live-badge flex items-center gap-1.5">
              <span className="admin-live-dot" />
              Live
            </span>
          </div>
          <p className="text-[12px] text-[var(--admin-text-dim)] font-mono tracking-wide">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--admin-text-dim)]" />
          <span className="text-[11px] font-mono text-[var(--admin-text-dim)]">
            Auto-refresh 30s
          </span>
        </div>
      </motion.div>

      {/* ── Row 2: System Status Strip ── */}
      <SystemStatusStrip stats={stats} isLoading={isLoading} />

      {/* ── Row 3: Hero Metric + Compact Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero metric — dominant */}
        <div className="lg:col-span-5">
          <HeroMetric stats={stats} isLoading={isLoading} />
        </div>

        {/* Supporting stats — 3 compact cards stacked */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <CompactStat
            icon={Users}
            label="Users"
            value={stats ? stats.users.total.toLocaleString() : "—"}
            sub={stats ? `${stats.users.newToday} new today` : undefined}
            accentColor="#3b82f6"
          />
          <CompactStat
            icon={Zap}
            label="Requests"
            value={stats ? stats.requests.totalToday.toLocaleString() : "—"}
            sub={
              stats
                ? `${stats.requests.avgLatencyMs.toFixed(0)}ms latency`
                : undefined
            }
            accentColor="#a855f7"
          />
          <CompactStat
            icon={Server}
            label="Providers"
            value={
              stats
                ? `${stats.providers.healthy}/${stats.providers.total}`
                : "—"
            }
            sub={
              stats && stats.providers.degraded > 0
                ? `${stats.providers.degraded} degraded`
                : "All healthy"
            }
            accentColor="#34d399"
          />
        </div>

        {/* Platform Pulse */}
        <div className="lg:col-span-4">
          {stats ? (
            <PlatformPulse stats={stats} />
          ) : (
            <div className="admin-card p-6 h-full">
              <div className="admin-skeleton h-full min-h-[200px]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Activity + Commands ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityFeed
            usersData={usersData?.data}
            isLoading={usersLoading}
          />
        </div>
        <div>
          <QuickCommands />
        </div>
      </div>
    </motion.div>
  );
}
