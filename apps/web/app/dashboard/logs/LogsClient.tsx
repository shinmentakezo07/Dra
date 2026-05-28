"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Search,
  Zap,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Hash,
  Clock,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LogDetailDrawer } from "@/components/dashboard/LogDetailDrawer";
import { ModelBreakdown } from "@/components/dashboard/ModelBreakdown";
import { useLogs } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { getSDK } from "@/lib/api/sdk";
import type { APILog } from "@/lib/api/sdk";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function formatCost(cents: number): string {
  return `$${(cents / 100000).toFixed(4)}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function FeedSkeleton() {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex gap-6">
        {["Timestamp", "Model", "Tokens", "Cost", "Latency", "Status"].map(
          (h) => (
            <div
              key={h}
              className="h-3 w-16 bg-white/5 rounded animate-pulse"
            />
          ),
        )}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-white/5 flex gap-6">
          {Array.from({ length: 6 }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-white/5 rounded animate-pulse"
              style={{
                width: `${30 + Math.random() * 50}%`,
                animationDelay: `${i * 0.05 + j * 0.03}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LogsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);
  const limit = 20;
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: logsData, isLoading, error, refetch } = useLogs(page, limit);
  const sdk = getSDK();

  const allLogs = logsData?.data ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery && statusFilter === "all") return allLogs;
    return allLogs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.model.toLowerCase().includes(q) ||
        log.provider.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        log.status.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allLogs, searchQuery, statusFilter]);

  const totalPages = logsData?.totalPages ?? 1;
  const displayLogs =
    searchQuery || statusFilter !== "all" ? filteredLogs : allLogs;

  const successCount = allLogs.filter((l) => l.status === "success").length;
  const errorCount = allLogs.filter((l) => l.status === "error").length;
  const avgLatency =
    allLogs.length > 0
      ? Math.round(
          allLogs.reduce((sum, log) => sum + log.latency, 0) / allLogs.length,
        )
      : 0;
  const totalTokens = allLogs.reduce(
    (sum, log) => sum + log.inputTokens + log.outputTokens,
    0,
  );
  const totalCost = allLogs.reduce((sum, log) => sum + log.cost, 0);
  const successRate =
    allLogs.length > 0
      ? ((successCount / allLogs.length) * 100).toFixed(1)
      : "—";

  const handleRowClick = useCallback((row: APILog) => setSelectedLog(row), []);
  const handleCloseDrawer = useCallback(() => setSelectedLog(null), []);

  const filters = [
    { key: "all" as const, label: "All Requests", icon: Activity },
    { key: "success" as const, label: "Successful", icon: CheckCircle2 },
    { key: "error" as const, label: "Errors", icon: AlertCircle },
  ];

  const generatePageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Request Logs
                  </h1>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Monitor all API requests and responses
                    {logsData?.total != null && (
                      <span className="text-gray-500">
                        {" "}
                        · {logsData.total.toLocaleString()} total
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm disabled:opacity-30"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </motion.button>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-1">
                    Error loading logs
                  </h3>
                  <p className="text-xs text-red-300/80">
                    {getErrorMessage(error)}
                  </p>
                  {sdk.lastRequestId() && (
                    <p className="text-xs text-red-400/60 mt-1 font-mono">
                      Request ID: {sdk.lastRequestId()}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Metric Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5"
                >
                  <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-3" />
                  <div className="h-7 w-24 bg-white/5 rounded animate-pulse mb-1" />
                  <div className="h-2.5 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  title="Total Requests"
                  value={logsData?.total ?? 0}
                  icon={Activity}
                  iconColor="text-blue-400"
                  iconBg="bg-blue-500/10"
                />
                <MetricCard
                  title="Successful"
                  value={successCount}
                  change={allLogs.length > 0 ? `${successRate}%` : undefined}
                  changeType="positive"
                  icon={CheckCircle2}
                  iconColor="text-green-400"
                  iconBg="bg-green-500/10"
                />
                <MetricCard
                  title="Errors"
                  value={errorCount}
                  change={
                    allLogs.length > 0
                      ? `${((errorCount / allLogs.length) * 100).toFixed(0)}%`
                      : undefined
                  }
                  changeType={errorCount > 0 ? "negative" : "neutral"}
                  icon={AlertCircle}
                  iconColor="text-red-400"
                  iconBg="bg-red-500/10"
                />
                <MetricCard
                  title="Avg Latency"
                  value={`${avgLatency}ms`}
                  icon={Zap}
                  iconColor="text-yellow-400"
                  iconBg="bg-yellow-500/10"
                />
              </>
            )}
          </motion.div>

          {/* Secondary stats row */}
          {!isLoading && allLogs.length > 0 && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl px-6 py-4 flex flex-wrap items-center gap-6 sm:gap-8">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-400/60" />
                  <span className="text-sm text-gray-400">Tokens</span>
                  <span className="text-sm font-mono text-white">
                    {totalTokens.toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400/60" />
                  <span className="text-sm text-gray-400">Cost</span>
                  <span className="text-sm font-mono text-emerald-400">
                    {formatCost(totalCost)}
                  </span>
                </div>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400/60" />
                  <span className="text-sm text-gray-400">Showing</span>
                  <span className="text-sm font-mono text-white">
                    {displayLogs.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {logsData?.total ?? 0}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search + Filters */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search by model, provider, ID, or status…  /"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500 mr-1" />
                  {filters.map(({ key, label, icon: Icon }) => {
                    const isActive = statusFilter === key;
                    return (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setStatusFilter(key);
                          setPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          isActive
                            ? key === "success"
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : key === "error"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : "bg-white/10 text-white border-white/20"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/15"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Log Table + Model Breakdown */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
          >
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <FeedSkeleton />
                  </motion.div>
                ) : displayLogs.length > 0 ? (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto hero-scroll">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Timestamp
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Model
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Tokens
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Cost
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Latency
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {displayLogs.map((log, i) => (
                              <motion.tr
                                key={log.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.2 }}
                                onClick={() => handleRowClick(log)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleRowClick(log);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`View details for ${log.model} request ${log.id}`}
                                className="hover:bg-white/[0.03] transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                                    {formatTime(log.createdAt)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-semibold text-white">
                                      {log.model}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                                      {log.provider}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-mono">
                                    <span className="text-green-400">
                                      {log.inputTokens.toLocaleString()}
                                    </span>
                                    <span className="text-gray-600 mx-1">
                                      /
                                    </span>
                                    <span className="text-cyan-400">
                                      {log.outputTokens.toLocaleString()}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-mono text-emerald-400">
                                    {formatCost(log.cost)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div
                                    className={`flex items-center gap-1.5 text-sm font-mono ${
                                      log.latency < 500
                                        ? "text-green-400"
                                        : log.latency < 1500
                                          ? "text-yellow-400"
                                          : "text-red-400"
                                    }`}
                                  >
                                    <Zap className="w-3.5 h-3.5 shrink-0" />
                                    {log.latency}ms
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <StatusBadge
                                    status={
                                      log.status === "success"
                                        ? "success"
                                        : "error"
                                    }
                                    label={log.status}
                                    size="sm"
                                  />
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      Click any row to view details
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-20 bg-[#0A0A0A] border border-white/10 rounded-xl"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="inline-block mb-6"
                    >
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <Hash className="w-12 h-12 text-gray-600" />
                      </div>
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      No logs found
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Logs will appear here once API requests are made"}
                    </p>
                    {(searchQuery || statusFilter !== "all") && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setPage(1);
                        }}
                        className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
                      >
                        Clear filters
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Model Breakdown sidebar */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 h-fit">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Top Models
                </span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 w-24 bg-white/5 rounded animate-pulse ml-auto" />
                      <div className="flex-1 h-5 bg-white/5 rounded-full" />
                      <div className="h-3 w-6 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <ModelBreakdown logs={allLogs} />
              )}
            </div>
          </motion.div>

          {/* Pagination */}
          {!isLoading && logsData && totalPages > 1 && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between bg-[#0A0A0A] border border-white/10 rounded-xl px-6 py-4"
            >
              <div className="text-sm text-gray-400 font-mono">
                Page{" "}
                <span className="text-white font-semibold">
                  {logsData.page}
                </span>{" "}
                of{" "}
                <span className="text-white font-semibold">{totalPages}</span>
                <span className="text-gray-600 ml-2">
                  · {displayLogs.length} results
                </span>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>

                <div className="flex gap-1.5 items-center">
                  {generatePageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`e-${i}`}
                        className="text-gray-600 text-sm px-1"
                      >
                        ···
                      </span>
                    ) : (
                      <motion.button
                        key={p}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-mono font-medium transition-all ${
                          p === page
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
                        }`}
                      >
                        {p}
                      </motion.button>
                    ),
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, x: 2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <LogDetailDrawer log={selectedLog} onClose={handleCloseDrawer} />
    </div>
  );
}
