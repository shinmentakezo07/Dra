"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Info, CheckCircle, XCircle } from "lucide-react";
import type { ScheduledReport } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";

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
          {error instanceof Error ? error.message : "Failed to load reports"}
        </p>
      </div>
    );
  }

  return (
    <AdminPageHeader
      title="Scheduled Reports"
      subtitle="Automated report scheduling and delivery"
    >
      {!reports || reports.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-9 w-9 text-[var(--admin-text-dim)]" />
            <p className="mt-3 text-[14px] font-medium text-[var(--admin-text-muted)]">
              No scheduled reports
            </p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-dim)]">
              Create your first scheduled report to automate data delivery
            </p>
          </div>
        </div>
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
