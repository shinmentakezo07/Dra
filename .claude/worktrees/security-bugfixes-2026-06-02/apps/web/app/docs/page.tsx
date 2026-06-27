"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
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
} from "lucide-react";
import type { NavItem } from "@/components/docs/types";

/* ── Section design tokens ── */
const SECTION_STYLES = {
  "Getting Started": {
    accent: "#34d399",
    border: "border-emerald-500/[0.1]",
    hoverBorder: "hover:border-emerald-500/25",
    iconBg: "bg-emerald-500/[0.06]",
    iconBorder: "border-emerald-500/[0.12]",
    iconText: "text-emerald-400",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/[0.06]",
  },
  "Core Features": {
    accent: "#60a5fa",
    border: "border-blue-500/[0.1]",
    hoverBorder: "hover:border-blue-500/25",
    iconBg: "bg-blue-500/[0.06]",
    iconBorder: "border-blue-500/[0.12]",
    iconText: "text-blue-400",
    dot: "bg-blue-500",
    glow: "shadow-blue-500/[0.06]",
  },
  Platform: {
    accent: "#fbbf24",
    border: "border-amber-500/[0.1]",
    hoverBorder: "hover:border-amber-500/25",
    iconBg: "bg-amber-500/[0.06]",
    iconBorder: "border-amber-500/[0.12]",
    iconText: "text-amber-400",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/[0.06]",
  },
  Reference: {
    accent: "#a78bfa",
    border: "border-violet-500/[0.1]",
    hoverBorder: "hover:border-violet-500/25",
    iconBg: "bg-violet-500/[0.06]",
    iconBorder: "border-violet-500/[0.12]",
    iconText: "text-violet-400",
    dot: "bg-violet-500",
    glow: "shadow-violet-500/[0.06]",
  },
} as const;

interface DocSection extends NavItem {
  desc: string;
  category: string;
}

const sections: DocSection[] = [
  {
    id: "quickstart",
    label: "Quick Start",
    icon: Zap,
    desc: "Get up and running in under 5 minutes.",
    category: "Getting Started",
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: Key,
    desc: "API keys, JWT, and bearer token auth.",
    category: "Getting Started",
  },
  {
    id: "api-reference",
    label: "API Reference",
    icon: Code2,
    desc: "Complete endpoint documentation.",
    category: "Getting Started",
  },
  {
    id: "self-hosting",
    label: "Self-Hosting",
    icon: Globe,
    desc: "Configure base URL for your deployment.",
    category: "Getting Started",
  },
  {
    id: "chat",
    label: "Chat & Streaming",
    icon: MessageSquare,
    desc: "SSE streaming and standard chat.",
    category: "Core Features",
  },
  {
    id: "embeddings",
    label: "Embeddings",
    icon: Database,
    desc: "Generate text embeddings.",
    category: "Core Features",
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: Boxes,
    desc: "Multi-turn conversation management.",
    category: "Core Features",
  },
  {
    id: "prompts",
    label: "Prompt Templates",
    icon: FileText,
    desc: "Reusable prompt templates.",
    category: "Core Features",
  },
  {
    id: "batch",
    label: "Batch API",
    icon: Layers,
    desc: "Process multiple requests at once.",
    category: "Platform",
  },
  {
    id: "files",
    label: "File Upload",
    icon: UploadCloud,
    desc: "Upload images for vision models.",
    category: "Platform",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Webhook,
    desc: "Event-driven outbound webhook delivery.",
    category: "Platform",
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    icon: Shield,
    desc: "Usage limits and throttling.",
    category: "Platform",
  },
  {
    id: "error-handling",
    label: "Error Handling",
    icon: AlertTriangle,
    desc: "Error codes and responses.",
    category: "Platform",
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: Users,
    desc: "Multi-user organization management.",
    category: "Platform",
  },
  {
    id: "models",
    label: "Available Models",
    icon: Cpu,
    desc: "Supported providers and models.",
    category: "Reference",
  },
  {
    id: "pricing",
    label: "Pricing & Credits",
    icon: TrendingUp,
    desc: "Credit system and costs.",
    category: "Reference",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    desc: "Usage analytics and monitoring.",
    category: "Reference",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    desc: "Encryption, hashing, and CORS.",
    category: "Reference",
  },
  {
    id: "examples",
    label: "Code Examples",
    icon: Terminal,
    desc: "Full examples in Python, JS, Go.",
    category: "Reference",
  },
];

const categories = [
  "Getting Started",
  "Core Features",
  "Platform",
  "Reference",
] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ── Quick Start step data ── */
const quickSteps = [
  {
    step: "01",
    title: "Sign up",
    desc: "Create an account in seconds",
    icon: Key,
  },
  {
    step: "02",
    title: "Get a key",
    desc: "Generate your API credentials",
    icon: Zap,
  },
  {
    step: "03",
    title: "Make a request",
    desc: "Call any model instantly",
    icon: Code2,
  },
];

/* ── Animated grid background ── */
function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Radial fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#08080a_70%)]" />
    </div>
  );
}

