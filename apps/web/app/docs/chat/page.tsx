"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function ChatPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="chat" icon={MessageSquare} title="Chat & Streaming">
        <p>
          The chat endpoint supports both standard JSON response and Server-Sent Events (SSE) streaming. Streaming is enabled by setting <code className="text-white/60">stream: true</code>.
        </p>

        <div className="flex items-center gap-3 mt-4 mb-6">
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-mono font-bold border border-blue-500/15">POST</span>
          <code className="text-white/60 font-mono text-sm">{BASE_URL}/api/chat</code>
          <span className="text-[11px] font-mono text-white/20 uppercase tracking-wider ml-auto">Unified endpoint</span>
        </div>

        <div className="mt-8">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            Standard request
          </h3>
          <CodeBlock
            examples={{
              curl: `curl -N ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
              js: `const response = await fetch("${BASE_URL}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});

const data = await response.json();
console.log(data);`,
              python: `import requests

BASE = "${BASE_URL}"
API_KEY = "YOUR_API_KEY"

res = requests.post(
    f"{BASE}/api/chat",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
    },
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}],
    },
)
print(res.json())`,
              go: `body, _ := json.Marshal(map[string]any{
    "model": "openai/gpt-4o",
    "messages": []map[string]string{
        {"role": "user", "content": "Hello!"},
    },
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/chat",
    bytes.NewReader(body),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Api-Key", "YOUR_API_KEY")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]any
json.NewDecoder(resp.Body).Decode(&result)
fmt.Printf("%+v\\n", result)`,
            }}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            Streaming (SSE)
          </h3>
          <p className="text-sm text-white/40 mb-4">
            Set <code className="text-white/60">stream: true</code> in the request body to receive a Server-Sent Events stream. Each chunk is a JSON object prefixed with <code className="text-white/60">data:</code>, and the stream terminates with <code className="text-white/60">data: [DONE]</code>.
          </p>

          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0c] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20">
              <span className="w-2 h-2 rounded-full bg-red-500/30" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/30" />
              <span className="w-2 h-2 rounded-full bg-green-500/30" />
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider ml-2">SSE stream format</span>
            </div>
            <pre className="p-5 font-mono text-[13px] leading-[1.65] text-white/65 overflow-x-auto">{`data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"choices":[{"delta":{"content":"! How"},"index":0}]}

data: {"choices":[{"delta":{"content":" can I"},"index":0}]}

data: {"choices":[{"delta":{"content":" help you today?"},"index":0}]}

data: [DONE]`}</pre>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <h4 className="text-white font-semibold text-xs mb-1">Chunk format</h4>
              <p className="text-xs text-white/30">Each <code className="text-white/50">data:</code> line is a JSON object with a <code className="text-white/50">choices</code> array containing a <code className="text-white/50">delta</code> with the partial content.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <h4 className="text-white font-semibold text-xs mb-1">Stream end</h4>
              <p className="text-xs text-white/30">The stream terminates with <code className="text-white/50">data: [DONE]</code>. The server closes the connection after sending this signal.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <h4 className="text-white font-semibold text-xs mb-1">Timeout</h4>
              <p className="text-xs text-white/30">Idle connections time out after 30 seconds. Keep the connection active by consuming chunks as they arrive.</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            Streaming with JavaScript
          </h3>
          <CodeBlock
            language="javascript"
            code={`const response = await fetch("${BASE_URL}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    stream: true,
    messages: [{ role: "user", content: "Hello!" }],
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split("\\n").filter(l => l.startsWith("data: "));

  for (const line of lines) {
    const payload = line.slice(6); // remove "data: " prefix
    if (payload === "[DONE]") continue;
    const json = JSON.parse(payload);
    const content = json.choices?.[0]?.delta?.content || "";
    process.stdout.write(content);
  }
}`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
            OpenAI-compatible endpoint
          </h3>
          <p className="text-sm text-white/40 mb-4">
            Yapapa also provides a fully OpenAI-compatible endpoint at <code className="text-white/60">/v1/chat/completions</code>. This endpoint accepts the standard OpenAI request format and returns responses in OpenAI format, making it a drop-in replacement for existing OpenAI integrations.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/15">POST</span>
            <code className="text-white/60 font-mono text-sm">{BASE_URL}/v1/chat/completions</code>
          </div>
          <CodeBlock
            code={`curl ${BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'`}
          />
        </div>

        <TipBox>
          Always use <code className="text-blue-400 font-mono text-xs">X-Api-Key</code> for the <code className="text-blue-400 font-mono text-xs">/api/chat</code> endpoint or <code className="text-blue-400 font-mono text-xs">Authorization: Bearer</code> for the <code className="text-blue-400 font-mono text-xs">/v1/chat/completions</code> endpoint. For streaming, set <code className="text-blue-400 font-mono text-xs">stream: true</code> and use <code className="text-blue-400 font-mono text-xs">curl -N</code> to disable output buffering.
        </TipBox>
      </Section>
    </motion.div>
  );
}
