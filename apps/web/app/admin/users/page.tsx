"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import {
  Search,
  Eye,
  UserX,
  UserCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserDetail, PaginatedResponse } from "@/types/admin";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 bg-green-500/10",
  suspended: "text-yellow-400 bg-yellow-500/10",
  disabled: "text-red-400 bg-red-500/10",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function DeleteConfirmDialog({
  userName,
  onConfirm,
  onCancel,
  isPending,
}: {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0A0A0A] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Delete User</h3>
        <p className="mt-2 text-sm text-white/60">
          Are you sure you want to delete{" "}
          <span className="font-medium text-white">{userName}</span>? This
          action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserDetail | null>(null);

  const debouncedQuery = useDebounce(searchInput, 400);

  const {
    data,
    isLoading,
    error,
  } = useQuery<PaginatedResponse<AdminUserDetail>>({
    queryKey: ["admin", "users", { query: debouncedQuery, status: statusFilter, page }],
    queryFn: () =>
      getAdminSDK().listUsers({
        query: debouncedQuery || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  const suspendMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      getAdminSDK().updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getAdminSDK().deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmDelete(null);
    },
  });

  const handleToggleStatus = useCallback(
    (user: AdminUserDetail) => {
      const newStatus = user.status === "active" ? "suspended" : "active";
      suspendMutation.mutate({ id: user.id, status: newStatus });
    },
    [suspendMutation],
  );

  const handleDelete = useCallback(() => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete.id);
  }, [confirmDelete, deleteMutation]);

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="mt-1 text-sm text-white/50">
          {total > 0
            ? `${total} user${total !== 1 ? "s" : ""} registered`
            : "Manage platform users"}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-red-400">
            {error instanceof Error ? error.message : "Failed to load users"}
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No users found</p>
            <p className="mt-1 text-sm text-white/30">
              {debouncedQuery || statusFilter
                ? "Try adjusting your search or filters"
                : "No users have registered yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Last Login
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user, index) => (
                <tr
                  key={user.id}
                  className={cn(
                    "text-sm transition-colors",
                    index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]",
                    "hover:bg-white/[0.04]",
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-white">
                    {user.name || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50">
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[user.status] ||
                          "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/40">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/users/${user.id}`}
                        className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white/70"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={suspendMutation.isPending}
                        className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-yellow-400 disabled:opacity-30"
                        title={
                          user.status === "active"
                            ? "Suspend user"
                            : "Activate user"
                        }
                      >
                        {user.status === "active" ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-red-400"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="text-sm text-white/40">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <DeleteConfirmDialog
          userName={confirmDelete.name || confirmDelete.email}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
