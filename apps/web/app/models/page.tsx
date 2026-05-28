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
    <div className="flex flex-col items-center w-full min-h-[60vh] justify-center bg-[#000000]">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
    </div>
  );
}

export default function ModelsPage() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-[#000000] text-foreground selection:bg-primary/30 selection:text-white">
      <Suspense fallback={<LoadingFallback />}>
        <ModelsExplorer initialModels={modelData} />
      </Suspense>
    </div>
  );
}
