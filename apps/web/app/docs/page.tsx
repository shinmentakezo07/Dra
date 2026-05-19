"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Book, Users, Webhook,
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
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
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
        transition={{ duration: 0.5 }}
        className="mb-20"
      >
        <p className="text-xs font-mono text-white/20 mb-6">Documentation</p>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4 leading-[1.1]">
          Build with Yapapa
        </h1>
        <p className="text-[15px] text-white/35 max-w-lg leading-relaxed">
          One unified API for 100+ AI models. OpenAI-compatible drop-in replacement with credit-based billing and real-time analytics.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-20"
      >
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-xs font-mono text-white/15 uppercase tracking-widest">Quick Start</h2>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Sign up", desc: "Create an account" },
            { step: "2", title: "Get a key", desc: "Generate an API key" },
            { step: "3", title: "Make a request", desc: "Call any model" },
          ].map((item) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group flex items-start gap-4 p-5 rounded-lg border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-lg font-mono text-white/10 group-hover:text-white/20 transition-colors flex-shrink-0">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">{item.title}</p>
                <p className="text-xs text-white/20 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {categories.map((category, catIdx) => {
        const categorySections = sections.filter((s) => s.category === category);

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + catIdx * 0.06, duration: 0.4 }}
            className="mb-16 last:mb-0"
          >
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xs font-mono text-white/15 uppercase tracking-widest">
                {category}
              </h3>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-0"
            >
              {categorySections.map((section) => (
                <motion.div key={section.id} variants={itemVariants}>
                  <Link
                    href={`/docs/${section.id}`}
                    className="group flex items-center gap-4 py-3.5 border-b border-white/[0.03] hover:border-white/[0.06] transition-colors"
                  >
                    <section.icon className="w-3.5 h-3.5 text-white/15 group-hover:text-white/25 transition-colors flex-shrink-0" />
                    <span className="text-sm text-white/40 group-hover:text-white/70 transition-colors flex-1">
                      {section.label}
                    </span>
                    <span className="text-xs text-white/10 group-hover:text-white/20 transition-colors hidden sm:block">
                      {section.desc}
                    </span>
                    <ArrowRight className="w-3 h-3 text-white/5 group-hover:text-white/15 group-hover:translate-x-0.5 transition-all" />
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
