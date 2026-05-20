"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Users, Webhook, Globe,
} from "lucide-react";
import type { NavItem } from "@/components/docs/types";

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

const categories = ["Getting Started", "Core Features", "Platform", "Reference"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function DocsIndexPage() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-24"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-400/70" />
          </div>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Documentation</span>
        </div>
        <h1 className="text-4xl md:text-[3.5rem] font-bold tracking-tight text-white mb-5 leading-[1.05]">
          Build with<br />
          <span className="bg-gradient-to-r from-blue-400/90 to-blue-300/60 bg-clip-text text-transparent">Yapapa</span>
        </h1>
        <p className="text-[16px] text-white/35 max-w-lg leading-[1.7]">
          One unified API for 100+ AI models. OpenAI-compatible drop-in replacement with credit-based billing and real-time analytics.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-24"
      >
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Quick Start</h2>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "01", title: "Sign up", desc: "Create an account" },
            { step: "02", title: "Get a key", desc: "Generate an API key" },
            { step: "03", title: "Make a request", desc: "Call any model" },
          ].map((item) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group relative p-5 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:border-blue-500/[0.15] hover:bg-blue-500/[0.02] transition-all duration-300 cursor-pointer"
            >
              <span className="text-2xl font-mono font-bold text-white/[0.06] group-hover:text-blue-400/20 transition-colors duration-300">
                {item.step}
              </span>
              <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors mt-1">{item.title}</p>
              <p className="text-xs text-white/20 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {categories.map((category, catIdx) => {
        const categorySections = sections.filter((s) => s.category === category);
        const categoryColors: Record<string, string> = {
          "Getting Started": "text-emerald-400/50",
          "Core Features": "text-blue-400/50",
          "Platform": "text-amber-400/50",
          "Reference": "text-violet-400/50",
        };

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + catIdx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 last:mb-0"
          >
            <div className="flex items-center gap-3 mb-5">
              <h3 className={`text-[10px] font-mono uppercase tracking-[0.2em] ${categoryColors[category] || "text-white/20"}`}>
                {category}
              </h3>
              <div className="h-px flex-1 bg-white/[0.04]" />
              <span className="text-[10px] font-mono text-white/10">{categorySections.length}</span>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {categorySections.map((section) => (
                <motion.div key={section.id} variants={itemVariants}>
                  <Link
                    href={`/docs/${section.id}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/[0.06] group-hover:border-blue-500/[0.1] transition-all duration-200">
                      <section.icon className="w-3.5 h-3.5 text-white/20 group-hover:text-blue-400/60 transition-colors duration-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white/50 group-hover:text-white/80 transition-colors duration-200 truncate">
                        {section.label}
                      </p>
                      <p className="text-[11px] text-white/20 truncate mt-0.5">
                        {section.desc}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-white/[0.06] group-hover:text-white/20 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );
      })}
    </>
  );
}
