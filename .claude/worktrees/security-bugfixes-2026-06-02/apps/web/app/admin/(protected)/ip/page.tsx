"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { CheckCircle, XCircle } from "lucide-react";
import type { IPListEntry, IPAccessLog } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import { cn } from "@/lib/utils";
import {
  AdminTabNav,
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

const TABS = ["IP Lists", "Access Logs"] as const;

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    allow: "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15",
    block: "text-red-400 bg-red-500/8 border border-red-500/15",
    challenge: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  };
  return (
    <span
      className={`admin-badge ${styles[action] ?? "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}
    >
      {action}
    </span>
  );
}

export default function AdminIPPage() {
  const [activeTab, setActiveTab] = useState<string>("IP Lists");

  const { data: ipEntries, isLoading: entriesLoading } = useQuery<
    IPListEntry[]
  >({
    queryKey: ["admin", "ip", "entries"],
    queryFn: () => getAdminSDK().listIPEntries(),
    enabled: activeTab === "IP Lists",
  });

  const { data: accessLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin", "ip", "access-logs", { limit: 20 }],
    queryFn: () => getAdminSDK().listIPAccessLogs({ limit: 20 }),
    enabled: activeTab === "Access Logs",
  });

  const isLoading = activeTab === "IP Lists" ? entriesLoading : logsLoading;

  return (
    <AdminPageHeader
      title="IP Management"
      subtitle="IP allow/block lists and access logs"
    >
      {/* Tabs */}
      <AdminTabNav
        tabs={[
          { key: "IP Lists", label: "IP Lists" },
          { key: "Access Logs", label: "Access Logs" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {isLoading ? (
        <AdminCenterLoading label="Loading IP data" />
      ) : activeTab === "IP Lists" ? (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>IP/CIDR</th>
                <th>Action</th>
                <th>Reason</th>
                <th className="text-right">Expires</th>
              </tr>
            </thead>
            <tbody>
              {!ipEntries || ipEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-[12px] text-[var(--admin-text-dim)]"
                  >
                    No IP entries configured
                  </td>
                </tr>
              ) : (
                ipEntries.map((entry: IPListEntry) => (
                  <tr key={entry.id}>
                    <td className="font-mono text-[var(--admin-text)]">
                      {entry.ipOrCidr}
                    </td>
                    <td>
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="text-[var(--admin-text-muted)]">
                      {entry.reason ?? "—"}
                    </td>
                    <td className="text-right text-[var(--admin-text-dim)]">
                      {entry.expiresAt
                        ? new Date(entry.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>IP</th>
                <th>Method</th>
                <th>Path</th>
                <th>Country</th>
                <th>Blocked</th>
                <th className="text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {!accessLogs?.data || accessLogs.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-[12px] text-[var(--admin-text-dim)]"
                  >
                    No access logs recorded
                  </td>
                </tr>
              ) : (
                (accessLogs.data as IPAccessLog[]).map((log: IPAccessLog) => (
                  <tr key={log.id}>
                    <td className="font-mono text-[var(--admin-text)]">
                      {log.ipAddress}
                    </td>
                    <td className="text-[var(--admin-text)]">{log.method}</td>
                    <td className="max-w-[200px] truncate text-[var(--admin-text-muted)]">
                      {log.path}
                    </td>
                    <td className="text-[var(--admin-text-muted)]">
                      {log.country ?? "—"}
                    </td>
                    <td>
                      {log.blocked ? (
                        <span className="admin-badge text-red-400 bg-red-500/8 border border-red-500/15">
                          <XCircle className="h-3 w-3" /> Blocked
                        </span>
                      ) : (
                        <span className="admin-badge text-emerald-400 bg-emerald-500/8 border border-emerald-500/15">
                          <CheckCircle className="h-3 w-3" /> Allowed
                        </span>
                      )}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageHeader>
  );
}
