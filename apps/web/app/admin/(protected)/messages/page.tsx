"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2, Send, Trash2, Plus } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-400",
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  critical: "bg-red-500/10 text-red-400",
};

const TARGET_LABELS: Record<string, string> = {
  all: "All Users",
  user: "Specific User",
  tier: "By Tier",
  group: "By Group",
};

interface MessageForm {
  title: string;
  body: string;
  priority: string;
  targetType: string;
  targetIds: string;
  expiresAt: string;
}

const emptyForm: MessageForm = {
  title: "",
  body: "",
  priority: "info",
  targetType: "all",
  targetIds: "",
  expiresAt: "",
};

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MessageForm>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: () => getAdminSDK().listMessages(),
  });

  const createMutation = useMutation({
    mutationFn: (data: MessageForm) =>
      getAdminSDK().createMessage({
        title: data.title,
        body: data.body,
        priority: data.priority,
        targetType: data.targetType,
        targetIds: data.targetIds ? data.targetIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        expiresAt: data.expiresAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getAdminSDK().deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
    },
  });

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
          {error instanceof Error ? error.message : "Failed to load messages"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="mt-1 text-sm text-white/50">Send targeted messages to users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Message
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-white/5 bg-white/5 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                placeholder="Message title"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="low">Low</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
              placeholder="Message content..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">Target</label>
              <select
                value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Users</option>
                <option value="user">Specific User</option>
                <option value="tier">By Tier</option>
                <option value="group">By Group</option>
              </select>
            </div>
            {form.targetType !== "all" && (
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">
                  {form.targetType === "user" ? "User IDs (comma-separated)" : form.targetType === "tier" ? "Tier Names (comma-separated)" : "Group Names (comma-separated)"}
                </label>
                <input
                  type="text"
                  value={form.targetIds}
                  onChange={(e) => setForm({ ...form, targetIds: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  placeholder={form.targetType === "user" ? "uuid1, uuid2" : "free, pro"}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-mono text-white/40 mb-1.5 uppercase tracking-wider">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || !form.body || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {createMutation.isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}

      {!data || data.data.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-white/5 bg-white/5">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No messages</p>
            <p className="mt-1 text-sm text-white/30">Send your first message to users</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-white/5 bg-white/5 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{msg.title}</h3>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      PRIORITY_STYLES[msg.priority] || "bg-gray-500/10 text-gray-400"
                    }`}
                  >
                    {msg.priority}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(msg.id)}
                    className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/60 line-clamp-2 mb-3">{msg.body}</p>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span>{TARGET_LABELS[msg.targetType] || msg.targetType}</span>
                <span>
                  {new Date(msg.sentAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {msg.expiresAt && (
                  <span>
                    Expires{" "}
                    {new Date(msg.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="ml-auto">{msg.readCount} read</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
