"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Settings, Flag, Globe, Save, Pencil } from "lucide-react";
import type { SystemSetting, FeatureFlag } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";

function DocsBaseUrlCard({
  setting,
  onSave,
  isSaving,
}: {
  setting: SystemSetting | null;
  onSave: (value: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    setting ? String(setting.value ?? "") : ""
  );

  const currentValue = setting ? String(setting.value ?? "") : "";

  if (!setting) {
    return (
      <div className="admin-card p-5 border-dashed border-[var(--admin-border)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-[10px] bg-indigo-500/[0.06] border border-indigo-500/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-indigo-400/70" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--admin-text)]">Docs Base URL</p>
            <p className="text-[11px] text-[var(--admin-text-dim)]">
              Not configured yet. Add a system setting with key{" "}
              <code className="text-indigo-400/70 font-mono">docs_base_url</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card p-5 border-indigo-500/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-[10px] bg-indigo-500/[0.06] border border-indigo-500/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-indigo-400/70" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--admin-text)]">Docs Base URL</p>
          <p className="text-[11px] text-[var(--admin-text-dim)]">
            The base URL shown in all documentation code examples. Self-hosted
            users should set this to their actual API endpoint.
          </p>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-3">
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://api.yourdomain.com"
            className="admin-input flex-1 font-mono text-[12px]"
          />
          <button
            onClick={() => { onSave(draft); setEditing(false); }}
            disabled={isSaving || draft === currentValue}
            className="admin-btn admin-btn-primary text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => { setDraft(currentValue); setEditing(false); }}
            className="admin-btn admin-btn-ghost text-[11px]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-[10px] bg-white/[0.02] border border-[var(--admin-border)] px-3 py-2.5 font-mono text-[12px] text-indigo-400/70 truncate">
            {currentValue || "Not set"}
          </code>
          <button
            onClick={() => { setDraft(currentValue); setEditing(true); }}
            className="admin-btn admin-btn-ghost text-[11px]"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      )}

      {setting.description && (
        <p className="mt-3 text-[10px] text-[var(--admin-text-dim)]">{setting.description}</p>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"system" | "flags">("system");

  return (
    <AdminPageHeader title="Settings" subtitle="System configuration and feature flags">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-[12px] border border-[var(--admin-border)] bg-white/[0.01] p-1 w-fit">
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12px] font-medium transition-all duration-200 ${
            activeTab === "system"
              ? "bg-indigo-500/[0.06] text-indigo-400 border border-indigo-500/10"
              : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-transparent"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          System Settings
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          className={`flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12px] font-medium transition-all duration-200 ${
            activeTab === "flags"
              ? "bg-indigo-500/[0.06] text-indigo-400 border border-indigo-500/10"
              : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-transparent"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          Feature Flags
        </button>
      </div>

      {activeTab === "system" ? <SystemSettingsTab /> : <FeatureFlagsTab />}
    </AdminPageHeader>
  );
}

function SystemSettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery<SystemSetting[]>({
    queryKey: ["admin", "settings"],
    queryFn: () => getAdminSDK().listSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      getAdminSDK().updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-[13px] text-red-400/70">{error instanceof Error ? error.message : "Failed to load system settings"}</p>
      </div>
    );
  }

  const docsBaseUrlSetting = settings.find((s) => s.key === "docs_base_url");

  const grouped = settings
    .filter((s) => s.key !== "docs_base_url")
    .reduce<Record<string, SystemSetting[]>>((acc, setting) => {
      const group = setting.groupName || "General";
      if (!acc[group]) acc[group] = [];
      acc[group].push(setting);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <DocsBaseUrlCard
        setting={docsBaseUrlSetting ?? null}
        onSave={(value) => updateMutation.mutate({ key: "docs_base_url", value })}
        isSaving={updateMutation.isPending}
      />

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <h3 className="admin-label mb-3">{group}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((setting) => (
              <div key={setting.key} className="admin-card p-4">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{setting.key}</p>
                    {setting.description && (
                      <p className="mt-0.5 text-[11px] text-[var(--admin-text-dim)] line-clamp-2">{setting.description}</p>
                    )}
                  </div>
                  <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04] flex-shrink-0">
                    {setting.type}
                  </span>
                </div>
                <div className="rounded-[8px] bg-white/[0.015] px-3 py-2 font-mono text-[11px] text-[var(--admin-text-muted)]">
                  {setting.isEncrypted
                    ? "••••••••"
                    : typeof setting.value === "object"
                      ? JSON.stringify(setting.value)
                      : String(setting.value ?? "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureFlagsTab() {
  const queryClient = useQueryClient();

  const { data: flags, isLoading, error } = useQuery<FeatureFlag[]>({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => getAdminSDK().listFeatureFlags(),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; enabled: boolean }) =>
      getAdminSDK().toggleFeatureFlag(data.id, data.enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !flags) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-[13px] text-red-400/70">{error instanceof Error ? error.message : "Failed to load feature flags"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {flags.length === 0 ? (
        <div className="admin-card border-dashed border-[var(--admin-border)] p-8 text-center">
          <Flag className="mx-auto h-7 w-7 text-[var(--admin-text-dim)]" />
          <p className="mt-3 text-[13px] text-[var(--admin-text-dim)]">No feature flags configured.</p>
        </div>
      ) : (
        flags.map((flag) => (
          <div key={flag.id} className="admin-card p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-[var(--admin-text)]">{flag.name}</p>
                <span className="admin-badge bg-white/[0.03] text-[var(--admin-text-dim)] border border-white/[0.04] font-mono">{flag.key}</span>
              </div>
              {flag.description && (
                <p className="mt-0.5 text-[11px] text-[var(--admin-text-dim)] line-clamp-1">{flag.description}</p>
              )}
            </div>

            <button
              onClick={() => toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
              disabled={toggleMutation.isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                flag.enabled ? "bg-indigo-500/30" : "bg-white/[0.06]"
              } ${toggleMutation.isPending ? "opacity-50" : ""}`}
              aria-label={`Toggle ${flag.name}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flag.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
