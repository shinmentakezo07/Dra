"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getProviderTheme } from "@/lib/model-utils";
import { SlidersHorizontal } from "lucide-react";

const paramDescriptions: Record<string, string> = {
  temperature:
    "Controls randomness. Lower = more deterministic, higher = more creative.",
  top_p:
    "Nucleus sampling. Limits token selection to top cumulative probability.",
  top_k: "Limits token selection to the K most likely options.",
  max_tokens: "Maximum length of the generated response.",
  stop: "Sequences where the model will stop generating further tokens.",
  repetition_penalty: "Penalizes repeated tokens to reduce redundancy.",
  frequency_penalty: "Reduces repetition based on token frequency.",
  presence_penalty:
    "Penalizes tokens that have already appeared in the output.",
  seed: "Sets a random seed for reproducible outputs.",
  logit_bias: "Adjusts likelihood of specific tokens appearing.",
  min_p: "Minimum probability threshold for token selection.",
  top_a: "Alternative sampling method combining top-k and top-p.",
  typical_p: "Typical sampling — focuses on tokens with expected probability.",
  echo: "Echo back the prompt in the response.",
  stream: "Stream response tokens as they are generated.",
};

interface ParametersPanelProps {
  params: string[];
  modelId?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function ParametersPanel({ params, modelId }: ParametersPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();
  const theme = modelId ? getProviderTheme(modelId) : null;
  const accent = theme?.accent || "#6366f1";

  if (!params || params.length === 0) return null;

  return (
    <motion.section
      initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      aria-label="Supported parameters"
      id="parameters"
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: accent }}
        >
          05
        </span>
        <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">
          Parameters
        </h2>
        <span
          className="flex-1 h-px"
          style={{ backgroundColor: `${accent}12` }}
        />
      </div>

      <div
        className="rounded-2xl border p-5 relative overflow-hidden"
        style={{ borderColor: `${accent}12`, backgroundColor: `${accent}04` }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${accent}30, transparent)`,
          }}
        />

        {/* Count badge */}
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal
            className="w-3 h-3"
            style={{ color: `${accent}50` }}
          />
          <span className="text-[10px] font-mono text-gray-600">
            {params.length} supported
          </span>
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Supported parameters"
        >
          {params.map((param) => (
            <button
              key={param}
              onMouseEnter={() => setHovered(param)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(param)}
              onBlur={() => setHovered(null)}
              className="px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-medium transition-all duration-150 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
              style={{
                backgroundColor:
                  hovered === param ? `${accent}10` : `${accent}06`,
                borderColor: hovered === param ? `${accent}20` : `${accent}0a`,
                color: hovered === param ? "#fff" : `${accent}aa`,
                // @ts-expect-error CSS custom property
                "--tw-ring-color": `${accent}40`,
              }}
            >
              {param.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {hovered && paramDescriptions[hovered] && (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="mt-4 pt-4"
              style={{ borderTopColor: `${accent}08`, borderTopWidth: 1 }}
            >
              <span className="text-[11px] font-mono text-gray-400 leading-relaxed">
                <span className="font-semibold text-gray-200">
                  {hovered.replace(/_/g, " ")}
                </span>
                {" — "}
                {paramDescriptions[hovered]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
