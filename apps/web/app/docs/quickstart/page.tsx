"use client";

import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Key,
  Code2,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  Play,
  Cpu,
  Globe,
  Terminal,
} from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

const steps = [
  {
    step: "01",
    title: "Create an Account",
    desc: "Sign up at /signup or call POST /auth/signup with your name, email, and password. You'll receive a JWT session token immediately.",
    href: "/docs/authentication",
    icon: Key,
    detail: "~30 seconds",
    accent: "from-violet-500/20 to-indigo-500/20",
    iconBg: "from-violet-500/15 to-indigo-500/15",
  },
  {
    step: "02",
    title: "Generate an API Key",
    desc: "Navigate to Dashboard \u2192 Keys and create a new API key. Optionally restrict it to specific models or IPs.",
    href: "/docs/dashboard",
    icon: Shield,
    detail: "~15 seconds",
    accent: "from-indigo-500/20 to-sky-500/20",
    iconBg: "from-indigo-500/15 to-sky-500/15",
  },
  {
    step: "03",
    title: "Make Your First Request",
    desc: "Use your API key to call any of 100+ supported models through the unified API. Swap the model string to switch providers instantly.",
    href: "/docs/chat",
    icon: Code2,
    detail: "~10 seconds",
    accent: "from-sky-500/20 to-emerald-500/20",
    iconBg: "from-sky-500/15 to-emerald-500/15",
  },
];

