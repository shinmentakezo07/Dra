"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  critical: "bg-red-500/10 text-red-400",
};

export default function AdminAnnouncementsPage() {
  const {
    data: announcements,
    isLoading,
    error,
  } = useQuery<{ id: string; title: string; body: string; priority: string; targetType: string; startsAt: string; endsAt?: string; createdAt: string; createdBy: string }[]>({
    queryKey: ["admin", "announcements"],
    queryFn: () => getAdminSDK().listAnnouncements(),
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
          {error instanceof Error ? error.message : "Failed to load announcements"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <p className="mt-1 text-sm text-white/50">Create and manage platform announcements</p>
      </div>

      {!announcements || announcements.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-white/5 bg-white/5">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No announcements</p>
            <p className="mt-1 text-sm text-white/30">No platform announcements have been created yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-xl border border-white/5 bg-white/5 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {announcement.title}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ml-3 ${
                    PRIORITY_STYLES[announcement.priority] || "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {announcement.priority}
                </span>
              </div>
              <p className="text-sm text-white/60 line-clamp-2 mb-3">
                {announcement.body}
              </p>
              <div className="flex items-center gap-4 text-xs text-white/40">
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
                <span className="ml-auto font-mono text-white/30">
                  {announcement.createdBy}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
