"use client";

import { Hero } from "../components/Hero";
import { GatewayFeatures } from "../components/GatewayFeatures";
import { IntegrationFlow } from "../components/IntegrationFlow";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-[#000000] text-foreground selection:bg-primary/30 selection:text-white">
      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- FEATURES SECTION --- */}
      <GatewayFeatures />

      {/* --- INTEGRATION FLOW (Zero to Production) --- */}
      <IntegrationFlow />

      <footer className="w-full py-12 border-t border-white/10 bg-[#050505] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground relative z-10 font-mono text-sm">
          <p className="flex items-center justify-center gap-2">
            <span>&copy; 2026 Yapapa</span>
            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
            <span>Universal LLM Gateway</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
