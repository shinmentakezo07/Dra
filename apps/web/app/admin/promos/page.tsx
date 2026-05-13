"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromoCode } from "@/types/admin";

const TYPE_STYLES: Record<string, string> = {
  percentage: "text-blue-400 bg-blue-500/10",
  fixed: "text-green-400 bg-green-500/10",
  credits: "text-purple-400 bg-purple-500/10",
};

export default function AdminPromosPage() {
  const { data, isLoading, error } = useQuery<PromoCode[]>({
    queryKey: ["admin", "promos"],
    queryFn: () => getAdminSDK().listPromoCodes(),
  });

  const promos = data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
        <p className="mt-1 text-sm text-white/50">Discount and promotion code management</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-red-400">
            {error instanceof Error ? error.message : "Failed to load promo codes"}
          </p>
        </div>
      ) : promos.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No promo codes</p>
            <p className="mt-1 text-sm text-white/30">
              Create promo codes to offer discounts and promotions to your users
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Uses
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {promos.map((promo, index) => (
                <tr
                  key={promo.id}
                  className={cn(
                    "text-sm transition-colors hover:bg-white/[0.04]",
                    index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]",
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-sm font-medium text-white">
                      {promo.code}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        TYPE_STYLES[promo.type] || "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {promo.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/80">
                    {promo.type === "percentage"
                      ? `${promo.value}%`
                      : promo.type === "credits"
                        ? `${promo.value} credits`
                        : `$${promo.value.toFixed(2)}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {promo.currentUses}/{promo.maxUses}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/40">
                    {promo.expiresAt
                      ? new Date(promo.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        promo.isActive
                          ? "bg-green-500/10 text-green-400"
                          : "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {promo.isActive ? "Active" : "Inactive"}
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
