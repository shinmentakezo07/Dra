"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect } from "react";
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
  Rocket,
  Building2,
  Scale,
  Mail,
  Newspaper,
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

const categories = ["Getting Started", "Core Features", "Platform", "Reference"] as const;

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
  },
  {
    step: "02",
    title: "Get a key",
    desc: "Generate your first API credential",
    icon: Zap,
    href: "/docs/authentication",
  },
  {
    step: "03",
    title: "Make a call",
    desc: "Hit any of 100+ models in one line",
    icon: Code2,
    href: "/docs/chat",
  },
];

const popularPages = [
  { id: "quickstart", label: "Quick Start", href: "/docs/quickstart" },
  { id: "authentication", label: "Authentication", href: "/docs/authentication" },
  { id: "chat", label: "Chat & Streaming", href: "/docs/chat" },
  { id: "api-reference", label: "API Reference", href: "/docs/api-reference" },
];

const recentUpdates = [
  {
    date: "2026-05-30",
    title: "SSE streaming for Claude 4 Sonnet",
    page: "chat",
  },
  {
    date: "2026-05-28",
    title: "Webhooks v2 with retries and DLQ",
    page: "webhooks",
  },
  {
    date: "2026-05-26",
    title: "Batch API async submissions",
    page: "batch",
  },
];

const resourceLinks = [
  {
    label: "Changelog",
    desc: "Every release, every fix, every breaking change.",
    icon: FileText,
    href: "/changelog",
  },
  {
    label: "Blog",
    desc: "Engineering deep dives and product decisions.",
    icon: Newspaper,
    href: "/blog",
  },
  {
    label: "Status",
    desc: "Live system availability and recent incidents.",
    icon: Activity,
    href: "/status",
  },
  {
    label: "Roadmap",
    desc: "What we’re building next, and what we’re exploring.",
    icon: Rocket,
    href: "/roadmap",
  },
  {
    label: "Enterprise",
    desc: "Dedicated clusters, SOC 2, BAA, 24/7 support.",
    icon: Building2,
    href: "/enterprise",
  },
  {
    label: "About",
    desc: "Our story, team, investors, and open roles.",
    icon: Users,
    href: "/about",
  },
];

/* ── Atmospheric background with breathing orbs ── */
function Atmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-6 sm:-mx-10">
      <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.07] blur-[120px] animate-[breathe_14s_ease-in-out_infinite]" />
      <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] blur-[120px] animate-[breathe_18s_ease-in-out_infinite_3s]" />
      <div className="absolute top-40 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-400/[0.04] blur-[100px] animate-[breathe_22s_ease-in-out_infinite_6s]" />

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

/* ── 3D parallax card with cursor reactivity ── */
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

/* ── Section card with editorial hover state ── */
function SectionCard({ section, idx }: { section: DocSection; idx: number }) {
  return (
    <motion.div variants={fadeUp} custom={idx}>
      <Link
        href={section.href}
        className={cn(
          "group relative block p-5 rounded-2xl overflow-hidden",
          "border border-white/[0.06] bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
          "hover:border-indigo-500/25 hover:from-indigo-500/[0.04] hover:to-transparent",
          "hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          "transition-all duration-300 cursor-pointer",
        )}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Conic gradient hover orb */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 220deg, rgba(99,102,241,0.18), transparent 30%, transparent 70%, rgba(99,102,241,0.12))",
            filter: "blur(24px)",
          }}
        />

        <div className="relative flex items-center gap-4">
          {/* Glass icon */}
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/[0.06] bg-white/[0.02] relative overflow-hidden",
              "group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06]",
              "transition-all duration-300",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <section.icon
              className="w-[18px] h-[18px] text-white/45 group-hover:text-indigo-200 transition-colors duration-300"
              style={{ transform: "translateZ(20px)" }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors duration-200 truncate tracking-[-0.01em]">
              {section.label}
            </p>
            <p className="text-[11.5px] text-white/30 truncate mt-0.5 group-hover:text-white/45 transition-colors leading-relaxed">
              {section.desc}
            </p>
          </div>

          <ArrowRight
            className="w-3.5 h-3.5 text-white/[0.1] group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
          />
        </div>
      </Link>
    </motion.div>
  );
}

