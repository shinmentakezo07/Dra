"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const paramDescriptions: Record<string, string> = {
  temperature: "Controls randomness. Lower = more deterministic, higher = more creative.",
  top_p: "Nucleus sampling. Limits token selection to top cumulative probability.",
  top_k: "Limits token selection to the K most likely options.",
  max_tokens: "Maximum length of the generated response.",
  stop: "Sequences where the model will stop generating further tokens.",
  repetition_penalty: "Penalizes repeated tokens to reduce redundancy.",
  frequency_penalty: "Reduces repetition based on token frequency.",
  presence_penalty: "Penalizes tokens that have already appeared in the output.",
  seed: "Sets a random seed for reproducible outputs.",
  logit_bias: "Adjusts likelihood of specific tokens appearing.",
  min_p: "Minimum probability threshold for token selection.",
  top_a: "Alternative sampling method combining top-k and top-p.",
  typical_p: "Typical sampling — focuses on tokens with expected probability.",
  echo: "Echo back the prompt in the response.",
  stream: "Stream response tokens as they are generated.",
};

interface ParametersPanelProps {
  params: string[]
}

export function ParametersPanel({ params }: ParametersPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!params || params.length === 0) return null;

  return (
    <section aria-label="Supported parameters" id="parameters">
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-4 flex items-center gap-3">
        <span className="w-4 h-px bg-gray-600" />
        Parameters
        <span className="text-gray-700 normal-case tracking-normal">{params.length}</span>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4">
        <div className="flex flex-wrap gap-1.5">
          {params.map((param) => (
            <button
              key={param}
              onMouseEnter={() => setHovered(param)}
              onMouseLeave={() => setHovered(null)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400 font-mono text-[11px] font-medium hover:border-white/[0.12] hover:text-gray-200 hover:bg-white/[0.06] transition-all duration-150 cursor-default"
            >
              {param.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {hovered && paramDescriptions[hovered] && (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 pt-3 border-t border-white/[0.04]"
            >
              <span className="text-[11px] font-mono text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-semibold">{hovered.replace(/_/g, " ")}</span>
                {" — "}
                {paramDescriptions[hovered]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
