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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/admin";

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

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getAdminSDK().getDashboard(),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">
          {error instanceof Error ? error.message : "Failed to load dashboard data"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">Platform overview</p>
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
    </div>
  );
}
