"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2, Settings, Flag, Globe, Save, Pencil } from "lucide-react";
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
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-400/70" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Docs Base URL</p>
            <p className="text-xs text-white/30">
              Not configured yet. Add a system setting with key{" "}
              <code className="text-blue-400/70">docs_base_url</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/[0.12] bg-blue-500/[0.02] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center">
          <Globe className="w-4 h-4 text-blue-400/70" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Docs Base URL</p>
          <p className="text-xs text-white/30">
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
            className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white font-mono placeholder:text-white/15 outline-none focus:border-blue-500/30 transition-colors"
          />
          <button
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
            disabled={isSaving || draft === currentValue}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setDraft(currentValue);
              setEditing(false);
            }}
            className="px-3 py-2 rounded-lg bg-white/[0.04] text-white/40 text-xs font-medium hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2 font-mono text-sm text-blue-400/80 truncate">
            {currentValue || "Not set"}
          </code>
          <button
            onClick={() => {
              setDraft(currentValue);
              setEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-medium hover:text-white/60 hover:border-white/[0.1] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      )}

      {setting.description && (
        <p className="mt-3 text-[11px] text-white/20">{setting.description}</p>
      )}
    </div>
  );
}
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"system" | "flags">("system");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/50">
          System configuration and feature flags
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-white/5 bg-white/5 p-1 w-fit">
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "system"
              ? "bg-blue-600 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Settings className="h-4 w-4" />
          System Settings
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "flags"
              ? "bg-blue-600 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Flag className="h-4 w-4" />
          Feature Flags
        </button>
      </div>

      {activeTab === "system" ? <SystemSettingsTab /> : <FeatureFlagsTab />}
    </div>
  );
}

function SystemSettingsTab() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<SystemSetting[]>({
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-red-400">
          {error instanceof Error
            ? error.message
            : "Failed to load system settings"}
        </p>
      </div>
    );
  }

  const docsBaseUrlSetting = settings.find((s) => s.key === "docs_base_url");

  const grouped = settings
    .filter((s) => s.key !== "docs_base_url")
    .reduce<Record<string, SystemSetting[]>>(
      (acc, setting) => {
        const group = setting.groupName || "General";
        if (!acc[group]) acc[group] = [];
        acc[group].push(setting);
        return acc;
      },
      {},
    );

  return (
    <div className="space-y-6">
      <DocsBaseUrlCard
        setting={docsBaseUrlSetting ?? null}
        onSave={(value) =>
          updateMutation.mutate({ key: "docs_base_url", value })
        }
        isSaving={updateMutation.isPending}
      />

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
            {group}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((setting) => (
              <div
                key={setting.key}
                className="rounded-xl border border-white/5 bg-white/5 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {setting.key}
                    </p>
                    {setting.description && (
                      <p className="mt-0.5 text-xs text-white/40 line-clamp-2">
                        {setting.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
                    {setting.type}
                  </span>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-xs text-white/60">
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

  const {
    data: flags,
    isLoading,
    error,
  } = useQuery<FeatureFlag[]>({
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !flags) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-red-400">
          {error instanceof Error
            ? error.message
            : "Failed to load feature flags"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flags.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Flag className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm text-white/30">
            No feature flags configured.
          </p>
        </div>
      ) : (
        flags.map((flag) => (
          <div
            key={flag.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4"
          >
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{flag.name}</p>
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                  {flag.key}
                </span>
              </div>
              {flag.description && (
                <p className="mt-0.5 text-xs text-white/40 line-clamp-1">
                  {flag.description}
                </p>
              )}
            </div>

            <button
              onClick={() =>
                toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })
              }
              disabled={toggleMutation.isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                flag.enabled ? "bg-blue-600" : "bg-white/10"
              } ${toggleMutation.isPending ? "opacity-50" : ""}`}
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
