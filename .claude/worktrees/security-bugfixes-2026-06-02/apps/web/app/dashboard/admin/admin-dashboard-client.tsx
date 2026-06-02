"use client";

import { useState } from "react";
import {
  Shield,
  Users,
  Activity,
  Server,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAdminStats,
  useAdminUsers,
  useAdminDeleteUser,
  useProviderHealth,
  useCircuitBreakers,
} from "@/lib/api/hooks";

export default function AdminDashboardClient() {
  const [userPage, setUserPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userLimit = 10;

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useAdminStats();
  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useProviderHealth();
  const {
    data: circuitBreakers,
    isLoading: cbLoading,
    refetch: refetchCB,
  } = useCircuitBreakers();
  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useAdminUsers(userPage, userLimit);
  const deleteUser = useAdminDeleteUser();

  const users = (usersData as any)?.data ?? [];
  const userTotal =
    (usersData as any)?.meta?.total ?? (usersData as any)?.total ?? 0;

  const handleDelete = async (userId: string) => {
    setError(null);
    try {
      await deleteUser.mutateAsync(userId);
      setDeleteConfirm(null);
      refetchUsers();
      refetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      setError(msg);
    }
  };

  const totalUserPages = Math.max(1, Math.ceil(userTotal / userLimit));

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <button
          onClick={() => {
            refetchStats();
            refetchHealth();
            refetchCB();
            refetchUsers();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.users?.total ?? "-"}
          loading={statsLoading}
        />
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={stats?.logs?.total ?? "-"}
          loading={statsLoading}
        />
        <StatCard
          icon={Server}
          label="Total Credits"
          value={stats?.credits?.totalBalance ?? "-"}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Health */}
        <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Provider Health
          </h2>
          {healthLoading ? (
            <LoadingRows count={3} />
          ) : health.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No provider health data available.
            </p>
          ) : (
            <div className="space-y-2">
              {health.map((h) => (
                <div
                  key={h.provider}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <span className="text-gray-300 font-medium">
                      {h.provider}
                    </span>
                    {h.latency_ms !== undefined && (
                      <span className="text-gray-500 text-xs ml-2">
                        {h.latency_ms}ms
                      </span>
                    )}
                  </div>
                  <StatusBadge status={h.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Circuit Breakers */}
        <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Circuit Breakers
          </h2>
          {cbLoading ? (
            <LoadingRows count={3} />
          ) : circuitBreakers.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No circuit breaker data available.
            </p>
          ) : (
            <div className="space-y-2">
              {circuitBreakers.map((cb) => (
                <div
                  key={cb.provider}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-gray-300 font-medium">
                    {cb.provider}
                  </span>
                  <CircuitBadge state={cb.state} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Users */}
      <section className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Users
          </h2>
          <span className="text-gray-500 text-sm">
            {userTotal} total · Page {userPage} of {totalUserPages}
          </span>
        </div>

        {usersLoading ? (
          <LoadingRows count={5} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-gray-400 font-medium">Name</th>
                    <th className="pb-3 text-gray-400 font-medium">Email</th>
                    <th className="pb-3 text-gray-400 font-medium">Role</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {users.map((u) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td className="py-3 text-white">{u.name}</td>
                        <td className="py-3 text-gray-400">{u.email}</td>
                        <td className="py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="py-3 text-right">
                          {deleteConfirm === u.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-gray-400 hover:text-white text-xs px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={deleteUser.isPending}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-50"
                              >
                                {deleteUser.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                Confirm
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-gray-500 text-sm mt-4">No users found.</p>
              )}
            </div>

            {/* Pagination */}
            {totalUserPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setUserPage(p)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                          p === userPage
                            ? "bg-primary/20 text-primary border border-primary/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
                <button
                  onClick={() =>
                    setUserPage((p) => Math.min(totalUserPages, p + 1))
                  }
                  disabled={userPage === totalUserPages}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: any;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "bg-green-500/20 text-green-400"
      : status === "degraded"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-red-500/20 text-red-400";

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${color}`}
    >
      {status !== "healthy" && <AlertTriangle className="w-3 h-3" />}
      {status}
    </span>
  );
}

function CircuitBadge({ state }: { state: string }) {
  const color =
    state === "closed"
      ? "bg-green-500/20 text-green-400"
      : state === "half-open"
        ? "bg-yellow-500/20 text-yellow-400"
        : state === "open"
          ? "bg-red-500/20 text-red-400"
          : "bg-gray-500/20 text-gray-400";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {state}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        isAdmin ? "bg-primary/20 text-primary" : "bg-gray-800 text-gray-400"
      }`}
    >
      {role}
    </span>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-white/5 rounded animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}
