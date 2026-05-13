"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import openRouterModels from "../openrouter-models-2026.json";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme } from "@/lib/model-utils";
import { AmbientBackground } from "@/components/models/detail/AmbientBackground";
import { ModelIdentity } from "@/components/models/detail/ModelIdentity";
import { PerformancePanel } from "@/components/models/detail/PerformancePanel";
import { ArchitecturePanel } from "@/components/models/detail/ArchitecturePanel";
import { PricingPanel } from "@/components/models/detail/PricingPanel";
import { ParametersPanel } from "@/components/models/detail/ParametersPanel";
import { QuickStartCard } from "@/components/models/detail/QuickStartCard";

const containerEase = [0.16, 1, 0.3, 1] as const;

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" } as const,
    transition: { duration: 0.6, ease: containerEase, delay },
  };
}

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = decodeURIComponent(params.id as string);
  const model = (openRouterModels as OpenRouterModelData[]).find((m) => m.id === modelId);
  const theme = model ? getProviderTheme(model.id) : null;

  if (!model || !theme) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center relative overflow-hidden">
        <AmbientBackground />
        <div className="text-center relative z-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter mb-3">Model Not Found</h1>
          <p className="text-gray-600 mb-8 text-sm font-mono">The model you&apos;re looking for doesn&apos;t exist.</p>
          <button onClick={() => router.push("/models")} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer">
            ← Back to Models
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10 pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero — dominant typographic statement */}
          <ModelIdentity model={model} theme={theme} onBack={() => router.push("/models")} />

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-white/5 via-white/10 to-transparent my-16" />

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Left — narrative flow */}
            <div className="lg:col-span-3 space-y-12">
              {model.description && (
                <motion.section {...fadeUp()} aria-label="About this model">
                  <h2 className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-5">About</h2>
                  <p className="text-gray-300 text-sm leading-[1.8] max-w-prose">{model.description}</p>
                </motion.section>
              )}

              <PerformancePanel model={model} />
              <ArchitecturePanel model={model} />
            </div>

            {/* Right — data panel */}
            <div className="lg:col-span-2 space-y-8">
              <div className="lg:sticky lg:top-28 space-y-8">
                <PricingPanel model={model} />
                <ParametersPanel params={model.supported_parameters} />
                <QuickStartCard model={model} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
