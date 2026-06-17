"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import {
  Zap,
  Key,
  Code2,
  MessageSquare,
  Database,
  Boxes,
  FileText,
  Layers,
  UploadCloud,
  Shield,
  AlertTriangle,
  Cpu,
  TrendingUp,
  BarChart3,
  Lock,
  Terminal,
  ArrowRight,
  ArrowUpRight,
  Users,
  Webhook,
  Globe,
  BookOpen,
  Sparkles,
  Command,
  Clock,
  Activity,
  Search,
  Copy,
  Check,
  Star,
  Server,
  Mail,
} from "lucide-react";
import type { NavItem } from "@/components/docs/types";
import { cn } from "@/lib/utils";

interface DocSection extends NavItem {
  desc: string;
  category: string;
  href: string;
}

const sections: DocSection[] = [
  {
    id: "quickstart",
    label: "Quick Start",
    icon: Zap,
    desc: "Get up and running in under 5 minutes.",
    category: "Getting Started",
    href: "/docs/quickstart",
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: Key,
    desc: "API keys, JWT, and bearer token auth.",
    category: "Getting Started",
    href: "/docs/authentication",
  },
  {
    id: "api-reference",
    label: "API Reference",
    icon: Code2,
    desc: "Complete endpoint documentation.",
    category: "Getting Started",
    href: "/docs/api-reference",
  },
  {
    id: "self-hosting",
    label: "Self-Hosting",
    icon: Globe,
    desc: "Configure base URL for your deployment.",
    category: "Getting Started",
    href: "/docs/self-hosting",
  },
  {
    id: "chat",
    label: "Chat & Streaming",
    icon: MessageSquare,
    desc: "SSE streaming and standard chat.",
    category: "Core Features",
    href: "/docs/chat",
  },
  {
    id: "embeddings",
    label: "Embeddings",
    icon: Database,
    desc: "Generate text embeddings.",
    category: "Core Features",
    href: "/docs/embeddings",
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: Boxes,
    desc: "Multi-turn conversation management.",
    category: "Core Features",
    href: "/docs/conversations",
  },
  {
    id: "prompts",
    label: "Prompt Templates",
    icon: FileText,
    desc: "Reusable prompt templates.",
    category: "Core Features",
    href: "/docs/prompts",
  },
  {
    id: "batch",
    label: "Batch API",
    icon: Layers,
    desc: "Process multiple requests at once.",
    category: "Platform",
    href: "/docs/batch",
  },
  {
    id: "files",
    label: "File Upload",
    icon: UploadCloud,
    desc: "Upload images for vision models.",
    category: "Platform",
    href: "/docs/files",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Webhook,
    desc: "Event-driven outbound delivery.",
    category: "Platform",
    href: "/docs/webhooks",
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    icon: Shield,
    desc: "Usage limits and throttling.",
    category: "Platform",
    href: "/docs/rate-limits",
  },
  {
    id: "error-handling",
    label: "Error Handling",
    icon: AlertTriangle,
    desc: "Error codes and responses.",
    category: "Platform",
    href: "/docs/error-handling",
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: Users,
    desc: "Multi-user organization management.",
    category: "Platform",
    href: "/docs/organizations",
  },
  {
    id: "models",
    label: "Available Models",
    icon: Cpu,
    desc: "Supported providers and models.",
    category: "Reference",
    href: "/docs/models",
  },
  {
    id: "pricing",
    label: "Pricing & Credits",
    icon: TrendingUp,
    desc: "Credit system and costs.",
    category: "Reference",
    href: "/docs/pricing",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    desc: "Usage analytics and monitoring.",
    category: "Reference",
    href: "/docs/dashboard",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    desc: "Encryption, hashing, and CORS.",
    category: "Reference",
    href: "/docs/security",
  },
  {
    id: "examples",
    label: "Code Examples",
    icon: Terminal,
    desc: "Full examples in Python, JS, Go.",
    category: "Reference",
    href: "/docs/examples",
  },
];

const categories = [
  "Getting Started",
  "Core Features",
  "Platform",
  "Reference",
] as const;

const categoryAccent: Record<
  string,
  { tint: string; icon: string; ring: string }