/* ── Floating accent orb ── */
function AccentOrb({
  color,
  size,
  top,
  left,
  delay,
}: {
  color: string;
  size: number;
  top: string;
  left: string;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color}10, transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export default function DocsIndexPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ══════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════ */}
      <section className="relative mb-20 sm:mb-28 pt-8 sm:pt-14 overflow-hidden rounded-2xl">
        <GridBg />
        <AccentOrb color="#60a5fa" size={280} top="-60px" left="-40px" delay={0} />
        <AccentOrb color="#34d399" size={180} top="40px" left="60%" delay={2} />
        <AccentOrb color="#a78bfa" size={140} top="-20px" left="85%" delay={4} />

        <div className="relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-2.5 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.25em]">
              Documentation
            </span>
            <div className="h-px w-12 bg-gradient-to-r from-white/[0.08] to-transparent" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.75rem] sm:text-[3.75rem] lg:text-[4.5rem] font-bold tracking-[-0.04em] leading-[1.0] mb-8"
          >
            <span className="text-white/90">Build with</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)",
              }}
            >
              Yapapa
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-[15px] sm:text-[17px] text-white/40 max-w-xl leading-relaxed"
          >
            One unified API for 100+ AI models. OpenAI-compatible drop-in
            replacement with credit-based billing and real-time analytics.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex items-center gap-3 mt-8"
          >
            <Link
              href="/docs/quickstart"
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.18] hover:shadow-lg hover:shadow-white/[0.03] transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/docs/api-reference"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white/30 hover:text-white/60 transition-colors duration-300"
            >
              API Reference
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          QUICK START RAIL
          ══════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-24 sm:mb-32"
      >
        <div className="flex items-center gap-3 mb-8">
          <span className="text-[9px] font-mono font-semibold text-emerald-400/60 uppercase tracking-[0.2em]">
            Quick Start
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickSteps.map((item, i) => (
            <Link
              key={item.step}
              href="/docs/quickstart"
              className="group relative rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-emerald-500/20 hover:bg-emerald-500/[0.025] transition-all duration-400 cursor-pointer overflow-hidden"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Corner glow */}
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-emerald-500/[0.04] blur-xl group-hover:bg-emerald-500/[0.1] transition-all duration-600" />

              <div className="relative p-5 sm:p-6">
                {/* Step number + connector line */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
                    <span className="text-[11px] font-mono font-bold text-emerald-400/60 group-hover:text-emerald-400 transition-colors">
                      {item.step}
                    </span>
                  </div>
                  {i < quickSteps.length - 1 && (
                    <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-emerald-500/15 to-transparent" />
                  )}
                </div>

                {/* Icon + text */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/15 group-hover:bg-emerald-500/[0.04] transition-all duration-300">
                    <item.icon className="w-4 h-4 text-white/25 group-hover:text-emerald-400/70 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/60 group-hover:text-white/90 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/25 mt-1 leading-relaxed group-hover:text-white/40 transition-colors">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════
          CATEGORY SECTIONS
          ══════════════════════════════════════════════════ */}
      {categories.map((category, catIdx) => {
        const catSections = sections.filter((s) => s.category === category);
        const style = SECTION_STYLES[category];

        return (
          <motion.section
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3 + catIdx * 0.08,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-16 sm:mb-20 last:mb-8"
          >
            {/* Category header */}
            <div className="flex items-center gap-3 mb-6">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: style.accent, opacity: 0.6 }}
              />
              <h3
                className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em]"
                style={{ color: `${style.accent}80` }}
              >
                {category}
              </h3>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${style.accent}18, transparent)` }}
              />
              <span className="text-[10px] font-mono text-white/15 tabular-nums">
                {catSections.length}
              </span>
            </div>

            {/* Section cards grid */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {catSections.map((section) => (
                <motion.div key={section.id} variants={fadeUp}>
                  <Link
                    href={`/docs/${section.id}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border bg-white/[0.01] hover:bg-white/[0.025] transition-all duration-300 cursor-pointer relative overflow-hidden"
                    style={{
                      borderColor: `${style.accent}0a`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${style.accent}20`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px -6px ${style.accent}10`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${style.accent}0a`;
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at 0% 50%, ${style.accent}06, transparent 60%)`,
                      }}
                    />

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-300 relative z-10"
                      style={{
                        backgroundColor: `${style.accent}06`,
                        borderColor: `${style.accent}12`,
                      }}
                    >
                      <section.icon
                        className="w-4 h-4 transition-colors duration-300"
                        style={{ color: `${style.accent}80` }}
                      />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1 relative z-10">
                      <p className="text-[13px] font-medium text-white/55 group-hover:text-white/90 transition-colors duration-200 truncate">
                        {section.label}
                      </p>
                      <p className="text-[11px] text-white/25 truncate mt-0.5 group-hover:text-white/40 transition-colors">
                        {section.desc}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      className="w-3.5 h-3.5 text-white/[0.08] group-hover:text-white/30 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 relative z-10"
                    />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        );
      })}
    </motion.div>
  );
}
