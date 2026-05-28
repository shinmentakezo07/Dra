"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import type { ModelInfo } from "@/lib/api/sdk";
import {
  Swords,
  Send,
  Loader2,
  Star,
  Trophy,
  Clock,
  Coins,
  RotateCcw,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BattleResponse {
  model: string;
  content: string;
  latency: number;
  tokens: number;
  cost: number;
  status: "streaming" | "done" | "error";
  error?: string;
}

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-4": { input: 0.003, output: 0.015 },
  "claude-opus-4": { input: 0.015, output: 0.075 },
  "gemini-2.5-pro": { input: 0.0025, output: 0.01 },
  "llama-3.1-70b": { input: 0.0005, output: 0.0015 },
  "mistral-large": { input: 0.002, output: 0.006 },
};

function estimateCost(model: string, outputTokens: number): number {
  const pricing = COST_PER_1K[model.toLowerCase()] ?? {
    input: 0.001,
    output: 0.003,
  };
  return (outputTokens / 1000) * pricing.output;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(4)}`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ModelBattlePage() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<BattleResponse[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const abortRef = useRef(false);

  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: () => getSDK().listModels(),
  });

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : prev.length < 4
          ? [...prev, modelId]
          : prev,
    );
  };

  const runBattle = useCallback(async () => {
    if (selectedModels.length < 2 || !prompt) return;

    abortRef.current = false;
    setIsRunning(true);
    setRatings({});
    setResponses(
      selectedModels.map((model) => ({
        model,
        content: "",
        latency: 0,
        tokens: 0,
        cost: 0,
        status: "streaming" as const,
      })),
    );

    const startTime = Date.now();

    await Promise.all(
      selectedModels.map(async (model) => {
        try {
          const stream = getSDK().chatStream({
            model,
            messages: [{ role: "user", content: prompt }],
          });

          let content = "";
          for await (const chunk of stream) {
            if (abortRef.current) break;
            content += chunk;
            const elapsed = Date.now() - startTime;
            setResponses((prev) =>
              prev.map((r) =>
                r.model === model
                  ? { ...r, content, latency: elapsed, tokens: content.length }
                  : r,
              ),
            );
          }

          const elapsed = Date.now() - startTime;
          const cost = estimateCost(model, content.length);
          setResponses((prev) =>
            prev.map((r) =>
              r.model === model
                ? {
                    ...r,
                    content,
                    status: "done",
                    latency: elapsed,
                    tokens: content.length,
                    cost,
                  }
                : r,
            ),
          );
        } catch (err) {
          setResponses((prev) =>
            prev.map((r) =>
              r.model === model
                ? {
                    ...r,
                    status: "error",
                    error: err instanceof Error ? err.message : "Stream failed",
                    latency: Date.now() - startTime,
                  }
                : r,
            ),
          );
        }
      }),
    );

    setIsRunning(false);
  }, [selectedModels, prompt]);

  const cancelBattle = () => {
    abortRef.current = true;
    setIsRunning(false);
  };

  const rateResponse = (model: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [model]: rating }));
  };

  const reset = () => {
    setResponses([]);
    setRatings({});
    setPrompt("");
    abortRef.current = false;
    setIsRunning(false);
  };

  const winner = Object.entries(ratings).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-white">Model Battle</h1>
            <p className="text-sm text-gray-400">
              Compare model responses side-by-side — latency, cost, and quality
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {responses.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            Select Models ({selectedModels.length}/4)
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {models?.map((model) => {
            const isSelected = selectedModels.includes(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                disabled={!isSelected && selectedModels.length >= 4}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-primary/20 border-primary/30 text-primary"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                {isSelected && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {model.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to compare across models..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            {selectedModels.length < 2
              ? "Select at least 2 models"
              : `${selectedModels.length} models ready`}
          </span>
          <div className="flex gap-2">
            {isRunning && (
              <button
                onClick={cancelBattle}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              onClick={runBattle}
              disabled={selectedModels.length < 2 || !prompt || isRunning}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Battle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {winner && winner[1] >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5"
        >
          <Trophy className="w-5 h-5 text-amber-400" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">{winner[0]}</span> wins with{" "}
            {winner[1]} stars!
          </p>
        </motion.div>
      )}

      <div
        className={`grid gap-4 ${responses.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
      >
        <AnimatePresence>
          {responses.map((r) => (
            <motion.div
              key={r.model}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-white/5 bg-white/[0.02] flex flex-col"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{r.model}</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    r.status === "done"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : r.status === "error"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {r.status === "streaming" && (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  )}
                  {r.status === "done" && (
                    <CheckCircle className="w-2.5 h-2.5" />
                  )}
                  {r.status === "error" && (
                    <AlertTriangle className="w-2.5 h-2.5" />
                  )}
                  {r.status}
                </span>
              </div>

              <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500 border-b border-white/5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatLatency(r.latency)}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {formatCost(r.cost)}
                </span>
              </div>

              <div className="flex-1 p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                {r.status === "error" ? (
                  <p className="text-sm text-red-400">{r.error}</p>
                ) : r.content ? (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                    {r.content}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                    Waiting...
                  </div>
                )}
              </div>

              {r.status === "done" && (
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => rateResponse(r.model, star)}
                      className={`transition-colors ${
                        (ratings[r.model] ?? 0) >= star
                          ? "text-amber-400"
                          : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      <Star
                        className="w-4 h-4"
                        fill={
                          (ratings[r.model] ?? 0) >= star
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