> = {
  "Getting Started": {
    tint: "from-indigo-500/[0.07]",
    icon: "text-indigo-200",
    ring: "border-indigo-500/20",
  },
  "Core Features": {
    tint: "from-violet-500/[0.07]",
    icon: "text-violet-200",
    ring: "border-violet-500/20",
  },
  Platform: {
    tint: "from-cyan-500/[0.05]",
    icon: "text-cyan-200",
    ring: "border-cyan-500/20",
  },
  Reference: {
    tint: "from-amber-500/[0.05]",
    icon: "text-amber-200",
    ring: "border-amber-500/20",
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.1 + i * 0.05,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const quickSteps = [
  {
    step: "01",
    title: "Sign up",
    desc: "Create an account in under 30 seconds",
    icon: Key,
    href: "/docs/authentication",
    accent: "indigo" as const,
  },
  {
    step: "02",
    title: "Get a key",
    desc: "Generate your first API credential",
    icon: Zap,
    href: "/docs/authentication",
    accent: "violet" as const,
  },
  {
    step: "03",
    title: "Make a call",
    desc: "Hit any of 100+ models in one line",
    icon: Code2,
    href: "/docs/chat",
    accent: "purple" as const,
  },
];

const popularPages = [
  {
    id: "quickstart",
    label: "Quick Start",
    href: "/docs/quickstart",
    views: "12k",
  },
  {
    id: "authentication",
    label: "Authentication",
    href: "/docs/authentication",
    views: "8.5k",
  },
  { id: "chat", label: "Chat & Streaming", href: "/docs/chat", views: "6.2k" },
  {
    id: "api-reference",
    label: "API Reference",
    href: "/docs/api-reference",
    views: "5.1k",
  },
];

const recentUpdates = [
  {
    date: "2026-05-30",
    title: "SSE streaming for Claude 4 Sonnet",
    page: "chat",
    tag: "New" as const,
  },
  {
    date: "2026-05-28",
    title: "Webhooks v2 with retries and DLQ",
    page: "webhooks",
    tag: "Improved" as const,
  },
  {
    date: "2026-05-26",
    title: "Batch API async submissions",
    page: "batch",
    tag: "Beta" as const,
  },
];

const tagStyles: Record<"New" | "Improved" | "Beta", string> = {
  New: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  Improved: "bg-indigo-500/10 text-indigo-200 border-indigo-500/25",
  Beta: "bg-amber-500/10 text-amber-200 border-amber-500/25",
};

const heroStats = [
  { value: "100+", label: "Models" },
  { value: "99.9%", label: "Uptime" },
  { value: "<200ms", label: "P50 Latency" },
  { value: "12M+", label: "Daily Reqs" },
];

const codeExamples: Record<"curl" | "python" | "typescript", string> = {
  curl: `curl https://yapa.up.railway.app/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $YAPAPA_KEY" \\
  -d '{
    "model": "claude-opus-4",
    "messages": [
      { "role": "user", "content": "Hello from Yapapa!" }
    ]
  }'`,
  python: `from openai import OpenAI
import os

client = OpenAI(
    base_url="https://yapa.up.railway.app/v1",
    api_key=os.environ["YAPAPA_KEY"],
)

stream = client.chat.completions.create(
    model="claude-opus-4",
    messages=[{"role": "user", "content": "Hello from Yapapa!"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
  typescript: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://yapa.up.railway.app/v1",
  apiKey: process.env.YAPAPA_KEY,
});

const stream = await client.chat.completions.create({
  model: "claude-opus-4",
  messages: [{ role: "user", content: "Hello from Yapapa!" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
};

/* ── Enhanced atmosphere: aurora + breathing orbs + constellation ── */
function Atmosphere() {
  // Deterministic constellation positions (SSR-safe — no Math.random on render)
  const dots = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: (i * 37) % 100,
    top: (i * 53) % 80,
    size: 1 + ((i * 7) % 3),
    delay: (i % 8) * 0.7,
    opacity: 0.15 + (i % 5) * 0.05,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-6 sm:-mx-10">
      {/* Aurora conic gradient */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] opacity-50 animate-[aurora-shift_24s_ease-in-out_infinite]"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, rgba(99,102,241,0.18), rgba(139,92,246,0.12), rgba(79,70,229,0.08), rgba(99,102,241,0.18))",
          filter: "blur(80px)",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 30%, #000 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 30%, #000 30%, transparent 75%)",
        }}
      />

      {/* Breathing orbs */}
      <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.07] blur-[120px] animate-[breathe_14s_ease-in-out_infinite]" />
      <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] blur-[120px] animate-[breathe_18s_ease-in-out_infinite_3s]" />
      <div className="absolute top-40 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-400/[0.04] blur-[100px] animate-[breathe_22s_ease-in-out_infinite_6s]" />

      {/* Constellation dots */}
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-indigo-200"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            opacity: d.opacity,
            animation: `float-dot ${8 + (d.id % 5)}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%)",
        }}
      />
    </div>
  );
}

