"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2, Search, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import type { ModelRegistry, ModelAlias, ModelStatus } from "@/types/admin";

import AdminPageHeader from "../../AdminPageHeader";
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

interface ModelFormProps {
  initial?: Partial<ModelRegistry>;
  onSubmit: (data: Partial<ModelRegistry>) => void;
  onCancel: () => void;
  isPending: boolean;
  providers: { id: string; name: string }[];
}

function ModelForm({ initial, onSubmit, onCancel, isPending, providers }: ModelFormProps) {
  const [form, setForm] = useState({
    modelId: initial?.modelId ?? "",
    displayName: initial?.displayName ?? "",
    providerId: initial?.providerId ?? (providers[0]?.id ?? ""),
    description: initial?.description ?? "",
    contextWindow: initial?.contextWindow ?? 128000,
    maxOutput: initial?.maxOutput ?? 4096,
    inputPricePer1k: initial?.inputPricePer1k ?? 0,
    outputPricePer1k: initial?.outputPricePer1k ?? 0,
    supportsVision: initial?.supportsVision ?? false,
    supportsTools: initial?.supportsTools ?? false,
    supportsThinking: initial?.supportsThinking ?? false,
    status: initial?.status ?? "active" as ModelStatus,
  });

  const handleSubmit = () => {
    onSubmit({
      ...form,
      capabilities: [
        ...(form.supportsVision ? ["vision"] : []),
        ...(form.supportsTools ? ["tools"] : []),
        ...(form.supportsThinking ? ["thinking"] : []),
      ],
    });
  };

  return (
    <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] space-y-3">
      <h3 className="text-sm font-semibold text-white mb-3">{initial ? "Edit Model" : "Add Model"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Model ID (e.g. gpt-4o)"
          value={form.modelId}
          onChange={(e) => setForm({ ...form, modelId: e.target.value })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono"
        />
        <input
          placeholder="Display name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <select
          value={form.providerId}
          onChange={(e) => setForm({ ...form, providerId: e.target.value })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as ModelStatus })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
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
          onChange={(e) => setForm({ ...form, contextWindow: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        />
        <input
          type="number"
          placeholder="Max output"
          value={form.maxOutput}
          onChange={(e) => setForm({ ...form, maxOutput: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        />
        <input
          type="number"
          placeholder="Input price per 1k tokens"
          value={form.inputPricePer1k}
          onChange={(e) => setForm({ ...form, inputPricePer1k: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          step="0.000001"
        />
        <input
          type="number"
          placeholder="Output price per 1k tokens"
          value={form.outputPricePer1k}
          onChange={(e) => setForm({ ...form, outputPricePer1k: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          step="0.000001"
        />
      </div>
      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
      />
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={form.supportsVision} onChange={(e) => setForm({ ...form, supportsVision: e.target.checked })} className="rounded border-white/20 bg-white/5" />
          Vision
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={form.supportsTools} onChange={(e) => setForm({ ...form, supportsTools: e.target.checked })} className="rounded border-white/20 bg-white/5" />
          Tools
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={form.supportsThinking} onChange={(e) => setForm({ ...form, supportsThinking: e.target.checked })} className="rounded border-white/20 bg-white/5" />
          Thinking
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!form.modelId || !form.providerId || isPending}
          className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : (initial ? "Update" : "Create Model")}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
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

function AliasForm({ initial, onSubmit, onCancel, isPending, models }: AliasFormProps) {
  const [form, setForm] = useState({
    alias: initial?.alias ?? "",
    targetModelId: initial?.targetModelId ?? (models[0]?.modelId ?? ""),
    rpmOverride: initial?.rpmOverride ?? 0,
    tpmOverride: initial?.tpmOverride ?? 0,
    monthlyBudget: initial?.monthlyBudget ?? 0,
    isActive: initial?.isActive ?? true,
  });

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] space-y-3">
      <h3 className="text-sm font-semibold text-white mb-3">{initial ? "Edit Alias" : "Add Alias"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Alias (e.g. smart)"
          value={form.alias}
          onChange={(e) => setForm({ ...form, alias: e.target.value })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono"
        />
        <select
          value={form.targetModelId}
          onChange={(e) => setForm({ ...form, targetModelId: e.target.value })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        >
          {models.map((m) => (
            <option key={m.id} value={m.modelId}>{m.modelId} ({m.displayName})</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="RPM override (0 = default)"
          value={form.rpmOverride}
          onChange={(e) => setForm({ ...form, rpmOverride: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <input
          type="number"
          placeholder="Monthly budget (cents, 0 = unlimited)"
          value={form.monthlyBudget}
          onChange={(e) => setForm({ ...form, monthlyBudget: Number(e.target.value) })}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!form.alias || !form.targetModelId || isPending}
          className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : (initial ? "Update" : "Create Alias")}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminModelsPage() {
  const [activeTab, setActiveTab] = useState<"registry" | "aliases">("registry");
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
    mutationFn: (data: Partial<ModelRegistry>) => getAdminSDK().createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      setShowAddModel(false);
    },
  });

  const updateModel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModelRegistry> }) => getAdminSDK().updateModel(id, data),
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
    mutationFn: ({ id, status }: { id: string; status: string }) => getAdminSDK().updateModelStatus(id, status),
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
    mutationFn: ({ id, data }: { id: string; data: Partial<ModelAlias> }) => getAdminSDK().updateAlias(id, data),
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
    { key: "registry" as const, label: "Model Registry", count: models?.length },
    { key: "aliases" as const, label: "Aliases", count: aliases?.length },
  ];

  const providerOptions = (providers ?? []).map((p) => ({ id: p.id, name: p.name }));

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
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by model ID, name, or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/40 focus:bg-blue-500/[0.02]"
              />
            </div>
            <button
              onClick={() => setShowAddModel(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Model
            </button>
          </div>

          {showAddModel && (
            <div className="mb-4">
              <ModelForm
                providers={providerOptions}
                onSubmit={(data) => createModel.mutate(data)}
                onCancel={() => setShowAddModel(false)}
                isPending={createModel.isPending}
              />
            </div>
          )}

          {editingModel && (
            <div className="mb-4">
              <ModelForm
                initial={editingModel}
                providers={providerOptions}
                onSubmit={(data) => updateModel.mutate({ id: editingModel.id, data })}
                onCancel={() => setEditingModel(null)}
                isPending={updateModel.isPending}
              />
            </div>
          )}

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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredModels?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/30">
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingModel(model)}
                              className="p-1 text-white/40 hover:text-white/70 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {model.status === "active" ? (
                              <button
                                onClick={() => updateModelStatus.mutate({ id: model.id, status: "disabled" })}
                                className="p-1 text-white/40 hover:text-yellow-400 transition-colors"
                                title="Disable"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => updateModelStatus.mutate({ id: model.id, status: "active" })}
                                className="p-1 text-white/40 hover:text-green-400 transition-colors"
                                title="Enable"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => { if (confirm(`Delete model ${model.modelId}?`)) deleteModel.mutate(model.id); }}
                              className="p-1 text-white/40 hover:text-red-400 transition-colors"
                              title="Delete"
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Alias
            </button>
          </div>

          {showAddAlias && (
            <div className="mb-4">
              <AliasForm
                models={models ?? []}
                onSubmit={(data) => createAlias.mutate(data)}
                onCancel={() => setShowAddAlias(false)}
                isPending={createAlias.isPending}
              />
            </div>
          )}

          {editingAlias && (
            <div className="mb-4">
              <AliasForm
                initial={editingAlias}
                models={models ?? []}
                onSubmit={(data) => updateAlias.mutate({ id: editingAlias.id, data })}
                onCancel={() => setEditingAlias(null)}
                isPending={updateAlias.isPending}
              />
            </div>
          )}

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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aliases?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-white/30">
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingAlias(alias)}
                              className="p-1 text-white/40 hover:text-white/70 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete alias ${alias.alias}?`)) deleteAlias.mutate(alias.id); }}
                              className="p-1 text-white/40 hover:text-red-400 transition-colors"
                              title="Delete"
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
    </div>
  );
}
