"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Book, Users, Webhook,
  Search, UserPlus, ChevronRight, Sparkles, Clock, Star,
  ArrowUpRight, Hash, CircleDot,
} from "lucide-react";
import type { NavItem } from "@/components/docs/types";

interface DocSection extends NavItem {
  desc: string;
  featured?: boolean;
  category: string;
  badge?: string;
}

const sections: DocSection[] = [
  { id: "quickstart", label: "Quick Start", icon: Zap, desc: "Get up and running in under 5 minutes.", category: "Getting Started", featured: true, badge: "Start here" },
  { id: "authentication", label: "Authentication", icon: Key, desc: "API keys, JWT, and bearer token auth.", category: "Getting Started" },
  { id: "api-reference", label: "API Reference", icon: Code2, desc: "Complete endpoint documentation.", category: "Getting Started", featured: true },
  { id: "chat", label: "Chat & Streaming", icon: MessageSquare, desc: "SSE streaming and standard chat.", category: "Core Features", featured: true, badge: "Popular" },
  { id: "embeddings", label: "Embeddings", icon: Database, desc: "Generate text embeddings.", category: "Core Features" },
  { id: "conversations", label: "Conversations", icon: Boxes, desc: "Multi-turn conversation management.", category: "Core Features" },
  { id: "prompts", label: "Prompt Templates", icon: FileText, desc: "Reusable prompt templates.", category: "Core Features" },
  { id: "batch", label: "Batch API", icon: Layers, desc: "Process multiple requests at once.", category: "Platform", featured: true },
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

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const categoryIconMap: Record<string, typeof Zap> = {
  "Getting Started": Zap,
  "Core Features": Code2,
  "Platform": Layers,
  "Reference": Book,
};

const categoryAccentMap: Record<string, { text: string; bg: string; ring: string; border: string; glow: string }> = {
  "Getting Started": { text: "text-emerald-400", bg: "bg-emerald-400/8", ring: "ring-emerald-400/15", border: "border-emerald-400/20", glow: "shadow-emerald-500/5" },
  "Core Features": { text: "text-sky-400", bg: "bg-sky-400/8", ring: "ring-sky-400/15", border: "border-sky-400/20", glow: "shadow-sky-500/5" },
  "Platform": { text: "text-violet-400", bg: "bg-violet-400/8", ring: "ring-violet-400/15", border: "border-violet-400/20", glow: "shadow-violet-500/5" },
  "Reference": { text: "text-amber-400", bg: "bg-amber-400/8", ring: "ring-amber-400/15", border: "border-amber-400/20", glow: "shadow-amber-500/5" },
};

export default function DocsIndexPage() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative mb-16"
      >
        <div className="absolute inset-0 overflow-hidden rounded-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(139,92,246,0.05),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        <div className="relative z-10 pt-10 pb-12 md:pt-14 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
            </span>
            <span className="text-xs font-medium text-white/40 tracking-wide">API Documentation</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[0.95]"
          >
            <span className="text-white">Build with</span>
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              Yapapa
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base md:text-lg text-white/35 max-w-lg leading-relaxed mb-10"
          >
            One unified API for 100+ AI models. OpenAI-compatible drop-in replacement with credit-based billing and real-time analytics.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-x-8 gap-y-4"
          >
            {[
              { value: "100+", label: "Models" },
              { value: "<50ms", label: "Latency" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white/80 font-mono">{stat.value}</span>
                <span className="text-[11px] text-white/25 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-16"
      >
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200 text-sm text-white/25 hover:text-white/40"
        >
          <Search className="w-4 h-4 text-white/20" />
          <span>Search docs...</span>
          <kbd className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/20">
            <span>⌘</span>K
          </kbd>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-20"
      >
        <div className="flex items-center gap-3 mb-6">
          <Hash className="w-3.5 h-3.5 text-white/20" />
          <h2 className="text-xs uppercase tracking-widest font-mono text-white/30">Quick Start</h2>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.04]">
          {[
            { step: "01", title: "Sign Up", desc: "30 seconds", icon: UserPlus, accent: "text-emerald-400" },
            { step: "02", title: "Get API Key", desc: "1 minute", icon: Key, accent: "text-sky-400" },
            { step: "03", title: "First Request", desc: "2 minutes", icon: Terminal, accent: "text-violet-400" },
          ].map((item, idx) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group relative flex items-center gap-4 p-6 bg-[#080808] hover:bg-[#0c0c0c] transition-colors duration-200"
            >
              <div className={`text-2xl font-black font-mono text-white/[0.04] group-hover:text-white/[0.08] transition-colors absolute top-4 right-4`}>
                {item.step}
              </div>
              <div className={`w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center ${item.accent} group-hover:bg-white/[0.05] transition-colors flex-shrink-0`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{item.title}</p>
                <p className="text-[11px] text-white/25 font-mono">{item.desc}</p>
              </div>
              {idx < 2 && (
                <div className="hidden sm:block absolute -right-px top-1/2 -translate-y-1/2 text-white/[0.06] z-10">
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </motion.div>

      {categories.map((category, catIdx) => {
        const categorySections = sections.filter((s) => s.category === category);
        const featured = categorySections.filter((s) => s.featured);
        const standard = categorySections.filter((s) => !s.featured);
        const accent = categoryAccentMap[category];
        const CatIcon = categoryIconMap[category];

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + catIdx * 0.08, duration: 0.5 }}
            className="mb-20 last:mb-0"
          >
            <div className="flex items-center gap-3 mb-8">
              <CircleDot className={`w-3 h-3 ${accent.text}`} />
              <h3 className="text-sm font-semibold text-white/50">
                {category}
              </h3>
              <span className="text-[10px] font-mono text-white/15">
                {categorySections.length}
              </span>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-px"
            >
              {featured.map((section, fIdx) => (
                <motion.div key={section.id} variants={cardVariants}>
                  <Link
                    href={`/docs/${section.id}`}
                    className={`group relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-5 md:p-6 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/[0.08] transition-all duration-300 ${fIdx < featured.length - 1 ? "mb-px" : ""}`}
                  >
                    <div className={`w-11 h-11 rounded-lg ${accent.bg} flex items-center justify-center ${accent.text} ring-1 ${accent.ring} group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                      <section.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-white/80 group-hover:text-white transition-colors">
                          {section.label}
                        </h4>
                        {section.badge && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${accent.bg} ${accent.text} ring-1 ${accent.ring}`}>
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/30">{section.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                      <code className="hidden md:block text-xs font-mono text-white/15 group-hover:text-white/25 transition-colors">
                        /api/{section.id}
                      </code>
                      <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                    </div>
                  </Link>
                </motion.div>
              ))}

              {standard.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.03] rounded-xl overflow-hidden border border-white/[0.03] mt-4">
                  {standard.map((section) => (
                    <motion.div key={section.id} variants={cardVariants}>
                      <Link
                        href={`/docs/${section.id}`}
                        className="group flex items-start gap-3 p-4 bg-[#080808] hover:bg-[#0c0c0c] transition-colors duration-200 h-full"
                      >
                        <div className="w-8 h-8 rounded-md bg-white/[0.03] flex items-center justify-center text-white/20 flex-shrink-0 group-hover:bg-white/[0.05] group-hover:text-white/30 transition-colors">
                          <section.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors truncate">
                              {section.label}
                            </h4>
                            <ArrowRight className="w-3 h-3 text-white/5 group-hover:text-white/20 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-white/20 mt-0.5 leading-relaxed line-clamp-2">{section.desc}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-16"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-3.5 h-3.5 text-white/20" />
          <h2 className="text-xs uppercase tracking-widest font-mono text-white/30">At a Glance</h2>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
          {[
            { value: `${sections.length}`, label: "Doc Sections" },
            { value: "6", label: "Languages" },
            { value: "100+", label: "AI Models" },
            { value: "24/7", label: "Support" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center p-6 bg-[#080808]">
              <p className="text-2xl font-black text-white/80 font-mono">{stat.value}</p>
              <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden group"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgba(56,189,248,0.06),transparent)]" />

        <div className="relative z-10 px-8 py-12 md:px-12 md:py-16 text-center">
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Ready to Build?</h3>
          <p className="text-white/30 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Start integrating with 100+ AI models through one unified, credit-based API.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group/btn relative px-6 py-3 rounded-lg bg-white text-black hover:bg-white/90 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <span>Sign Up Free</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/docs/quickstart"
              className="px-6 py-3 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.12] font-medium text-sm transition-all flex items-center gap-2"
            >
              <span>Quick Start</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
