"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

const circuitStateStyle: Record<string, string> = {
  closed: "bg-emerald-500/10 text-emerald-400",
  open: "bg-red-500/10 text-red-400",
  halfopen: "bg-amber-500/10 text-amber-400",
};

export default function ProviderHealthPage() {
  const queryClient = useQueryClient();

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["provider-health"],
    queryFn: () => getSDK().adminProviderHealth(),
    refetchInterval: 30000,
  });

  const { data: circuitBreakers, isLoading: cbLoading } = useQuery({
    queryKey: ["circuit-breakers"],
    queryFn: () => getSDK().adminCircuitBreakers(),
    refetchInterval: 30000,
  });

  const { data: publicHealth, isLoading: publicLoading } = useQuery({
    queryKey: ["public-provider-health"],
    queryFn: () => getSDK().providerHealth(),
    refetchInterval: 60000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["provider-health"] }),
        queryClient.invalidateQueries({ queryKey: ["circuit-breakers"] }),
        queryClient.invalidateQueries({ queryKey: ["public-provider-health"] }),
      ]);
    },
  });

  const avgLatency = health?.length
    ? health.reduce((sum, p) => sum + p.latency, 0) / health.length
    : 0;

  const healthyCount = health?.filter((p) => p.healthy).length ?? 0;
  const unhealthyCount = (health?.length ?? 0) - healthyCount;

  const openCircuits =
    circuitBreakers?.filter((cb) => cb.state !== "closed").length ?? 0;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-white">Provider Health</h1>
            <p className="text-sm text-gray-400">
              Real-time provider status, latency, and circuit breaker state
            </p>
          </div>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refresh.isPending ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Zap className="w-5 h-5 text-blue-400" />}
          label="Total Providers"
          value={health?.length ?? 0}
          loading={healthLoading}
        />
        <SummaryCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
          label="Healthy"
          value={healthyCount}
          loading={healthLoading}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Unhealthy"
          value={unhealthyCount}
          loading={healthLoading}
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          label="Avg Latency"
          value={formatLatency(avgLatency)}
          loading={healthLoading}
        />
      </div>

      {openCircuits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5"
        >
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">
              {openCircuits} circuit breaker{openCircuits > 1 ? "s" : ""} open
            </p>
            <p className="text-xs text-red-400/70">
              Affected providers are temporarily excluded from routing
            </p>
          </div>
        </motion.div>
      )}

      <div className="rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">
            Provider Health Status
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500">
                <th className="text-left font-medium py-2.5 px-4">Provider</th>
                <th className="text-left font-medium py-2.5 px-4">Status</th>
                <th className="text-left font-medium py-2.5 px-4">Latency</th>
                <th className="text-left font-medium py-2.5 px-4">
                  Last Check
                </th>
                <th className="text-left font-medium py-2.5 px-4">Circuit</th>
                <th className="text-left font-medium py-2.5 px-4">Failures</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {(healthLoading || publicLoading) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading provider health...
                    </td>
                  </tr>
                )}
                {!healthLoading &&
                  health?.map((p) => {
                    const cb = circuitBreakers?.find(
                      (c) => c.provider === p.provider,
                    );
                    return (
                      <tr
                        key={p.provider}
                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-4 font-medium text-white">
                          {p.provider}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.healthy
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {p.healthy ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {p.healthy ? "Healthy" : "Unhealthy"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`font-mono text-xs ${
                              p.latency > 2000
                                ? "text-red-400"
                                : p.latency > 1000
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {formatLatency(p.latency)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-400 text-xs">
                          {timeAgo(p.lastCheck)}
                        </td>
                        <td className="py-2.5 px-4">
                          {cb ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                circuitStateStyle[cb.state] ||
                                "bg-gray-500/10 text-gray-400"
                              }`}
                            >
                              {cb.state}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {cb && cb.failureCount > 0 ? (
                            <span className="flex items-center gap-1 text-amber-400 text-xs">
                              <TrendingDown className="w-3 h-3" />
                              {cb.failureCount}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </AnimatePresence>
              {!healthLoading && (!health || health.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-500 text-sm"
                  >
                    No provider health data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {publicHealth && publicHealth.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">
              Public Provider Summary
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {publicHealth.map((p) => (
              <div
                key={p.provider}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    p.status === "healthy" ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {p.provider}
                  </p>
                  <p className="text-xs text-gray-500">{p.models} models</p>
                </div>
                <span
                  className={`text-xs font-medium capitalize ${
                    p.status === "healthy" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="p-2 rounded-lg bg-white/5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-white">
          {loading ? "..." : value}
        </p>
      </div>
    </div>
  );
}
