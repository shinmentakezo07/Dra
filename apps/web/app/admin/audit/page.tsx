"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";
import type { AuditLog } from "@/types/admin";
import type { PaginatedResult } from "@/lib/api/admin-sdk";

import AdminPageHeader from "../AdminPageHeader";
const severityConfig: Record<string, { bg: string; text: string }> = {
  info: { bg: "bg-blue-500/15", text: "text-blue-400" },
  warning: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  error: { bg: "bg-red-500/15", text: "text-red-400" },
  critical: { bg: "bg-red-800/20", text: "text-red-300" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity.toLowerCase()] ?? {
    bg: "bg-white/5", text: "text-white/50",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${config.bg} ${config.text}`}>
      {severity.toLowerCase()}
    </span>
  );
}

export default function AdminAuditPage() {
  const {
    data,
    isLoading,
    error,
  } = useQuery<PaginatedResult<AuditLog>>({
    queryKey: ["admin", "audit"],
    queryFn: () => getAdminSDK().listAuditLogs(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">
          {error instanceof Error ? error.message : "Failed to load audit logs"}
        </p>
      </div>
    );
  }

  const logs = data?.data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <p className="mt-1 text-sm text-white/50">Complete audit log of all admin actions</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px] rounded-xl border border-white/5 bg-white/5">
          <p className="text-white/50">No audit log entries found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Target Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white/80 font-medium">{log.action}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-white/80 text-xs">{log.actorEmail}</span>
                      <span className="text-white/40 font-mono text-[10px]">{log.actorId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70 text-xs capitalize">{log.targetType}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
