"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type {
  Provider,
  ProviderKey,
  ProviderStatus,
  ModelRegistry,
} from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
  fadeUp,
} from "@/components/admin/AdminUI";
import {
  Plus,
  Activity,
  ArrowUpDown,
  Trash2,
  Pencil,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Server,
  Search,
  X,
  Key,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyle: Record<ProviderStatus, string> = {
  active: "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15",
  inactive:
    "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
  maintenance: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  deprecated: "text-red-400 bg-red-500/8 border border-red-500/15",
};

const strategyLabel: Record<string, string> = {
  "round-robin": "Round Robin",
  "fill-first": "Fill First",
  weighted: "Weighted",
  "latency-optimized": "Latency Opt",
  "quota-aware": "Quota Aware",
};

function ProviderKeysPanel({ providerId }: { providerId: string }) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await getAdminSDK().listProviderKeys(providerId);
      setKeys(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const createKey = useMutation({
    mutationFn: (data: { label: string; key: string; strategy?: string; weight?: number }) =>
      getAdminSDK().createProviderKey(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      loadKeys();
      setShowAddForm(false);
    },
  });

  const deleteKey = useMutation({
    mutationFn: (keyId: string) =>
      getAdminSDK().deleteProviderKey(providerId, keyId),
    onSuccess: () => {
      loadKeys();
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
  });

  const [form, setForm] = useState({
    label: "",
    key: "",
    strategy: "round-robin" as const,
    weight: 1,
  });

  return (
    <div className="border-t border-[var(--admin-border)] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            if (!keys || keys.length === 0) loadKeys();
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-1.5 text-[11px] text-indigo-400/70 hover:text-indigo-400 transition-colors font-medium"
        >
          <Key className="h-3 w-3" />
          Add Key
        </button>
        <button
          onClick={loadKeys}
          className={cn(
            "flex items-center gap-1.5 text-[11px] text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] transition-colors",
            loading && "animate-spin",
          )}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 p-3.5 rounded-[12px] bg-white/[0.015] border border-[var(--admin-border)] space-y-2.5">
          <input
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="admin-input w-full text-[12px] py-[7px]"
          />
          <input
            placeholder="API Key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            className="admin-input w-full text-[12px] py-[7px]"
          />
          <div className="flex gap-2">
            <select
              value={form.strategy}
              onChange={(e) =>
                setForm({
                  ...form,
                  strategy: e.target.value as typeof form.strategy,
                })
              }
              className="admin-input flex-1 text-[12px] py-[7px]"
            >
              <option value="round-robin">Round Robin</option>
              <option value="fill-first">Fill First</option>
              <option value="weighted">Weighted</option>
              <option value="latency-optimized">Latency Optimized</option>
              <option value="quota-aware">Quota Aware</option>
            </select>
            <input
              type="number"
              placeholder="Weight"
              value={form.weight}
              onChange={(e) =>
                setForm({ ...form, weight: Number(e.target.value) })
              }
              className="admin-input w-20 text-[12px] py-[7px]"
            />
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => {
                createKey.mutate({
                  label: form.label,
                  strategy: form.strategy as ProviderKey["strategy"],
                  weight: form.weight,
                  key: form.key,
                });
              }}
              disabled={!form.label || !form.key || createKey.isPending}
              className="admin-btn admin-btn-primary text-[11px] py-[5px] disabled:opacity-50"
            >
              {createKey.isPending ? "Saving..." : "Save Key"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400/60" />
        </div>
      ) : keys.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className="text-left font-medium py-1.5 pr-2">Label</th>
                <th className="text-left font-medium py-1.5 pr-2">Prefix</th>
                <th className="text-left font-medium py-1.5 pr-2">Strategy</th>
                <th className="text-left font-medium py-1.5 pr-2">Weight</th>
                <th className="text-left font-medium py-1.5 pr-2">Used</th>
                <th className="text-left font-medium py-1.5 pr-2">Status</th>
                <th className="text-right font-medium py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-white/[0.015]">
                  <td className="py-1.5 pr-2 font-medium text-[var(--admin-text)]">
                    {key.label}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[var(--admin-text-muted)]">
                    {key.keyPrefix}...{key.keyLastFour}
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--admin-text-muted)]">
                    {strategyLabel[key.strategy] || key.strategy}
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--admin-text-muted)]">
                    {key.weight}
                  </td>
                  <td className="py-1.5 pr-2 text-[var(--admin-text-muted)]">
                    {key.usageCount.toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span
                      className={cn(
                        "admin-badge text-[9px]",
                        key.isActive
                          ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15"
                          : "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
                      )}
                    >
                      {key.isActive ? "active" : "disabled"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this key?"))
                          deleteKey.mutate(key.id);
                      }}
                      className="text-red-400/50 hover:text-red-400 transition-colors"
                      aria-label="Delete key"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--admin-text-dim)] text-center py-2">
          No keys configured
        </p>
      )}
    </div>
  );
}

