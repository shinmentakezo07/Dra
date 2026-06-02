"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { AuditLog } from "@/types/admin";
import type { PaginatedResult } from "@/lib/api/admin-sdk";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
  AdminTableLoading,
} from "@/components/admin/AdminUI";

const severityConfig: Record<string, { bg: string; text: string }> = {
  info: { bg: "bg-indigo-500/8", text: "text-indigo-400" },
  warning: { bg: "bg-amber-500/8", text: "text-amber-400" },
  error: { bg: "bg-red-500/8", text: "text-red-400" },
  critical: { bg: "bg-red-800/15", text: "text-red-300" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity.toLowerCase()] ?? {
    bg: "bg-white/[0.03]",
    text: "text-[var(--admin-text-dim)]",
  };
  return (
    <span
      className={`admin-badge ${config.bg} ${config.text} border border-current/10 capitalize`}
    >
      {severity.toLowerCase()}
    </span>
  );
}

export default function AdminAuditPage() {
  const { data, isLoading, error } = useQuery<PaginatedResult<AuditLog>>({
    queryKey: ["admin", "audit"],
    queryFn: () => getAdminSDK().listAuditLogs(),
  });

  if (isLoading) {
    return <AdminCenterLoading label="Loading audit logs" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={FileText}
        title="Failed to load audit logs"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  const logs = data?.data ?? [];

  return (
    <AdminPageHeader
      title="Audit Trail"
      subtitle="Complete audit log of all admin actions"
    >
      {logs.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title="No audit entries"
          description="Admin actions will be logged here as they occur"
        />
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target Type</th>
                <th>Severity</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-medium text-[var(--admin-text)]">
                    {log.action}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-[var(--admin-text)] text-[12px]">
                        {log.actorEmail}
                      </span>
                      <span className="text-[var(--admin-text-dim)] font-mono text-[10px]">
                        {log.actorId}
                      </span>
                    </div>
                  </td>
                  <td className="text-[var(--admin-text-muted)] text-[12px] capitalize">
                    {log.targetType}
                  </td>
                  <td>
                    <SeverityBadge severity={log.severity} />
                  </td>
                  <td className="text-[var(--admin-text-muted)] text-[12px] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
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
    </AdminPageHeader>
  );
}
