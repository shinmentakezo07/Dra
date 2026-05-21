"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangelogEntry } from "@/types/admin";

import AdminPageHeader from "../../AdminPageHeader";
const TYPE_STYLES: Record<string, string> = {
  new: "text-green-400 bg-green-500/10",
  change: "text-blue-400 bg-blue-500/10",
  deprecation: "text-yellow-400 bg-yellow-500/10",
  fix: "text-gray-400 bg-gray-500/10",
};

export default function AdminChangelogPage() {
  const { data, isLoading, error } = useQuery<ChangelogEntry[]>({
    queryKey: ["admin", "changelog"],
    queryFn: () => getAdminSDK().listChangelog(),
  });

  const entries = data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Changelog</h1>
        <p className="mt-1 text-sm text-white/50">API changelog management</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-red-400">
            {error instanceof Error ? error.message : "Failed to load changelog"}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-white/40">No changelog entries</p>
            <p className="mt-1 text-sm text-white/30">Changelog entries will appear here once published</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-xl border border-white/10 p-5 transition-colors hover:border-white/20",
                index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate text-base font-semibold text-white">
                      {entry.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        TYPE_STYLES[entry.type] || "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {entry.type}
                    </span>
                    {entry.isDraft && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                        Draft
                      </span>
                    )}
                  </div>
                  {entry.body && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-white/50">
                      {entry.body}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs text-white/30">
                    v{entry.version}
                  </span>
                  {entry.publishedAt && (
                    <p className="mt-1 text-xs text-white/40">
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
    </div>
  );
}
