"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { RefreshCw, CheckCircle, XCircle, Info } from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
  AdminSection,
} from "@/components/admin/AdminUI";

interface CacheStats {
  entries: number;
  size: string;
  hitRate: number;
}

interface WebhookLogEntry {
  id: string;
  event: string;
  status: number;
  duration: number;
  createdAt: string;
}

export default function AdminOperationsPage() {
  const { data: cacheStats, isLoading: cacheLoading } = useQuery({
    queryKey: ["admin", "operations", "cache-stats"],
    queryFn: () => getAdminSDK().cacheStats() as Promise<CacheStats>,
  });

  const { data: webhookLogs, isLoading: webhookLoading } = useQuery({
    queryKey: ["admin", "operations", "webhook-logs"],
    queryFn: () =>
      getAdminSDK().listWebhookLogs() as Promise<
        { data: WebhookLogEntry[] } | WebhookLogEntry[]
      >,
  });

  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await getAdminSDK().clearCache();
    } finally {
      setClearing(false);
    }
  };

  const isLoading = cacheLoading || webhookLoading;

  if (isLoading) {
    return <AdminCenterLoading label="Loading operations" />;
  }

  const logs: WebhookLogEntry[] = Array.isArray(webhookLogs)
    ? webhookLogs
    : (webhookLogs?.data ?? []);

  return (
    <AdminPageHeader
      title="Operations"
      subtitle="Cache management, webhooks, and tracing"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Cache Stats */}
        <div className="admin-card p-6">
          <h2 className="text-[15px] font-semibold text-[var(--admin-text)] mb-5">
            Cache Stats
          </h2>
          {cacheStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="admin-label mb-1.5">Entries</p>
                <p className="admin-stat-value text-[28px]">
                  {cacheStats.entries.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="admin-label mb-1.5">Size</p>
                <p className="admin-stat-value text-[28px]">
                  {cacheStats.size}
                </p>
              </div>
              <div>
                <p className="admin-label mb-1.5">Hit Rate</p>
                <p className="admin-stat-value text-[28px] text-emerald-400">
                  {(cacheStats.hitRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--admin-text-dim)]">
              Cache stats unavailable
            </p>
          )}

          <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mt-6 mb-3">
            Cache Control
          </h3>
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="admin-btn admin-btn-danger text-[12px]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${clearing ? "animate-spin" : ""}`}
            />
            {clearing ? "Clearing..." : "Clear Cache"}
          </button>
        </div>

        {/* Webhook Deliveries */}
        <div className="admin-card p-6">
          <h2 className="text-[15px] font-semibold text-[var(--admin-text)] mb-5">
            Webhook Deliveries
          </h2>
          {!logs || logs.length === 0 ? (
            <AdminEmptyState
              icon={Info}
              title="No webhook deliveries"
              description="Webhook delivery logs will appear here"
            />
          ) : (
            <div className="admin-table !border-0 !bg-transparent !rounded-[12px]">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th className="text-right">Duration</th>
                    <th className="text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log: WebhookLogEntry) => (
                    <tr key={log.id}>
                      <td className="font-medium text-[var(--admin-text)]">
                        {log.event}
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${log.status < 400 ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15" : "text-red-400 bg-red-500/8 border border-red-500/15"}`}
                        >
                          {log.status < 400 ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="text-right text-[var(--admin-text-muted)]">
                        {log.duration}ms
                      </td>
                      <td className="text-right text-[var(--admin-text-dim)]">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminPageHeader>
  );
}
