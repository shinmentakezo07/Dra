"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Send, Plus } from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

const PRIORITY_STYLES: Record<string, string> = {
  info: "text-indigo-400 bg-indigo-500/8 border border-indigo-500/15",
  warning: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  critical: "text-red-400 bg-red-500/8 border border-red-500/15",
};

interface AnnouncementForm {
  title: string;
  body: string;
  priority: string;
  targetType: string;
  targetIds: string;
  startsAt: string;
  endsAt: string;
  showInApp: boolean;
  sendEmail: boolean;
}

const emptyForm: AnnouncementForm = {
  title: "",
  body: "",
  priority: "info",
  targetType: "all",
  targetIds: "",
  startsAt: "",
  endsAt: "",
  showInApp: true,
  sendEmail: false,
};

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);

  const {
    data: announcements,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => getAdminSDK().listAnnouncements(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementForm) =>
      getAdminSDK().createAnnouncement({
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
        startsAt: data.startsAt
          ? new Date(data.startsAt).toISOString()
          : new Date().toISOString(),
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
        showInApp: data.showInApp,
        sendEmail: data.sendEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  if (isLoading) {
    return <AdminCenterLoading label="Loading announcements" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={Send}
        title="Failed to load announcements"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <AdminPageHeader
      title="Announcements"
      subtitle="Platform announcements and notices"
      action={
        <button
          onClick={() => setShowForm(!showForm)}
          className="admin-btn admin-btn-primary text-[12px]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Announcement
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
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="admin-input w-full"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="admin-label block mb-1.5">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="admin-input w-full resize-none"
              placeholder="Announcement content..."
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
              <label className="admin-label block mb-1.5">Start Date</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="admin-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="admin-label block mb-1.5">
                End Date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="admin-input w-full"
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInApp}
                  onChange={(e) =>
                    setForm({ ...form, showInApp: e.target.checked })
                  }
                  className="rounded border-white/20 bg-white/5"
                />
                <span className="admin-label">Show in App</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendEmail}
                  onChange={(e) =>
                    setForm({ ...form, sendEmail: e.target.checked })
                  }
                  className="rounded border-white/20 bg-white/5"
                />
                <span className="admin-label">Send Email</span>
              </label>
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
              {createMutation.isPending ? "Creating..." : "Create Announcement"}
            </button>
          </div>
        </div>
      )}

      {!announcements || announcements.length === 0 ? (
        <AdminEmptyState
          icon={Send}
          title="No announcements"
          description="No platform announcements have been created yet"
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="admin-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--admin-text)] truncate text-[14px]">
                    {announcement.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`admin-badge capitalize ${PRIORITY_STYLES[announcement.priority] || "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}
                  >
                    {announcement.priority}
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-[var(--admin-text-muted)] line-clamp-2 mb-3 leading-relaxed">
                {announcement.body}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-[var(--admin-text-dim)]">
                <span>
                  {new Date(announcement.startsAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {announcement.endsAt && (
                  <span>
                    Ends{" "}
                    {new Date(announcement.endsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {announcement.showInApp && (
                  <span className="text-green-400/60">In-App</span>
                )}
                {announcement.sendEmail && (
                  <span className="text-blue-400/60">Email</span>
                )}
                <span className="ml-auto font-mono">
                  {announcement.createdBy}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageHeader>
  );
}
