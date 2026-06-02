"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Rocket,
  Wrench,
  Vote,
  Calendar,
  Cpu,
  Layers,
  Shield,
  Database,
  Webhook,
  Zap,
  MessageSquare,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

type Status = "shipped" | "in-progress" | "planned" | "exploring";

const statusConfig: Record<
  Status,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  shipped: {
    label: "Shipped",
    color: "text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  "in-progress": {
    label: "In Progress",
    color: "text-indigo-200",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
    dot: "bg-indigo-400",
  },
  planned: {
    label: "Planned",
    color: "text-sky-200",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
  },
  exploring: {
    label: "Exploring",
    color: "text-violet-200",
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/20",
    dot: "bg-violet-400",
  },
};

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  quarter: string;
  votes: number;
  area: string;
  icon: typeof Cpu;
}

const items: RoadmapItem[] = [
  // Shipped
  {
    title: "Webhooks v2 with DLQ",
    description: "Exponential backoff, configurable retry counts, inspectable dead-letter queue.",
    status: "shipped",
    quarter: "Q2 2026",
    votes: 412,
    area: "Platform",
    icon: Webhook,
  },
  {
    title: "Anthropic Claude 4 streaming",
    description: "Full SSE event streaming with tool-use deltas and usage accounting.",
    status: "shipped",
    quarter: "Q2 2026",
    votes: 287,
    area: "Providers",
    icon: MessageSquare,
  },
  {
    title: "Batch API async submissions",
    description: "Submit thousands of requests as a single batch with webhook completion.",
    status: "shipped",
    quarter: "Q2 2026",
    votes: 198,
    area: "Platform",
    icon: Layers,
  },
  {
    title: "Prompt template versioning",
    description: "Every prompt save creates a new version. Roll back at any time.",
    status: "shipped",
    quarter: "Q2 2026",
    votes: 156,
    area: "Developer",
    icon: Database,
  },

  // In progress
  {
    title: "Function-calling router",
    description: "Automatic tool selection and parallel function calling across providers.",
    status: "in-progress",
    quarter: "Q2 2026",
    votes: 524,
    area: "Intelligence",
    icon: Zap,
  },
  {
    title: "Custom model fine-tunes",
    description: "Bring your own fine-tuned adapters and route to them via the same API.",
    status: "in-progress",
    quarter: "Q3 2026",
    votes: 391,
    area: "Providers",
    icon: Cpu,
  },
  {
    title: "Real-time cost anomaly alerts",
    description: "Webhook + email alerts when spend rate spikes or an org exceeds its threshold.",
    status: "in-progress",
    quarter: "Q2 2026",
    votes: 273,
    area: "Billing",
    icon: Shield,
  },

  // Planned
  {
    title: "On-prem enterprise edition",
    description: "Hardened offline build with signed bundle updates. Targets regulated industries.",
    status: "planned",
    quarter: "Q3 2026",
    votes: 488,
    area: "Enterprise",
    icon: Shield,
  },
  {
    title: "Multi-region active-active failover",
    description: "us-east, us-west, eu, ap. Automatic geo-routing and zero-downtime region failover.",
    status: "planned",
    quarter: "Q3 2026",
    votes: 367,
    area: "Infrastructure",
    icon: Layers,
  },
  {
    title: "Native Anthropic tool-use protocol",
    description: "First-class support for Anthropic's structured tool-use format with parallel calls.",
    status: "planned",
    quarter: "Q3 2026",
    votes: 281,
    area: "Providers",
    icon: Wrench,
  },
  {
    title: "Audio transcription & TTS",
    description: "Unified audio endpoint for Whisper, ElevenLabs, and our own streaming TTS.",
    status: "planned",
    quarter: "Q4 2026",
    votes: 642,
    area: "New APIs",
    icon: MessageSquare,
  },

  // Exploring
  {
    title: "Vector database in the gateway",
    description: "Managed pgvector-compatible store with RAG primitives and metadata filters.",
    status: "exploring",
    quarter: "Q4 2026",
    votes: 829,
    area: "New APIs",
    icon: Database,
  },
  {
    title: "Browser-agent SDK",
    description: "Drive a headless browser from a chat session. Screenshot, click, fill forms.",
    status: "exploring",
    quarter: "Q4 2026",
    votes: 612,
    area: "Agents",
    icon: Zap,
  },
  {
    title: "Self-serve SOC 2 audit portal",
    description: "Customer-facing view of our controls, evidence, and live audit status.",
    status: "exploring",
    quarter: "Q4 2026",
    votes: 287,
    area: "Compliance",
    icon: Shield,
  },
];

