"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Clock,
  Zap,
  Hash,
  User,
  KeyRound,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { APILog } from "@/lib/api/sdk";

interface LogDetailDrawerProps {
  log: APILog | null;
  onClose: () => void;
}

const drawerVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.2 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-white/10 transition-colors group"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="w-3.5 h-3.5 text-green-400" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  copyable,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] px-1 -mx-1 rounded-lg transition-colors">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm text-white ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

export function LogDetailDrawer({ log, onClose }: LogDetailDrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (log) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [log, onClose]);

  return (
    <AnimatePresence>
      {log && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0A0A0A] border-l border-white/10 z-50 overflow-y-auto hero-scroll"
          >
            <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Log Details
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Request metadata
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div
                className={`rounded-xl p-4 border ${
                  log.status === "success"
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {log.status === "success" ? (
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <ChevronUp className="w-5 h-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        log.status === "success"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {log.status === "success"
                        ? "Request Succeeded"
                        : "Request Failed"}
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-300/70 mt-1 font-mono break-all">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Model & Provider */}
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  Model Information
                </h3>
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-1">
                  <DetailRow
                    icon={Hash}
                    label="Model"
                    value={log.model}
                    mono
                    copyable
                  />
                  <DetailRow
                    icon={User}
                    label="Provider"
                    value={log.provider}
                    mono
                  />
                </div>
              </div>

              {/* Tokens & Cost */}
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Usage & Cost
                </h3>
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-1">
                  <DetailRow
                    icon={Zap}
                    label="Input Tokens"
                    value={log.inputTokens.toLocaleString()}
                    mono
                  />
                  <DetailRow
                    icon={Zap}
                    label="Output Tokens"
                    value={log.outputTokens.toLocaleString()}
                    mono
                  />
                  <DetailRow
                    icon={Zap}
                    label="Total Tokens"
                    value={(
                      log.inputTokens + log.outputTokens
                    ).toLocaleString()}
                    mono
                  />
                  <DetailRow
                    icon={Clock}
                    label="Cost"
                    value={`$${(log.cost / 100000).toFixed(6)}`}
                    mono
                  />
                  <DetailRow
                    icon={Clock}
                    label="Latency"
                    value={`${log.latency}ms`}
                    mono
                  />
                </div>
              </div>

              {/* Identifiers */}
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Identifiers
                </h3>
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-1">
                  <DetailRow
                    icon={Hash}
                    label="Log ID"
                    value={log.id}
                    mono
                    copyable
                  />
                  {log.apiKeyId && (
                    <DetailRow
                      icon={KeyRound}
                      label="API Key ID"
                      value={log.apiKeyId}
                      mono
                      copyable
                    />
                  )}
                  <DetailRow
                    icon={User}
                    label="User ID"
                    value={log.userId}
                    mono
                    copyable
                  />
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Timestamp
                </h3>
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-1">
                  <DetailRow
                    icon={Clock}
                    label="Created"
                    value={new Date(log.createdAt).toLocaleString()}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
