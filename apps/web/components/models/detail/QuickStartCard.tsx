"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface QuickStartCardProps {
  model: OpenRouterModelData
}

export function QuickStartCard({ model }: QuickStartCardProps) {
  const router = useRouter();

  return (
    <section aria-label="Quick start">
      <div className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-4">Quick Start</div>
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 transition-all duration-300 hover:border-white/[0.12]">
        <p className="text-gray-500 text-xs font-mono mb-4 leading-relaxed">
          Get your API key and start building in minutes.
        </p>
        <button
          onClick={() => router.push("/dashboard/keys")}
          className="w-full py-3 px-4 rounded-lg bg-white text-black font-mono text-xs font-bold tracking-wider uppercase hover:brightness-110 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          API Keys <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
}
