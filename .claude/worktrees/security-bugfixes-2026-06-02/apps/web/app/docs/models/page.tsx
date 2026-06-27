"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function ModelsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="models" icon={Cpu} title="Available Models" accent="violet">
        <p>
          Yapapa routes requests to the optimal model based on your selected
          provider prefix. Use the{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            /api/models
          </code>{" "}
          endpoint to get the full, up-to-date list of available models.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Provider
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Prefix
                </th>
                <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                  Example Models
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                {
                  provider: "OpenAI",
                  prefix: "openai/",
                  models: "GPT-4o, GPT-4o-mini, o3, o4-mini",
                },
                {
                  provider: "Anthropic",
                  prefix: "anthropic/",
                  models: "Claude 3.5 Sonnet, Claude 3 Opus, Claude 3.7 Sonnet",
                },
                {
                  provider: "Groq",
                  prefix: "groq/",
                  models: "Llama 3, Mixtral, Gemma 2",
                },
                {
                  provider: "Gemini",
                  prefix: "gemini/",
                  models: "Gemini 2.0 Flash, Gemini 2.5 Pro",
                },
                {
                  provider: "NVIDIA NIM",
                  prefix: "nvidia/",
                  models: "Nemotron, Llama 3.1 NIM",
                },
              ].map((row) => (
                <tr
                  key={row.provider}
                  className="hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-3 px-4 text-white font-medium">
                    {row.provider}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-blue-400 font-mono text-xs">
                      {row.prefix}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-white/30">{row.models}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Fetching models via API
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Use the API to get the complete, dynamically-updated list of
            supported models. This is useful for populating model selectors in
            your own application.
          </p>
          <CodeBlock
            code={
              "curl " +
              BASE_URL +
              '/api/models \\\n  -H "X-Api-Key: YOUR_API_KEY"'
            }
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            OpenAI-compatible endpoint
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Use{" "}
            <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
              /v1/models
            </code>{" "}
            for OpenAI SDK compatibility. This endpoint returns models in the
            standard OpenAI format.
          </p>
          <CodeBlock
            code={
              "curl " +
              BASE_URL +
              '/v1/models \\\n  -H "Authorization: Bearer YOUR_API_KEY"'
            }
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Response format
          </h3>
          <CodeBlock
            language="json"
            code={`{
  "data": [
    {
      "id": "openai/gpt-4o",
      "provider": "openai",
      "capabilities": ["chat", "vision"],
      "pricing": {
        "input": 2.5,
        "output": 10
      }
    },
    {
      "id": "anthropic/claude-sonnet-4",
      "provider": "anthropic",
      "capabilities": ["chat", "vision"],
      "pricing": {
        "input": 3,
        "output": 15
      }
    }
  ]
}`}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Provider-specific model listing
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Filter models by provider to see only the models available from a
            specific provider.
          </p>
          <CodeBlock
            code={
              "curl " +
              BASE_URL +
              '/api/models/openai \\\n  -H "X-Api-Key: YOUR_API_KEY"'
            }
          />
        </div>

        <TipBox>
          Use the{" "}
          <code className="text-blue-400 font-mono text-xs">provider/</code>{" "}
          prefix in the model name (e.g.,{" "}
          <code className="text-blue-400 font-mono text-xs">openai/gpt-4o</code>
          ) to route to a specific provider. The{" "}
          <code className="text-blue-400 font-mono text-xs">/api/models</code>{" "}
          endpoint returns pricing information per model. Model availability may
          vary based on provider API keys configured in your deployment.
        </TipBox>
      </Section>
    </motion.div>
  );
}
