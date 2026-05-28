"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import AdminPageHeader from "../../AdminPageHeader";

export default function AdminAdminsPage() {
  const {
    data: admins,
    isLoading,
    error,
  } = useQuery<{ userId: string; role: string }[]>({
    queryKey: ["admin", "admins"],
    queryFn: () => getAdminSDK().listAdminUsers(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[13px] text-red-400/70">
          {error instanceof Error
            ? error.message
            : "Failed to load admin users"}
        </p>
      </div>
    );
  }

  return (
    <AdminPageHeader
      title="Admin Users"
      subtitle="Manage administrator accounts"
    >
      {!admins || admins.length === 0 ? (
        <div className="admin-card flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <p className="text-[14px] font-medium text-[var(--admin-text-muted)]">
              No admin users found
            </p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-dim)]">
              No administrator accounts have been created yet
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.userId}>
                  <td className="font-mono text-[var(--admin-text)]">
                    {admin.userId}
                  </td>
                  <td>
                    <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04]">
                      {admin.role}
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