export default function DocsIndexPage() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  return (
    <div className="relative">
      <Atmosphere />

      {/* ═══════════════════════════════════════════
          EDITORIAL HERO
          ═══════════════════════════════════════════ */}
      <section className="relative mb-24 sm:mb-32 pt-6 sm:pt-10">
        <div className="relative z-10">
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

          {/* Title with editorial italic */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.75rem] sm:text-[3.75rem] lg:text-[4.5rem] font-semibold tracking-[-0.04em] leading-[0.96] mb-8"
          >
            <span className="text-white/95">Build with</span>{" "}
            <span className="font-display italic font-normal bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 via-violet-200 to-indigo-300">
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
            replacement with credit-based billing, real-time analytics, and
            full conversation control.
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

          {/* Live status rail */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-12 text-[11px] font-mono text-white/30"
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

      {/* ═══════════════════════════════════════════
          QUICK START RAIL
          ═══════════════════════════════════════════ */}
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
          {quickSteps.map((item, i) => (
            <ParallaxCard key={item.step} intensity={6}>
              <Link
                href={item.href}
                className={cn(
                  "group relative block rounded-2xl overflow-hidden p-6",
                  "border border-white/[0.07] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.4)]",
                  "hover:border-indigo-500/25 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-12px_rgba(99,102,241,0.3)]",
                  "transition-all duration-400 cursor-pointer",
                )}
              >
                {/* Top hairline highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60" />
                {/* Hover glow */}
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
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                      <span className="text-[11px] font-mono font-bold text-indigo-200 tracking-[0.05em]">
                        {item.step}
                      </span>
                    </div>
                    {i < quickSteps.length - 1 && (
                      <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-indigo-500/20 via-white/[0.05] to-transparent" />
                    )}
                    {i < quickSteps.length - 1 && (
                      <ArrowRight className="hidden sm:block w-3 h-3 text-indigo-200/30" />
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        "border border-white/[0.06] bg-white/[0.02]",
                        "group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06]",
                        "transition-all duration-300",
                      )}
                    >
                      <item.icon className="w-4 h-4 text-white/40 group-hover:text-indigo-200 transition-colors" />
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
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          POPULAR + RECENT
          ═══════════════════════════════════════════ */}
      <section className="relative mb-24 sm:mb-32 grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Popular pages */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
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
                <ArrowRight className="w-3 h-3 text-white/[0.1] group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
              <Link
                key={i}
                href={`/docs/${u.page}`}
                className="group block"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[9px] font-mono text-white/25 tabular-nums">
                    {u.date.slice(5)}
                  </span>
                  <p className="text-[12.5px] text-white/60 group-hover:text-white transition-colors leading-snug">
                    {u.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CATEGORY SECTIONS
          ═══════════════════════════════════════════ */}
      {categories.map((category, catIdx) => {
        const catSections = sections.filter((s) => s.category === category);
        const catCount = catSections.length;

        return (
          <section
            key={category}
            id={`cat-${category.toLowerCase().replace(/\s+/g, "-")}`}
            ref={(el) => {
              sectionRefs.current[category] = el;
            }}
            className="relative mb-16 sm:mb-20 last:mb-8 scroll-mt-24"
          >
            {/* Category header */}
            <header className="flex items-center gap-3 mb-7">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-200" />
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
                  transition: { staggerChildren: 0.04, delayChildren: catIdx * 0.05 },
                },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {catSections.map((section, idx) => (
                <SectionCard key={section.id} section={section} idx={idx} />
              ))}
            </motion.div>
          </section>
        );
      })}

      {/* ═══════════════════════════════════════════
          MORE FROM YAPAPA
          ═══════════════════════════════════════════ */}
      <section className="relative mb-16 sm:mb-20 scroll-mt-24">
        <header className="flex items-center gap-3 mb-7">
          <div className="w-8 h-8 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
          </div>
          <h2 className="text-[18px] sm:text-[22px] font-semibold tracking-[-0.025em] text-white">
            More from{" "}
            <span className="font-display italic font-normal text-indigo-200/95">
              Yapapa
            </span>
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
          <span className="text-[9px] font-mono text-white/30 tabular-nums tracking-[0.15em]">
            {resourceLinks.length} PAGES
          </span>
        </header>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
        >
          {resourceLinks.map((res, idx) => (
            <motion.div
              key={res.href}
              variants={fadeUp}
              custom={idx}
            >
              <Link
                href={res.href}
                className={cn(
                  "group relative block p-5 rounded-2xl overflow-hidden h-full",
                  "border border-white/[0.06] bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
                  "hover:border-indigo-500/25 hover:from-indigo-500/[0.04] hover:to-transparent",
                  "hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                  "transition-all duration-300 cursor-pointer",
                )}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-start gap-3.5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/[0.06] bg-white/[0.02] relative overflow-hidden",
                      "group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06]",
                      "transition-all duration-300",
                    )}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <res.icon
                      className="w-4 h-4 text-white/45 group-hover:text-indigo-200 transition-colors"
                      style={{ transform: "translateZ(20px)" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors tracking-[-0.01em] flex items-center gap-1.5">
                      {res.label}
                      <ArrowUpRight className="w-3 h-3 text-white/0 group-hover:text-indigo-200 transition-all duration-200" />
                    </p>
                    <p className="text-[11.5px] text-white/35 mt-1 leading-[1.6] group-hover:text-white/50 transition-colors">
                      {res.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-16 mb-4 rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.04] to-transparent p-8 sm:p-10"
      >
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
          <p className="text-[14px] text-white/55 max-w-md leading-[1.7] mb-6">
            Open the playground to test prompts against any model in your
            browser, or grab a key and make your first call in 30 seconds.
          </p>
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
      </motion.section>
    </div>
  );
}
