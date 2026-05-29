"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import {
  Search,
  Eye,
  UserX,
  UserCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AdminUserDetail, PaginatedResponse } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminPageShell,
  AdminCenterLoading,
  AdminEmptyState,
  AdminTableLoading,
  fadeUp,
} from "@/components/admin/AdminUI";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15",
  suspended: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  disabled: "text-red-400 bg-red-500/8 border border-red-500/15",
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 25 }}
        className="w-full max-w-[420px] rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-elevated)] p-7 shadow-2xl shadow-black/50"
      >
        <div className="w-11 h-11 rounded-[13px] bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center mb-5">
          <Trash2 className="w-5 h-5 text-red-400/70" />
        </div>
        <h3 className="text-[16px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">
          Delete User
        </h3>
        <p className="mt-2.5 text-[13px] text-[var(--admin-text-muted)] leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="font-medium text-[var(--admin-text)]">
            {userName}
          </span>
          ? This action is permanent and cannot be undone.
        </p>
        <div className="mt-7 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="admin-btn admin-btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="admin-btn admin-btn-danger"
          >
            {isPending ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserDetail | null>(
    null,
  );

  const debouncedQuery = useDebounce(searchInput, 400);

  const { data, isLoading, error } = useQuery<
    PaginatedResponse<AdminUserDetail>
  >({
    queryKey: [
      "admin",
      "users",
      { query: debouncedQuery, status: statusFilter, page },
    ],
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
    <AdminPageHeader
      title="Users"
      subtitle={
        total > 0
          ? `${total} user${total !== 1 ? "s" : ""} registered`
          : "Manage platform users"
      }
      badge={total > 0 ? `${total}` : undefined}
    >
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--admin-text-dim)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="admin-input w-full pl-10 pr-4 py-[9px] rounded-[12px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-input rounded-[12px] py-[9px] px-4 w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <AdminTableLoading rows={8} cols={6} />
      ) : error ? (
        <AdminEmptyState
          icon={Users}
          title="Failed to load users"
          description={error instanceof Error ? error.message : "An error occurred"}
        />
      ) : users.length === 0 ? (
        <AdminEmptyState
          icon={UserPlus}
          title="No users found"
          description={
            debouncedQuery || statusFilter
              ? "Try adjusting your search or filters"
              : "No users have registered yet"
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-table"
        >
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Name",
                  "Email",
                  "Role",
                  "Status",
                  "Last Login",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(h === "Actions" ? "text-right" : "text-left")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="font-medium text-[var(--admin-text)]">
                      {user.name || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[12px] text-[var(--admin-text-muted)]">
                      {user.email}
                    </span>
                  </td>
                  <td>
                    <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04]">
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "admin-badge",
                        STATUS_STYLES[user.status] ||
                          "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[12px] text-[var(--admin-text-muted)]">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Never"}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-[8px] p-[7px] text-[var(--admin-text-dim)] hover:bg-white/[0.03] hover:text-indigo-400/70 transition-all duration-200"
                        aria-label="View user"
                      >
                        <Eye className="h-[15px] w-[15px]" />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={suspendMutation.isPending}
                        className="rounded-[8px] p-[7px] text-[var(--admin-text-dim)] hover:bg-white/[0.03] hover:text-amber-400/70 transition-all duration-200 disabled:opacity-30"
                        title={
                          user.status === "active" ? "Suspend" : "Activate"
                        }
                        aria-label={
                          user.status === "active"
                            ? "Suspend user"
                            : "Activate user"
                        }
                      >
                        {user.status === "active" ? (
                          <UserX className="h-[15px] w-[15px]" />
                        ) : (
                          <UserCheck className="h-[15px] w-[15px]" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="rounded-[8px] p-[7px] text-[var(--admin-text-dim)] hover:bg-white/[0.03] hover:text-red-400/70 transition-all duration-200"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-5 py-3.5">
              <p className="text-[11px] font-mono text-[var(--admin-text-dim)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="admin-btn admin-btn-ghost py-[5px] px-2.5 text-[11px] disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={cn(
                        "w-8 h-8 rounded-[8px] text-[11px] font-mono transition-all duration-200",
                        pg === page
                          ? "bg-indigo-500/[0.08] text-indigo-400 border border-indigo-500/15"
                          : "text-[var(--admin-text-dim)] hover:bg-white/[0.02] hover:text-[var(--admin-text-muted)]",
                      )}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="admin-btn admin-btn-ghost py-[5px] px-2.5 text-[11px] disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog
            userName={confirmDelete.name || confirmDelete.email}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </AdminPageHeader>
  );
}
