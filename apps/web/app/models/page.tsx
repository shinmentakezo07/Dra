import type { Metadata } from "next";
import modelData from "./openrouter-models-2026.json";
import { ModelsExplorer } from "@/components/models/ModelsExplorer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Model Registry — Yapapa",
  description:
    "Browse 100+ AI models with transparent per-token pricing. Compare capabilities, context windows, and costs.",
};

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center w-full min-h-[80vh] justify-center bg-ink-950 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* amber skeleton pulse */}
        <div className="w-24 h-1.5 rounded-full bg-ink-800 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-amber/60 animate-glow-pulse" />
        </div>
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-ash">
          Loading registry
        </p>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-ink-950 text-bone min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
        <ModelsExplorer initialModels={modelData} />
      </Suspense>
    </div>
  );
}
