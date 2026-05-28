"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Key,
  BarChart3,
  DollarSign,
  Zap,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Braces,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAnalytics, useCredits, useKeys } from "@/lib/api/hooks";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function CostDisplay({ cost }: { cost: number }) {
  // cost is in micro-dollars (1/100000)
  const dollars = cost / 100000;
  if (dollars < 0.01)
    return <span className="text-green-400/60">&lt;$0.01</span>;
  return <span>${dollars.toFixed(dollars < 1 ? 4 : 2)}</span>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DashboardOverviewClient() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAnalytics();
  const { data: credits, isLoading: creditsLoading } = useCredits();
  const { data: keys, isLoading: keysLoading } = useKeys();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const loading = analyticsLoading || creditsLoading || keysLoading;
  const error = analyticsError ? (analyticsError as Error).message : null;

  const summary = analytics?.summary ?? {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
  };
  const recentLogs = analytics?.recentLogs ?? [];
  const modelBreakdown = analytics?.modelBreakdown ?? [];
  const dailyUsage = analytics?.dailyUsage ?? [];

  const totalCost = recentLogs.reduce((sum, log) => sum + log.cost, 0);
  const avgLatency =
    recentLogs.length > 0
      ? Math.round(
          recentLogs.reduce((sum, log) => sum + log.latency, 0) /
            recentLogs.length,
        )
      : 0;
  const successRate =
    summary.totalRequests > 0
      ? ((summary.successRequests / summary.totalRequests) * 100).toFixed(1)
      : "0.0";
  const creditsRemaining = credits?.balance ?? 0;

  const hourlyMap = new Map<
    string,
    { requests: number; latency: number; count: number }
  >();
  recentLogs.forEach((log) => {
    const hour = new Date(log.createdAt).getHours();
    const time = `${hour.toString().padStart(2, "0")}:00`;
    const existing = hourlyMap.get(time) ?? {
      requests: 0,
      latency: 0,
      count: 0,
    };
    hourlyMap.set(time, {
      requests: existing.requests + 1,
      latency: existing.latency + log.latency,
      count: existing.count + 1,
    });
  });
  const hourlyData = Array.from(hourlyMap.entries())
    .map(([time, data]) => ({
      time,
      requests: data.requests,
      latency: Math.round(data.latency / data.count),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const totalModelRequests = modelBreakdown.reduce(
    (sum, m) => sum + (m.count ?? 0),
    0,
  );
  const topModels = modelBreakdown
    .map((m) => ({
      model: m.model,
      requests: m.count ?? 0,
      percentage:
        totalModelRequests > 0
          ? Math.round(((m.count ?? 0) / totalModelRequests) * 100)
          : 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 3);

  /* ---- layout config ---- */
  const card =
    "bg-[#0A0A0A] border border-white/[0.07] rounded-2xl overflow-hidden";

  /* ---- shared chart components ---- */
  const chartDefaults = {
    margin: { top: 8, right: 8, bottom: 0, left: -20 },
  } as const;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Ambient bg glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/4 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 max-w-7xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Overview
              </h1>
              <div className="h-4 w-[1px] bg-white/10" />
              <span className="text-xs text-gray-600 font-mono">
                {mounted
                  ? new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : " "}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Monitor your API usage and performance in real time.
            </p>
          </div>
          <Link
            href="/dashboard/keys"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            New API Key
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-300 mb-0.5">
                Failed to load dashboard data
              </p>
              <p className="text-xs text-red-400/60 font-mono truncate">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div className="space-y-8">
            {/* ── Metric cards ── */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard
                  title="Total Requests"
                  value={summary.totalRequests.toLocaleString()}
                  change="+12.5%"
                  changeType="positive"
                  icon={Activity}
                  iconColor="text-blue-400"
                  iconBg="bg-blue-500/10"
                />
                <MetricCard
                  title="Total Spent"
                  value={`$${(totalCost / 100000).toFixed(2)}`}
                  change="+8.3%"
                  changeType="positive"
                  icon={DollarSign}
                  iconColor="text-emerald-400"
                  iconBg="bg-emerald-500/10"
                />
                <MetricCard
                  title="Credits Left"
                  value={`$${(creditsRemaining / 100000).toFixed(2)}`}
                  icon={DollarSign}
                  iconColor="text-purple-400"
                  iconBg="bg-purple-500/10"
                />
                <MetricCard
                  title="Avg Latency"
                  value={`${avgLatency}ms`}
                  change="-5.2%"
                  changeType="positive"
                  icon={Zap}
                  iconColor="text-yellow-400"
                  iconBg="bg-yellow-500/10"
                />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <MetricCard
                  title="Success Rate"
                  value={`${successRate}%`}
                  change="+0.3%"
                  changeType="positive"
                  icon={CheckCircle}
                  iconColor="text-green-400"
                  iconBg="bg-green-500/10"
                />
                <MetricCard
                  title="Requests / min"
                  value={
                    summary.totalRequests > 0
                      ? (summary.totalRequests / 60).toFixed(1)
                      : "0.0"
                  }
                  change="+15.2%"
                  changeType="positive"
                  icon={TrendingUp}
                  iconColor="text-cyan-400"
                  iconBg="bg-cyan-500/10"
                />
                <MetricCard
                  title="Active Keys"
                  value={(keys?.length ?? 0).toString()}
                  icon={Key}
                  iconColor="text-purple-400"
                  iconBg="bg-purple-500/10"
                />
              </div>
            </section>

            {/* ── Charts row ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`${card} p-5 sm:p-6`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Requests per Hour
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Last 24 hours
                    </p>
                  </div>
                </div>
                {hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={hourlyData} {...chartDefaults}>
                      <defs>
                        <linearGradient
                          id="reqFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis
                        dataKey="time"
                        stroke="#4b5563"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#4b5563"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#reqFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
                    No request data yet
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${card} p-5 sm:p-6`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Latency Trend
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Daily average
                    </p>
                  </div>
                </div>
                {dailyUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={dailyUsage.slice().reverse()}
                      {...chartDefaults}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis
                        dataKey="date"
                        stroke="#4b5563"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#4b5563"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={{ fill: "#eab308", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
                    No latency data yet
                  </div>
                )}
              </motion.div>
            </section>

            {/* ── Activity + Models ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={card}
              >
                <div className="flex items-center justify-between p-5 sm:p-6 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Braces className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Recent Activity
                      </h3>
                      <p className="text-[11px] text-gray-500 font-mono">
                        Latest requests
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/logs"
                    className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-3 sm:p-4">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="group flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors first:pt-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">
                            {log.model}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono shrink-0">
                            {log.provider}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-gray-600" />
                          <span className="text-xs text-gray-500 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-mono text-emerald-400/80">
                          <CostDisplay cost={log.cost} />
                        </span>
                        <StatusBadge
                          status={
                            log.status === "success" ? "success" : "error"
                          }
                          label={log.status}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <div className="text-center py-10 text-gray-600 text-sm">
                      No recent activity
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Top models */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={card}
              >
                <div className="flex items-center justify-between p-5 sm:p-6 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Top Models
                      </h3>
                      <p className="text-[11px] text-gray-500 font-mono">
                        Usage distribution
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/analytics"
                    className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-5 sm:p-6">
                  {topModels.length > 0 ? (
                    <div className="space-y-5">
                      {topModels.map((model, index) => (
                        <div key={model.model}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-mono font-bold text-gray-600 w-4">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="text-sm font-medium text-white">
                                {model.model}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              {model.percentage}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${model.percentage}%` }}
                              transition={{
                                delay: 0.5 + index * 0.1,
                                duration: 0.6,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                            />
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1 font-mono">
                            {model.requests.toLocaleString()} requests
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-600 text-sm">
                      No model usage yet
                    </div>
                  )}
                </div>
              </motion.div>
            </section>

            {/* ── Quick actions ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  {
                    href: "/dashboard/keys",
                    label: "Manage API Keys",
                    desc: "Create and rotate your credentials",
                    icon: Key,
                    color: "from-purple-500/20 to-purple-500/5",
                    border: "border-purple-500/20",
                    text: "text-purple-400",
                    hover: "hover:border-purple-500/30",
                  },
                  {
                    href: "/dashboard/logs",
                    label: "View Logs",
                    desc: "Inspect every request in detail",
                    icon: Braces,
                    color: "from-blue-500/20 to-blue-500/5",
                    border: "border-blue-500/20",
                    text: "text-blue-400",
                    hover: "hover:border-blue-500/30",
                  },
                  {
                    href: "/dashboard/analytics",
                    label: "Analytics",
                    desc: "Track usage patterns and costs",
                    icon: TrendingUp,
                    color: "from-emerald-500/20 to-emerald-500/5",
                    border: "border-emerald-500/20",
                    text: "text-emerald-400",
                    hover: "hover:border-emerald-500/30",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative ${card} ${item.hover} transition-colors`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div className="relative p-5 flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} border ${item.border} flex items-center justify-center ${item.text}`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">
                          {item.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
}
