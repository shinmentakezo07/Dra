"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { SuspiciousActivity } from "@/types/admin";
import type { PaginatedResult } from "@/lib/api/admin-sdk";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
  AdminTableLoading,
} from "@/components/admin/AdminUI";

const severityConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  high: { bg: "bg-red-500/8", text: "text-red-400", label: "High" },
  medium: { bg: "bg-amber-500/8", text: "text-amber-400", label: "Medium" },
  low: { bg: "bg-indigo-500/8", text: "text-indigo-400", label: "Low" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity.toLowerCase()] ?? {
    bg: "bg-white/[0.03]",
    text: "text-[var(--admin-text-dim)]",
    label: severity,
  };
  return (
    <span
      className={`admin-badge ${config.bg} ${config.text} border border-current/10`}
    >
      {config.label}
    </span>
  );
}

function statusLabel(item: SuspiciousActivity): {
  label: string;
  color: string;
} {
  if (item.resolved) return { label: "Resolved", color: "text-emerald-400" };
  if (item.reviewed) return { label: "Under Review", color: "text-amber-400" };
  return { label: "Pending", color: "text-[var(--admin-text-muted)]" };
}

export default function AdminSecurityPage() {
  const { data, isLoading, error } = useQuery<
    PaginatedResult<SuspiciousActivity>
  >({
    queryKey: ["admin", "security", "suspicious"],
    queryFn: () => getAdminSDK().listSuspicious(),
  });

  if (isLoading) {
    return <AdminCenterLoading label="Loading security data" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Shield}
        title="Failed to load security data"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  const activities = data?.data ?? [];

  return (
    <AdminPageHeader title="Security" subtitle="Suspicious activity monitoring">
      {activities.length === 0 ? (
        <AdminEmptyState
          icon={Shield}
          title="No suspicious activity"
          description="Security threats and anomalies will appear here when detected"
        />
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Severity</th>
                <th>User ID</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((item) => {
                const status = statusLabel(item);
                return (
                  <tr key={item.id}>
                    <td className="font-mono text-[11px] text-[var(--admin-text-muted)]">
                      {item.id}
                    </td>
                    <td className="text-[var(--admin-text)] capitalize">
                      {item.category.replace(/_/g, " ")}
                    </td>
                    <td>
                      <SeverityBadge severity={item.severity} />
                    </td>
                    <td>
                      {item.userId ? (
                        <span className="font-mono text-[11px] text-[var(--admin-text-muted)]">
                          {item.userId}
                        </span>
                      ) : (
                        <span className="text-[var(--admin-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="text-[var(--admin-text-muted)] text-[12px]">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span
                        className={`text-[12px] font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageHeader>
  );
}
