"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";
import type { SuspiciousActivity } from "@/types/admin";
import type { PaginatedResult } from "@/lib/api/admin-sdk";

import AdminPageHeader from "../AdminPageHeader";
const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-500/15", text: "text-red-400", label: "High" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Medium" },
  low: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Low" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity.toLowerCase()] ?? {
    bg: "bg-white/5", text: "text-white/50", label: severity,
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function statusLabel(item: SuspiciousActivity): { label: string; color: string } {
  if (item.resolved) return { label: "Resolved", color: "text-green-400" };
  if (item.reviewed) return { label: "Under Review", color: "text-yellow-400" };
  return { label: "Pending", color: "text-white/50" };
}

export default function AdminSecurityPage() {
  const {
    data,
    isLoading,
    error,
  } = useQuery<PaginatedResult<SuspiciousActivity>>({
    queryKey: ["admin", "security", "suspicious"],
    queryFn: () => getAdminSDK().listSuspicious(),
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
          {error instanceof Error ? error.message : "Failed to load suspicious activities"}
        </p>
      </div>
    );
  }

  const activities = data?.data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="mt-1 text-sm text-white/50">Suspicious activity monitoring</p>
      </div>

      {activities.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px] rounded-xl border border-white/5 bg-white/5">
          <p className="text-white/50">No suspicious activity detected</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">User ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activities.map((item) => {
                const status = statusLabel(item);
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/70 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 text-white/80 capitalize">{item.category.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={item.severity} /></td>
                    <td className="px-4 py-3">
                      {item.userId ? (
                        <span className="font-mono text-xs text-white/70">{item.userId}</span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
