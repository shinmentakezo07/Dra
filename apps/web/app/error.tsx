"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
          Something went wrong!
        </h1>
        
        <p className="text-gray-400 mb-2 font-mono text-sm">
          {error.message || "An unexpected error occurred"}
        </p>
        
        {error.digest && (
          <p className="text-gray-600 mb-8 font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-xs text-gray-600 font-mono">
            If this problem persists, please contact support.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
