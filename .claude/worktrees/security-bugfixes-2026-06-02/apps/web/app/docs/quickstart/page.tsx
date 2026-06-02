"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";
import Link from "next/link";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function QuickstartPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="quickstart" icon={Zap} title="Quick Start" accent="emerald">
        <p className="text-lg text-white/80 leading-[1.65]">
          Get started with Yapapa AI Gateway in under 5 minutes. The backend
          runs on{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-blue-500/[0.06] text-blue-400/90 font-mono text-xs border border-blue-500/[0.1]">
            {BASE_URL}
          </code>{" "}
          and the frontend on{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-blue-500/[0.06] text-blue-400/90 font-mono text-xs border border-blue-500/[0.1]">
            http://localhost:3000
          </code>
          .
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
          {[
            {
              step: "01",
              title: "Create an Account",
              desc: "Sign up at /signup or call POST /auth/signup with name, email, and password.",
              href: "/docs/authentication",
            },
            {
              step: "02",
              title: "Get Your API Key",
              desc: "Navigate to the Dashboard and generate a new API key with a recognizable name.",
              href: "/docs/dashboard",
            },
            {
              step: "03",
              title: "Make Your First Request",
              desc: "Use your API key to call any supported model through the unified API.",
              href: "/docs/chat",
            },
          ].map((card) => (
            <Link
              key={card.step}
              href={card.href}
              className="group relative p-6 rounded-xl bg-white/[0.01] border border-white/[0.06] hover:border-blue-500/[0.2] hover:bg-blue-500/[0.02] hover:shadow-lg hover:shadow-blue-500/[0.03] transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.04] border border-blue-500/[0.15] text-blue-400 text-xs font-bold font-mono shadow-sm shadow-black/10">
                  {card.step}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
              </div>
              <h3 className="text-white/90 font-semibold text-sm mb-2 group-hover:text-blue-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-white/35 leading-relaxed">
                {card.desc}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 w-3.5 h-3.5 text-white/[0.08] group-hover:text-blue-400/40 group-hover:translate-x-0.5 transition-all duration-300" />
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Your first API call
          </h3>
          <CodeBlock
            examples={{
              curl: `curl ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
              js: `const res = await fetch("${BASE_URL}/api/chat", {
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
const data = await res.json();
console.log(data);`,
              python: `import requests

res = requests.post(
    "${BASE_URL}/api/chat",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "YOUR_API_KEY",
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

req, _ := http.NewRequest("POST", "${BASE_URL}/api/chat", bytes.NewReader(body))
req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Api-Key", "YOUR_API_KEY")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()`,
            }}
          />
        </div>

        <TipBox>
          All API requests require authentication via the{" "}
          <code className="text-blue-400 font-mono text-xs">X-Api-Key</code>{" "}
          header or a valid JWT session cookie.
        </TipBox>
      </Section>
    </motion.div>
  );
}
