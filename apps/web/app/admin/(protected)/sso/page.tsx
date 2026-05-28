"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { CheckCircle, XCircle, Info } from "lucide-react";
import type { SSOConfig } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";

function maskClientId(clientId: string): string {
  if (clientId.length <= 8) return clientId.slice(0, 4) + "****";
  return clientId.slice(0, 8) + "****" + clientId.slice(-4);
}

export default function AdminSSOPage() {
  const {
    data: configs,
    isLoading,
    error,
  } = useQuery<SSOConfig[]>({
    queryKey: ["admin", "sso"],
    queryFn: () => getAdminSDK().listSSOConfigs(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-[13px] text-red-400/70">
          {error instanceof Error
            ? error.message
            : "Failed to load SSO configs"}
        </p>
      </div>
    );
  }

  return (
    <AdminPageHeader
      title="SSO Configuration"
      subtitle="Single sign-on provider settings"
    >
      {!configs || configs.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-9 w-9 text-[var(--admin-text-dim)]" />
            <p className="mt-3 text-[14px] font-medium text-[var(--admin-text-muted)]">
              No SSO providers configured
            </p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-dim)]">
              Add an SSO provider to enable single sign-on for your organization
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configs.map((cfg) => (
            <div key={cfg.id} className="admin-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--admin-text)]">
                    {cfg.label}
                  </h3>
                  <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04] mt-1">
                    {cfg.provider}
                  </span>
                </div>
                <span
                  className={`admin-badge ${cfg.isActive ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15" : "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}
                >
                  {cfg.isActive ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {cfg.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--admin-text-dim)]">Issuer</span>
                  <span className="text-[var(--admin-text)]">{cfg.issuer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--admin-text-dim)]">
                    Client ID
                  </span>
                  <span className="font-mono text-[var(--admin-text-muted)]">
                    {maskClientId(cfg.clientId)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--admin-text-dim)]">
                    Default Role
                  </span>
                  <span className="text-[var(--admin-text)]">
                    {cfg.defaultRole}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--admin-text-dim)]">
                    Auto Provision
                  </span>
                  <span
                    className={
                      cfg.autoProvision
                        ? "text-emerald-400"
                        : "text-[var(--admin-text-dim)]"
                    }
                  >
                    {cfg.autoProvision ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {cfg.allowedDomains.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--admin-border)]">
                  <p className="admin-label mb-1.5">Allowed Domains</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.allowedDomains.map((domain) => (
                      <span
                        key={domain}
                        className="admin-badge text-indigo-400 bg-indigo-500/8 border border-indigo-500/15"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPageHeader>
  );
}
