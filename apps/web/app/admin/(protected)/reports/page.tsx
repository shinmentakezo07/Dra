"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Info, CheckCircle, XCircle } from "lucide-react";
import type { ScheduledReport } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

export default function AdminReportsPage() {
  const {
    data: reports,
    isLoading,
    error,
  } = useQuery<ScheduledReport[]>({
    queryKey: ["admin", "reports"],
    queryFn: () => getAdminSDK().listReports(),
  });

  if (isLoading) {
    return <AdminCenterLoading label="Loading reports" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Info}
        title="Failed to load reports"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <AdminPageHeader
      title="Scheduled Reports"
      subtitle="Automated report scheduling and delivery"
    >
      {!reports || reports.length === 0 ? (
        <AdminEmptyState
          icon={Info}
          title="No scheduled reports"
          description="Create your first scheduled report to automate data delivery"
        />
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Frequency</th>
                <th>Format</th>
                <th>Recipients</th>
                <th>Next Send</th>
                <th>Last Sent</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report: ScheduledReport) => (
                <tr key={report.id}>
                  <td className="font-medium text-[var(--admin-text)]">
                    {report.name}
                  </td>
                  <td>
                    <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-muted)] border border-white/[0.04] capitalize">
                      {report.frequency}
                    </span>
                  </td>
                  <td className="text-[var(--admin-text-muted)] uppercase text-[12px]">
                    {report.format}
                  </td>
                  <td className="max-w-[200px] truncate text-[var(--admin-text-muted)]">
                    {report.recipients.join(", ")}
                  </td>
                  <td className="text-[var(--admin-text-dim)]">
                    {report.nextSendAt
                      ? new Date(report.nextSendAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="text-[var(--admin-text-dim)]">
                    {report.lastSentAt
                      ? new Date(report.lastSentAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="text-right">
                    <span
                      className={`admin-badge ${report.isActive ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15" : "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}
                    >
                      {report.isActive ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {report.isActive ? "Active" : "Inactive"}
                    </span>
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
