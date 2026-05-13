"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { DashboardStats, AdminUserDetail } from "@/types/admin";
import {
  Users, DollarSign, Activity, Server, TrendingUp,
  Eye, ArrowRight, Loader2, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import AdminPageHeader, { containerVariants, itemVariants } from "../AdminPageHeader";

function StatCard({ icon: Icon, label, value, trend, sub }: {
  icon: typeof Users; label: string; value: string; trend?: string; sub?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] p-6 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-6 h-6 text-blue-400" />
          </div>
          {trend && (
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-green-400/70 bg-green-500/10 rounded-full px-2.5 py-1">
              {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{value}</p>
        <p className="text-xs font-mono font-bold tracking-widest uppercase text-blue-400/50 mt-1.5">{label}</p>
        {sub && <p className="text-xs text-white/20 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-white/30 font-mono tracking-wider">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-red-400/80">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const s = stats!;

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
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-white/30 mt-1 font-mono tracking-wide">
              Platform overview · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-blue-400/50 bg-blue-500/10 rounded-full border border-blue-500/30 px-3 py-1.5">
            Live
          </span>
        </div>
      </motion.div>{" "}
      {/* UNCOMMENT BELOW when AdminPageHeader is stable */}
      {/* <AdminPageHeader title="Dashboard" subtitle="Platform overview" badge="Live"> */}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} label="Total Users" value={s.users.total.toLocaleString()} sub={`${s.users.newToday} new today`} />
        <StatCard icon={Activity} label="Requests Today" value={s.requests.totalToday.toLocaleString()} sub={`${s.requests.avgLatencyMs.toFixed(0)}ms avg latency`} />
        <StatCard icon={DollarSign} label="Revenue Today" value={`$${(s.revenue.todayCents / 100).toFixed(2)}`} sub={`$${(s.revenue.monthCents / 100).toFixed(2)} this month`} />
        <StatCard icon={Server} label="Providers" value={`${s.providers.healthy}/${s.providers.total}`} sub={`${s.providers.degraded} degraded`} />
      </motion.div>

      {/* Recent Users + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Users */}
        <motion.div variants={itemVariants} className="lg:col-span-2 rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Recent Users</h2>
              <p className="text-xs text-white/20 mt-0.5 font-mono">Latest registered accounts</p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-mono font-bold tracking-wider text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {usersData?.data?.slice(0, 4).map((user: AdminUserDetail, i: number) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-white/[0.02] transition-colors group"
              >
                <div className="w-8 h-8 rounded-[10px] bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/10">
                  <Users className="w-4 h-4 text-blue-400/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate font-medium">{user.name}</p>
                  <p className="text-xs text-white/20 truncate">{user.email}</p>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-white/20 bg-white/5 rounded-full px-2 py-0.5">
                  {user.role}
                </span>
                <span className="text-[9px] font-mono text-white/20">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </motion.div>
            ))}
            {(!usersData?.data || usersData.data.length === 0) && (
              <p className="text-sm text-white/20 text-center py-6">No users yet</p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] p-6">
          <h2 className="text-base font-bold text-white tracking-tight mb-5">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: "/admin/users", label: "Manage Users", icon: Users },
              { href: "/admin/providers", label: "View Providers", icon: Server },
              { href: "/admin/models", label: "Browse Models", icon: Activity },
              { href: "/admin/billing", label: "Billing", icon: DollarSign },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] hover:bg-white/[0.03] transition-all duration-200 group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                  <action.icon className="w-4 h-4 text-blue-400/70 group-hover:text-blue-400" />
                </div>
                <span className="flex-1 text-sm text-white/50 group-hover:text-white/70 transition-colors font-medium">{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-blue-400/50 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
