"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useKeys, useCreateKey, useDeleteKey } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { getSDK } from "@/lib/api/sdk";

export default function KeysClient() {
  const { data: keys, isLoading, error } = useKeys();
  const createKey = useCreateKey();
  const deleteKey = useDeleteKey();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const sdk = getSDK();

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskKey = (key: string | undefined, fallbackId?: string) => {
    if (key) return `${key.slice(0, 12)}${"•".repeat(32)}${key.slice(-4)}`;
    if (fallbackId) {
      const prefix = "dra_";
      const hash = fallbackId.replace(/-/g, "").slice(0, 32).padEnd(32, "x");
      return `${prefix}${hash.slice(0, 8)}${"•".repeat(24)}${hash.slice(24, 28)}`;
    }
    return "dra_••••••••••••••••••••••••••••••••";
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const created = await createKey.mutateAsync({ name: newKeyName.trim() });
      setNewKeyName("");
      setShowCreateModal(false);
      if (created.key) {
        setNewlyCreatedKey(created.id);
        setVisibleKeys((prev) => new Set(prev).add(created.id));
        setTimeout(() => setNewlyCreatedKey(null), 5000);
      }
    } catch (err) {
      // Error handled by mutation state
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone.",
      )
    )
      return;
    try {
      await deleteKey.mutateAsync(keyId);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  const errorMessage = error
    ? getErrorMessage(error)
    : createKey.error
      ? getErrorMessage(createKey.error)
      : deleteKey.error
        ? getErrorMessage(deleteKey.error)
        : null;

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Key className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-white">API Keys</h1>
            </div>
            <p className="text-gray-400">
              Manage your API keys for authentication
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Key
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-1">Error</h3>
              <p className="text-xs text-red-300/80">{errorMessage}</p>
              {sdk.lastRequestId() && (
                <p className="text-xs text-red-400/60 mt-1 font-mono">
                  Request ID: {sdk.lastRequestId()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-400 mb-1">
              Keep your keys secure
            </h3>
            <p className="text-xs text-yellow-300/80">
              Never share your API keys publicly or commit them to version
              control. Treat them like passwords.
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* API Keys List */}
        {!isLoading && (
          <div className="space-y-4">
            <AnimatePresence>
              {keys?.map((apiKey, index) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-[#0A0A0A] border rounded-xl p-6 hover:border-white/20 transition-colors ${
                    newlyCreatedKey === apiKey.id
                      ? "border-primary/50"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white">
                          {apiKey.name}
                        </h3>
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-mono rounded border border-green-500/20">
                          ACTIVE
                        </span>
                        {newlyCreatedKey === apiKey.id && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded border border-primary/20">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm font-mono text-gray-300">
                          {visibleKeys.has(apiKey.id) && apiKey.key
                            ? apiKey.key
                            : maskKey(apiKey.key, apiKey.id)}
                        </code>

                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title={
                            visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"
                          }
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            copyToClipboard(apiKey.id, apiKey.key || "")
                          }
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="Copy to clipboard"
                          disabled={!apiKey.key}
                        >
                          {copiedKey === apiKey.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>
                          Created:{" "}
                          {new Date(apiKey.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Last used:{" "}
                          {apiKey.lastUsed
                            ? new Date(apiKey.lastUsed).toLocaleString()
                            : "Never"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="self-start lg:self-center p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400 group"
                      title="Revoke key"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && keys?.length === 0 && (
          <div className="text-center py-12 bg-[#0A0A0A] border border-white/10 rounded-xl">
            <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No API keys yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-primary hover:underline text-sm"
            >
              Create your first API key
            </button>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0A0A] border border-white/20 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Create New API Key
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Give your API key a descriptive name to help you identify it
                later.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API, Mobile App"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || createKey.isPending}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {createKey.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Create Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
