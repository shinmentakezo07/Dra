"use client";

import { motion } from "framer-motion";
import { Activity, Key, BarChart3, DollarSign, Zap, TrendingUp, ArrowRight, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAnalytics, useCredits, useKeys } from "@/lib/api/hooks";
import { getSDK } from "@/lib/api/sdk";

export default function DashboardOverviewClient() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalytics();
  const { data: credits, isLoading: creditsLoading } = useCredits();
  const { data: keys, isLoading: keysLoading } = useKeys();

  const loading = analyticsLoading || creditsLoading || keysLoading;
  const sdk = getSDK();
  const error = analyticsError ? (analyticsError as Error).message : null;

  const summary = analytics?.summary ?? { totalRequests: 0, successRequests: 0, errorRequests: 0 };
  const recentLogs = analytics?.recentLogs ?? [];
  const modelBreakdown = analytics?.modelBreakdown ?? [];
  const dailyUsage = analytics?.dailyUsage ?? [];

  const totalCost = recentLogs.reduce((sum, log) => sum + log.cost, 0);
  const avgLatency = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((sum, log) => sum + log.latency, 0) / recentLogs.length)
    : 0;
  const successRate = summary.totalRequests > 0
    ? ((summary.successRequests / summary.totalRequests) * 100).toFixed(1)
    : "0.0";
  const creditsRemaining = credits?.balance ?? 0;

  const hourlyMap = new Map<string, { requests: number; latency: number; count: number }>();
  recentLogs.forEach((log) => {
    const hour = new Date(log.createdAt).getHours();
    const time = `${hour.toString().padStart(2, "0")}:00`;
    const existing = hourlyMap.get(time) ?? { requests: 0, latency: 0, count: 0 };
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

  const totalModelRequests = modelBreakdown.reduce((sum, m) => sum + (m.count ?? 0), 0);
  const topModels = modelBreakdown
    .map((m) => ({
      model: m.model,
      requests: m.count ?? 0,
      percentage: totalModelRequests > 0 ? Math.round(((m.count ?? 0) / totalModelRequests) * 100) : 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 3);

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-400">Monitor your API usage and performance</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-1">Error loading dashboard</h3>
              <p className="text-xs text-red-300/80">{error}</p>
              {sdk.lastRequestId() && (
                <p className="text-xs text-red-400/60 mt-1 font-mono">Request ID: {sdk.lastRequestId()}</p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                title="Credits Remaining"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                title="Requests/Min"
                value={summary.totalRequests > 0 ? (summary.totalRequests / 60).toFixed(1) : "0.0"}
                change="+15.2%"
                changeType="positive"
                icon={TrendingUp}
                iconColor="text-cyan-400"
                iconBg="bg-cyan-500/10"
              />
              <MetricCard
                title="Active API Keys"
                value={(keys?.length ?? 0).toString()}
                icon={Key}
                iconColor="text-purple-400"
                iconBg="bg-purple-500/10"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Requests per Hour
                </h3>
                {hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRequests)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                    No request data yet
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Latency Trend
                </h3>
                {dailyUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyUsage.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={{ fill: "#eab308", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                    No latency data yet
                  </div>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Recent Activity
                  </h3>
                  <Link
                    href="/dashboard/logs"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">{log.model}</span>
                          <span className="text-xs text-gray-500">{log.provider}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-400 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-emerald-400">
                          ${(log.cost / 100000).toFixed(4)}
                        </span>
                        <StatusBadge
                          status={log.status === "success" ? "success" : "error"}
                          label={log.status}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">No recent activity</div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Top Models
                  </h3>
                  <Link
                    href="/dashboard/analytics"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-6">
                  {topModels.map((model, index) => (
                    <div key={model.model} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{model.model}</span>
                        <span className="text-gray-400 text-sm font-mono">{model.percentage}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${model.percentage}%` }}
                          transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                        />
                      </div>
                      <span className="text-xs text-gray-500">{model.requests.toLocaleString()} requests</span>
                    </div>
                  ))}
                  {topModels.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">No model usage yet</div>
                  )}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Link
                href="/dashboard/keys"
                className="p-6 bg-[#0A0A0A] border border-white/10 rounded-xl hover:border-purple-500/30 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold">Manage API Keys</h3>
                </div>
                <p className="text-sm text-gray-400">Create and manage your API keys</p>
              </Link>

              <Link
                href="/dashboard/logs"
                className="p-6 bg-[#0A0A0A] border border-white/10 rounded-xl hover:border-blue-500/30 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold">View Request Logs</h3>
                </div>
                <p className="text-sm text-gray-400">Monitor all API requests</p>
              </Link>

              <Link
                href="/dashboard/analytics"
                className="p-6 bg-[#0A0A0A] border border-white/10 rounded-xl hover:border-emerald-500/30 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold">View Analytics</h3>
                </div>
                <p className="text-sm text-gray-400">Track usage and spending</p>
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
