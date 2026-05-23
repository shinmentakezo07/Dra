"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Check, KeyRound } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme } from "@/lib/model-utils";

interface QuickStartCardProps {
  model: OpenRouterModelData
}

export function QuickStartCard({ model }: QuickStartCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const theme = getProviderTheme(model.id);
  const accent = theme?.accent || "#6366f1";

  const snippet = `curl https://yapa.up.railway.app/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section aria-label="Quick start" id="quickstart" className="mt-2">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: accent }}>
          06
        </span>
        <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">Quick Start</h2>
        <span className="flex-1 h-px" style={{ backgroundColor: `${accent}12` }} />
      </div>

      <div
        className="rounded-2xl border relative overflow-hidden"
        style={{ borderColor: `${accent}12`, backgroundColor: `${accent}04` }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, ${accent}30, transparent)` }}
        />

        {/* Terminal header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottomColor: `${accent}0a`, borderBottomWidth: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            </div>
            <span className="text-[10px] font-mono text-gray-600 ml-3">curl</span>
          </div>
          <button
            onClick={copySnippet}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono transition-all cursor-pointer"
            style={{ color: `${accent}80`, backgroundColor: `${accent}08` }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accent}12`; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${accent}08`; }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Code */}
        <pre className="p-5 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre text-gray-400">
          <code>{snippet}</code>
        </pre>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center justify-between gap-3"
          style={{ backgroundColor: `${accent}06`, borderTopColor: `${accent}0a`, borderTopWidth: 1 }}
        >
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
            <KeyRound className="w-3 h-3" style={{ color: `${accent}50` }} />
            Need an API key?
          </div>
          <button
            onClick={() => router.push("/dashboard/keys")}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: accent,
              color: "#000",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
          >
            Get API Key <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
