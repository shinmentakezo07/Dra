"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { Provider, ProviderKey, ProviderStatus } from "@/types/admin";
import AdminPageHeader from "../AdminPageHeader";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderCardProps {
  provider: Provider;
  onToggleStatus: (id: string, status: ProviderStatus) => void;
}

const statusStyle: Record<ProviderStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  inactive: "bg-gray-500/10 text-gray-400",
  maintenance: "bg-amber-500/10 text-amber-400",
  deprecated: "bg-red-500/10 text-red-400",
};

const strategyLabel: Record<string, string> = {
  "round-robin": "Round Robin",
  "fill-first": "Fill First",
  weighted: "Weighted",
  "latency-optimized": "Latency Opt",
  "quota-aware": "Quota Aware",
};

function ProviderKeysPanel({
  providerId,
}: {
  providerId: string;
}) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await getAdminSDK().listProviderKeys(providerId);
      setKeys(data);
    } finally {
      setLoading(false);
    }
  };

  const createKey = useMutation({
    mutationFn: (data: Partial<ProviderKey>) =>
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
    },
  });

  const [form, setForm] = useState({
    label: "",
    key: "",
    strategy: "round-robin" as const,
    weight: 1,
  });

  return (
    <div className="border-t border-white/5 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            if (keys.length === 0) loadKeys();
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Key
        </button>
        <button
          onClick={loadKeys}
          className={cn(
            "flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors",
            loading && "animate-spin",
          )}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
          <input
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
          <input
            placeholder="API Key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-2">
            <select
              value={form.strategy}
              onChange={(e) => setForm({ ...form, strategy: e.target.value })}
              className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500/50"
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
              onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              className="w-20 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                createKey.mutate({
                  label: form.label,
                  strategy: form.strategy as ProviderKey["strategy"],
                  weight: form.weight,
                } as Partial<ProviderKey>);
              }}
              disabled={!form.label || createKey.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {createKey.isPending ? "Saving..." : "Save Key"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        </div>
      ) : keys.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
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
                <tr key={key.id} className="border-b border-white/[0.02] text-white/70">
                  <td className="py-1.5 pr-2 font-medium text-white/80">{key.label}</td>
                  <td className="py-1.5 pr-2 font-mono text-white/50">{key.keyPrefix}...{key.keyLastFour}</td>
                  <td className="py-1.5 pr-2">{strategyLabel[key.strategy] || key.strategy}</td>
                  <td className="py-1.5 pr-2">{key.weight}</td>
                  <td className="py-1.5 pr-2">{key.usageCount.toLocaleString()}</td>
                  <td className="py-1.5 pr-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                        key.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {key.isActive ? "active" : "disabled"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => deleteKey.mutate(key.id)}
                      className="text-red-400/60 hover:text-red-400 transition-colors"
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
        <p className="text-xs text-white/30 text-center py-2">No keys configured</p>
      )}
    </div>
  );
}

function ProviderCard({ provider, onToggleStatus }: ProviderCardProps) {
  const [showKeys, setShowKeys] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: provider.displayName,
    baseUrl: provider.baseUrl,
    priority: provider.priority,
    timeoutMs: provider.timeoutMs,
  });
  const queryClient = useQueryClient();

  const updateProvider = useMutation({
    mutationFn: (data: Partial<Provider>) =>
      getAdminSDK().updateProvider(data),
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
    <div className="rounded-xl border border-white/5 bg-white/5 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{provider.displayName}</h3>
            <p className="text-xs text-white/40">{provider.name}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize",
            statusStyle[provider.status],
          )}
        >
          {provider.status}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2 mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <input
            value={editForm.displayName}
            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            placeholder="Display Name"
          />
          <input
            value={editForm.baseUrl}
            onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono"
            placeholder="Base URL"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-white/40 mb-1">Priority</label>
              <input
                type="number"
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-white/40 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={editForm.timeoutMs}
                onChange={(e) => setEditForm({ ...editForm, timeoutMs: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={updateProvider.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {updateProvider.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Type</p>
            <p className="text-white/80 font-mono">{provider.providerType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Base URL</p>
            <p className="text-white/60 truncate font-mono text-xs" title={provider.baseUrl}>
              {provider.baseUrl}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Priority</p>
            <p className="text-white/80">{provider.priority}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Timeout</p>
            <p className="text-white/80">{provider.timeoutMs}ms</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          onClick={() => {
            setShowKeys(!showKeys);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
          {showKeys ? "Hide Keys" : "View Keys"}
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 rounded-md transition-colors"
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 rounded-md transition-colors ml-auto"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Toggle Status
        </button>
      </div>

      {showKeys && <ProviderKeysPanel providerId={provider.id} />}
    </div>
  );
}

export default function AdminProvidersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
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
    mutationFn: (data: Partial<Provider>) =>
      getAdminSDK().createProvider(data),
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

  const [form, setForm] = useState({
    name: "",
    displayName: "",
    providerType: "",
    baseUrl: "",
    priority: 0,
    timeoutMs: 30000,
  });

  const handleCreate = () => {
    createProvider.mutate({
      name: form.name,
      displayName: form.displayName || form.name,
      providerType: form.providerType,
      baseUrl: form.baseUrl,
      priority: form.priority,
      timeoutMs: form.timeoutMs,
      status: "active",
    } as Partial<Provider>);
  };

  const resetForm = () => {
    setForm({
      name: "",
      displayName: "",
      providerType: "",
      baseUrl: "",
      priority: 0,
      timeoutMs: 30000,
    });
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400">
          {error instanceof Error ? error.message : "Failed to load providers"}
        </p>
      </div>
    );
  }

  const itemsPerPage = 10;
  const totalPages = providers ? Math.ceil(providers.length / itemsPerPage) : 0;
  const paginated = providers
    ? providers.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Providers</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage AI provider backends and API keys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/50 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Provider
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 p-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] space-y-3">
          <h3 className="text-sm font-semibold text-white mb-3">New Provider</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Provider name (slug)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <input
              placeholder="Display name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <input
              placeholder="Provider type (e.g. openai)"
              value={form.providerType}
              onChange={(e) => setForm({ ...form, providerType: e.target.value })}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <input
              placeholder="Base URL"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono"
            />
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!form.name || !form.providerType || !form.baseUrl || createProvider.isPending}
              className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {createProvider.isPending ? "Creating..." : "Create Provider"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
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
          />
        ))}
        {paginated.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-white/30">
            <Server className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No providers configured</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Add your first provider
            </button>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/50 hover:text-white/70 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                p === page
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5",
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/50 hover:text-white/70 disabled:opacity-30 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
