"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Book, Users, Webhook,
  Search, UserPlus,
} from "lucide-react";

interface DocSection extends NavItem {
  desc: string;
  featured?: boolean;
  category: string;
}

const sections: DocSection[] = [
  // Getting Started
  { id: "quickstart", label: "Quick Start", icon: Zap, desc: "Get up and running in under 5 minutes.", category: "Getting Started", featured: true },
  { id: "authentication", label: "Authentication", icon: Key, desc: "API keys, JWT, and bearer token auth.", category: "Getting Started" },
  { id: "api-reference", label: "API Reference", icon: Code2, desc: "Complete endpoint documentation.", category: "Getting Started" },
  // Core Features
  { id: "chat", label: "Chat & Streaming", icon: MessageSquare, desc: "SSE streaming and standard chat.", category: "Core Features" },
  { id: "embeddings", label: "Embeddings", icon: Database, desc: "Generate text embeddings.", category: "Core Features" },
  { id: "conversations", label: "Conversations", icon: Boxes, desc: "Multi-turn conversation management.", category: "Core Features" },
  { id: "prompts", label: "Prompt Templates", icon: FileText, desc: "Reusable prompt templates.", category: "Core Features", featured: true },
  // Platform
  { id: "batch", label: "Batch API", icon: Layers, desc: "Process multiple requests at once.", category: "Platform", featured: true },
  { id: "files", label: "File Upload", icon: UploadCloud, desc: "Upload images for vision models.", category: "Platform" },
  { id: "webhooks", label: "Webhooks", icon: Webhook, desc: "Event-driven outbound webhook delivery.", category: "Platform" },
  { id: "rate-limits", label: "Rate Limits", icon: Shield, desc: "Usage limits and throttling.", category: "Platform" },
  { id: "error-handling", label: "Error Handling", icon: AlertTriangle, desc: "Error codes and responses.", category: "Platform" },
  { id: "organizations", label: "Organizations", icon: Users, desc: "Multi-user organization management.", category: "Platform" },
  // Reference
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

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function DocsIndexPage() {
  return (
    <>

      {/* Hero Search Zone */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        {/* Search bar */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#0A0A0A] border border-white/10 backdrop-blur-md text-sm text-white/30 hover:text-white/50 hover:border-white/20 transition-all duration-200"
        >
          <Search className="w-5 h-5 text-white/20" />
          <span>Search docs, endpoints, models...</span>
          <kbd className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/20">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Quick-start pathway */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { step: "1", title: "Sign Up", desc: "30 seconds", icon: UserPlus, color: "text-purple-400", bg: "bg-purple-400/10" },
            { step: "2", title: "Get API Key", desc: "1 minute", icon: Key, color: "text-blue-400", bg: "bg-blue-400/10" },
            { step: "3", title: "First Request", desc: "2 minutes", icon: Terminal, color: "text-green-400", bg: "bg-green-400/10" },
          ].map((item) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group flex items-center gap-4 p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} ring-1 ring-white/5`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-white/20">STEP {item.step}</span>
                <p className="text-sm font-semibold text-white/80 group-hover:text-blue-400 transition-colors">{item.title}</p>
                <p className="text-[10px] text-white/30 font-mono">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Categorized Card Grid */}
      {categories.map((category) => {
        const categorySections = sections.filter((s) => s.category === category);
        const featured = categorySections.filter((s) => s.featured);
        const standard = categorySections.filter((s) => !s.featured);

        return (
          <div key={category} className="mb-16 last:mb-0">
            {/* Category header */}
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xs uppercase tracking-widest font-mono text-white/20">
                {category}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
            >
              {/* Featured cards (col-span-2) */}
              {featured.map((section) => (
                <motion.div key={section.id} variants={cardVariants} className="sm:col-span-2">
                  <Link
                    href={`/docs/${section.id}`}
                    className="group relative block rounded-[28px] p-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 hover:from-blue-500/30 hover:via-purple-500/20 hover:to-blue-500/30 transition-all duration-500"
                  >
                    <div className="bg-[#0A0A0A] rounded-[27px] p-6 md:p-8 h-full">
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/[0.12] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.2] group-hover:ring-blue-500/[0.3] group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                          <section.icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                              {section.label}
                            </h3>
                            <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-blue-400/60 transition-all duration-300 flex-shrink-0" />
                          </div>
                          <p className="text-sm text-white/40 mb-4">{section.desc}</p>
                          {/* Mini code preview */}
                          <div className="rounded-xl bg-black border border-white/5 p-3 font-mono text-xs text-green-400/60">
                            <span className="text-blue-400">GET</span> /api/{section.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Standard cards */}
              {standard.map((section) => (
                <motion.div key={section.id} variants={cardVariants}>
                  <Link
                    href={`/docs/${section.id}`}
                    className="group flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-[#0A0A0A] hover:border-blue-500/[0.2] hover:bg-white/[0.02] transition-all duration-300 h-full"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] flex-shrink-0 group-hover:ring-blue-500/[0.25] transition-all duration-300">
                      <section.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {section.label}
                        </h3>
                        <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-blue-400/60 transition-all duration-300 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-white/40 mt-1 leading-relaxed">{section.desc}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        );
      })}

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-2xl border border-white/5 bg-[#0A0A0A]/50 p-4 mt-12 text-xs font-mono text-white/30 text-center"
      >
        {sections.length} sections &middot; 6 code languages &middot; 100+ models &middot; 24/7 support
      </motion.div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative rounded-2xl p-10 md:p-14 border border-white/[0.06] text-center overflow-hidden mt-12 group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] via-purple-500/[0.03] to-transparent" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[120px] group-hover:bg-blue-500/[0.08] transition-all duration-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.03)_0%,_transparent_60%)]" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] mx-auto mb-6">
            <Book className="w-7 h-7" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Ready to Build?</h3>
          <p className="text-white/40 mb-8 max-w-lg mx-auto text-sm md:text-base">
            Start integrating with 100+ AI models through one unified, credit-based API.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group/btn relative px-7 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-500/90 text-white font-semibold text-sm transition-all flex items-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
              <span className="relative z-10">Sign Up Free</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
