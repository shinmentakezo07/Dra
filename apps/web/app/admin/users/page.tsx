"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import {
  Search, Eye, UserX, UserCheck, Trash2,
  ChevronLeft, ChevronRight, Loader2, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AdminUserDetail } from "@/types/admin";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="w-full max-w-md rounded-[24px] border border-white/[0.05] bg-[#000000] p-6 shadow-2xl shadow-black/50"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20 mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Delete User</h3>
        <p className="mt-2 text-sm text-white/40 leading-relaxed">
          Are you sure you want to delete <span className="font-medium text-white/70">{userName}</span>? This action permanently removes the account and cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-[14px] text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 rounded-[14px] text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Users</h1>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-blue-400/50 bg-blue-500/10 rounded-full border border-blue-500/30 px-3 py-1">
            {total > 0 ? `${total} total` : "Management"}
          </span>
        </div>
        <p className="text-sm text-white/30 font-mono tracking-wide">
          {total > 0 ? `${total} user${total !== 1 ? "s" : ""} registered` : "Manage platform users"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-[16px] pl-11 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-[14px] px-4 py-2.5 text-sm text-white/70 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </motion.div>

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[24px] border border-white/[0.05] bg-black/40 backdrop-blur-xl"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Name", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} className={cn(
                    "px-5 py-4 text-[10px] font-mono font-bold tracking-[0.15em] uppercase",
                    h === "Actions" ? "text-right text-white/30" : "text-left text-white/30",
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.03 } }}
                  className={cn(
                    "text-sm transition-colors duration-200",
                    "hover:bg-white/[0.015]",
                  )}
                >
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="text-white/80 font-medium">{user.name || "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-white/40 font-mono text-xs">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-white/30 bg-white/5 rounded-full px-2.5 py-1">
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span
                      className={cn(
                        "text-[9px] font-mono font-bold tracking-wider uppercase rounded-full px-2.5 py-1",
                        STATUS_STYLES[user.status] || "text-gray-400 bg-gray-500/10",
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-white/30 text-xs font-mono">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-[10px] p-2 text-white/20 hover:bg-white/[0.03] hover:text-blue-400/70 transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={suspendMutation.isPending}
                        className="rounded-[10px] p-2 text-white/20 hover:bg-white/[0.03] hover:text-yellow-400/70 transition-all duration-200 disabled:opacity-30"
                        title={user.status === "active" ? "Suspend" : "Activate"}
                      >
                        {user.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="rounded-[10px] p-2 text-white/20 hover:bg-white/[0.03] hover:text-red-400/70 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3.5">
              <p className="text-xs font-mono text-white/20">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 rounded-[12px] border border-white/[0.05] bg-black/40 px-3.5 py-1.5 text-xs font-mono text-white/40 hover:bg-white/[0.03] hover:text-white/70 transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={cn(
                        "w-8 h-8 rounded-[10px] text-xs font-mono transition-all duration-200",
                        pg === page
                          ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                          : "text-white/20 hover:bg-white/[0.03] hover:text-white/50",
                      )}
                    >
                      {pg}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1.5 rounded-[12px] border border-white/[0.05] bg-black/40 px-3.5 py-1.5 text-xs font-mono text-white/40 hover:bg-white/[0.03] hover:text-white/70 transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
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
    </motion.div>
  )
}
