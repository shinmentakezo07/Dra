"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto w-12 h-12 rounded-[14px] bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-400/70" />
        </div>
        <h2 className="text-[15px] font-semibold text-[var(--admin-text)]">
          Something went wrong
        </h2>
        <p className="text-[13px] text-[var(--admin-text-muted)] leading-relaxed">
          An error occurred while loading this section. Please try again.
        </p>
        <button onClick={reset} className="admin-btn admin-btn-ghost mx-auto">
          Try again
        </button>
      </div>
    </div>
  );
}
