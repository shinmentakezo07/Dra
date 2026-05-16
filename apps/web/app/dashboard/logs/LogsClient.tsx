"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Search, Clock, Zap, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, FileText, TrendingUp, CheckCircle2, XCircle,
  Filter, RefreshCw, Eye, BarChart3,
} from "lucide-react";
import { DataTable } from "@/components/dashboard/DataTable";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LogDetailDrawer } from "@/components/dashboard/LogDetailDrawer";
import { ModelBreakdown } from "@/components/dashboard/ModelBreakdown";
import { SkeletonCard } from "@/components/ui/loading-spinner";
import { useLogs } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { getSDK } from "@/lib/api/sdk";
import type { APILog } from "@/lib/api/sdk";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function TableSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto hero-scroll">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {["Timestamp", "Model", "Tokens", "Cost", "Latency", "Status"].map((h) => (
                <th key={h} className="px-6 py-4 text-left">
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <div
                      className="h-4 bg-white/5 rounded animate-pulse"
                      style={{ width: `${40 + Math.random() * 40}%`, animationDelay: `${i * 0.05 + j * 0.03}s` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LogsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);
  const limit = 20;

  const { data: logsData, isLoading, error, refetch } = useLogs(page, limit);
  const sdk = getSDK();

  const allLogs = logsData?.data ?? [];

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
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allLogs, searchQuery, statusFilter]);

  const totalPages = logsData?.totalPages ?? 1;

  const successCount = allLogs.filter((l) => l.status === "success").length;
  const errorCount = allLogs.filter((l) => l.status === "error").length;
  const avgLatency = allLogs.length > 0
    ? Math.round(allLogs.reduce((sum, log) => sum + log.latency, 0) / allLogs.length)
    : 0;
  const totalTokens = allLogs.reduce((sum, log) => sum + log.inputTokens + log.outputTokens, 0);

  const handleRowClick = useCallback((row: APILog) => {
    setSelectedLog(row);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedLog(null);
  }, []);

  const columns = [
    {
      header: "Timestamp",
      accessor: "createdAt" as const,
      width: "140px",
      render: (value: unknown) => (
        <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          {new Date(value as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      ),
    },
    {
      header: "Model",
      accessor: "model" as const,
      render: (value: unknown, row: APILog) => (
        <div>
          <div className="text-sm font-semibold text-white">{value as string}</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">{row.provider}</div>
        </div>
      ),
    },
    {
      header: "Tokens",
      accessor: "inputTokens" as const,
      render: (value: unknown, row: APILog) => (
        <div className="text-sm font-mono">
          <span className="text-green-400">{(value as number).toLocaleString()}</span>
          <span className="text-gray-600 mx-1">/</span>
          <span className="text-cyan-400">{row.outputTokens.toLocaleString()}</span>
        </div>
      ),
    },
    {
      header: "Cost",
      accessor: "cost" as const,
      render: (value: unknown) => (
        <div className="text-sm font-mono text-emerald-400">${((value as number) / 100000).toFixed(4)}</div>
      ),
    },
    {
      header: "Latency",
      accessor: "latency" as const,
      render: (value: unknown) => {
        const ms = value as number;
        const latencyColor = ms < 500 ? "text-green-400" : ms < 1500 ? "text-yellow-400" : "text-red-400";
        return (
          <div className={`flex items-center gap-1.5 text-sm font-mono ${latencyColor}`}>
            <Zap className="w-3.5 h-3.5 shrink-0" />
            {ms}ms
          </div>
        );
      },
    },
    {
      header: "Status",
      accessor: "status" as const,
      render: (value: unknown) => (
        <StatusBadge status={(value as string) === "success" ? "success" : "error"} label={value as string} size="sm" />
      ),
    },
  ];

  const displayLogs = searchQuery || statusFilter !== "all" ? filteredLogs : allLogs;

  const filters = [
    { key: "all" as const, label: "All", icon: FileText },
    { key: "success" as const, label: "Success", icon: CheckCircle2 },
    { key: "error" as const, label: "Errors", icon: XCircle },
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute inset-0 mesh-gradient animate-mesh-shift opacity-60" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="relative z-10 pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gradient">Request Logs</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Monitor all API requests and responses in real-time</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => refetch()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </motion.button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-start gap-3"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-400 mb-1">Error loading logs</h3>
                    <p className="text-xs text-red-300/80">{getErrorMessage(error)}</p>
                    {sdk.lastRequestId() && (
                      <p className="text-xs text-red-400/60 mt-1 font-mono">Request ID: {sdk.lastRequestId()}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  <MetricCard
                    title="Total Requests"
                    value={logsData?.total ?? 0}
                    icon={FileText}
                    iconColor="text-blue-400"
                    iconBg="bg-blue-500/10"
                  />
                  <MetricCard
                    title="Successful"
                    value={successCount}
                    change={allLogs.length > 0 ? `${((successCount / allLogs.length) * 100).toFixed(0)}%` : undefined}
                    changeType="positive"
                    icon={CheckCircle2}
                    iconColor="text-green-400"
                    iconBg="bg-green-500/10"
                  />
                  <MetricCard
                    title="Errors"
                    value={errorCount}
                    change={allLogs.length > 0 ? `${((errorCount / allLogs.length) * 100).toFixed(0)}%` : undefined}
                    changeType={errorCount > 0 ? "negative" : "neutral"}
                    icon={XCircle}
                    iconColor="text-red-400"
                    iconBg="bg-red-500/10"
                  />
                  <MetricCard
                    title="Avg Latency"
                    value={`${avgLatency}ms`}
                    icon={TrendingUp}
                    iconColor="text-yellow-400"
                    iconBg="bg-yellow-500/10"
                  />
                </>
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="lg:col-span-2">
                <div className="glass-card rounded-xl p-4 animate-border-glow">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search by model, provider, ID, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500 mr-1" />
                      {filters.map(({ key, label, icon: Icon }) => {
                        const isActive = statusFilter === key;
                        const activeStyles: Record<string, string> = {
                          all: "bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.08)]",
                          success: "bg-green-500/15 text-green-400 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]",
                          error: "bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
                        };
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
                                ? activeStyles[key]
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
              </div>

              <div className="glass-card rounded-xl p-4 animate-border-glow">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Top Models</span>
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

            <motion.div variants={itemVariants}>
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableSkeleton />
                  </motion.div>
                )}

                {!isLoading && displayLogs.length > 0 && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <DataTable columns={columns} data={displayLogs} onRowClick={handleRowClick} />
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      Click any row to view details
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {!isLoading && logsData && totalPages > 1 && (
              <motion.div
                variants={fadeInUp}
                className="mt-6 flex items-center justify-between glass-card rounded-xl px-5 py-3 animate-border-glow"
              >
                <div className="text-sm text-gray-400 font-mono">
                  Page <span className="text-white font-semibold">{logsData.page}</span> of{" "}
                  <span className="text-white font-semibold">{totalPages}</span>
                  <span className="text-gray-600 ml-2">· {displayLogs.length} results</span>
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
                        <span key={`e-${i}`} className="text-gray-600 text-sm px-1">
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
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                              : "text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
                          }`}
                        >
                          {p}
                        </motion.button>
                      )
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

            <AnimatePresence>
              {!isLoading && displayLogs.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-20"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block mb-6"
                  >
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                      <FileText className="w-12 h-12 text-gray-600" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">No logs found</h3>
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
                      }}
                      className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
                    >
                      Clear filters
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <LogDetailDrawer log={selectedLog} onClose={handleCloseDrawer} />
    </div>
  );
}
