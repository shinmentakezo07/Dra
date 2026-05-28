"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import type { FineTuningJob, FileInfo } from "@/lib/api/sdk";
import {
  Wand2,
  Upload,
  FileJson,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function statusBadge(status: FineTuningJob["status"]) {
  const config: Record<
    FineTuningJob["status"],
    { icon: typeof Clock; color: string }
  > = {
    queued: { icon: Clock, color: "bg-gray-500/10 text-gray-400" },
    running: { icon: Loader2, color: "bg-blue-500/10 text-blue-400" },
    completed: {
      icon: CheckCircle,
      color: "bg-emerald-500/10 text-emerald-400",
    },
    failed: { icon: XCircle, color: "bg-red-500/10 text-red-400" },
  };
  const { icon: Icon, color } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      <Icon
        className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`}
      />
      {status}
    </span>
  );
}

export default function FineTuningPage() {
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: () => getSDK().listModels(),
  });

  const { data: jobsData, refetch } = useQuery({
    queryKey: ["fine-tuning-jobs"],
    queryFn: () => getSDK().listFineTuningJobs(1, 50),
    refetchInterval: (query) => {
      const jobs = query.state.data?.data ?? [];
      return jobs.some((j) => j.status === "running" || j.status === "queued")
        ? 15000
        : false;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["uploaded-files"],
    queryFn: () => getSDK().listFiles(),
  });

  const jobs = jobsData?.data ?? [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const startFineTuning = async () => {
    if (!selectedModel || !selectedFile) return;
    setIsUploading(true);
    try {
      const uploaded = await getSDK().uploadFile(
        selectedFile,
        selectedFile.name,
      );
      await getSDK().createFineTuningJob?.({
        baseModel: selectedModel,
        datasetId: uploaded.id,
      });
      setSelectedFile(null);
      setSelectedModel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch {
      void 0;
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const finetunableModels =
    models?.filter(
      (m) =>
        m.provider.toLowerCase().includes("openai") ||
        m.provider.toLowerCase().includes("anthropic"),
    ) ?? [];

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-white">Fine-tuning</h1>
            <p className="text-sm text-gray-400">
              Train custom models on your data — upload datasets, track jobs,
              deploy results
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            New Fine-tuning Job
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Base Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 appearance-none"
              >
                <option value="" className="bg-gray-900">
                  Select a model
                </option>
                {finetunableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-gray-900">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Dataset (JSONL)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-primary/30 bg-primary/5"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jsonl,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <>
                    <FileJson className="w-6 h-6 text-primary mb-2" />
                    <p className="text-sm text-white truncate max-w-full">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400">
                      Click to upload JSONL
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Training data in OpenAI format
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={startFineTuning}
              disabled={!selectedModel || !selectedFile || isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Fine-tuning
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Jobs</h2>
            <span className="text-xs text-gray-500">{jobs.length} total</span>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Wand2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No fine-tuning jobs yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Upload a dataset to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {jobs.map((job) => (
                <div key={job.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white font-mono">
                        {job.model}
                      </span>
                      {statusBadge(job.status)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {job.status === "running" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          className="h-full bg-blue-500 rounded-full"
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  {job.status === "failed" && job.error && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {job.error}
                    </div>
                  )}

                  {job.status === "completed" && job.resultModelId && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Result:</span>
                      <code className="text-xs text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded font-mono">
                        {job.resultModelId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(job.resultModelId!)}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {copiedId === job.resultModelId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {job.datasetFileId && (
                    <div className="mt-1 text-xs text-gray-600">
                      Dataset: {job.datasetFileId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
