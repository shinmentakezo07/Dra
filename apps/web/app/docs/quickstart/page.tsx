"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, Key, Code2, Boxes, Shield } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";
import Link from "next/link";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

const steps = [
  {
    step: "01",
    title: "Create an Account",
    desc: "Sign up at /signup or call POST /auth/signup with name, email, and password.",
    href: "/docs/authentication",
    icon: Key,
  },
  {
    step: "02",
    title: "Get Your API Key",
    desc: "Navigate to the Dashboard and generate a new API key with a recognizable name.",
    href: "/docs/dashboard",
    icon: Shield,
  },
  {
    step: "03",
    title: "Make Your First Request",
    desc: "Use your API key to call any supported model through the unified API.",
    href: "/docs/chat",
    icon: Code2,
  },
];

const guarantees = [
  {
    icon: Zap,
    title: "100+ Models",
    desc: "OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, Mistral, Meta, DeepSeek. All under one key.",
  },
  {
    icon: Boxes,
    title: "Drop-in Compatible",
    desc: "OpenAI-shaped API surface. Swap your base URL, keep your client library.",
  },
  {
    icon: Shield,
    title: "Keyless Sandbox",
    desc: "Send X-Sandbox: true to disable quota and cost while prototyping.",
  },
];

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
      <Section
        id="quickstart"
        icon={Zap}
        eyebrow="Getting Started"
        title="Quick"
        italic="start"
        description="Three minutes to your first model call. Yapapa is a single API that fronts every major LLM provider — change the model name, change the vendor. Your code stays the same."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
          {steps.map((card) => (
            <Link
              key={card.step}
              href={card.href}
              className="group relative p-6 rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-indigo-500/25 hover:from-indigo-500/[0.04] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-12px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background:
                    "conic-gradient(from 220deg, rgba(99,102,241,0.18), transparent 30%, transparent 70%, rgba(99,102,241,0.1))",
                  filter: "blur(20px)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.08] text-indigo-200 text-[11px] font-bold font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                    {card.step}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                  <card.icon className="w-3.5 h-3.5 text-white/30 group-hover:text-indigo-200 transition-colors" />
                </div>
                <h3 className="text-white/90 font-semibold text-sm mb-2 group-hover:text-white transition-colors tracking-[-0.01em]">
                  {card.title}
                </h3>
                <p className="text-xs text-white/40 leading-[1.65]">
                  {card.desc}
                </p>
                <ArrowRight className="absolute bottom-5 right-5 w-3.5 h-3.5 text-white/[0.1] group-hover:text-indigo-200/60 group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </Link>
          ))}
        </div>

        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-12 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
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

        {/* Why Yapapa guarantees */}
        <div className="mt-14">
          <h3 className="text-white/95 font-semibold text-sm mb-5 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
            What you get out of the box
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {guarantees.map((g) => (
              <div
                key={g.title}
                className="p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              >
                <div className="w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] flex items-center justify-center mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                  <g.icon className="w-4 h-4 text-indigo-200" />
                </div>
                <h4 className="text-white/85 text-[13px] font-semibold mb-1.5">
                  {g.title}
                </h4>
                <p className="text-xs text-white/40 leading-[1.65]">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <TipBox variant="info">
          All API requests require authentication via the <code>X-Api-Key</code>{" "}
          header or a valid JWT session cookie. The frontend on{" "}
          <code>http://localhost:3000</code> already handles session cookies
          automatically.
        </TipBox>

        <TipBox>
          Want to test without burning credits? Send{" "}
          <code>X-Sandbox: true</code> on <code>/v1/chat/completions</code> to
          skip quota, cost, and logging. Useful in CI and when you&apos;re
          iterating on a prompt.
        </TipBox>
      </Section>
    </motion.div>
  );
}
