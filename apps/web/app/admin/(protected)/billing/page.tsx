"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { DollarSign, CreditCard, History, Loader2 } from "lucide-react";
import type { CreditAdjustment } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminPageShell,
  AdminSection,
  AdminEmptyState,
  fadeUp,
} from "@/components/admin/AdminUI";

export default function AdminBillingPage() {
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [adjustments, setAdjustments] = useState<CreditAdjustment[]>([]);

  const adjustMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; reason: string }) =>
      getAdminSDK().adjustCredits(data.userId, data.amount, data.reason),
    onSuccess: (result) => {
      setAdjustments((prev) => [result, ...prev]);
      setUserId("");
      setAmount("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] });
    },
  });

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!userId || isNaN(parsed) || !reason.trim()) return;
    adjustMutation.mutate({ userId, amount: parsed, reason });
  };

  return (
    <AdminPageHeader
      title="Billing"
      subtitle="Revenue, transactions, and credit adjustments"
    >
      <div className="space-y-5">
        {/* Revenue Summary */}
        <AdminSection
          title="Revenue Summary"
          subtitle="Track platform revenue and transaction metrics"
          action={
            <div className="w-9 h-9 rounded-[10px] bg-emerald-500/[0.06] border border-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-400/70" />
            </div>
          }
        >
          <div className="rounded-[14px] border border-dashed border-[var(--admin-border)] bg-white/[0.008] p-10 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-[var(--admin-text-dim)] opacity-40" />
            <p className="mt-3 text-[13px] font-medium text-[var(--admin-text-muted)]">
              Coming Soon
            </p>
            <p className="mt-1 text-[11px] text-[var(--admin-text-dim)] max-w-md mx-auto leading-relaxed">
              Revenue charts, transaction history, daily/monthly breakdowns, and
              exportable billing reports will appear here.
            </p>
          </div>
        </AdminSection>

        {/* Manual Credit Adjustment */}
        <AdminSection
          title="Manual Credit Adjustment"
          subtitle="Add or remove credits from any user account"
          action={
            <div className="w-9 h-9 rounded-[10px] bg-blue-500/[0.06] border border-blue-500/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-blue-400/70" />
            </div>
          }
        >

          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="admin-label block mb-1.5">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="admin-label block mb-1.5">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 10.00"
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="admin-label block mb-1.5">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="admin-input w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                adjustMutation.isPending || !userId || !amount || !reason.trim()
              }
              className="admin-btn admin-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adjustMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                "Apply Adjustment"
              )}
            </button>

            {adjustMutation.isError && (
              <p className="text-[12px] text-red-400/70">
                {adjustMutation.error instanceof Error
                  ? adjustMutation.error.message
                  : "Failed to apply adjustment"}
              </p>
            )}
          </form>
        </AdminSection>

        {/* Recent Adjustments */}
        <AdminSection
          title="Recent Adjustments"
          subtitle="Credit adjustments applied in this session"
          action={
            <div className="w-9 h-9 rounded-[10px] bg-violet-500/[0.06] border border-violet-500/10 flex items-center justify-center">
              <History className="h-4 w-4 text-violet-400/70" />
            </div>
          }
        >
          {adjustments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--admin-border)] bg-white/[0.008] p-8 text-center">
              <p className="text-[12px] text-[var(--admin-text-dim)]">
                No adjustments recorded yet. Use the form above to apply
                credits.
              </p>
            </div>
          ) : (
            <div className="admin-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th className="text-right">Amount</th>
                    <th>Reason</th>
                    <th className="text-right">Balance After</th>
                    <th className="text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj.id}>
                      <td className="font-mono text-[11px] text-[var(--admin-text-muted)]">
                        {adj.userId.slice(0, 12)}...
                      </td>
                      <td
                        className={`text-right font-medium tabular-nums ${adj.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {adj.amount >= 0 ? "+" : ""}
                        {adj.amount.toFixed(2)}
                      </td>
                      <td className="text-[var(--admin-text-muted)] max-w-[200px] truncate">
                        {adj.reason}
                      </td>
                      <td className="text-right font-mono text-[11px] text-[var(--admin-text-muted)] tabular-nums">
                        {adj.balanceAfter.toFixed(2)}
                      </td>
                      <td className="text-right text-[11px] text-[var(--admin-text-dim)]">
                        {new Date(adj.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminPageHeader>
  );
}
