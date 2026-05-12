import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className={cn(sizeClasses[size], "text-[#3b82f6]")} />
      </motion.div>
      {text && (
        <p className="text-sm text-gray-400 font-mono animate-pulse">{text}</p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 space-y-2"
        >
          <p className="text-white font-bold text-lg">Loading...</p>
          <p className="text-gray-500 text-sm font-mono">INITIALIZING_SYSTEMS</p>
        </motion.div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 animate-pulse">
      <div className="h-32 bg-white/5 rounded-2xl mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
        <div className="h-10 bg-white/5 rounded mt-4" />
      </div>
    </div>
  );
}
