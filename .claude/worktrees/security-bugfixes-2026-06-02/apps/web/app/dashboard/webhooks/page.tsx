"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import type { Webhook } from "@/lib/api/sdk";
import {
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Webhook as WebhookIcon,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_OPTIONS = [
  "chat.completed",
  "chat.failed",
  "batch.completed",
  "batch.failed",
  "credits.low",
  "credits.exhausted",
  "budget.exceeded",
  "key.revoked",
  "user.signup",
  "provider.unhealthy",
];

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => getSDK().listWebhooks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      url: string;
      events: string[];
      secret?: string;
    }) =>
      getSDK().createWebhook({
        name: data.name,
        url: data.url,
        events: data.events,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Webhook> }) =>
      getSDK().updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSDK().deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      getSDK().updateWebhook(id, { active } as Partial<Webhook>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WebhookIcon className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-white">Webhooks</h1>
            <p className="text-sm text-gray-400">
              Manage outbound event delivery to external endpoints
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <WebhookForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowCreate(false)}
              isPending={createMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {webhooks?.map((wh) => (
          <WebhookCard
            key={wh.id}
            webhook={wh}
            isEditing={editingId === wh.id}
            onToggleEdit={() =>
              setEditingId(editingId === wh.id ? null : wh.id)
            }
            onToggleActive={() =>
              toggleMutation.mutate({ id: wh.id, active: !wh.active })
            }
            onUpdate={(data) => updateMutation.mutate({ id: wh.id, data })}
            onDelete={() => deleteMutation.mutate(wh.id)}
            isPending={
              updateMutation.isPending ||
              deleteMutation.isPending ||
              toggleMutation.isPending
            }
          />
        ))}
        {(!webhooks || webhooks.length === 0) && !showCreate && (
          <div className="text-center py-12 text-gray-500">
            <WebhookIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No webhooks configured.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Add your first webhook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookForm({
  onSubmit,
  onCancel,
  isPending,
  initial,
}: {
  onSubmit: (data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  initial?: { name?: string; url?: string; events?: string[]; secret?: string };
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [secret, setSecret] = useState(initial?.secret ?? "");
  const [events, setEvents] = useState<string[]>(initial?.events ?? []);

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Endpoint URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Signing Secret <span className="text-gray-600">(optional)</span>
        </label>
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="whsec_..."
          className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">Events</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((event) => (
            <button
              key={event}
              onClick={() => toggleEvent(event)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                events.includes(event)
                  ? "bg-primary/20 border-primary/30 text-primary"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              {event}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() =>
            onSubmit({ name: url, url, events, secret: secret || undefined })
          }
          disabled={!url || events.length === 0 || isPending}
          className="px-4 py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : initial ? "Update" : "Create"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function WebhookCard({
  webhook,
  isEditing,
  onToggleEdit,
  onToggleActive,
  onUpdate,
  onDelete,
  isPending,
}: {
  webhook: Webhook;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleActive: () => void;
  onUpdate: (data: Partial<Webhook>) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        webhook.active
          ? "border-white/5 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01] opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                webhook.active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-gray-500/10 text-gray-400"
              }`}
            >
              {webhook.active ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {webhook.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-white">
            <span className="truncate">{webhook.url}</span>
            <button
              onClick={copyUrl}
              className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
            >
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {webhook.events.map((event) => (
              <span
                key={event}
                className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-gray-400 font-mono"
              >
                {event}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleActive}
            disabled={isPending}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
              webhook.active
                ? "text-amber-400 hover:bg-amber-500/10"
                : "text-emerald-400 hover:bg-emerald-500/10"
            }`}
            title={webhook.active ? "Disable" : "Enable"}
          >
            {webhook.active ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onToggleEdit}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {webhook.secret && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <span className="text-xs text-gray-500">Secret:</span>
          <code className="text-xs font-mono text-gray-400">
            {showSecret ? webhook.secret : `${webhook.secret.slice(0, 8)}...`}
          </code>
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            {showSecret ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-white/5"
        >
          <WebhookForm
            initial={{
              url: webhook.url,
              events: webhook.events,
              secret: webhook.secret,
            }}
            onSubmit={(data) =>
              onUpdate({
                url: data.url,
                events: data.events,
                secret: data.secret,
              })
            }
            onCancel={onToggleEdit}
            isPending={isPending}
          />
        </motion.div>
      )}
    </div>
  );
}