const quarterSections: Array<{ quarter: string; statuses: Status[] }> = [
  { quarter: "Q2 2026", statuses: ["shipped", "in-progress"] },
  { quarter: "Q3 2026", statuses: ["planned"] },
  { quarter: "Q4 2026", statuses: ["exploring"] },
];

export default function RoadmapPage() {
  return (
    <PageContainer>
      <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Roadmap"
          title="What we&apos;re building"
          italic="next"
          description="A public, honest look at what we've shipped, what we're working on, and what we're still figuring out. Vote on what matters to you — your input shapes the queue."
          icon={Rocket}
          primaryCta={{ label: "Submit an idea", href: "/contact?topic=product", icon: Sparkles }}
          secondaryCta={{ label: "View changelog", href: "/changelog" }}
          stats={[
            { value: "4", label: "Shipped Q2" },
            { value: "3", label: "In progress" },
            { value: "4", label: "Planned" },
            { value: "3", label: "Exploring" },
          ]}
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {(["shipped", "in-progress", "planned", "exploring"] as Status[]).map((s) => {
            const cfg = statusConfig[s];
            return (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-[0.15em]",
                  cfg.bg,
                  cfg.border,
                  cfg.color,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </div>
            );
          })}
        </div>

        {quarterSections.map((section) => {
          const quarterItems = items.filter((i) => section.statuses.includes(i.status));
          if (quarterItems.length === 0) return null;
          return (
            <section key={section.quarter} className="mb-20 sm:mb-24">
              <header className="flex items-center gap-3 mb-7">
                <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-200" />
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
                  {section.quarter}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
                <span className="text-[9px] font-mono text-white/25 tracking-[0.18em]">
                  {quarterItems.length} ITEMS
                </span>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {quarterItems.map((item, idx) => {
                  const cfg = statusConfig[item.status];
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent hover:border-indigo-500/25 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-[0.12em]",
                            cfg.bg,
                            cfg.border,
                            cfg.color,
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/30">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                            {item.area}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06] flex items-center justify-center flex-shrink-0 transition-all">
                          <item.icon className="w-4 h-4 text-white/45 group-hover:text-indigo-200 transition-colors" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-white/90 group-hover:text-white tracking-[-0.01em] leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-[12.5px] text-white/50 group-hover:text-white/65 leading-[1.7] mb-5">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                        <button className="flex items-center gap-1.5 text-[11px] font-mono text-white/40 hover:text-indigo-200 transition-colors group/vote">
                          <Vote className="w-3 h-3 group-hover/vote:text-indigo-200" />
                          {item.votes} votes
                        </button>
                        {item.status === "in-progress" && (
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-200/70">
                            <Clock className="w-2.5 h-2.5" />
                            ETA this quarter
                          </span>
                        )}
                        {item.status === "shipped" && (
                          <Link
                            href="/changelog"
                            className="text-[10px] font-mono text-emerald-300/80 hover:text-emerald-200 flex items-center gap-1"
                          >
                            See release <ArrowUpRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Submit idea CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8 rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.04] to-transparent p-8 sm:p-10"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/[0.12] blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.03em] text-white mb-3">
                Have an idea we should"
                <span className="font-display italic font-normal text-indigo-200/95"> build</span>?
              </h3>
              <p className="text-[14px] text-white/55 max-w-md leading-[1.7]">
                We read every submission. The roadmap is shaped by your votes
                and feedback, not just our roadmap committee.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/contact?topic=product"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/12 to-violet-500/10 border border-indigo-500/25 text-[13px] font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-all duration-300"
              >
                Submit an idea
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/changelog"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] font-medium text-white/75 hover:bg-white/[0.08] hover:text-white transition-all duration-300"
              >
                See what shipped
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
