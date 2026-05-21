"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import AdminPageHeader from "../../AdminPageHeader";

const PRIORITY_STYLES: Record<string, string> = {
  info: "text-indigo-400 bg-indigo-500/8 border border-indigo-500/15",
  warning: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  critical: "text-red-400 bg-red-500/8 border border-red-500/15",
};

export default function AdminAnnouncementsPage() {
  const { data: announcements, isLoading, error } = useQuery<{ id: string; title: string; body: string; priority: string; targetType: string; startsAt: string; endsAt?: string; createdAt: string; createdBy: string }[]>({
    queryKey: ["admin", "announcements"],
    queryFn: () => getAdminSDK().listAnnouncements(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[13px] text-red-400/70">{error instanceof Error ? error.message : "Failed to load announcements"}</p>
      </div>
    );
  }

  return (
    <AdminPageHeader title="Announcements" subtitle="Platform announcements and notices">
      {!announcements || announcements.length === 0 ? (
        <div className="admin-card flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <p className="text-[14px] font-medium text-[var(--admin-text-muted)]">No announcements</p>
            <p className="mt-1 text-[12px] text-[var(--admin-text-dim)]">No platform announcements have been created yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="admin-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--admin-text)] truncate text-[14px]">{announcement.title}</h3>
                </div>
                <span className={`admin-badge capitalize ml-3 ${PRIORITY_STYLES[announcement.priority] || "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]"}`}>
                  {announcement.priority}
                </span>
              </div>
              <p className="text-[12px] text-[var(--admin-text-muted)] line-clamp-2 mb-3 leading-relaxed">{announcement.body}</p>
              <div className="flex items-center gap-4 text-[11px] text-[var(--admin-text-dim)]">
                <span>{new Date(announcement.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                {announcement.endsAt && (
                  <span>Ends {new Date(announcement.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                )}
                <span className="ml-auto font-mono">{announcement.createdBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageHeader>
  );
}
