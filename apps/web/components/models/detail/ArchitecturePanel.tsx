"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";

interface ArchitecturePanelProps {
  model: OpenRouterModelData
}

const modalityColors: Record<string, string> = {
  text: "text-blue-400/80 bg-blue-500/[0.06] border-blue-500/15",
  image: "text-violet-400/80 bg-violet-500/[0.06] border-violet-500/15",
  audio: "text-amber-400/80 bg-amber-500/[0.06] border-amber-500/15",
  video: "text-rose-400/80 bg-rose-500/[0.06] border-rose-500/15",
};

function ModalityTag({ mod }: { mod: string }) {
  const cls = modalityColors[mod.toLowerCase()] || "text-gray-400/80 bg-white/[0.04] border-white/[0.06]";
  return (
    <span className={`px-2.5 py-1 rounded-md border font-mono text-[11px] font-semibold ${cls}`}>
      {mod}
    </span>
  );
}

export function ArchitecturePanel({ model }: ArchitecturePanelProps) {
  const arch = model.architecture;
  if (!arch) return null;

  const hasInput = arch.input_modalities && arch.input_modalities.length > 0;
  const hasOutput = arch.output_modalities && arch.output_modalities.length > 0;
  const hasTokenizer = !!arch.tokenizer;
  const hasInstruct = !!arch.instruct_type;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Architecture details"
      id="architecture"
    >
      <h2 className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-6 flex items-center gap-3">
        <span className="w-4 h-px bg-gray-600" />
        Architecture
      </h2>

      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-6">
        {(hasInput || hasOutput) && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {hasInput && (
              <div className="flex flex-wrap gap-1.5">
                {arch.input_modalities.map((mod: string) => (
                  <ModalityTag key={`in-${mod}`} mod={mod} />
                ))}
              </div>
            )}
            {(hasInput && hasOutput) && (
              <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
            )}
            {hasOutput && (
              <div className="flex flex-wrap gap-1.5">
                {arch.output_modalities.map((mod: string) => (
                  <ModalityTag key={`out-${mod}`} mod={mod} />
                ))}
              </div>
            )}
          </div>
        )}

        {(hasTokenizer || hasInstruct) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
            {hasTokenizer && (
              <div>
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em] mb-1.5">Tokenizer</div>
                <span className="font-mono text-[12px] text-gray-300">{arch.tokenizer}</span>
              </div>
            )}
            {hasInstruct && (
              <div>
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em] mb-1.5">Instruct Type</div>
                <span className="font-mono text-[12px] text-gray-300">{arch.instruct_type}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
