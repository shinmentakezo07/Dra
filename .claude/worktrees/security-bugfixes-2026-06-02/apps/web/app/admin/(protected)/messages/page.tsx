"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Send, Trash2, Plus } from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
  info: "text-indigo-400 bg-indigo-500/8 border border-indigo-500/15",
  warning: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  critical: "text-red-400 bg-red-500/8 border border-red-500/15",
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
        targetIds: data.targetIds
          ? data.targetIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
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
    return <AdminCenterLoading label="Loading messages" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Send}
        title="Failed to load messages"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <AdminPageHeader
      title="Messages"
      subtitle="Send targeted messages to users"
      action={
        <button
          onClick={() => setShowForm(!showForm)}
          className="admin-btn admin-btn-primary text-[12px]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Message
        </button>
      }
    >
      {showForm && (
        <div className="admin-card p-6 border-indigo-500/15 bg-indigo-500/[0.015] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="admin-input w-full"
                placeholder="Message title"
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="admin-input w-full"
              >
                <option value="low">Low</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="admin-label block mb-1.5">Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="admin-input w-full resize-none"
              placeholder="Message content..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Target</label>
              <select
                value={form.targetType}
                onChange={(e) =>
                  setForm({ ...form, targetType: e.target.value })
                }
                className="admin-input w-full"
              >
                <option value="all">All Users</option>
                <option value="user">Specific User</option>
                <option value="tier">By Tier</option>
                <option value="group">By Group</option>
              </select>
            </div>
            {form.targetType !== "all" && (
              <div>
                <label className="admin-label block mb-1.5">
                  {form.targetType === "user"
                    ? "User IDs (comma-sep)"
                    : form.targetType === "tier"
                      ? "Tier Names"
                      : "Group Names"}
                </label>
                <input
                  type="text"
                  value={form.targetIds}
                  onChange={(e) =>
                    setForm({ ...form, targetIds: e.target.value })
                  }
                  className="admin-input w-full"
                  placeholder={
                    form.targetType === "user" ? "uuid1, uuid2" : "free, pro"
                  }
                />
              </div>
            )}
            <div>
              <label className="admin-label block mb-1.5">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
                className="admin-input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="admin-btn admin-btn-ghost text-[12px]"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || !form.body || createMutation.isPending}
              className="admin-btn admin-btn-primary text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {createMutation.isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}

      {!data || data.data.length === 0 ? (
        <AdminEmptyState
          icon={Send}
          title="No messages"
          description="Send your first message to users"
        />
      ) : (
        <div className="space-y-3">
          {data.data.map((msg) => (
            <div key={msg.id} className="admin-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--admin-text)] truncate text-[14px]">
                    {msg.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`admin-badge capitalize ${PRIORITY_STYLES[msg.priority] || "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}
                  >
                    {msg.priority}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(msg.id)}
                    className="rounded-[8px] p-[6px] text-[var(--admin-text-dim)] hover:text-red-400/70 hover:bg-red-500/[0.04] transition-colors"
                    aria-label="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-[var(--admin-text-muted)] line-clamp-2 mb-3 leading-relaxed">
                {msg.body}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-[var(--admin-text-dim)]">
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
    </AdminPageHeader>
  );
}
