"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function ModelsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="models" icon={Cpu} title="Available Models" accent="violet">
        <p>
          Yapapa routes requests to the optimal model based on your selected provider prefix. Use the <code className="text-white/60">/api/models</code> endpoint to get the full, up-to-date list.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Provider</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Prefix</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Example Models</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { provider: "OpenAI", prefix: "openai/", models: "GPT-4o, GPT-4o-mini, o3, o4-mini" },
                { provider: "Anthropic", prefix: "anthropic/", models: "Claude 3.5 Sonnet, Claude 3 Opus, Claude 3.7 Sonnet" },
                { provider: "Groq", prefix: "groq/", models: "Llama 3, Mixtral, Gemma 2" },
                { provider: "Gemini", prefix: "gemini/", models: "Gemini 2.0 Flash, Gemini 2.5 Pro" },
                { provider: "NVIDIA NIM", prefix: "nvidia/", models: "Nemotron, Llama 3.1 NIM" },
              ].map((row) => (
                <tr key={row.provider} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{row.provider}</td>
                  <td className="py-3 px-4">
                    <code className="text-blue-400 font-mono text-xs">{row.prefix}</code>
                  </td>
                  <td className="py-3 px-4 text-white/30">{row.models}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </motion.div>
  );
}