const guarantees = [
  {
    icon: Cpu,
    title: "100+ Models",
    desc: "OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, Mistral, Meta, DeepSeek. All under one key.",
    stat: "100+",
    statLabel: "models",
    accentColor: "text-indigo-200",
    accentBg: "bg-indigo-500/[0.06]",
    accentBorder: "border-indigo-500/15",
  },
  {
    icon: Globe,
    title: "Drop-in Compatible",
    desc: "OpenAI-shaped API surface. Swap your base URL, keep your client library. Zero refactoring.",
    stat: "0",
    statLabel: "code changes",
    accentColor: "text-sky-200",
    accentBg: "bg-sky-500/[0.06]",
    accentBorder: "border-sky-500/15",
  },
  {
    icon: Shield,
    title: "Keyless Sandbox",
    desc: "Send X-Sandbox: true to disable quota and cost tracking while prototyping. Perfect for CI.",
    stat: "free",
    statLabel: "in sandbox",
    accentColor: "text-emerald-200",
    accentBg: "bg-emerald-500/[0.06]",
    accentBorder: "border-emerald-500/15",
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
      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative mb-10 rounded-3xl overflow-hidden border border-white/[0.07] shadow-[0_24px_80px_-24px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c1a] via-[#0a0a14] to-[#08080e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <motion.div animate={{ x: [0, 20, 0], y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/[0.06] blur-[80px] pointer-events-none" />
        <motion.div animate={{ x: [0, -15, 0], y: [0, 12, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-violet-500/[0.05] blur-[100px] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                <Clock className="w-3 h-3 text-indigo-300" />
                <span className="text-[11px] font-mono font-medium text-indigo-200/80">~3 minutes to first token</span>
              </motion.div>
              <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.035em] leading-[1.05] text-white mb-4">Quick<span className="font-display italic font-normal text-indigo-200/95">start</span></h1>
              <p className="text-[15px] text-white/50 leading-[1.85] max-w-lg">Yapapa is a single API that fronts every major LLM provider. Change the model name, change the vendor. Your code stays the same.</p>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex flex-row sm:flex-col gap-2 sm:items-end flex-shrink-0">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/[0.08] border border-indigo-500/15 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-indigo-200" /></div>
                <div><div className="text-xs font-semibold text-white/80">3 steps</div><div className="text-[10px] font-mono text-white/30">to production</div></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center"><Terminal className="w-3.5 h-3.5 text-emerald-200" /></div>
                <div><div className="text-xs font-semibold text-white/80">4 languages</div><div className="text-[10px] font-mono text-white/30">curl · js · py · go</div></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Section
        id="quickstart"
        icon={Zap}
        eyebrow="Getting Started"
        title="Three steps to"
        italic="your first call"
        description="Follow the path below. Each step builds on the previous one."
      >
        {/* ═══════════ TIMELINE STEPS ═══════════ */}
        <div className="relative mt-8">
          <div className="absolute left-[23px] top-12 bottom-12 w-px bg-gradient-to-b from-violet-500/20 via-indigo-500/20 to-sky-500/20 hidden sm:block" />
          <div className="absolute left-[23px] top-12 bottom-12 w-px hidden sm:block"><motion.div className="w-full bg-gradient-to-b from-violet-400/40 via-indigo-400/40 to-sky-400/40" initial={{ height: "0%" }} animate={{ height: "100%" }} transition={{ duration: 2, delay: 0.5, ease: "easeOut" }} style={{ filter: "blur(1px)" }} /></div>
          <div className="space-y-4">
          {steps.map((card) => (
            <Link
              key={card.step}
              href={card.href}
              className="group relative flex gap-4 sm:gap-6"
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0 hidden sm:flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl border border-white/[0.1] flex items-center justify-center",
                    "bg-gradient-to-br",
                    card.iconBg,
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                    "group-hover:border-indigo-500/30 transition-all duration-300",
                  )}
                >
                  <span className="text-[11px] font-bold font-mono text-white/70 group-hover:text-white transition-colors">
                    {card.step}
                  </span>
                </div>
              </div>

              {/* Card content */}
              <div
                className={cn(
                  "flex-1 p-5 sm:p-6 rounded-2xl overflow-hidden",
                  "border border-white/[0.07] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
                  "hover:border-indigo-500/25 hover:from-indigo-500/[0.04]",
                  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-12px_rgba(99,102,241,0.25)]",
                  "transition-all duration-300 cursor-pointer",
                  "relative",
                )}
              >
                {/* Top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Hover glow */}
                <div
                  className={cn(
                    "absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br",
                    card.accent,
                  )}
                  style={{ filter: "blur(40px)" }}
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Mobile step number */}
                      <span
                        className={cn(
                          "flex sm:hidden items-center justify-center w-7 h-7 rounded-lg border border-white/[0.1] bg-white/[0.03] text-[10px] font-bold font-mono text-white/60",
                        )}
                      >
                        {card.step}
                      </span>
                      <card.icon className="w-4 h-4 text-white/30 group-hover:text-indigo-200 transition-colors flex-shrink-0" />
                      <h3 className="text-white/90 font-semibold text-[15px] group-hover:text-white transition-colors tracking-[-0.01em]">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-[13px] text-white/40 leading-[1.75] group-hover:text-white/55 transition-colors">
                      {card.desc}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2.5 py-1 rounded-lg border",
                        "border-white/[0.08] bg-white/[0.02] text-white/35",
                        "group-hover:border-indigo-500/20 group-hover:text-indigo-200/60 group-hover:bg-indigo-500/[0.04]",
                        "transition-all duration-300",
                      )}
                    >
                      {card.detail}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/[0.08] group-hover:text-indigo-200/50 group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>

        {/* ═══════════ YOUR FIRST API CALL ═══════════ */}
        <div className="mt-16 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.08] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Play className="w-3.5 h-3.5 text-indigo-200 ml-0.5" />
            </div>
            <div>
              <h3 className="text-white/95 font-semibold text-[15px]">Your first API call</h3>
              <p className="text-[12px] text-white/35 font-mono mt-0.5">POST /api/chat</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr,300px] gap-4">
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

          {/* Response preview panel */}
          <div className="hidden xl:block">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a0a0e] to-[#060608] overflow-hidden shadow-[0_8px_32px_-12px_rgba(99,102,241,0.15),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="text-[11px] font-mono text-emerald-300/80">200 OK</span>
                </div>
                <span className="text-[10px] font-mono text-white/40">~320ms</span>
              </div>
              {/* Body */}
              <div className="p-4 space-y-3 text-[12px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">model:</span>
                  <span className="text-indigo-200">openai/gpt-4o</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-1">content:</span>
                  <span className="text-white/80 leading-relaxed">"Hello! How can I assist you today?"</span>
                </div>
                <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-white/40">tokens:</span>
                    <span className="text-white/70">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">cost:</span>
                    <span className="text-emerald-300">$0.00012</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ GUARANTEES ═══════════ */}
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.08] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Sparkles className="w-4 h-4 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-white/95 font-semibold text-[15px]">What you get out of the box</h3>
              <p className="text-[12px] text-white/35 font-mono mt-0.5">Zero-config infrastructure</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {guarantees.map((g, i) => (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="group relative p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-white/[0.12] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <div className="absolute top-4 right-4">
                  <div className={cn("px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold", g.accentBg, g.accentBorder, g.accentColor)}>
                    {g.stat} <span className="font-normal opacity-60">{g.statLabel}</span>
                  </div>
                </div>

                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]", g.accentBorder, g.accentBg)}>
                  <g.icon className={cn("w-4 h-4", g.accentColor)} />
                </div>

                <h4 className="text-white/85 text-[13px] font-semibold mb-2">{g.title}</h4>
                <p className="text-[12px] text-white/40 leading-[1.7] group-hover:text-white/50 transition-colors">{g.desc}</p>
              </motion.div>
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

        {/* ═══════════ CTA FOOTER ═══════════ */}
        <div className="mt-12 relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-br from-white/[0.02] via-transparent to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-indigo-400/15 via-transparent to-transparent" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-transparent to-indigo-400/15" />
          </div>
          <div className="relative px-6 py-8 sm:px-8 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-1 min-w-0">
              <h4 className="text-white/90 font-semibold text-[15px] mb-1.5">Ready to build?</h4>
              <p className="text-[13px] text-white/40 leading-[1.7]">Explore the full API reference, or jump straight into chat streaming with SSE.</p>
            </div>
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <Link
                href="/docs/chat"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white bg-indigo-500/15 border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-500/35 shadow-[0_4px_16px_-4px_rgba(99,102,241,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-200"
              >
                <Play className="w-3.5 h-3.5" />
                Chat &amp; Streaming
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/docs/api-reference"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/60 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.12] transition-all duration-200"
              >
                <Code2 className="w-3.5 h-3.5" />
                API Reference
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}
