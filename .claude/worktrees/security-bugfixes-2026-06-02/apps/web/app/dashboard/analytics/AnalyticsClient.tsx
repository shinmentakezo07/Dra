"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  Activity,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { getSDK, AnalyticsData } from "@/lib/api/sdk";
import { getErrorMessage } from "@/lib/api/errors";

interface ModelBreakdownItem {
  model: string;
  requests: number;
  cost: number;
  percentage: number;
  fill: string;
}

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

export default function AnalyticsClient() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSDK().getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = analytics?.summary ?? {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
  };
  const dailyUsage = analytics?.dailyUsage ?? [];
  const modelBreakdown = analytics?.modelBreakdown ?? [];
  const recentLogs = analytics?.recentLogs ?? [];

  // Calculate stats
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

  // Filter daily usage by time range
  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[timeRange];
  const filteredDaily = dailyUsage.slice(0, days).reverse();

  // Format model breakdown for charts
  const totalModelRequests = modelBreakdown.reduce(
    (sum, m) => sum + (m.count ?? 0),
    0,
  );
  const chartModelData: ModelBreakdownItem[] = modelBreakdown.map((m, i) => ({
    model: m.model,
    requests: m.count ?? 0,
    cost: m.totalCost ?? 0,
    percentage:
      totalModelRequests > 0
        ? Math.round(((m.count ?? 0) / totalModelRequests) * 100)
        : 0,
    fill: COLORS[i % COLORS.length],
  }));

  // Build hourly pattern from recent logs (group by hour)
  const hourlyMap = new Map<string, number>();
  for (let i = 0; i < 24; i += 3) {
    const hour = `${i.toString().padStart(2, "0")}:00`;
    hourlyMap.set(hour, 0);
  }
  recentLogs.forEach((log) => {
    const hour = new Date(log.createdAt).getHours();
    const bucket = `${Math.floor(hour / 3) * 3}`.padStart(2, "0") + ":00";
    hourlyMap.set(bucket, (hourlyMap.get(bucket) ?? 0) + 1);
  });
  const hourlyRequests = Array.from(hourlyMap.entries())
    .map(([hour, requests]) => ({ hour, requests }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-white">Analytics</h1>
            </div>
            <p className="text-gray-400">Track your API usage and spending</p>
          </div>

          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-[#0A0A0A] text-gray-400 border border-white/10 hover:text-white"
                }`}
              >
                {range === "7d"
                  ? "7 Days"
                  : range === "30d"
                    ? "30 Days"
                    : "90 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-1">
                Error loading analytics
              </h3>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Grid */}
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
                title="Avg Latency"
                value={`${avgLatency}ms`}
                change="-5.2%"
                changeType="positive"
                icon={Zap}
                iconColor="text-yellow-400"
                iconBg="bg-yellow-500/10"
              />
              <MetricCard
                title="Success Rate"
                value={`${successRate}%`}
                change="+0.3%"
                changeType="positive"
                icon={TrendingUp}
                iconColor="text-green-400"
                iconBg="bg-green-500/10"
              />
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Daily Requests & Cost */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Daily Requests & Cost
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0A0A0A",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="requests"
                      fill="#3b82f6"
                      name="Requests"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="cost"
                      fill="#10b981"
                      name="Cost (units)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Model Usage Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Usage by Model
                </h3>
                {chartModelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartModelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) =>
                          `${entry.model} ${entry.percentage}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="requests"
                      >
                        {chartModelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No model usage data yet
                  </div>
                )}
              </motion.div>
            </div>

            {/* Additional Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Hourly Request Pattern */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Hourly Request Pattern
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={hourlyRequests}>
                    <defs>
                      <linearGradient
                        id="colorHourly"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#06b6d4"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#06b6d4"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis
                      dataKey="hour"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
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
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorHourly)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Latency Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Latency Trend
                </h3>
                {filteredDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={filteredDaily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        style={{ fontSize: "12px" }}
                      />
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
                        strokeWidth={3}
                        dot={{ fill: "#eab308", r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
                    No latency data yet
                  </div>
                )}
              </motion.div>
            </div>

            {/* Model Breakdown Table */}
            {chartModelData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-6">
                  Model Performance Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase">
                          Model
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase">
                          Requests
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase">
                          Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {chartModelData.map((model, index) => (
                        <motion.tr
                          key={model.model}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: model.fill }}
                              />
                              <span className="text-white font-medium">
                                {model.model}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 font-mono">
                            {model.requests.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-mono">
                            ${(model.cost / 100000).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative max-w-[200px]">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all duration-500"
                                  style={{ width: `${model.percentage}%` }}
                                />
                              </div>
                              <span className="text-gray-400 text-sm font-mono">
                                {model.percentage}%
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
