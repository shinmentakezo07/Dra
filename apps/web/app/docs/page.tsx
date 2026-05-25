"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Users, Webhook, Globe,
} from "lucide-react";
import type { NavItem } from "@/components/docs/types";

/* ── Section design tokens ── */
const SECTION_STYLES = {
  "Getting Started": {
    border: "border-emerald-500/[0.15] hover:border-emerald-500/30",
    icon: "text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/15",
    glow: "from-emerald-500/[0.04]",
    gradient: "from-emerald-400 to-emerald-600",
    dot: "bg-emerald-500",
  },
  "Core Features": {
    border: "border-blue-500/[0.15] hover:border-blue-500/30",
    icon: "text-blue-400 bg-blue-500/[0.06] border-blue-500/15",
    glow: "from-blue-500/[0.04]",
    gradient: "from-blue-400 to-cyan-600",
    dot: "bg-blue-500",
  },
  "Platform": {
    border: "border-amber-500/[0.15] hover:border-amber-500/30",
    icon: "text-amber-400 bg-amber-500/[0.06] border-amber-500/15",
    glow: "from-amber-500/[0.04]",
    gradient: "from-amber-400 to-orange-600",
    dot: "bg-amber-500",
  },
  "Reference": {
    border: "border-violet-500/[0.15] hover:border-violet-500/30",
    icon: "text-violet-400 bg-violet-500/[0.06] border-violet-500/15",
    glow: "from-violet-500/[0.04]",
    gradient: "from-violet-400 to-purple-600",
    dot: "bg-violet-500",
  },
} as const;

interface DocSection extends NavItem {
  desc: string;
  category: string;
}

const sections: DocSection[] = [
  { id: "quickstart", label: "Quick Start", icon: Zap, desc: "Get up and running in under 5 minutes.", category: "Getting Started" },
  { id: "authentication", label: "Authentication", icon: Key, desc: "API keys, JWT, and bearer token auth.", category: "Getting Started" },
  { id: "api-reference", label: "API Reference", icon: Code2, desc: "Complete endpoint documentation.", category: "Getting Started" },
  { id: "self-hosting", label: "Self-Hosting", icon: Globe, desc: "Configure base URL for your deployment.", category: "Getting Started" },
  { id: "chat", label: "Chat & Streaming", icon: MessageSquare, desc: "SSE streaming and standard chat.", category: "Core Features" },
  { id: "embeddings", label: "Embeddings", icon: Database, desc: "Generate text embeddings.", category: "Core Features" },
  { id: "conversations", label: "Conversations", icon: Boxes, desc: "Multi-turn conversation management.", category: "Core Features" },
  { id: "prompts", label: "Prompt Templates", icon: FileText, desc: "Reusable prompt templates.", category: "Core Features" },
  { id: "batch", label: "Batch API", icon: Layers, desc: "Process multiple requests at once.", category: "Platform" },
  { id: "files", label: "File Upload", icon: UploadCloud, desc: "Upload images for vision models.", category: "Platform" },
  { id: "webhooks", label: "Webhooks", icon: Webhook, desc: "Event-driven outbound webhook delivery.", category: "Platform" },
  { id: "rate-limits", label: "Rate Limits", icon: Shield, desc: "Usage limits and throttling.", category: "Platform" },
  { id: "error-handling", label: "Error Handling", icon: AlertTriangle, desc: "Error codes and responses.", category: "Platform" },
  { id: "organizations", label: "Organizations", icon: Users, desc: "Multi-user organization management.", category: "Platform" },
  { id: "models", label: "Available Models", icon: Cpu, desc: "Supported providers and models.", category: "Reference" },
  { id: "pricing", label: "Pricing & Credits", icon: TrendingUp, desc: "Credit system and costs.", category: "Reference" },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, desc: "Usage analytics and monitoring.", category: "Reference" },
  { id: "security", label: "Security", icon: Lock, desc: "Encryption, hashing, and CORS.", category: "Reference" },
  { id: "examples", label: "Code Examples", icon: Terminal, desc: "Full examples in Python, JS, Go.", category: "Reference" },
];

const categories = ["Getting Started", "Core Features", "Platform", "Reference"] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DocsIndexPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* ── Hero ── */}
      <div className="mb-16 sm:mb-24 pt-8 sm:pt-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em]">Documentation</span>
        </div>
        <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-bold tracking-tight leading-[1.05] mb-6">
          <span className="text-white">Build with</span><br />
          <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-200 bg-clip-text text-transparent">
            Yapapa
          </span>
        </h1>
        <p className="text-base sm:text-lg text-white/40 max-w-xl leading-relaxed">
          One unified API for 100+ AI models. OpenAI-compatible drop-in replacement with credit-based billing and real-time analytics.
        </p>
      </div>

      {/* ── Quick Start rail ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-20 sm:mb-28"
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[9px] font-mono font-semibold text-emerald-400/70 uppercase tracking-[0.18em]">Quick Start</span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/25 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "01", title: "Sign up", desc: "Create an account in seconds" },
            { step: "02", title: "Get a key", desc: "Generate your API credentials" },
            { step: "03", title: "Make a request", desc: "Call any model instantly" },
          ].map((item) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group relative p-5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-emerald-500/[0.2] hover:bg-emerald-500/[0.02] hover:shadow-lg hover:shadow-emerald-500/[0.03] transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-emerald-500/[0.04] blur-xl group-hover:bg-emerald-500/[0.08] transition-all duration-500" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400/60 group-hover:text-emerald-400/90 transition-colors">
                    {item.step}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                </div>
                <p className="text-sm font-semibold text-white/65 group-hover:text-white/85 transition-colors">{item.title}</p>
                <p className="text-xs text-white/25 mt-0.5 group-hover:text-white/35 transition-colors">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Category sections ── */}
      {categories.map((category, catIdx) => {
        const catSections = sections.filter((s) => s.category === category);
        const style = SECTION_STYLES[category];

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + catIdx * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 sm:mb-16 last:mb-0"
          >
            {/* Category header */}
            <div className="group cursor-default mb-5">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${style.dot} opacity-60`} />
                <h3 className={`text-[10px] font-mono font-semibold uppercase tracking-[0.2em] ${style.icon.split(" ")[0]}`}>
                  {category}
                </h3>
                <div className="h-px flex-1 bg-white/[0.04]" />
                <span className="text-[10px] font-mono text-white/15">{catSections.length}</span>
              </div>
            </div>

            {/* Section cards */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {catSections.map((section) => (
                <motion.div key={section.id} variants={fadeUp}>
                  <Link
                    href={`/docs/${section.id}`}
                    className={`group flex items-center gap-4 p-4 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02] hover:shadow-md hover:shadow-black/5 transition-all duration-200 cursor-pointer`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${style.icon.split(" ").slice(1).join(" ")} flex items-center justify-center flex-shrink-0 border transition-all duration-200 shadow-sm shadow-black/10`}>
                      <section.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white/[0.55] group-hover:text-white/85 transition-colors duration-200 truncate">
                        {section.label}
                      </p>
                      <p className="text-[11px] text-white/25 truncate mt-0.5 group-hover:text-white/35 transition-colors">
                        {section.desc}
                      </p>
                    </div>
                    <ArrowRight className={`w-3 h-3 text-white/[0.08] group-hover:text-white/25 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0`} />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
