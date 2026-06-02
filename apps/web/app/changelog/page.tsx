"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  Rocket,
  Wrench,
  Bug,
  Shield,
  Zap,
  MessageSquare,
  Webhook,
  Layers,
  Key,
  Cpu,
  Database,
  ArrowRight,
  Rss,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

type ChangeType = "feature" | "improvement" | "fix" | "security" | "breaking";

const changeTypeConfig: Record<
  ChangeType,
  { label: string; color: string; bg: string; border: string; icon: typeof Rocket }
> = {
  feature: {
    label: "New",
    color: "text-indigo-200",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
    icon: Sparkles,
  },
  improvement: {
    label: "Improved",
    color: "text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    icon: Wrench,
  },
  fix: {
    label: "Fixed",
    color: "text-sky-200",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
    icon: Bug,
  },
  security: {
    label: "Security",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    icon: Shield,
  },
  breaking: {
    label: "Breaking",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
    icon: Rocket,
  },
};

interface Release {
  version: string;
  date: string;
  tag: "stable" | "beta" | "deprecated";
  highlights: string[];
  changes: Array<{
    type: ChangeType;
    title: string;
    description: string;
    href?: string;
  }>;
}

const releases: Release[] = [
  {
    version: "v1.4.0",
    date: "2026-05-30",
    tag: "stable",
    highlights: ["SSE streaming for Claude 4 Sonnet", "Webhooks v2 with DLQ"],
    changes: [
      {
        type: "feature",
        title: "Anthropic Claude 4 Sonnet streaming",
        description:
          "Full SSE event streaming for Anthropic Claude 4 Sonnet with proper tool-use delta events and usage accounting.",
        href: "/docs/chat",
      },
      {
        type: "feature",
        title: "Webhooks v2 with retries and dead-letter queue",
        description:
          "Outbound webhooks now support exponential backoff, configurable retry counts, and an inspectable DLQ for failed deliveries.",
        href: "/docs/webhooks",
      },
      {
        type: "improvement",
        title: "70% faster cache lookups for embeddings",
        description:
          "Vector similarity cache rewritten in CGO-free Go. Median p95 latency under 8ms for 1M-candidate pools.",
      },
      {
        type: "fix",
        title: "Resolved streaming disconnection on long contexts",
        description:
          "Fixed chi router timeout that killed long-context streaming connections past 60s.",
      },
    ],
  },
  {
    version: "v1.3.2",
    date: "2026-05-22",
    tag: "stable",
    highlights: ["Batch API async submissions", "Granular rate-limit tiers"],
    changes: [
      {
        type: "feature",
        title: "Batch API with async submissions",
        description:
          "Submit thousands of chat or embedding requests as a single batch. Poll for completion or register a webhook.",
        href: "/docs/batch",
      },
      {
        type: "improvement",
        title: "Per-endpoint rate-limit tiers",
        description:
          "Choose from Standard, Priority, or Burst tiers for each API key. Limits are visible in the dashboard.",
        href: "/docs/rate-limits",
      },
      {
        type: "fix",
        title: "MarkInviteUsed atomicity",
        description:
          "Invites are now consumed atomically; the unique constraint prevents double-use under race conditions.",
      },
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-05-15",
    tag: "stable",
    highlights: ["Provider registry rewrite", "Conversation archives"],
    changes: [
      {
        type: "feature",
        title: "Conversation archives with export",
        description:
          "Archive completed conversations and export them as JSONL, CSV, or raw OpenAI-format JSON for fine-tuning.",
        href: "/docs/conversations",
      },
      {
        type: "improvement",
        title: "Provider registry rewritten",
        description:
          "All provider integrations consolidated under pkg/llm/provider/. Legacy internal/provider/ removed entirely.",
      },
      {
        type: "security",
        title: "API keys are now displayed only once",
        description:
          "Dashboard now shows the full key only at creation time. Existing keys are masked as sk-...XXXX.",
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-05-02",
    tag: "stable",
    highlights: ["Embeddings endpoint", "Prompt templates with versioning"],
    changes: [
      {
        type: "feature",
        title: "Embeddings endpoint with semantic cache",
        description:
          "Generate embeddings for any text and benefit from the built-in semantic dedup cache.",
        href: "/docs/embeddings",
      },
      {
        type: "feature",
        title: "Prompt templates with version history",
        description:
          "Store reusable prompts as templates. Every update creates a new version. Roll back at any time.",
        href: "/docs/prompts",
      },
      {
        type: "improvement",
        title: "Search across the docs and dashboard",
        description:
          "Press ⌘K anywhere in the app to open the global search palette.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-04-18",
    tag: "stable",
    highlights: ["Organizations and teams", "Audit log streaming"],
    changes: [
      {
        type: "feature",
        title: "Organizations and team membership",
        description:
          "Group API keys, usage, and billing under an organization. Invite members and assign roles.",
        href: "/docs/organizations",
      },
      {
        type: "feature",
        title: "Audit log streaming to S3",
        description:
          "Stream every auth, key, and billing event to an S3 bucket of your choice for compliance.",
      },
      {
        type: "breaking",
        title: "Renamed /v1/respond → /v1/chat/completions",
        description:
          "The legacy respond endpoint is now an alias. Update your client to use the OpenAI-compatible path.",
        href: "/docs/api-reference",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-04-01",
    tag: "stable",
    highlights: ["Public GA", "OpenAI-compatible API surface"],
    changes: [
      {
        type: "feature",
        title: "Public GA of the Yapapa gateway",
        description:
          "Out of beta. 100+ models, OpenAI-compatible, 99.95% SLA on the Standard tier.",
      },
      {
        type: "feature",
        title: "OpenAI-compatible API surface",
        description:
          "Drop-in replacement for /v1/chat/completions, /v1/embeddings, /v1/models. Bring your existing SDK.",
        href: "/docs/quickstart",
      },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const tagStyles = {
  stable: "bg-indigo-500/[0.08] text-indigo-200 border-indigo-500/20",
  beta: "bg-amber-500/[0.08] text-amber-200 border-amber-500/20",
  deprecated: "bg-white/[0.04] text-white/40 border-white/[0.08]",
};

export default function ChangelogPage() {
  return (
    <PageContainer>
      <div className="max-w-[860px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Changelog"
          title="What we"
          italic="shipped"
          description="Every release, every fix, every breaking change. We ship often, document everything, and never silently move endpoints."
          icon={Sparkles}
          primaryCta={{ label: "Subscribe to RSS", href: "/changelog/rss", icon: Rss }}
          secondaryCta={{ label: "View Roadmap", href: "/roadmap" }}
          stats={[
            { value: "47", label: "Releases" },
            { value: "12 days", label: "Avg cycle" },
            { value: "99.95%", label: "SLA" },
            { value: "0", label: "Silent breaks" },
          ]}
        />

        {/* Releases timeline */}
        <section className="relative">
          {/* Vertical guide line */}
          <div className="absolute left-[19px] sm:left-[27px] top-2 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-white/[0.07] to-transparent pointer-events-none" />

          <div className="space-y-12 sm:space-y-16">
            {releases.map((release, idx) => (
              <motion.article
                key={release.version}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
                custom={idx}
                className="relative pl-12 sm:pl-16"
              >
                {/* Dot on timeline */}
                <div className="absolute left-[12px] sm:left-[20px] top-2 flex items-center justify-center">
                  <div className="relative w-3.5 h-3.5">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-sm" />
                    <div className="relative w-3.5 h-3.5 rounded-full bg-[#06060a] border border-indigo-500/40 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-indigo-200" />
                    </div>
                  </div>
                </div>

                {/* Version header */}
                <header className="mb-5">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <h3 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] text-white">
                      {release.version}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-[0.15em] border",
                        tagStyles[release.tag],
                      )}
                    >
                      {release.tag}
                    </span>
                    <span className="text-[11px] font-mono text-white/30 tracking-wide">
                      {release.date}
                    </span>
                  </div>

                  {/* Highlight chips */}
                  {release.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {release.highlights.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.025] border border-white/[0.06] text-[11px] text-white/55"
                        >
                          <Zap className="w-2.5 h-2.5 text-indigo-200/70" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </header>

                {/* Changes list */}
                <ul className="space-y-2.5">
                  {release.changes.map((change, i) => {
                    const cfg = changeTypeConfig[change.type];
                    const Icon = cfg.icon;
                    const content = (
                      <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent hover:border-indigo-500/20 transition-all duration-300">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                            cfg.bg,
                            cfg.border,
                          )}
                        >
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                "text-[9px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded",
                                cfg.bg,
                                cfg.color,
                              )}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-[13.5px] text-white/75 font-medium leading-snug">
                            {change.title}
                          </p>
                          <p className="text-[12.5px] text-white/45 mt-1 leading-[1.65]">
                            {change.description}
                          </p>
                        </div>
                        {change.href && (
                          <ArrowRight className="w-3.5 h-3.5 text-white/20 mt-1 flex-shrink-0" />
                        )}
                      </div>
                    );
                    return (
                      <li key={i}>
                        {change.href ? (
                          <Link href={change.href} className="block group">
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-24 mb-4 rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.04] to-transparent p-8 sm:p-10"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/[0.12] blur-3xl pointer-events-none" />
          <div className="relative">
            <h3 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.03em] text-white mb-3">
              See what&apos;s{" "}
              <span className="font-display italic font-normal text-indigo-200/95">
                next
              </span>
              .
            </h3>
            <p className="text-[14px] text-white/55 max-w-md leading-[1.7] mb-6">
              The roadmap is public. Vote on features, watch items, and shape
              the direction of the platform.
            </p>
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-[13px] font-medium text-white/85 hover:bg-white/[0.1] hover:border-white/[0.18] hover:text-white transition-all duration-300"
            >
              View Roadmap
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
