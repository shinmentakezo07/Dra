"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function ExamplesPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section
        id="examples"
        icon={Terminal}
        title="Code Examples"
       
      >
        <p className="text-white/80">
          Full working examples in multiple languages to help you integrate
          quickly.
        </p>

        <div className="space-y-10 mt-6">
          <motion.div variants={fadeIn}>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-green-500/15 text-green-400 text-[11px] font-mono font-bold">
                Python
              </span>
              Full Client Example
            </h4>
            <CodeBlock
              language="python"
              code={`import requests

BASE = "${BASE_URL}"
API_KEY = "YOUR_API_KEY"
HEADERS = {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY,
}

# Chat completion
res = requests.post(
    f"{BASE}/api/chat",
    headers=HEADERS,
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)
print(res.json())

# List models
models = requests.get(f"{BASE}/api/models", headers=HEADERS)
print(models.json())

# Get credits
credits = requests.get(f"{BASE}/api/credits", headers=HEADERS)
print(credits.json())`}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 text-[11px] font-mono font-bold">
                JavaScript
              </span>
            </h4>
            <CodeBlock
              language="javascript"
              code={`const API_KEY = "YOUR_API_KEY";
const BASE = "${BASE_URL}";

async function chat(model, messages) {
  const res = await fetch(\`\${BASE}/api/chat\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify({ model, messages }),
  });
  return res.json();
}

// Usage
const data = await chat("openai/gpt-4o", [
  { role: "user", content: "Explain async/await" },
]);
console.log(data);`}
            />
          </motion.div>

          <motion.div variants={fadeIn}>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 text-[11px] font-mono font-bold">
                Go
              </span>
            </h4>
            <CodeBlock
              language="go"
              code={`package main

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

    req, _ := http.NewRequest("POST", "${BASE_URL}/api/chat", bytes.NewReader(body))
    req.Header.Set("X-Api-Key", "YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("%+v\\n", result)
}`}
            />
          </motion.div>
        </div>
      </Section>
    </motion.div>
  );
}
