"use client";

import { motion } from "framer-motion";
import { Database } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function EmbeddingsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="embeddings" icon={Database} title="Embeddings">
        <p>
          Generate dense vector embeddings from text input. Embeddings capture
          semantic meaning and are used for semantic search, clustering,
          recommendation systems, and RAG (Retrieval-Augmented Generation)
          pipelines.
        </p>

        <div className="flex items-center gap-3 mt-4 mb-2">
          <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.04] text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/[0.2] shadow-sm">
            POST
          </span>
          <code className="text-white/60 font-mono text-sm">
            {BASE_URL}/api/embeddings
          </code>
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Request
          </h3>
          <CodeBlock
            examples={{
              curl: `curl ${BASE_URL}/api/embeddings \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/text-embedding-3-small",
    "input": "The quick brown fox jumps over the lazy dog"
  }'`,
              js: `const res = await fetch("${BASE_URL}/api/embeddings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    model: "openai/text-embedding-3-small",
    input: "Hello world",
  }),
});
const data = await res.json();
console.log(data.embeddings);`,
              python: `import requests

res = requests.post(
    "${BASE_URL}/api/embeddings",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "YOUR_API_KEY",
    },
    json={
        "model": "openai/text-embedding-3-small",
        "input": "Hello world",
    },
)
print(res.json()["embeddings"])`,
              go: `body, _ := json.Marshal(map[string]any{
    "model": "openai/text-embedding-3-small",
    "input": "Hello world",
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/embeddings",
    bytes.NewReader(body),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Api-Key", "YOUR_API_KEY")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]any
json.NewDecoder(resp.Body).Decode(&result)
embeddings := result["embeddings"]
fmt.Printf("%+v\\n", embeddings)`,
            }}
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
  "embeddings": [
    [0.0023, -0.0156, 0.0421, ...],
    [0.0018, -0.0142, 0.0398, ...]
  ],
  "model": "openai/text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}`}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            OpenAI-compatible endpoint
          </h3>
          <p className="text-sm text-white/50 mb-4">
            For OpenAI SDK compatibility, use the{" "}
            <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
              /v1/embeddings
            </code>{" "}
            endpoint. It accepts the standard OpenAI embedding request format
            and returns OpenAI-shaped responses.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.04] text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/[0.2] shadow-sm">
              POST
            </span>
            <code className="text-white/60 font-mono text-sm">
              {BASE_URL}/v1/embeddings
            </code>
          </div>
          <CodeBlock
            code={`curl ${BASE_URL}/v1/embeddings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "openai/text-embedding-3-small",
    "input": "The quick brown fox jumps over the lazy dog"
  }'`}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Use cases
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Semantic Search
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Compare query embeddings against a document corpus using cosine
                similarity to find semantically relevant results.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Clustering
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Group similar documents by embedding proximity. Useful for topic
                discovery, content organization, and deduplication.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                RAG Pipelines
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Store document embeddings in a vector database and retrieve
                relevant context before sending to an LLM for generation.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Recommendation
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Compute similarity between user preferences and item
                descriptions to power content-based recommendation engines.
              </p>
            </div>
          </div>
        </div>

        <TipBox>
          Supported embedding models include{" "}
          <code className="text-blue-400 font-mono text-xs">
            openai/text-embedding-3-small
          </code>
          ,{" "}
          <code className="text-blue-400 font-mono text-xs">
            openai/text-embedding-3-large
          </code>
          , and provider-specific alternatives. Use the{" "}
          <code className="text-blue-400 font-mono text-xs">dimensions</code>{" "}
          parameter with OpenAI models to reduce vector size (e.g., 256, 512,
          1024) for lower storage costs.
        </TipBox>
      </Section>
    </motion.div>
  );
}
