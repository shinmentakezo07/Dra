"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

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
            go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]any{
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
    fmt.Printf("%+v\\n", result)
}`,
          }}
        />

        <div className="mt-6 rounded-xl border border-white/[0.05] bg-white/[0.01] p-5">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-mono font-bold">SSE</span>
            Streaming Response
          </h4>
          <p className="text-sm text-white/30">
            Set <code className="text-white/60">stream: true</code> in your request body to enable SSE. Each chunk is prefixed with <code className="text-white/60">data:</code> and the stream ends with <code className="text-white/60">data: [DONE]</code>.
          </p>
        </div>
      </Section>
    </motion.div>
  );
}
