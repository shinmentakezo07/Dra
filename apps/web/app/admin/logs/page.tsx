"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import { Loader2 } from "lucide-react";

export default function AdminLogsPage() {
  const { isLoading } = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: () => getAdminSDK().listSuspicious({ limit: 1 }),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Logs</h1>
        <p className="mt-1 text-sm text-white/50">Request and error logs</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-white/5 bg-white/5">
        <div className="rounded-full bg-blue-500/10 p-4 mb-4">
          <Loader2 className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Log viewer coming soon</h3>
        <p className="text-sm text-white/50 max-w-md text-center">
          The full request and error log viewer is under development. You'll be able to
          search, filter, and export logs with detailed request and response data.
        </p>
      </div>
    </div>
  );
}
