"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2, Search, Check } from "lucide-react";
import type { ModelRegistry, ModelAlias } from "@/types/admin";

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-green-500/10 text-green-400 border border-green-500/20" },
  beta: { label: "Beta", classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  deprecated: { label: "Deprecated", classes: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  sunset: { label: "Sunset", classes: "bg-red-500/10 text-red-400 border border-red-500/20" },
  disabled: { label: "Disabled", classes: "bg-white/5 text-white/40 border border-white/10" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.disabled;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}

function CapabilityTag({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/70 border border-white/10">
      <Check className="h-3 w-3 text-green-400" />
      {label}
    </span>
  );
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100000).toFixed(6)}`;
}

export default function AdminModelsPage() {
  const [activeTab, setActiveTab] = useState<"registry" | "aliases">("registry");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useQuery<ModelRegistry[]>({
    queryKey: ["admin", "models"],
    queryFn: () => getAdminSDK().listModels(),
    refetchInterval: 30000,
  });

  const {
    data: aliases,
    isLoading: aliasesLoading,
    error: aliasesError,
  } = useQuery<ModelAlias[]>({
    queryKey: ["admin", "aliases"],
    queryFn: () => getAdminSDK().listAliases(),
    refetchInterval: 30000,
  });

  const filteredModels = models?.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.modelId.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().includes(q) ||
      m.providerId.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { key: "registry" as const, label: "Model Registry", count: models?.length },
    { key: "aliases" as const, label: "Aliases", count: aliases?.length },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Models</h1>
        <p className="mt-1 text-sm text-white/50">Model registry and alias management</p>
      </div>

      <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-500/10 text-blue-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.key
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-white/5 text-white/40"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "registry" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search by model ID, name, or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/40 focus:bg-blue-500/[0.02]"
            />
          </div>

          {modelsLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : modelsError ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-red-400">
                {modelsError instanceof Error ? modelsError.message : "Failed to load models"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Model ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Display Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Context</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Price (In/Out)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredModels?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">
                        {searchQuery ? "No models match your search." : "No models registered."}
                      </td>
                    </tr>
                  ) : (
                    filteredModels?.map((model) => (
                      <tr key={model.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-white">{model.modelId}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">{model.displayName}</td>
                        <td className="px-4 py-3 text-sm text-white/60">{model.providerId}</td>
                        <td className="px-4 py-3 text-sm text-white/80">
                          {(model.contextWindow / 1000).toFixed(0)}k
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-white/80">
                            <span>{formatPrice(model.inputPricePer1k)}</span>
                            <span className="mx-1 text-white/30">/</span>
                            <span>{formatPrice(model.outputPricePer1k)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={model.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <CapabilityTag label="Vision" active={model.supportsVision} />
                            <CapabilityTag label="Tools" active={model.supportsTools} />
                            <CapabilityTag label="Thinking" active={model.supportsThinking} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "aliases" && (
        <div>
          {aliasesLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : aliasesError ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-red-400">
                {aliasesError instanceof Error ? aliasesError.message : "Failed to load aliases"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Alias</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Target Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">RPM Override</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Budget</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aliases?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-white/30">
                        No aliases configured.
                      </td>
                    </tr>
                  ) : (
                    aliases?.map((alias) => (
                      <tr key={alias.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-white">{alias.alias}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">{alias.targetModelId}</td>
                        <td className="px-4 py-3">
                          {alias.rpmOverride > 0 ? (
                            <span className="text-sm text-white/80">{alias.rpmOverride} RPM</span>
                          ) : (
                            <span className="text-sm text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {alias.monthlyBudget > 0 ? (
                            <span className="text-sm text-white/80">
                              ${(alias.monthlyBudget / 100).toFixed(2)}/mo
                            </span>
                          ) : (
                            <span className="text-sm text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={alias.isActive ? "active" : "disabled"} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
