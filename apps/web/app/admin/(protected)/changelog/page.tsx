"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { cn } from "@/lib/utils";
import type { ChangelogEntry } from "@/types/admin";
import AdminPageHeader from "../../AdminPageHeader";
import {
  AdminCenterLoading,
  AdminEmptyState,
} from "@/components/admin/AdminUI";

const TYPE_STYLES: Record<string, string> = {
  new: "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15",
  change: "text-indigo-400 bg-indigo-500/8 border border-indigo-500/15",
  deprecation: "text-amber-400 bg-amber-500/8 border border-amber-500/15",
  fix: "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
};

export default function AdminChangelogPage() {
  const { data, isLoading, error } = useQuery<ChangelogEntry[]>({
    queryKey: ["admin", "changelog"],
    queryFn: () => getAdminSDK().listChangelog(),
  });

  const entries = data ?? [];

  if (isLoading) {
    return <AdminCenterLoading label="Loading changelog" />;
  }

  if (error) {
    return (
      <AdminEmptyState
        icon={FileText}
        title="Failed to load changelog"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <AdminPageHeader title="Changelog" subtitle="API changelog management">
      {entries.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title="No changelog entries"
          description="Changelog entries will appear here once published"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="admin-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate text-[14px] font-semibold text-[var(--admin-text)]">
                      {entry.title}
                    </h3>
                    <span
                      className={cn(
                        "admin-badge capitalize",
                        TYPE_STYLES[entry.type] ||
                          "text-[var(--admin-text-dim)] bg-white/[0.03] border border-white/[0.04]",
                      )}
                    >
                      {entry.type}
                    </span>
                    {entry.isDraft && (
                      <span className="admin-badge text-orange-400 bg-orange-500/8 border border-orange-500/15">
                        Draft
                      </span>
                    )}
                  </div>
                  {entry.body && (
                    <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--admin-text-muted)] leading-relaxed">
                      {entry.body}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-[11px] text-[var(--admin-text-dim)]">
                    v{entry.version}
                  </span>
                  {entry.publishedAt && (
                    <p className="mt-1 text-[11px] text-[var(--admin-text-dim)]">
                      {new Date(entry.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageHeader>
  );
}