function FetchModelsPanel({
  baseUrl,
  providerId,
}: {
  baseUrl: string;
  providerId: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<
    { id: string; object?: string; owned_by?: string }[]
  >([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const registerModels = useMutation({
    mutationFn: async (modelIds: string[]) => {
      for (const modelId of modelIds) {
        await getAdminSDK().createModel({
          modelId,
          providerId,
          displayName: modelId,
        } as Partial<ModelRegistry>);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      setSelectedIds(new Set());
    },
  });

  const handleFetch = async () => {
    if (!baseUrl) {
      setError("No base URL configured for this provider");
      return;
    }
    setFetching(true);
    setError(null);
    setModels([]);
    setSelectedIds(new Set());
    try {
      const result = await getAdminSDK().fetchModels(baseUrl, apiKey);
      setModels(result.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch models");
    } finally {
      setFetching(false);
    }
  };

  const toggleModel = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === models.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(models.map((m) => m.id)));
    }
  };

  return (
    <div className="border-t border-[var(--admin-border)] pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="password"
          placeholder="API Key (optional)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="admin-input flex-1 text-[12px] py-[7px]"
        />
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="admin-btn admin-btn-primary text-[11px] py-[6px] disabled:opacity-50"
        >
          {fetching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          {fetching ? "Fetching..." : "Fetch Models"}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded-[10px] bg-red-500/[0.04] border border-red-500/10 text-[11px] text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400/50 hover:text-red-400"
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {models.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">
              {selectedIds.size} of {models.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="text-[10px] text-indigo-400/70 hover:text-indigo-400 transition-colors font-medium flex items-center gap-1"
              >
                {selectedIds.size === models.length ? (
                  <CheckSquare className="h-3 w-3" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
                {selectedIds.size === models.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => registerModels.mutate(Array.from(selectedIds))}
                  disabled={registerModels.isPending}
                  className="admin-btn admin-btn-primary text-[10px] py-[4px] px-2.5 disabled:opacity-50"
                >
                  {registerModels.isPending
                    ? "Registering..."
                    : `Register ${selectedIds.size}`}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-[12px] border border-[var(--admin-border)] admin-scroll">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[var(--admin-surface-elevated)]">
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="w-8 py-1.5 pl-2"></th>
                  <th className="text-left font-medium py-1.5 pr-2">
                    Model ID
                  </th>
                  <th className="text-left font-medium py-1.5 pr-2">
                    Owned By
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/[0.015] hover:bg-white/[0.015] cursor-pointer"
                    onClick={() => toggleModel(m.id)}
                  >
                    <td className="py-1.5 pl-2">
                      {selectedIds.has(m.id) ? (
                        <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-[var(--admin-text-dim)]" />
                      )}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-[var(--admin-text)]">
                      {m.id}
                    </td>
                    <td className="py-1.5 pr-2 text-[var(--admin-text-muted)]">
                      {m.owned_by || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="py-1.5 px-3 text-[10px] text-[var(--admin-text-dim)] text-right">
              {models.length} model{models.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  onToggleStatus,
  onDelete,
}: {
  provider: Provider;
  onToggleStatus: (id: string, status: ProviderStatus) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [showKeys, setShowKeys] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: provider.displayName,
    baseUrl: provider.baseUrl,
    priority: provider.priority,
    timeoutMs: provider.timeoutMs,
  });
  const queryClient = useQueryClient();

  const updateProvider = useMutation({
    mutationFn: (data: Partial<Provider>) => getAdminSDK().updateProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setEditing(false);
    },
  });

  const handleSave = () => {
    updateProvider.mutate({
      id: provider.id,
      displayName: editForm.displayName,
      baseUrl: editForm.baseUrl,
      priority: editForm.priority,
      timeoutMs: editForm.timeoutMs,
    });
  };

  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-[10px] bg-indigo-500/[0.06] border border-indigo-500/10 p-2.5 text-indigo-400/70">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--admin-text)] text-[14px]">
              {provider.displayName}
            </h3>
            <p className="text-[11px] text-[var(--admin-text-dim)] font-mono">
              {provider.name}
            </p>
          </div>
        </div>
        <span
          className={cn("admin-badge capitalize", statusStyle[provider.status])}
        >
          {provider.status}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2.5 mb-4 p-3.5 rounded-[12px] bg-white/[0.015] border border-[var(--admin-border)]">
          <input
            value={editForm.displayName}
            onChange={(e) =>
              setEditForm({ ...editForm, displayName: e.target.value })
            }
            className="admin-input w-full text-[12px] py-[7px]"
            placeholder="Display Name"
          />
          <input
            value={editForm.baseUrl}
            onChange={(e) =>
              setEditForm({ ...editForm, baseUrl: e.target.value })
            }
            className="admin-input w-full text-[12px] py-[7px] font-mono"
            placeholder="Base URL"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider font-semibold">
                Priority
              </label>
              <input
                type="number"
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm({ ...editForm, priority: Number(e.target.value) })
                }
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider font-semibold">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={editForm.timeoutMs}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    timeoutMs: Number(e.target.value),
                  })
                }
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={handleSave}
              disabled={updateProvider.isPending}
              className="admin-btn admin-btn-primary text-[11px] py-[5px] disabled:opacity-50"
            >
              {updateProvider.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
          <div>
            <p className="admin-label mb-0.5">Type</p>
            <p className="text-[var(--admin-text)] font-mono">
              {provider.providerType}
            </p>
          </div>
          <div>
            <p className="admin-label mb-0.5">Base URL</p>
            <p
              className="text-[var(--admin-text-muted)] truncate font-mono text-[11px]"
              title={provider.baseUrl}
            >
              {provider.baseUrl}
            </p>
          </div>
          <div>
            <p className="admin-label mb-0.5">Priority</p>
            <p className="text-[var(--admin-text)]">{provider.priority}</p>
          </div>
          <div>
            <p className="admin-label mb-0.5">Timeout</p>
            <p className="text-[var(--admin-text)]">{provider.timeoutMs}ms</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--admin-border)]">
        <button
          onClick={() => {
            setShowKeys(!showKeys);
            setShowModels(false);
          }}
          className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5"
        >
          <Activity className="h-3.5 w-3.5" />
          {showKeys ? "Hide Keys" : "Keys"}
        </button>
        <button
          onClick={() => {
            setShowModels(!showModels);
            setShowKeys(false);
          }}
          className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5"
        >
          <Search className="h-3.5 w-3.5" />
          {showModels ? "Hide Models" : "Models"}
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() =>
            onToggleStatus(
              provider.id,
              provider.status === "active" ? "inactive" : "active",
            )
          }
          className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Toggle
        </button>
        <button
          onClick={() => onDelete(provider.id, provider.name)}
          className="admin-btn admin-btn-danger text-[11px] py-[5px] px-2.5 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {showKeys && <ProviderKeysPanel providerId={provider.id} />}
      {showModels && (
        <FetchModelsPanel baseUrl={provider.baseUrl} providerId={provider.id} />
      )}
    </div>
  );
}

