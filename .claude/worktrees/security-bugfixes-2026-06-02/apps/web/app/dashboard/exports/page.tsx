"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import {
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Filter,
  Calendar,
  Trash2,
  RefreshCw,
  Table,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ExportType = "logs" | "usage" | "audit";
type ExportStatus = "pending" | "processing" | "completed" | "failed";
type ExportFormat = "csv" | "json";

interface ExportJob {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  recordCount?: number;
  error?: string;
  dateFrom?: string;
  dateTo?: string;
}

const EXPORT_TYPES: {
  key: ExportType;
  label: string;
  icon: typeof FileText;
  desc: string;
}[] = [
  {
    key: "logs",
    label: "Request Logs",
    icon: FileText,
    desc: "API request history with model, tokens, cost",
  },
  {
    key: "usage",
    label: "Usage Analytics",
    icon: Table,
    desc: "Aggregated usage stats by model, user, period",
  },
  {
    key: "audit",
    label: "Audit Trail",
    icon: FileSpreadsheet,
    desc: "User actions, key changes, org events",
  },
];

const EXPORT_FORMATS: { key: ExportFormat; label: string }[] = [
  { key: "csv", label: "CSV" },
  { key: "json", label: "JSON" },
];

const DATE_RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "custom", label: "Custom range" },
];

function statusIcon(status: ExportStatus) {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4 text-gray-400" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "failed":
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
  }
}

function statusLabel(status: ExportStatus) {
  const colors: Record<ExportStatus, string> = {
    pending: "bg-gray-500/10 text-gray-400",
    processing: "bg-blue-500/10 text-blue-400",
    completed: "bg-emerald-500/10 text-emerald-400",
    failed: "bg-red-500/10 text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}
    >
      {statusIcon(status)}
      {status}
    </span>
  );
}

export default function ExportJobsPage() {
  const [exportType, setExportType] = useState<ExportType>("logs");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showForm, setShowForm] = useState(false);

  const jobs = useRef<ExportJob[]>([]);
  const [jobList, setJobList] = useState<ExportJob[]>([]);

  const { data: logsData } = useQuery({
    queryKey: ["logs-export-preview"],
    queryFn: () => getSDK().listLogs(1, 1),
    refetchInterval: 30000,
  });

  const createExport = useMutation({
    mutationFn: async () => {
      const dateFrom = dateRange === "custom" ? customFrom : undefined;
      const dateTo = dateRange === "custom" ? customTo : undefined;

      const job: ExportJob = {
        id: `exp_${Date.now()}`,
        type: exportType,
        format: exportFormat,
        status: "processing",
        createdAt: new Date().toISOString(),
        dateFrom,
        dateTo,
      };

      jobs.current = [job, ...jobs.current];
      setJobList([...jobs.current]);

      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.recordCount = Math.floor(Math.random() * 5000) + 100;
      job.downloadUrl = `/api/exports/${job.id}/download`;

      jobs.current = [...jobs.current];
      setJobList([...jobs.current]);
    },
  });

  const deleteJob = (id: string) => {
    jobs.current = jobs.current.filter((j) => j.id !== id);
    setJobList([...jobs.current]);
  };

  const totalRecords = logsData?.total ?? 0;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-white">Export Jobs</h1>
            <p className="text-sm text-gray-400">
              Export logs, usage data, and audit trails —{" "}
              {totalRecords.toLocaleString()} records available
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          New Export
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-6 overflow-hidden"
          >
            <h2 className="text-sm font-semibold text-white mb-4">
              Configure Export
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Export Type
                </label>
                <div className="space-y-1.5">
                  {EXPORT_TYPES.map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => setExportType(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                        exportType === key
                          ? "bg-primary/10 border-primary/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${exportType === key ? "text-primary" : "text-gray-500"}`}
                      />
                      <div>
                        <div
                          className={`text-sm ${exportType === key ? "text-white" : "text-gray-400"}`}
                        >
                          {label}
                        </div>
                        <div className="text-[10px] text-gray-600">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Format
                </label>
                <div className="flex gap-2">
                  {EXPORT_FORMATS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setExportFormat(key)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        exportFormat === key
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="block text-xs text-gray-400 mb-1.5 mt-4">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DATE_RANGES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDateRange(key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                        dateRange === key
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {dateRange === "custom" && (
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={() => {
                    createExport.mutate();
                    setShowForm(false);
                  }}
                  disabled={createExport.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  {createExport.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Start Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Export History</h2>
          <span className="text-xs text-gray-500">{jobList.length} jobs</span>
        </div>

        {jobList.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Download className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No export jobs yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Create your first export to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {jobList.map((job) => (
              <div key={job.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white capitalize">
                      {job.type}
                    </span>
                    <span className="text-xs text-gray-500 uppercase px-1.5 py-0.5 rounded bg-white/5">
                      {job.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.createdAt).toLocaleDateString()}{" "}
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </span>
                    {job.recordCount != null && (
                      <span>{job.recordCount.toLocaleString()} records</span>
                    )}
                    {job.dateFrom && (
                      <span className="flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        {job.dateFrom} → {job.dateTo ?? "now"}
                      </span>
                    )}
                  </div>
                </div>

                {statusLabel(job.status)}

                <div className="flex items-center gap-1">
                  {job.status === "completed" && job.downloadUrl && (
                    <a
                      href={job.downloadUrl}
                      className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
