"use client";

import { motion } from "framer-motion";
import { Database } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function EmbeddingsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="embeddings" icon={Database} title="Embeddings">
        <p>Generate text embeddings from supported providers including OpenAI, Anthropic, Cohere, NVIDIA NIM, and Gemini.</p>

        <div className="mt-6">
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
      </Section>
    </motion.div>
  );
}
