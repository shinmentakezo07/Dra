"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Gift, RefreshCw, Check, Loader2, Copy, Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { PromoCode } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function AdminPromosPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [random, setRandom] = useState(true);
  const [customCode, setCustomCode] = useState("");
  const [genCode, setGenCode] = useState(generateCode);
  const [promoType, setPromoType] = useState("credits");
  const [value, setValue] = useState(1000);
  const [maxUses, setMaxUses] = useState(100);
  const [expires, setExpires] = useState("");
  const [copied, setCopied] = useState("");

  const { data: promos, isLoading } = useQuery({
    queryKey: ["admin", "promos"],
    queryFn: () => getAdminSDK().listPromoCodes(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getAdminSDK().createPromoCode(data as Partial<PromoCode>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promos"] });
      setShowForm(false);
    },
  });

  const handleCreate = () => {
    const code = random ? genCode : customCode;
    if (!code || value <= 0) return;
    createMutation.mutate({
      code,
      type: promoType,
      value,
      maxUses,
      expiresAt: expires || undefined,
      random: true,
    } as unknown as Partial<PromoCode>);
  };

  return (
    <AdminPageHeader
      title="Promo Codes"
      subtitle="Create and manage promotional codes"
      action={
        <button
          onClick={() => setShowForm(!showForm)}
          className="admin-btn admin-btn-primary text-[12px]"
        >
          <Tag className="w-3.5 h-3.5" />
          {showForm ? "Cancel" : "New Code"}
        </button>
      }
    >
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-card p-6 border-indigo-500/15 bg-indigo-500/[0.015] space-y-4"
        >
          <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">
            Create Promo Code
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRandom(true)}
              className={`admin-btn text-[11px] py-[5px] ${random ? "admin-btn-primary" : "admin-btn-ghost"}`}
            >
              Random Generate
            </button>
            <button
              onClick={() => setRandom(false)}
              className={`admin-btn text-[11px] py-[5px] ${!random ? "admin-btn-primary" : "admin-btn-ghost"}`}
            >
              Custom Code
            </button>
          </div>

          {random ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[12px] px-4 py-3 font-mono text-[16px] tracking-[0.3em] text-indigo-400 font-bold select-all">
                {genCode}
              </div>
              <button
                onClick={() => setGenCode(generateCode)}
                className="admin-btn admin-btn-ghost p-2.5"
                aria-label="Regenerate code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(genCode);
                  setCopied(genCode);
                  setTimeout(() => setCopied(""), 1500);
                }}
                className="admin-btn admin-btn-ghost p-2.5"
                aria-label="Copy code"
              >
                {copied === genCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="ENTER CUSTOM CODE"
              className="admin-input w-full font-mono tracking-[0.2em] py-3"
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Type</label>
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                className="admin-input w-full text-[12px] py-[7px]"
              >
                <option value="credits">Credits</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="admin-label block mb-1.5">Value</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Expires</label>
              <input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="admin-btn admin-btn-primary text-[12px] disabled:opacity-30"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Create Promo Code
          </button>
        </motion.div>
      )}

      {isLoading ? (
        <AdminCenterLoading label="Loading promo codes" />
      ) : !promos || promos.length === 0 ? (
        <AdminEmptyState
          icon={Gift}
          title="No promo codes"
          description="Create your first promotional code to get started"
        />
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono font-bold text-indigo-400/80 tracking-wider">
                    {p.code}
                  </td>
                  <td className="font-mono text-[var(--admin-text-dim)] uppercase text-[11px]">
                    {p.type}
                  </td>
                  <td className="text-[var(--admin-text)] font-medium">
                    {p.value.toLocaleString()}
                  </td>
                  <td className="text-[var(--admin-text-muted)]">
                    {p.currentUses}/{p.maxUses}
                  </td>
                  <td className="font-mono text-[var(--admin-text-dim)]">
                    {p.expiresAt
                      ? new Date(p.expiresAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${p.isActive ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15" : "text-red-400 bg-red-500/8 border border-red-500/15"}`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
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
