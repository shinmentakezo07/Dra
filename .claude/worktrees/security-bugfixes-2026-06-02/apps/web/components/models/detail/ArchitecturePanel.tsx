"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme } from "@/lib/model-utils";

interface ArchitecturePanelProps {
  model: OpenRouterModelData;
}

const ease = [0.16, 1, 0.3, 1] as const;

const modalityStyles: Record<
  string,
  { bg: string; border: string; text: string; dot: string; icon: string }
> = {
  text: {
    bg: "bg-sky-500/[0.06]",
    border: "border-sky-500/12",
    text: "text-sky-400",
    dot: "bg-sky-400",
    icon: "T",
  },
  image: {
    bg: "bg-violet-500/[0.06]",
    border: "border-violet-500/12",
    text: "text-violet-400",
    dot: "bg-violet-400",
    icon: "I",
  },
  audio: {
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/12",
    text: "text-amber-400",
    dot: "bg-amber-400",
    icon: "A",
  },
  video: {
    bg: "bg-rose-500/[0.06]",
    border: "border-rose-500/12",
    text: "text-rose-400",
    dot: "bg-rose-400",
    icon: "V",
  },
};

function ModalityPill({ mod, index }: { mod: string; index: number }) {
  const prefersReduced = useReducedMotion();
  const style = modalityStyles[mod.toLowerCase()] ?? {
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    text: "text-gray-400",
    dot: "bg-gray-400",
    icon: "?",
  };
  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-[12px] font-semibold ${style.bg} ${style.border} ${style.text}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="capitalize">{mod}</span>
    </motion.div>
  );
}

export function ArchitecturePanel({ model }: ArchitecturePanelProps) {
  const arch = model.architecture;
  const prefersReduced = useReducedMotion();
  const theme = getProviderTheme(model.id);
  const accent = theme?.accent || "#6366f1";

  if (!arch) return null;

  const hasInput = arch.input_modalities && arch.input_modalities.length > 0;
  const hasOutput = arch.output_modalities && arch.output_modalities.length > 0;
  const hasTokenizer = !!arch.tokenizer;
  const hasInstruct = !!arch.instruct_type;

  return (
    <motion.section
      initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      aria-label="Architecture details"
      id="architecture"
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: accent }}
        >
          03
        </span>
        <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">
          Architecture
        </h2>
        <span
          className="flex-1 h-px"
          style={{ backgroundColor: `${accent}12` }}
        />
      </div>

      <div
        className="rounded-2xl border p-6 relative overflow-hidden"
        style={{ borderColor: `${accent}12`, backgroundColor: `${accent}04` }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${accent}30, transparent)`,
          }}
        />

        {/* Modality pipeline */}
        {(hasInput || hasOutput) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-6">
            {hasInput && (
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.15em]">
                  Input
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {arch.input_modalities.map((mod: string, i: number) => (
                    <ModalityPill key={`in-${mod}`} mod={mod} index={i} />
                  ))}
                </div>
              </div>
            )}

            {hasInput && hasOutput && (
              <div className="hidden sm:flex items-center pt-4">
                <div className="flex items-center gap-1">
                  <div
                    className="w-8 h-px"
                    style={{
                      background: `linear-gradient(90deg, ${accent}20, ${accent}40)`,
                    }}
                  />
                  <ArrowRight
                    className="w-3.5 h-3.5"
                    style={{ color: `${accent}50` }}
                  />
                  <div
                    className="w-8 h-px"
                    style={{
                      background: `linear-gradient(90deg, ${accent}40, ${accent}20)`,
                    }}
                  />
                </div>
              </div>
            )}

            {hasOutput && (
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.15em]">
                  Output
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {arch.output_modalities.map((mod: string, i: number) => (
                    <ModalityPill key={`out-${mod}`} mod={mod} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tokenizer + Instruct */}
        {(hasTokenizer || hasInstruct) && (
          <div
            className="grid grid-cols-2 gap-5 pt-5"
            style={{ borderTopColor: `${accent}08`, borderTopWidth: 1 }}
          >
            {hasTokenizer && (
              <div>
                <div className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.12em] mb-2">
                  Tokenizer
                </div>
                <span className="font-mono text-[14px] text-gray-300 font-medium">
                  {arch.tokenizer}
                </span>
              </div>
            )}
            {hasInstruct && (
              <div>
                <div className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.12em] mb-2">
                  Instruct type
                </div>
                <span className="font-mono text-[14px] text-gray-300 font-medium">
                  {arch.instruct_type}
                </span>
              </div>
            )}
          </div>
        )}

        {!hasTokenizer && !hasInstruct && !hasInput && !hasOutput && (
          <div className="text-center py-6">
            <span className="text-gray-600 font-mono text-xs">
              No architecture details available
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
