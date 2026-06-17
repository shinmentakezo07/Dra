import type { Metadata } from "next";
import modelData from "./openrouter-models-2026.json";
import { ModelsExplorer } from "@/components/models/ModelsExplorer";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Model Registry — Yapapa",
  description:
    "Browse every frontier AI model behind the Yapapa gateway. Transparent per-token pricing, real context windows, and unified access across all providers.",
};

function LoadingFallback() {
  return (
    <div className="relative flex min-h-[80dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px] animate-glow-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px] animate-glow-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-glow-pulse" />
          <Loader2 className="relative z-10 h-12 w-12 animate-spin text-blue-400" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-gray-500">
            Indexing Registry
          </p>
          <div className="flex gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: "0s" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#050505] text-foreground selection:bg-primary/30 selection:text-white">
      <Suspense fallback={<LoadingFallback />}>
        <ModelsExplorer initialModels={modelData} />
      </Suspense>
    </div>
  );
}
