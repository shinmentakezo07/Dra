"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Search, Check, Plus, Pencil, Trash2 } from "lucide-react";
import type { ModelRegistry, ModelAlias, ModelStatus } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminTabNav,
  AdminCenterLoading,
  AdminEmptyState,
  AdminTableLoading,
} from "@/components/admin/AdminUI";

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: {
    label: "Active",
    classes: "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15",
  },
  beta: {
    label: "Beta",
    classes: "text-indigo-400 bg-indigo-500/8 border border-indigo-500/15",
  },
  deprecated: {
    label: "Deprecated",
    classes: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  },
  sunset: {
    label: "Sunset",
    classes: "text-red-400 bg-red-500/8 border border-red-500/15",
  },
  disabled: {
    label: "Disabled",
    classes:
      "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.disabled;
  return (
    <span className={`admin-badge ${config.classes}`}>{config.label}</span>
  );
}

function CapabilityTag({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] bg-white/[0.03] px-2 py-[3px] text-[10px] text-[var(--admin-text-muted)] border border-white/[0.04]">
      <Check className="h-2.5 w-2.5 text-emerald-400/70" />
      {label}
    </span>
  );
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100000).toFixed(6)}`;
}

interface ModelFormProps {
  initial?: Partial<ModelRegistry>;
  onSubmit: (data: Partial<ModelRegistry>) => void;
  onCancel: () => void;
  isPending: boolean;
  providers: { id: string; name: string }[];
}

function ModelForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  providers,
}: ModelFormProps) {
  const [form, setForm] = useState({
    modelId: initial?.modelId ?? "",
    displayName: initial?.displayName ?? "",
    providerId: initial?.providerId ?? providers[0]?.id ?? "",
    description: initial?.description ?? "",
    contextWindow: initial?.contextWindow ?? 128000,
    maxOutput: initial?.maxOutput ?? 4096,
    inputPricePer1k: initial?.inputPricePer1k ?? 0,
    outputPricePer1k: initial?.outputPricePer1k ?? 0,
    supportsVision: initial?.supportsVision ?? false,
    supportsTools: initial?.supportsTools ?? false,
    supportsThinking: initial?.supportsThinking ?? false,
    status: initial?.status ?? ("active" as ModelStatus),
    modelGroup: initial?.modelGroup ?? "",
    fallbackModels: initial?.fallbackModels?.join(", ") ?? "",
    credentialName: initial?.credentialName ?? "",
    routingWeight: initial?.routingWeight ?? 1,
    isWildcard: initial?.isWildcard ?? false,
  });

  const handleSubmit = () => {
    onSubmit({
      ...form,
      capabilities: [
        ...(form.supportsVision ? ["vision"] : []),
        ...(form.supportsTools ? ["tools"] : []),
        ...(form.supportsThinking ? ["thinking"] : []),
      ],
      fallbackModels: form.fallbackModels
        ? form.fallbackModels.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <div className="admin-card p-5 border-indigo-500/15 bg-indigo-500/[0.015]">
      <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-4">
        {initial ? "Edit Model" : "Add Model"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Model ID (e.g. gpt-4o)"
          value={form.modelId}
          onChange={(e) => setForm({ ...form, modelId: e.target.value })}
          className="admin-input text-[12px] py-[7px] font-mono"
        />
        <input
          placeholder="Display name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="admin-input text-[12px] py-[7px]"
        />
        <select
          value={form.providerId}
          onChange={(e) => setForm({ ...form, providerId: e.target.value })}
          className="admin-input text-[12px] py-[7px]"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as ModelStatus })
          }
          className="admin-input text-[12px] py-[7px]"
        >
          <option value="active">Active</option>
          <option value="beta">Beta</option>
          <option value="deprecated">Deprecated</option>
          <option value="sunset">Sunset</option>
          <option value="disabled">Disabled</option>
        </select>
        <input
          type="number"
          placeholder="Context window"
          value={form.contextWindow}
          onChange={(e) =>
            setForm({ ...form, contextWindow: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
        />
        <input
          type="number"
          placeholder="Max output"
          value={form.maxOutput}
          onChange={(e) =>
            setForm({ ...form, maxOutput: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
        />
        <input
          type="number"
          placeholder="Input price per 1k"
          value={form.inputPricePer1k}
          onChange={(e) =>
            setForm({ ...form, inputPricePer1k: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
          step="0.000001"
        />
        <input
          type="number"
          placeholder="Output price per 1k"
          value={form.outputPricePer1k}
          onChange={(e) =>
            setForm({ ...form, outputPricePer1k: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
          step="0.000001"
        />
      </div>
      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="admin-input w-full text-[12px] py-[7px] mt-3"
      />
      <div className="flex gap-4 mt-3">
        <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.supportsVision}
            onChange={(e) =>
              setForm({ ...form, supportsVision: e.target.checked })
            }
            className="rounded border-white/20 bg-white/5 accent-indigo-500"
          />
          Vision
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.supportsTools}
            onChange={(e) =>
              setForm({ ...form, supportsTools: e.target.checked })
            }
            className="rounded border-white/20 bg-white/5 accent-indigo-500"
          />
          Tools
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.supportsThinking}
            onChange={(e) =>
              setForm({ ...form, supportsThinking: e.target.checked })
            }
            className="rounded border-white/20 bg-white/5 accent-indigo-500"
          />
          Thinking
        </label>
      </div>
      {/* Model Group & Routing */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <input
          placeholder="Model group (e.g. gpt-4o)"
          value={form.modelGroup}
          onChange={(e) => setForm({ ...form, modelGroup: e.target.value })}
          className="admin-input text-[12px] py-[7px] font-mono"
          title="Group multiple deployments under one name for load balancing"
        />
        <input
          type="number"
          placeholder="Routing weight (1-100)"
          value={form.routingWeight}
          onChange={(e) =>
            setForm({ ...form, routingWeight: Math.max(1, Number(e.target.value)) })
          }
          className="admin-input text-[12px] py-[7px]"
          min={1}
          title="Higher weight = more traffic in group load balancing"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <input
          placeholder="Fallback models (comma-separated)"
          value={form.fallbackModels}
          onChange={(e) => setForm({ ...form, fallbackModels: e.target.value })}
          className="admin-input text-[12px] py-[7px] font-mono"
          title="Model IDs to try if this model fails"
        />
        <input
          placeholder="Credential name"
          value={form.credentialName}
          onChange={(e) => setForm({ ...form, credentialName: e.target.value })}
          className="admin-input text-[12px] py-[7px]"
          title="Reference to centralized credential in vault"
        />
      </div>
      <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-muted)] cursor-pointer mt-3">
        <input
          type="checkbox"
          checked={form.isWildcard}
          onChange={(e) => setForm({ ...form, isWildcard: e.target.checked })}
          className="rounded border-white/20 bg-white/5 accent-indigo-500"
        />
        Wildcard (catch-all for this provider)
      </label>
      <div className="flex gap-2 pt-3">
        <button
          onClick={handleSubmit}
          disabled={!form.modelId || !form.providerId || isPending}
          className="admin-btn admin-btn-primary text-[11px] py-[5px] disabled:opacity-50"
        >
          {isPending ? "Saving..." : initial ? "Update" : "Create Model"}
        </button>
        <button
          onClick={onCancel}
          className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface AliasFormProps {
  initial?: Partial<ModelAlias>;
  onSubmit: (data: Partial<ModelAlias>) => void;
  onCancel: () => void;
  isPending: boolean;
  models: ModelRegistry[];
}

function AliasForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  models,
}: AliasFormProps) {
  const [form, setForm] = useState({
    alias: initial?.alias ?? "",
    targetModelId: initial?.targetModelId ?? models[0]?.modelId ?? "",
    rpmOverride: initial?.rpmOverride ?? 0,
    tpmOverride: initial?.tpmOverride ?? 0,
    monthlyBudget: initial?.monthlyBudget ?? 0,
    isActive: initial?.isActive ?? true,
  });

  return (
    <div className="admin-card p-5 border-indigo-500/15 bg-indigo-500/[0.015]">
      <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-4">
        {initial ? "Edit Alias" : "Add Alias"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Alias (e.g. smart)"
          value={form.alias}
          onChange={(e) => setForm({ ...form, alias: e.target.value })}
          className="admin-input text-[12px] py-[7px] font-mono"
        />
        <select
          value={form.targetModelId}
          onChange={(e) => setForm({ ...form, targetModelId: e.target.value })}
          className="admin-input text-[12px] py-[7px]"
        >
          {models.map((m) => (
            <option key={m.id} value={m.modelId}>
              {m.modelId} ({m.displayName})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="RPM override (0 = default)"
          value={form.rpmOverride}
          onChange={(e) =>
            setForm({ ...form, rpmOverride: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
        />
        <input
          type="number"
          placeholder="Monthly budget (cents, 0 = unlimited)"
          value={form.monthlyBudget}
          onChange={(e) =>
            setForm({ ...form, monthlyBudget: Number(e.target.value) })
          }
          className="admin-input text-[12px] py-[7px]"
        />
      </div>
      <div className="flex gap-2 pt-3">
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.alias || !form.targetModelId || isPending}
          className="admin-btn admin-btn-primary text-[11px] py-[5px] disabled:opacity-50"
        >
          {isPending ? "Saving..." : initial ? "Update" : "Create Alias"}
        </button>
        <button
          onClick={onCancel}
          className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminModelsPage() {
  const [activeTab, setActiveTab] = useState<"registry" | "aliases">(
    "registry",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelRegistry | null>(null);
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [editingAlias, setEditingAlias] = useState<ModelAlias | null>(null);
  const queryClient = useQueryClient();

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

  const { data: providers } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["admin", "providers"],
    queryFn: () => getAdminSDK().listProviders(),
  });

  const createModel = useMutation({
    mutationFn: (data: Partial<ModelRegistry>) =>
      getAdminSDK().createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      setShowAddModel(false);
    },
  });

  const updateModel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModelRegistry> }) =>
      getAdminSDK().updateModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      setEditingModel(null);
    },
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => getAdminSDK().deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  const updateModelStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      getAdminSDK().updateModelStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  const createAlias = useMutation({
    mutationFn: (data: Partial<ModelAlias>) => getAdminSDK().createAlias(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "aliases"] });
      setShowAddAlias(false);
    },
  });

  const updateAlias = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModelAlias> }) =>
      getAdminSDK().updateAlias(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "aliases"] });
      setEditingAlias(null);
    },
  });

  const deleteAlias = useMutation({
    mutationFn: (id: string) => getAdminSDK().deleteAlias(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "aliases"] });
    },
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
    {
      key: "registry" as const,
      label: "Model Registry",
      count: models?.length,
    },
    { key: "aliases" as const, label: "Aliases", count: aliases?.length },
  ];

  const providerOptions = (providers ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const providerNameMap = new Map((providers ?? []).map((p) => [p.id, p.name]));

  return (
    <AdminPageHeader
      title="Models"
      subtitle="Model registry and alias management"
    >
      {/* Tabs */}
      <AdminTabNav
        tabs={[
          { key: "registry", label: "Model Registry", count: models?.length },
          { key: "aliases", label: "Aliases", count: aliases?.length },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as "registry" | "aliases")}
      />

      {activeTab === "registry" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--admin-text-dim)]" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input w-full pl-10 pr-4 py-[9px] rounded-[12px]"
              />
            </div>
            <button
              onClick={() => setShowAddModel(true)}
              className="admin-btn admin-btn-primary text-[12px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Model
            </button>
          </div>

          {showAddModel && (
            <ModelForm
              providers={providerOptions}
              onSubmit={(data) => createModel.mutate(data)}
              onCancel={() => setShowAddModel(false)}
              isPending={createModel.isPending}
            />
          )}

          {editingModel && (
            <ModelForm
              initial={editingModel}
              providers={providerOptions}
              onSubmit={(data) =>
                updateModel.mutate({ id: editingModel.id, data })
              }
              onCancel={() => setEditingModel(null)}
              isPending={updateModel.isPending}
            />
          )}

          {modelsLoading ? (
            <AdminTableLoading rows={6} cols={8} />
          ) : modelsError ? (
            <AdminEmptyState
              icon={Activity}
              title="Failed to load models"
              description={modelsError instanceof Error ? modelsError.message : "An error occurred"}
            />
          ) : (
            <div className="admin-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Model ID</th>
                    <th>Display Name</th>
                    <th>Provider</th>
                    <th>Group</th>
                    <th>Context</th>
                    <th>Price (In/Out)</th>
                    <th>Status</th>
                    <th>Capabilities</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-[12px] text-[var(--admin-text-dim)]"
                      >
                        {searchQuery
                          ? "No models match your search."
                          : "No models registered."}
                      </td>
                    </tr>
                  ) : (
                    filteredModels?.map((model) => (
                      <tr key={model.id}>
                        <td>
                          <span className="font-mono text-[var(--admin-text)]">
                            {model.modelId}
                          </span>
                        </td>
                        <td className="text-[var(--admin-text-muted)]">
                          {model.displayName}
                        </td>
                        <td className="text-[var(--admin-text-muted)]">
                          {providerNameMap.get(model.providerId) ?? model.providerId}
                        </td>
                        <td className="text-[var(--admin-text-muted)] font-mono text-[11px]">
                          {model.modelGroup || "-"}
                        </td>
                        <td className="text-[var(--admin-text)]">
                          {(model.contextWindow / 1000).toFixed(0)}k
                        </td>
                        <td>
                          <div className="text-[var(--admin-text)]">
                            <span>{formatPrice(model.inputPricePer1k)}</span>
                            <span className="mx-1 text-[var(--admin-text-dim)]">
                              /
                            </span>
                            <span>{formatPrice(model.outputPricePer1k)}</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={model.status} />
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            <CapabilityTag
                              label="Vision"
                              active={model.supportsVision}
                            />
                            <CapabilityTag
                              label="Tools"
                              active={model.supportsTools}
                            />
                            <CapabilityTag
                              label="Thinking"
                              active={model.supportsThinking}
                            />
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => setEditingModel(model)}
                              className="rounded-[7px] p-[6px] text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.03] transition-all"
                              title="Edit"
                              aria-label="Edit model"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <select
                              value={model.status}
                              onChange={(e) =>
                                updateModelStatus.mutate({
                                  id: model.id,
                                  status: e.target.value,
                                })
                              }
                              className="admin-input text-[11px] py-[3px] px-2 w-[100px]"
                            >
                              <option value="active">Active</option>
                              <option value="beta">Beta</option>
                              <option value="deprecated">Deprecated</option>
                              <option value="sunset">Sunset</option>
                              <option value="disabled">Disabled</option>
                            </select>
                            <button
                              onClick={() => {
                                if (confirm(`Delete model ${model.modelId}? This will remove it from the registry.`))
                                  deleteModel.mutate(model.id);
                              }}
                              className="rounded-[7px] p-[6px] text-[var(--admin-text-dim)] hover:text-red-400/70 hover:bg-white/[0.03] transition-all"
                              title="Delete"
                              aria-label="Delete model"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setShowAddAlias(true)}
              className="admin-btn admin-btn-primary text-[12px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Alias
            </button>
          </div>

          {showAddAlias && (
            <AliasForm
              models={models ?? []}
              onSubmit={(data) => createAlias.mutate(data)}
              onCancel={() => setShowAddAlias(false)}
              isPending={createAlias.isPending}
            />
          )}

          {editingAlias && (
            <AliasForm
              initial={editingAlias}
              models={models ?? []}
              onSubmit={(data) =>
                updateAlias.mutate({ id: editingAlias.id, data })
              }
              onCancel={() => setEditingAlias(null)}
              isPending={updateAlias.isPending}
            />
          )}

          {aliasesLoading ? (
            <AdminTableLoading rows={4} cols={6} />
          ) : aliasesError ? (
            <AdminEmptyState
              icon={Activity}
              title="Failed to load aliases"
              description={aliasesError instanceof Error ? aliasesError.message : "An error occurred"}
            />
          ) : (
            <div className="admin-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Alias</th>
                    <th>Target Model</th>
                    <th>RPM Override</th>
                    <th>Budget</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-[12px] text-[var(--admin-text-dim)]"
                      >
                        No aliases configured.
                      </td>
                    </tr>
                  ) : (
                    aliases?.map((alias) => (
                      <tr key={alias.id}>
                        <td>
                          <span className="font-mono text-[var(--admin-text)]">
                            {alias.alias}
                          </span>
                        </td>
                        <td className="text-[var(--admin-text-muted)]">
                          {alias.targetModelId}
                        </td>
                        <td className="text-[var(--admin-text)]">
                          {alias.rpmOverride > 0 ? (
                            <span>{alias.rpmOverride} RPM</span>
                          ) : (
                            <span className="text-[var(--admin-text-dim)]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="text-[var(--admin-text)]">
                          {alias.monthlyBudget > 0 ? (
                            <span>
                              ${(alias.monthlyBudget / 100).toFixed(2)}/mo
                            </span>
                          ) : (
                            <span className="text-[var(--admin-text-dim)]">
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            status={alias.isActive ? "active" : "disabled"}
                          />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => setEditingAlias(alias)}
                              className="rounded-[7px] p-[6px] text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.03] transition-all"
                              title="Edit"
                              aria-label="Edit alias"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete alias ${alias.alias}?`))
                                  deleteAlias.mutate(alias.id);
                              }}
                              className="rounded-[7px] p-[6px] text-[var(--admin-text-dim)] hover:text-red-400/70 hover:bg-white/[0.03] transition-all"
                              title="Delete"
                              aria-label="Delete alias"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
    </AdminPageHeader>
  );
}
