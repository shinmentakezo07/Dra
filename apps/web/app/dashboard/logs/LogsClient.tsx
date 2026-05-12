"use client";

import { useState } from "react";
import { Activity, Search, Clock, Zap, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useLogs } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { getSDK } from "@/lib/api/sdk";
import type { APILog } from "@/lib/api/sdk";

export default function LogsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: logsData, isLoading, error } = useLogs(page, limit);
  const sdk = getSDK();

  const allLogs = logsData?.data ?? [];

  const filteredLogs = allLogs.filter((log) => {
    const matchesSearch =
      log.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = logsData?.totalPages ?? 1;

  const columns = [
    {
      header: "Timestamp",
      accessor: "createdAt" as const,
      width: "180px",
      render: (value: string) => (
        <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
          <Clock className="w-3 h-3" />
          {new Date(value).toLocaleTimeString()}
        </div>
      ),
    },
    {
      header: "Model",
      accessor: "model" as const,
      render: (value: string, row: APILog) => (
        <div>
          <div className="text-sm font-medium text-white">{value}</div>
          <div className="text-xs text-gray-500">{row.provider}</div>
        </div>
      ),
    },
    {
      header: "Tokens",
      accessor: "inputTokens" as const,
      render: (value: number, row: APILog) => (
        <div className="text-sm font-mono text-gray-300">
          <span className="text-green-400">{value}</span>
          {" / "}
          <span className="text-cyan-400">{row.outputTokens}</span>
        </div>
      ),
    },
    {
      header: "Cost",
      accessor: "cost" as const,
      render: (value: number) => (
        <div className="text-sm font-mono text-emerald-400">${(value / 100000).toFixed(4)}</div>
      ),
    },
    {
      header: "Latency",
      accessor: "latency" as const,
      render: (value: number) => (
        <div className="flex items-center gap-1 text-sm font-mono text-gray-300">
          <Zap className="w-3 h-3 text-yellow-500" />
          {value}ms
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status" as const,
      render: (value: string) => (
        <StatusBadge status={value === "success" ? "success" : "error"} label={value} size="sm" />
      ),
    },
  ];

  const displayLogs = searchQuery || statusFilter !== "all" ? filteredLogs : allLogs;
  const successCount = allLogs.filter((l) => l.status === "success").length;
  const errorCount = allLogs.filter((l) => l.status === "error").length;
  const totalCost = allLogs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white">Request Logs</h1>
          </div>
          <p className="text-gray-400">Monitor all API requests and responses in real-time</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-1">Error loading logs</h3>
              <p className="text-xs text-red-300/80">{getErrorMessage(error)}</p>
              {sdk.lastRequestId() && (
                <p className="text-xs text-red-400/60 mt-1 font-mono">Request ID: {sdk.lastRequestId()}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-white font-mono">{logsData?.total ?? 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Total Logs</div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400 font-mono">{successCount}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Successful</div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400 font-mono">{errorCount}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Errors</div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400 font-mono">${(totalCost / 100000).toFixed(4)}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Total Cost</div>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by model or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-[#0A0A0A] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("success")}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-[#0A0A0A] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setStatusFilter("error")}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "error"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-[#0A0A0A] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!isLoading && <DataTable columns={columns} data={displayLogs} />}

        {!isLoading && logsData && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {logsData.page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!isLoading && displayLogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No logs found matching your filters</div>
        )}
      </div>
    </div>
  );
}
