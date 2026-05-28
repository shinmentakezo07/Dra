"use client";

import { motion } from "framer-motion";
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
  AlertTriangle,
  UserPlus,
  Zap,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 110, damping: 22 },
  },
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: { direction: "up" | "down"; value: string };
}

function StatCard({ icon: Icon, label, value, sub, trend }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="admin-card p-6 relative overflow-hidden group"
    >
      {/* Subtle hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 space-y-3.5">
        <div className="flex items-start justify-between">
          <div
            className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center group-hover:scale-105 transition-transform duration-400"
            style={{
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06))",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            <Icon
              className="w-[20px] h-[20px]"
              style={{ color: "rgba(59,130,246,0.7)" }}
            />
          </div>
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-md ${
                trend.direction === "up"
                  ? "text-emerald-400/70 bg-emerald-500/8"
                  : "text-red-400/70 bg-red-500/8"
              }`}
            >
              <TrendingUp
                className={`w-[10px] h-[10px] ${trend.direction === "down" ? "rotate-180" : ""}`}
              />
              {trend.value}
            </span>
          )}
        </div>

        <div>
          <p className="admin-stat-value">{value}</p>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--admin-text-muted)] mt-1">
            {label}
          </p>
          {sub && (
            <p className="text-[12px] text-[var(--admin-text-dim)] mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({
  href,
  label,
  icon: Icon,
  description,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="admin-card p-4 group flex items-center gap-3.5 hover:bg-white/[0.01] transition-all duration-200"
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06))",
          border: "1px solid rgba(59,130,246,0.1)",
        }}
      >
        <Icon
          className="w-[16px] h-[16px]"
          style={{ color: "rgba(59,130,246,0.6)" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--admin-text)]">
          {label}
        </p>
        <p className="text-[11px] text-[var(--admin-text-dim)]">
          {description}
        </p>
      </div>
      <ArrowRight className="w-[14px] h-[14px] text-[var(--admin-text-dim)] group-hover:text-indigo-400/60 transition-colors flex-shrink-0" />
    </Link>
  );
}

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

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", "recent"],
    queryFn: () => getAdminSDK().listUsers({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
            <div className="absolute inset-0 rounded-full border-t-blue-400/60 border-2 border-transparent animate-spin" />
          </div>
          <p className="text-[11px] font-mono tracking-[0.14em] uppercase text-[var(--admin-text-dim)]">
            Loading dashboard
          </p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-red-400/70 bg-red-500/[0.04] px-5 py-3 rounded-[14px] border border-red-500/10">
          <AlertTriangle className="w-[18px] h-[18px]" />
          <p className="text-[13px]">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const s = stats;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-[var(--admin-text)] tracking-[-0.02em]">
                Dashboard
              </h1>
              <span
                className="admin-badge flex items-center gap-1.5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06))",
                  border: "1px solid rgba(59,130,246,0.12)",
                  color: "rgba(59,130,246,0.7)",
                }}
              >
                <span
                  className="w-[5px] h-[5px] rounded-full animate-pulse"
                  style={{ backgroundColor: "#3b82f6" }}
                />
                Live
              </span>
            </div>
            <p className="text-[13px] text-[var(--admin-text-muted)] font-mono tracking-wide">
              Platform overview ·{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Users}
          label="Total Users"
          value={s.users.total.toLocaleString()}
          sub={`${s.users.newToday} new today`}
        />
        <StatCard
          icon={Zap}
          label="Requests Today"
          value={s.requests.totalToday.toLocaleString()}
          sub={`${s.requests.avgLatencyMs.toFixed(0)}ms avg latency`}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue Today"
          value={`$${(s.revenue.todayCents / 100).toFixed(2)}`}
          sub={`$${(s.revenue.monthCents / 100).toFixed(2)} this month`}
        />
        <StatCard
          icon={ShieldCheck}
          label="Providers Online"
          value={`${s.providers.healthy}/${s.providers.total}`}
          sub={`${s.providers.degraded} degraded`}
        />
      </motion.div>

      {/* Recent Users + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Users */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 admin-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">
                Recent Users
              </h2>
              <p className="text-[11px] text-[var(--admin-text-dim)] mt-0.5 font-mono">
                Latest registrations
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-[11px] font-semibold tracking-wider transition-colors flex items-center gap-1.5"
              style={{ color: "rgba(59,130,246,0.5)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(59,130,246,0.5)";
              }}
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {usersData?.data
              ?.slice(0, 5)
              .map((user: AdminUserDetail, i: number) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: i * 0.04 },
                  }}
                  className="flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] hover:bg-white/[0.015] transition-colors group cursor-pointer"
                >
                  <div
                    className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06))",
                      border: "1px solid rgba(59,130,246,0.1)",
                    }}
                  >
                    <UserPlus
                      className="w-[14px] h-[14px]"
                      style={{ color: "rgba(59,130,246,0.5)" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] text-[var(--admin-text)] truncate font-medium">
                        {user.name || "—"}
                      </p>
                      <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04] px-1.5 py-[1px] text-[9px]">
                        {user.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--admin-text-dim)] truncate font-mono">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--admin-text-dim)] flex-shrink-0">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </motion.div>
              ))}
            {(!usersData?.data || usersData.data.length === 0) && (
              <p className="text-[13px] text-[var(--admin-text-dim)] text-center py-8">
                No users registered yet
              </p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="admin-card p-6">
          <div className="mb-5">
            <h2 className="text-[15px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">
              Quick Actions
            </h2>
            <p className="text-[11px] text-[var(--admin-text-dim)] mt-0.5 font-mono">
              Common admin tasks
            </p>
          </div>
          <div className="space-y-2">
            <QuickActionCard
              href="/admin/users"
              label="Manage Users"
              icon={Users}
              description="View and manage accounts"
            />
            <QuickActionCard
              href="/admin/providers"
              label="View Providers"
              icon={Server}
              description="Configure AI backends"
            />
            <QuickActionCard
              href="/admin/models"
              label="Browse Models"
              icon={Activity}
              description="Model registry & aliases"
            />
            <QuickActionCard
              href="/admin/billing"
              label="Billing"
              icon={DollarSign}
              description="Revenue & adjustments"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
