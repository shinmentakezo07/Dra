"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, ArrowRight, Book,
} from "lucide-react";

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

const sections = [
  { id: "quickstart", label: "Quick Start", icon: Zap, desc: "Get up and running in under 5 minutes." },
  { id: "authentication", label: "Authentication", icon: Key, desc: "API keys, JWT, and bearer token auth." },
  { id: "api-reference", label: "API Reference", icon: Code2, desc: "Complete endpoint documentation." },
  { id: "chat", label: "Chat & Streaming", icon: MessageSquare, desc: "SSE streaming and standard chat." },
  { id: "embeddings", label: "Embeddings", icon: Database, desc: "Generate text embeddings." },
  { id: "conversations", label: "Conversations", icon: Boxes, desc: "Multi-turn conversation management." },
  { id: "prompts", label: "Prompt Templates", icon: FileText, desc: "Reusable prompt templates." },
  { id: "batch", label: "Batch API", icon: Layers, desc: "Process multiple requests at once." },
  { id: "files", label: "File Upload", icon: UploadCloud, desc: "Upload images for vision models." },
  { id: "rate-limits", label: "Rate Limits", icon: Shield, desc: "Usage limits and throttling." },
  { id: "error-handling", label: "Error Handling", icon: AlertTriangle, desc: "Error codes and responses." },
  { id: "models", label: "Available Models", icon: Cpu, desc: "Supported providers and models." },
  { id: "pricing", label: "Pricing & Credits", icon: TrendingUp, desc: "Credit system and costs." },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, desc: "Usage analytics and monitoring." },
  { id: "security", label: "Security", icon: Lock, desc: "Encryption, hashing, and CORS." },
  { id: "examples", label: "Code Examples", icon: Terminal, desc: "Full examples in Python, JS, Go." },
];

export default function DocsIndexPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-10">
        <h2 className="text-3xl font-black tracking-tight text-white mb-3">Documentation</h2>
        <p className="text-gray-500 text-sm font-mono max-w-lg">
          Everything you need to integrate with 100+ AI models through one unified API.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {sections.map((section) => (
          <motion.div key={section.id} variants={cardVariants}>
            <Link
              href={`/docs/${section.id}`}
              className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A] hover:border-blue-500/[0.15] hover:bg-white/[0.01] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] flex-shrink-0 group-hover:ring-blue-500/[0.25] transition-all duration-300">
                <section.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">
                    {section.label}
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-blue-400/60 transition-all duration-300 -mr-1" />
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{section.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative rounded-2xl p-10 md:p-14 border border-white/[0.06] text-center overflow-hidden mt-16 group"
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
    </motion.div>
  );
}
