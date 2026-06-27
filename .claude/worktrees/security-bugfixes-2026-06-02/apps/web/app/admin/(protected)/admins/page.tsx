"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

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
    return <AdminCenterLoading label="Loading admins" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Users}
        title="Failed to load admins"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <AdminPageHeader
      title="Admin Users"
      subtitle="Manage administrator accounts"
    >
      {!admins || admins.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="No admin users"
          description="No administrator accounts have been created yet"
        />
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
