"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">
          {error instanceof Error ? error.message : "Failed to load admin users"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Users</h1>
        <p className="mt-1 text-sm text-white/50">Manage administrator accounts</p>
      </div>

      {!admins || admins.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-white/5 bg-white/5">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No admin users found</p>
            <p className="mt-1 text-sm text-white/30">No administrator accounts have been created yet</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((admin, index) => (
                <tr
                  key={admin.userId}
                  className={`text-sm transition-colors ${
                    index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                  } hover:bg-white/[0.04]`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-white">
                    {admin.userId}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50">
                      {admin.role}
                    </span>
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
