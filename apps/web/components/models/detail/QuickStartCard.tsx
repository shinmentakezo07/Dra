"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Check, Terminal } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface QuickStartCardProps {
  model: OpenRouterModelData
}

export function QuickStartCard({ model }: QuickStartCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

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
    <section aria-label="Quick start" id="quickstart">
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-4 flex items-center gap-3">
        <span className="w-4 h-px bg-gray-600" />
        Quick Start
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">cURL</span>
          </div>
          <button
            onClick={copySnippet}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <pre className="p-4 text-[11px] font-mono text-gray-400 leading-relaxed overflow-x-auto whitespace-pre">
          <code>{snippet}</code>
        </pre>

        <div className="px-4 py-3 border-t border-white/[0.04]">
          <button
            onClick={() => router.push("/dashboard/keys")}
            className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-mono text-[11px] font-bold tracking-wider uppercase hover:brightness-110 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Get API Key <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
