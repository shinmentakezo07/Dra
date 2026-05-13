"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import {
  Users,
  DollarSign,
  Activity,
  Server,
  TrendingUp,
  TrendingDown,
  Loader2,
  Eye,
  Search,
  Key,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats, AdminUserDetail } from "@/types/admin";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendLabel?: string;
}

function StatCard({ title, value, icon, trend, trendLabel }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            {icon}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">
              {title}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              trend === "up" ? "text-green-400" : "text-red-400",
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendLabel && <span>{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTable({ users }: { users: AdminUserDetail[] }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Recent Users</h3>
      <div className="overflow-hidden rounded-lg border border-white/5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-white">{user.name}</td>
                <td className="px-3 py-2 text-white/60">{user.email}</td>
                <td className="px-3 py-2">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs capitalize text-white/50">
                    {user.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProviderHealth({ providers }: { providers: DashboardStats["providers"] }) {
  const items = [
    { label: "Healthy", count: providers.healthy, color: "text-green-400" },
    { label: "Degraded", count: providers.degraded, color: "text-yellow-400" },
    { label: "Down", count: providers.down, color: "text-red-400" },
  ];

  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Provider Health</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-sm text-white/70">{item.label}</span>
            <span className={cn("text-sm font-semibold", item.color)}>
              {item.count}
            </span>
          </div>
        ))}
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(providers.healthy / Math.max(providers.total, 1)) * 100}%` }}
            />
            <div
              className="h-full rounded-full bg-yellow-500 transition-all"
              style={{ width: `${(providers.degraded / Math.max(providers.total, 1)) * 100}%` }}
            />
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${(providers.down / Math.max(providers.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    dataUpdatedAt: statsUpdatedAt,
  } = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getAdminSDK().getDashboard(),
    refetchInterval: 30000,
  });

  const {
    data: usersPage,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ["admin", "users", "recent"],
    queryFn: () => getAdminSDK().listUsers({ limit: 5 }),
    refetchInterval: 30000,
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>
            {statsError instanceof Error ? statsError.message : "Failed to load dashboard data"}
          </span>
        </div>
      </div>
    );
  }

  const lastUpdated = statsUpdatedAt
    ? new Date(statsUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="bg-[#050505] min-h-screen p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">Platform overview</p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-white/30">Updated {lastUpdated}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.users.total.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          trend="up"
          trendLabel={`+${stats.users.newToday} today`}
        />
        <StatCard
          title="Requests Today"
          value={stats.requests.totalToday.toLocaleString()}
          icon={<Activity className="h-5 w-5" />}
          trendLabel={`${stats.requests.avgLatencyMs}ms avg`}
        />
        <StatCard
          title="Revenue Today"
          value={`$${(stats.revenue.todayCents / 100).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Active Providers"
          value={`${stats.providers.healthy}/${stats.providers.total}`}
          icon={<Server className="h-5 w-5" />}
          trend={stats.providers.degraded > 0 ? "down" : "up"}
          trendLabel={
            stats.providers.degraded > 0
              ? `${stats.providers.degraded} degraded`
              : "all healthy"
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {usersLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-white/5 bg-white/5 p-4 min-h-[200px]">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        ) : (
          <UsersTable users={usersPage?.data ?? []} />
        )}
        <ProviderHealth providers={stats.providers} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/admin/users"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Users className="h-4 w-4" />
          Manage Users
        </Link>
        <Link
          href="/admin/providers"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Server className="h-4 w-4" />
          View Providers
        </Link>
        <Link
          href="/admin/models"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="h-4 w-4" />
          Browse Models
        </Link>
        <Link
          href="/admin/billing"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <DollarSign className="h-4 w-4" />
          Billing
        </Link>
      </div>
    </div>
  );
}
