"use client";

import { motion } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";

interface ArchitecturePanelProps {
  model: OpenRouterModelData
}

export function ArchitecturePanel({ model }: ArchitecturePanelProps) {
  const arch = model.architecture;
  if (!arch) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Architecture details"
    >
      <h2 className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-6">Architecture</h2>
      <div className="p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {arch.input_modalities && arch.input_modalities.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2.5">Input</div>
              <div className="flex flex-wrap gap-1.5">
                {arch.input_modalities.map((mod: string) => (
                  <span key={mod} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-blue-400/80 font-mono text-[11px] font-semibold">{mod}</span>
                ))}
              </div>
            </div>
          )}
          {arch.output_modalities && arch.output_modalities.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2.5">Output</div>
              <div className="flex flex-wrap gap-1.5">
                {arch.output_modalities.map((mod: string) => (
                  <span key={mod} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-violet-400/80 font-mono text-[11px] font-semibold">{mod}</span>
                ))}
              </div>
            </div>
          )}
          {arch.tokenizer && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2.5">Tokenizer</div>
              <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-300 font-mono text-[11px] font-semibold">{arch.tokenizer}</span>
            </div>
          )}
          {arch.instruct_type && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2.5">Instruction Type</div>
              <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-amber-400/80 font-mono text-[11px] font-semibold">{arch.instruct_type}</span>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
