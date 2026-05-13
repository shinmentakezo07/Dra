"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2, DollarSign, CreditCard, History } from "lucide-react";
import type { CreditAdjustment } from "@/types/admin";

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="mt-1 text-sm text-white/50">
          Revenue, transactions, and credit adjustments
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-white/5 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Revenue Summary
              </h2>
              <p className="text-sm text-white/50">
                Track platform revenue and transaction metrics
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <DollarSign className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-3 text-sm font-medium text-white/40">
              Coming Soon
            </p>
            <p className="mt-1 text-xs text-white/30 max-w-md mx-auto">
              Revenue charts, transaction history, daily/monthly breakdowns, and
              exportable billing reports will appear here once the billing
              analytics endpoint is available.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Manual Credit Adjustment
              </h2>
              <p className="text-sm text-white/50">
                Add or remove credits from any user account
              </p>
            </div>
          </div>

          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60 uppercase tracking-wider">
                  User ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60 uppercase tracking-wider">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 10.00"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60 uppercase tracking-wider">
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                adjustMutation.isPending || !userId || !amount || !reason.trim()
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {adjustMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Apply Adjustment"
              )}
            </button>

            {adjustMutation.isError && (
              <p className="text-sm text-red-400">
                {adjustMutation.error instanceof Error
                  ? adjustMutation.error.message
                  : "Failed to apply adjustment"}
              </p>
            )}
          </form>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Recent Adjustments
              </h2>
              <p className="text-sm text-white/50">
                Credit adjustments applied in this session
              </p>
            </div>
          </div>

          {adjustments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-white/30">
                No adjustments recorded yet. Use the form above to apply
                credits.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                      User ID
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                      Reason
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                      Balance After
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {adjustments.map((adj) => (
                    <tr
                      key={adj.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-white/70">
                        {adj.userId.slice(0, 12)}...
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-medium tabular-nums ${adj.amount >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {adj.amount >= 0 ? "+" : ""}
                        {adj.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-white/60 max-w-[200px] truncate">
                        {adj.reason}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-white/50 tabular-nums">
                        {adj.balanceAfter.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-white/40">
                        {new Date(adj.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
