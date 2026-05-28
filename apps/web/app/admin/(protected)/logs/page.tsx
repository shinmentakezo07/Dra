"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { CheckCircle, XCircle, Info } from "lucide-react";
import type { UsageRecord } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";

function StatusBadge({ statusCode }: { statusCode: number }) {
  const isSuccess = statusCode < 400;
  return (
    <span
      className={`admin-badge ${isSuccess ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15" : "text-red-400 bg-red-500/8 border border-red-500/15"}`}
    >
      {isSuccess ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {statusCode}
    </span>
  );
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "logs", { page }],
    queryFn: () => getAdminSDK().listTransactions({ limit: 20, page }),
  });

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-[13px] text-red-400/70">
          {error instanceof Error ? error.message : "Failed to load logs"}
        </p>
      </div>
    );
  }

  return (
    <AdminPageHeader
      title="Request Logs"
      subtitle="API request history and error monitoring"
    >
      {logs.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-9 w-9 text-[var(--admin-text-dim)]" />
            <p className="mt-3 text-[14px] font-medium text-[var(--admin-text-muted)]">
              No request logs found
            </p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-dim)]">
              API requests will appear here once users start using the platform
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Model</th>
                <th>Provider</th>
                <th>Status</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: UsageRecord) => (
                <tr key={log.id}>
                  <td className="text-[var(--admin-text-muted)]">
                    {new Date(log.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="font-medium text-[var(--admin-text)]">
                    {log.userId.slice(0, 8)}...
                  </td>
                  <td className="text-[var(--admin-text)]">{log.model}</td>
                  <td className="text-[var(--admin-text-muted)]">
                    {log.providerId ?? "—"}
                  </td>
                  <td>
                    <StatusBadge statusCode={log.statusCode} />
                  </td>
                  <td className="text-right text-[var(--admin-text)]">
                    ${(log.cost / 100).toFixed(4)}
                  </td>
                  <td className="text-right text-[var(--admin-text-muted)]">
                    {log.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-5 py-3.5">
              <p className="text-[11px] font-mono text-[var(--admin-text-dim)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-3 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-3 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminPageHeader>
  );
}
