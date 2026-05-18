"use client";

import { useEffect } from "react";

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
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Admin Panel Error</h2>
        <p className="text-gray-400 text-sm max-w-md">
          An error occurred while loading the admin panel. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#3b82f6] text-black font-medium rounded-lg hover:bg-[#3b82f6]/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