/* ── 3D parallax wrapper ── */
function ParallaxCard({
  children,
  className,
  intensity = 8,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useTransform(my, [0, 1], [intensity, -intensity]);
  const ry = useTransform(mx, [0, 1], [-intensity, intensity]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  );
}

/* ── Section card with cursor spotlight ── */
function SectionCard({
  section,
  idx,
  accent,
}: {
  section: DocSection;
  idx: number;
  accent: { tint: string; icon: string; ring: string };
}) {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const smoothX = useSpring(mx, { stiffness: 250, damping: 30 });
  const smoothY = useSpring(my, { stiffness: 250, damping: 30 });
  const bg = useTransform(
    [smoothX, smoothY],
    ([x, y]) =>
      `radial-gradient(220px circle at ${x}px ${y}px, rgba(165,180,252,0.18), transparent 60%)`,
  );

  return (
    <motion.div variants={fadeUp} custom={idx}>
      <Link
        href={section.href}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(e.clientX - r.left);
          my.set(e.clientY - r.top);
        }}
        onMouseLeave={() => {
          mx.set(-200);
          my.set(-200);
        }}
        className={cn(
          "group relative block p-5 rounded-2xl overflow-hidden",
          "border border-white/[0.06] bg-gradient-to-br",
          accent.tint,
          "to-transparent",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
          "hover:border-indigo-500/25 hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          "transition-[border-color,box-shadow] duration-300 cursor-pointer",
        )}
      >
        {/* Spotlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: bg }}
        />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-center gap-4">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/[0.06] bg-white/[0.02] relative overflow-hidden",
              "group-hover:bg-indigo-500/[0.06]",
              "transition-all duration-300",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <section.icon
              className={cn(
                "w-[18px] h-[18px] text-white/45 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                accent.icon,
                "group-hover:" + accent.icon,
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors duration-200 truncate tracking-[-0.01em]">
              {section.label}
            </p>
            <p className="text-[11.5px] text-white/30 truncate mt-0.5 group-hover:text-white/55 transition-colors leading-relaxed">
              {section.desc}
            </p>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-white/[0.1] group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Code preview panel with tabs + copy ── */
function CodePreview() {
  const [tab, setTab] = useState<"curl" | "python" | "typescript">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeExamples[tab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const tabs: Array<{ id: "curl" | "python" | "typescript"; label: string }> = [
    { id: "curl", label: "cURL" },
    { id: "python", label: "Python" },
    { id: "typescript", label: "TypeScript" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-24 sm:mb-32"
    >
      <header className="flex items-center gap-3 mb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <Terminal className="w-3.5 h-3.5 text-indigo-200" />
          </div>
          <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
            Make your first{" "}
            <span className="font-display italic font-normal text-indigo-200/95">
              request
            </span>
          </h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
        <span className="text-[9px] font-mono text-white/30 tracking-[0.18em]">
          LIVE
        </span>
      </header>

      <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0a0a0f]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_16px_48px_-16px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-indigo-500/[0.12] blur-3xl rounded-full pointer-events-none" />

        {/* Tab bar */}
        <div className="relative flex items-center justify-between border-b border-white/[0.05] px-3 py-2.5">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 mr-3 ml-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
            </div>
            {tabs.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative px-3 py-1.5 rounded-md text-[12px] font-mono font-medium cursor-pointer transition-colors duration-200",
                    active
                      ? "text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="code-tab"
                      className="absolute inset-0 rounded-md border border-indigo-500/25 bg-indigo-500/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Code body */}
        <pre className="relative p-5 sm:p-6 text-[12.5px] leading-[1.7] font-mono text-white/75 overflow-x-auto">
          <code>{codeExamples[tab]}</code>
        </pre>
      </div>
    </motion.section>
  );
}

export default function DocsIndexPage() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  return (
    <div className="relative">
      <Atmosphere />

      {/* HERO */}
      <section className="relative mb-24 sm:mb-32 pt-6 sm:pt-10">
        <div className="relative z-10">
          {/* What's new pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mb-6"
          >
            <Link
              href="/docs/chat"
              className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] text-[11px] font-medium text-white/75 hover:text-white hover:border-indigo-400/40 hover:bg-indigo-500/[0.12] transition-all duration-200 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/25 text-[9px] font-mono font-bold uppercase tracking-[0.1em] text-white">
                <Sparkles className="w-2.5 h-2.5" />
                New
              </span>
              <span>SSE streaming for Claude 4 Sonnet</span>
              <ArrowRight className="w-3 h-3 text-white/50 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-3 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]" />
            </span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">
              Documentation
            </span>
            <div className="h-px w-12 bg-gradient-to-r from-white/[0.1] to-transparent" />
            <span className="text-[10px] font-mono text-white/25 tracking-[0.2em]">
              v1.0
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: 0.15,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-[2.75rem] sm:text-[3.75rem] lg:text-[4.5rem] font-semibold tracking-[-0.04em] leading-[0.96] mb-8"
          >
            <span className="text-white/95">Build with</span>{" "}
            <span
              className="font-display italic font-normal bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 via-violet-200 to-indigo-300"
              style={{ textShadow: "0 0 40px rgba(165,180,252,0.25)" }}
            >
              Yapapa
            </span>
            <span className="text-white/40">.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-[15px] sm:text-[17px] text-white/45 max-w-xl leading-[1.7] mb-10"
          >
            One unified API for 100+ AI models. OpenAI-compatible drop-in
            replacement with credit-based billing, real-time analytics, and full
            conversation control.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              href="/docs/quickstart"
              className={cn(
                "group flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "bg-gradient-to-br from-indigo-500/20 via-indigo-500/12 to-violet-500/10",
                "border border-indigo-500/25",
                "text-[13px] font-medium text-white/85 hover:text-white",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(99,102,241,0.4)]",
                "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(99,102,241,0.55)]",
                "hover:border-indigo-400/40",
                "transition-all duration-300 relative overflow-hidden",
              )}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <Zap className="w-3.5 h-3.5 text-indigo-200" />
              Get Started
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              type="button"
              onClick={() => {
                const e = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(e);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer",
                "border border-white/[0.07] bg-white/[0.02]",
                "text-[13px] font-medium text-white/45 hover:text-white/75",
                "hover:border-indigo-500/20 hover:bg-indigo-500/[0.04]",
                "transition-all duration-300",
              )}
            >
              <Search className="w-3.5 h-3.5" />
              Search docs
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-[2px] rounded-[4px] bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-white/30 leading-none ml-1">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
            <Link
              href="/docs/api-reference"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/35 hover:text-white/65 transition-colors duration-300"
            >
              API Reference
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </motion.div>

          {/* Animated stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          >
            {heroStats.map((s, i) => (
              <div
                key={s.label}
                className="relative px-4 py-4 sm:py-5 bg-[#06060a]/40 backdrop-blur-sm"
              >
                {i > 0 && (
                  <span
                    className="hidden sm:block absolute left-0 top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent"
                    aria-hidden
                  />
                )}
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em] bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 animate-[count-shimmer_4s_ease-in-out_infinite] tabular-nums"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    {s.value}
                  </span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Live status rail */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 text-[11px] font-mono text-white/30"
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400/80" />
              <span>All systems operational</span>
            </span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-200/70" />
              <span>100+ models available</span>
            </span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-violet-200/70" />
              <span>Last updated 2 days ago</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* QUICK START RAIL */}
      <section className="relative mb-24 sm:mb-32">
        <header className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Zap className="w-3.5 h-3.5 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              From zero to{" "}
              <span className="font-display italic font-normal text-indigo-200/95">
                production
              </span>
            </h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
          <span className="text-[9px] font-mono text-white/25 tracking-[0.18em]">
            03 STEPS
          </span>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickSteps.map((item, i) => {
            const accentMap = {
              indigo: {
                tint: "from-indigo-500/[0.06]",
                ring: "border-indigo-500/25",
                text: "text-indigo-200",
              },
              violet: {
                tint: "from-violet-500/[0.06]",
                ring: "border-violet-500/25",
                text: "text-violet-200",
              },
              purple: {
                tint: "from-purple-500/[0.06]",
                ring: "border-purple-500/25",
                text: "text-purple-200",
              },
            } as const;
            const a = accentMap[item.accent];
            return (
              <ParallaxCard key={item.step} intensity={6}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative block rounded-2xl overflow-hidden p-6",
                    "border border-white/[0.07] bg-gradient-to-br",
                    a.tint,
                    "via-white/[0.01] to-transparent",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.4)]",
                    "hover:border-indigo-500/25 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-12px_rgba(99,102,241,0.3)]",
                    "hover:-translate-y-0.5",
                    "transition-all duration-300 cursor-pointer",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60" />
                  <div
                    className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)",
                      filter: "blur(20px)",
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className={cn(
                          "relative flex items-center justify-center w-9 h-9 rounded-xl border",
                          a.ring,
                          "bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                        )}
                      >
                        <div
                          className="absolute inset-0 rounded-xl opacity-40 group-hover:opacity-90 transition-opacity duration-500"
                          style={{
                            boxShadow: "0 0 16px rgba(165,180,252,0.4)",
                          }}
                        />
                        <span
                          className={cn(
                            "relative text-[11px] font-mono font-bold tracking-[0.05em]",
                            a.text,
                          )}
                        >
                          {item.step}
                        </span>
                      </div>
                      {i < quickSteps.length - 1 && (
                        <>
                          <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-indigo-500/20 via-white/[0.05] to-transparent" />
                          <ArrowRight className="hidden sm:block w-3 h-3 text-indigo-200/30" />
                        </>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          "border border-white/[0.06] bg-white/[0.02]",
                          "group-hover:bg-indigo-500/[0.06]",
                          "transition-all duration-300",
                        )}
                      >
                        <item.icon className="w-4 h-4 text-white/40 group-hover:text-indigo-200 transition-all duration-300 group-hover:scale-110" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white/75 group-hover:text-white transition-colors tracking-[-0.01em]">
                          {item.title}
                        </p>
                        <p className="text-[11.5px] text-white/35 mt-1 leading-[1.55] group-hover:text-white/50 transition-colors">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </ParallaxCard>
            );
          })}
        </div>
      </section>

      {/* LIVE CODE PREVIEW */}
      <CodePreview />

      {/* POPULAR + RECENT */}
      <section className="relative mb-24 sm:mb-32 grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Popular pages */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <Star className="w-3.5 h-3.5 text-indigo-200" />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-indigo-200/70">
              Most Read
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 to-transparent" />
          </div>
          <div className="space-y-1">
            {popularPages.map((p, i) => (
              <Link
                key={p.id}
                href={p.href}
                className="group flex items-center justify-between px-3 py-2.5 -mx-3 rounded-lg hover:bg-indigo-500/[0.04] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono text-white/20 tabular-nums w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-medium text-white/60 group-hover:text-white transition-colors truncate">
                    {p.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] font-mono text-white/25 tabular-nums group-hover:text-indigo-200/80 transition-colors">
                    {p.views} reads
                  </span>
                  <ArrowRight className="w-3 h-3 text-white/[0.1] group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent updates */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <Activity className="w-3.5 h-3.5 text-indigo-200" />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-indigo-200/70">
              Recent Updates
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 to-transparent" />
          </div>
          <div className="space-y-3">
            {recentUpdates.map((u, i) => (
              <Link key={i} href={`/docs/${u.page}`} className="group block">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "text-[9px] font-mono font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border flex-shrink-0 mt-px",
                      tagStyles[u.tag],
                    )}
                  >
                    {u.tag}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-white/60 group-hover:text-white transition-colors leading-snug">
                      {u.title}
                    </p>
                    <span className="text-[9px] font-mono text-white/25 tabular-nums mt-0.5 block">
                      {u.date}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY SECTIONS */}
      {categories.map((category, catIdx) => {
        const catSections = sections.filter((s) => s.category === category);
        const catCount = catSections.length;
        const accent = categoryAccent[category];

        return (
          <section
            key={category}
            id={`cat-${category.toLowerCase().replace(/\s+/g, "-")}`}
            ref={(el) => {
              sectionRefs.current[category] = el;
            }}
            className="relative mb-16 sm:mb-20 last:mb-8 scroll-mt-24"
          >
            <header className="flex items-center gap-3 mb-7">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] bg-gradient-to-br to-transparent border",
                    accent.tint,
                    accent.ring,
                  )}
                >
                  <BookOpen className={cn("w-3.5 h-3.5", accent.icon)} />
                </div>
                <h2 className="text-[18px] sm:text-[22px] font-semibold tracking-[-0.025em] text-white">
                  {category}
                </h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
              <span className="text-[9px] font-mono text-white/30 tabular-nums tracking-[0.15em]">
                {String(catCount).padStart(2, "0")} PAGES
              </span>
            </header>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.04,
                    delayChildren: catIdx * 0.05,
                  },
                },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {catSections.map((section, idx) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  idx={idx}
                  accent={accent}
                />
              ))}
            </motion.div>
          </section>
        );
      })}

      {/* BOTTOM CTA PAIR */}
      <section className="relative mt-16 mb-12 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Primary CTA with rotating border */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 relative rounded-2xl overflow-hidden p-[1px]"
        >
          <div
            className="absolute inset-[-100%] opacity-60 animate-[border-rotate_8s_linear_infinite] pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(99,102,241,0.6) 90deg, transparent 180deg, rgba(139,92,246,0.4) 270deg, transparent 360deg)",
            }}
          />
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.04] to-[#06060a] p-8 sm:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/[0.12] blur-3xl pointer-events-none" />
            <div className="relative">
              <h3 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.03em] text-white mb-3">
                Ready to ship{" "}
                <span className="font-display italic font-normal text-indigo-200/95">
                  faster
                </span>
                ?
              </h3>
              <p className="text-[14px] text-white/55 max-w-md leading-[1.7] mb-5">
                Open the playground to test prompts against any model in your
                browser, or grab a key and make your first call in 30 seconds.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-7 text-[11px] font-mono text-white/35">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400/80" />
                  <span>5 min setup</span>
                </span>
                <span className="text-white/10">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400/80" />
                  <span>100+ models</span>
                </span>
                <span className="text-white/10">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400/80" />
                  <span>OpenAI-compatible</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/playground"
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl",
                    "bg-white/[0.06] border border-white/[0.1] text-[13px] font-medium text-white/85",
                    "hover:bg-white/[0.1] hover:border-white/[0.18] hover:text-white",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                    "transition-all duration-300",
                  )}
                >
                  Open Playground
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/docs/quickstart"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white/55 hover:text-white transition-colors"
                >
                  Read the Quick Start
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary: self-host */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-cyan-500/[0.06] blur-3xl pointer-events-none" />

          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                <Server className="w-4 h-4 text-cyan-200" />
              </div>
              <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
                Self-Host
              </span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-white mb-2">
              Run Yapapa on your{" "}
              <span className="font-display italic font-normal text-cyan-200/95">
                infra
              </span>
            </h3>
            <p className="text-[12.5px] text-white/45 leading-[1.65] mb-6 flex-1">
              Deploy with Docker, configure your base URL, and route everything
              through your own gateway.
            </p>
            <Link
              href="/docs/self-hosting"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-200 hover:text-white transition-colors group/link"
            >
              Self-hosting guide
              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER STRIP */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative mt-12 pt-6 border-t border-white/[0.05]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[11px] font-mono text-white/30">
          <div className="flex items-center gap-4">
            <span>v1.0</span>
            <span className="text-white/10">·</span>
            <span>Last updated 2 days ago</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/shinmentakezo07/owsiwa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white/70 transition-colors"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              Edit on GitHub
            </a>
            <span className="text-white/10">·</span>
            <a
              href="mailto:support@yapapa.dev"
              className="flex items-center gap-1.5 hover:text-white/70 transition-colors"
            >
              <Mail className="w-3 h-3" />
              support@yapapa.dev
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