export default function AdminProvidersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const {
    data: providers,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Provider[]>({
    queryKey: ["admin", "providers"],
    queryFn: () => getAdminSDK().listProviders(),
  });

  const createProvider = useMutation({
    mutationFn: (data: Partial<Provider>) => getAdminSDK().createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setShowAddForm(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProviderStatus }) =>
      getAdminSDK().updateProviderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
  });

  const deleteProvider = useMutation({
    mutationFn: (id: string) => getAdminSDK().deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setDeleteConfirm(null);
    },
  });

  const [form, setForm] = useState({
    name: "",
    displayName: "",
    providerType: "openai" as string,
    baseUrl: "",
    apiKey: "",
    priority: 0,
    timeoutMs: 30000,
  });

  const [fetchedModels, setFetchedModels] = useState<
    { id: string; object?: string; owned_by?: string }[]
  >([]);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set(),
  );
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  const handleFetchModels = async () => {
    if (!form.baseUrl) {
      setFetchModelsError("Enter a base URL first");
      return;
    }
    setFetchingModels(true);
    setFetchModelsError(null);
    setFetchedModels([]);
    setSelectedModelIds(new Set());
    try {
      const result = await getAdminSDK().fetchModels(form.baseUrl, form.apiKey);
      setFetchedModels(result.models);
      if (result.models.length === 0) {
        setFetchModelsError("No models found at this endpoint");
      }
    } catch (err) {
      setFetchModelsError(
        err instanceof Error ? err.message : "Failed to fetch models",
      );
    } finally {
      setFetchingModels(false);
    }
  };

  const toggleModel = (id: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllModels = () => {
    if (selectedModelIds.size === fetchedModels.length) {
      setSelectedModelIds(new Set());
    } else {
      setSelectedModelIds(new Set(fetchedModels.map((m) => m.id)));
    }
  };

  const handleCreate = () => {
    const payload: Record<string, unknown> = {
      name: form.name,
      displayName: form.displayName || form.name,
      providerType: form.providerType,
      baseUrl: form.baseUrl,
      priority: form.priority,
      timeoutMs: form.timeoutMs,
    };
    if (form.apiKey) {
      payload.apiKey = form.apiKey;
    }
    if (selectedModelIds.size > 0) {
      payload.models = fetchedModels
        .filter((m) => selectedModelIds.has(m.id))
        .map((m) => ({
          modelId: m.id,
          displayName: m.id,
        }));
    }
    createProvider.mutate(payload as Partial<Provider>);
  };

  const resetForm = () => {
    setForm({
      name: "",
      displayName: "",
      providerType: "openai",
      baseUrl: "",
      apiKey: "",
      priority: 0,
      timeoutMs: 30000,
    });
    setFetchedModels([]);
    setSelectedModelIds(new Set());
    setFetchModelsError(null);
    setShowAddForm(false);
  };

  if (isLoading) {
    return <AdminCenterLoading label="Loading providers" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Server}
        title="Failed to load providers"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  const itemsPerPage = 10;
  const totalPages = providers ? Math.ceil(providers.length / itemsPerPage) : 0;
  const paginated = providers
    ? providers.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : [];

  return (
    <AdminPageHeader
      title="Providers"
      subtitle="Manage AI provider backends and API keys"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="admin-btn admin-btn-ghost text-[12px] disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
            />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="admin-btn admin-btn-primary text-[12px]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Provider
          </button>
        </div>
      }
    >
      {showAddForm && (
        <div className="admin-card p-5 border-indigo-500/15 bg-indigo-500/[0.015]">
          <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-4">
            New Provider
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Provider name (slug)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="admin-input text-[12px] py-[7px]"
            />
            <input
              placeholder="Display name"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              className="admin-input text-[12px] py-[7px]"
            />
            <select
              value={form.providerType}
              onChange={(e) =>
                setForm({ ...form, providerType: e.target.value })
              }
              className="admin-input text-[12px] py-[7px]"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="nvidia">NVIDIA NIM</option>
              <option value="deepseek">DeepSeek</option>
              <option value="mistral">Mistral</option>
              <option value="cohere">Cohere</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom (OpenAI-compatible)</option>
            </select>
            <input
              placeholder="Base URL (e.g. https://api.openai.com)"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="admin-input text-[12px] py-[7px] font-mono"
            />
            <input
              type="password"
              placeholder="API Key (optional, can add later)"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              className="admin-input text-[12px] py-[7px] font-mono"
            />
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={!form.baseUrl || fetchingModels}
              className="admin-btn admin-btn-primary text-[11px] py-[7px] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {fetchingModels ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
              {fetchingModels ? "Fetching..." : "Fetch Models"}
            </button>
            <div>
              <label className="block text-[9px] text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider font-semibold">
                Priority
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[var(--admin-text-dim)] mb-1 uppercase tracking-wider font-semibold">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(e) =>
                  setForm({ ...form, timeoutMs: Number(e.target.value) })
                }
                className="admin-input w-full text-[12px] py-[7px]"
              />
            </div>
          </div>

          {fetchModelsError && (
            <div className="mt-3 p-2.5 rounded-[10px] bg-red-500/[0.04] border border-red-500/10 text-[11px] text-red-400 flex items-center justify-between">
              <span>{fetchModelsError}</span>
              <button
                onClick={() => setFetchModelsError(null)}
                className="text-red-400/50 hover:text-red-400"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {fetchedModels.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">
                  {selectedModelIds.size} of {fetchedModels.length} models
                  selected
                </span>
                <button
                  onClick={toggleAllModels}
                  className="text-[10px] text-indigo-400/70 hover:text-indigo-400 transition-colors font-medium flex items-center gap-1"
                >
                  {selectedModelIds.size === fetchedModels.length ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {selectedModelIds.size === fetchedModels.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-[12px] border border-[var(--admin-border)] admin-scroll">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[var(--admin-surface-elevated)]">
                    <tr className="border-b border-[var(--admin-border)]">
                      <th className="w-8 py-1.5 pl-2"></th>
                      <th className="text-left font-medium py-1.5 pr-2">
                        Model ID
                      </th>
                      <th className="text-left font-medium py-1.5 pr-2">
                        Owned By
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchedModels.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-white/[0.015] hover:bg-white/[0.015] cursor-pointer"
                        onClick={() => toggleModel(m.id)}
                      >
                        <td className="py-1.5 pl-2">
                          {selectedModelIds.has(m.id) ? (
                            <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-[var(--admin-text-dim)]" />
                          )}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-[var(--admin-text)]">
                          {m.id}
                        </td>
                        <td className="py-1.5 pr-2 text-[var(--admin-text-muted)]">
                          {m.owned_by || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {createProvider.isError && (
            <div className="mt-3 p-2.5 rounded-[10px] bg-red-500/[0.04] border border-red-500/10 text-[11px] text-red-400">
              {createProvider.error instanceof Error
                ? createProvider.error.message
                : "Failed to create provider"}
            </div>
          )}
          <div className="flex gap-2 pt-3">
            <button
              onClick={handleCreate}
              disabled={!form.name || !form.baseUrl || createProvider.isPending}
              className="admin-btn admin-btn-primary text-[11px] py-[5px] disabled:opacity-50"
            >
              {createProvider.isPending ? "Creating..." : "Create Provider"}
            </button>
            <button
              onClick={resetForm}
              className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="admin-card p-5 border-red-500/15 bg-red-500/[0.015]">
          <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-2">
            Delete Provider
          </h3>
          <p className="text-[12px] text-[var(--admin-text-muted)] mb-4">
            Delete{" "}
            <span className="text-[var(--admin-text)] font-mono">
              {deleteConfirm.name}
            </span>
            ? This removes all keys and unregisters it from the runtime. Cannot
            be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteProvider.mutate(deleteConfirm.id)}
              disabled={deleteProvider.isPending}
              className="admin-btn admin-btn-danger text-[11px] py-[5px] disabled:opacity-50"
            >
              {deleteProvider.isPending ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="admin-btn admin-btn-ghost text-[11px] py-[5px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginated.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onToggleStatus={(id, status) => updateStatus.mutate({ id, status })}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        ))}
        {paginated.length === 0 && (
          <div className="col-span-full">
            <AdminEmptyState
              icon={Server}
              title="No providers configured"
              description="Add your first AI provider to start routing requests"
              action={
                <button
                  onClick={() => setShowAddForm(true)}
                  className="admin-btn admin-btn-primary text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  Add Provider
                </button>
              }
            />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5 disabled:opacity-20"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "w-8 h-8 rounded-[8px] text-[11px] font-mono transition-all duration-200",
                p === page
                  ? "bg-indigo-500/[0.08] text-indigo-400 border border-indigo-500/15"
                  : "text-[var(--admin-text-dim)] hover:bg-white/[0.02] hover:text-[var(--admin-text-muted)]",
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="admin-btn admin-btn-ghost text-[11px] py-[5px] px-2.5 disabled:opacity-20"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AdminPageHeader>
  );
}
