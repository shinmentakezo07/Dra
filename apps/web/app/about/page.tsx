"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Users,
  Target,
  Heart,
  Globe,
  Github,
  Twitter,
  Linkedin,
  MapPin,
  Cpu,
  Zap,
  Shield,
  Building2,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { FeatureCard, PageSection } from "@/components/shared/PageContainer";
import { cn } from "@/lib/utils";

const team = [
  {
    name: "Mira Vance",
    role: "CEO & Co-founder",
    bio: "Previously infrastructure lead at a major LLM provider. Believes the future of AI is open APIs, not walled gardens.",
    location: "San Francisco",
    initials: "MV",
  },
  {
    name: "Ade Olusola",
    role: "CTO & Co-founder",
    bio: "Built distributed caching systems at hyperscale. Wrote the first version of our provider router on a flight to Lagos.",
    location: "Lagos",
    initials: "AO",
  },
  {
    name: "Hana Reuter",
    role: "Head of Product",
    bio: "Designs pricing pages that don’t lie. Spent five years at a fintech making billing legible.",
    location: "Berlin",
    initials: "HR",
  },
  {
    name: "Tomás Iriarte",
    role: "Staff Engineer",
    bio: "Owns the LLM pipeline end-to-end. Has strong opinions about backpressure and stronger opinions about kebab case.",
    location: "Montevideo",
    initials: "TI",
  },
  {
    name: "Priya Anand",
    role: "Research Lead",
    bio: "Runs our router benchmarking. PhD in systems for ML. Once got a model to admit it was wrong.",
    location: "Bengaluru",
    initials: "PA",
  },
  {
    name: "Lior Bachar",
    role: "Security & Compliance",
    bio: "Drives our SOC 2 and key-management story. Cautions by default. Says ‘rotate the keys’ at least twice a day.",
    location: "Tel Aviv",
    initials: "LB",
  },
];

const values = [
  {
    icon: Target,
    title: "Boring infrastructure",
    description:
      "AI is exciting. The plumbing is not. We build the boring parts — routing, caching, retries, billing — so you can ship the interesting parts.",
  },
  {
    icon: Heart,
    title: "Fairness over lock-in",
    description:
      "We win by being the best layer, not by trapping you. Switching costs are zero. Your data, conversations, and keys are exportable in one click.",
  },
  {
    icon: Globe,
    title: "Open by default",
    description:
      "Our SDKs, our provider integrations, and our postmortems are public. If we are wrong, we want you to know quickly.",
  },
  {
    icon: Zap,
    title: "Ship small, ship often",
    description:
      "A 12-day release cycle. Daily deploys to staging. Every change is a small PR with a clear rollback. The platform improves while you sleep.",
  },
];

const milestones = [
  { year: "Q1 2025", title: "Founded", description: "Mira and Ade start Yapapa in a São Paulo coworking space." },
  { year: "Q3 2025", title: "Closed beta", description: "50 design partners, 12M requests served in the first month." },
  { year: "Q1 2026", title: "Public GA", description: "OpenAI-compatible API, 100+ models, credit-based billing." },
  { year: "Q2 2026", title: "Anthropic + Claude 4", description: "Streaming, tool use, and vision all on the unified gateway." },
];

const locations = ["San Francisco", "Berlin", "Lagos", "Bengaluru", "Tel Aviv", "Montevideo", "Tokyo", "Remote"];

const investors = [
  "Sequoia Scout",
  "Index Ventures",
  "A16Z Infra",
  "Y Combinator (W26)",
  "GitHub Fund",
  "Anthropic Ecosystem",
];

export default function AboutPage() {
  return (
    <PageContainer>
      <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="About"
          title="We build the"
          italic="infrastructure"
          description="Yapapa is a small, focused team building the universal layer for LLMs. One API, every model, transparent pricing, and the boring reliability that production workloads require."
          icon={Sparkles}
          primaryCta={{ label: "Open Roles", href: "#careers", icon: Users }}
          secondaryCta={{ label: "Read the Blog", href: "/blog" }}
          stats={[
            { value: "27", label: "Team" },
            { value: "12", label: "Countries" },
            { value: "8B+", label: "Tokens / mo" },
            { value: "100+", label: "Models" },
          ]}
        />

        {/* Story */}
        <PageSection
          id="story"
          icon={Building2}
          eyebrow="Our Story"
          title="Started in 2025, in a coworking space, with one"
          italic="frustration"
          description="Every team we knew was rebuilding the same thing: a thin layer that called OpenAI, then Anthropic, then a fallback, with a credit system on top. We thought: what if that layer already existed, and it was good?"
        >
          <div className="space-y-5 text-[15px] text-white/55 leading-[1.85] max-w-3xl">
            <p>
              The first commit was a Go binary that proxied to OpenAI and
              counted tokens. Six months later, we were handling billions of
              tokens a month for design partners across consumer apps, fintech,
              and developer tools.
            </p>
            <p>
              We learned that reliability matters more than features. That
              customers will forgive a missing endpoint if you explain why.
              That transparent pricing is the only pricing that scales. The
              Yapapa of today is the result of those lessons.
            </p>
            <p>
              We are still small, still focused, still building the boring
              infrastructure that AI applications need to actually work.
            </p>
          </div>
        </PageSection>

        {/* Values */}
        <PageSection
          id="values"
          icon={Heart}
          eyebrow="Principles"
          title="What we"
          italic="care about"
          description="Four operating principles. We use them to settle tradeoffs when the right answer isn't obvious."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {values.map((v, i) => (
              <FeatureCard
                key={v.title}
                icon={v.icon}
                title={v.title}
                description={v.description}
                delay={i * 0.05}
              />
            ))}
          </div>
        </PageSection>

        {/* Milestones */}
        <PageSection
          id="milestones"
          icon={Cpu}
          eyebrow="Milestones"
          title="The road so"
          italic="far"
        >
          <ol className="relative pl-8 sm:pl-10 max-w-3xl">
            <div className="absolute left-3 sm:left-4 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-500/40 via-white/[0.08] to-transparent" />
            {milestones.map((m, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="relative pb-8 last:pb-0"
              >
                <div className="absolute -left-[20px] sm:-left-[24px] top-2 w-2 h-2 rounded-full bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.7)]" />
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-200/70 tabular-nums">
                    {m.year}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-white/90 mb-1 tracking-[-0.01em]">
                  {m.title}
                </h3>
                <p className="text-[13px] text-white/50 leading-[1.7]">
                  {m.description}
                </p>
              </motion.li>
            ))}
          </ol>
        </PageSection>

        {/* Team */}
        <PageSection
          id="team"
          icon={Users}
          eyebrow="The Team"
          title="Twenty-seven people, twelve"
          italic="countries"
          description="A small, senior team. Most of us have shipped infrastructure at scale before. We are hiring across engineering, research, and design."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="group p-5 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.025] to-transparent hover:border-indigo-500/20 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 to-violet-500/10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:6px_6px]" />
                    <span className="relative text-[13px] font-mono font-bold text-indigo-100">
                      {member.initials}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-white/90 leading-tight">
                      {member.name}
                    </h3>
                    <p className="text-[12px] text-indigo-200/80 mt-0.5">
                      {member.role}
                    </p>
                  </div>
                </div>
                <p className="text-[12.5px] text-white/45 leading-[1.65] mb-3">
                  {member.bio}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/30 pt-3 border-t border-white/[0.05]">
                  <MapPin className="w-2.5 h-2.5" />
                  {member.location}
                </div>
              </motion.div>
            ))}
          </div>
        </PageSection>

        {/* Investors */}
        <PageSection
          id="backed-by"
          icon={Shield}
          eyebrow="Backed by"
          title="Investors who"
          italic="get it"
        >
          <div className="flex flex-wrap gap-2.5">
            {investors.map((inv) => (
              <span
                key={inv}
                className="inline-flex items-center px-4 py-2.5 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent text-[13px] text-white/60 font-mono"
              >
                {inv}
              </span>
            ))}
          </div>
        </PageSection>

        {/* Careers */}
        <PageSection
          id="careers"
          icon={Users}
          eyebrow="Careers"
          title="Come build the"
          italic="boring layer"
          description="We are hiring across engineering, research, and design. Remote-friendly across 12 countries. Competitive equity, real ownership."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Senior Backend Engineer (Go)", location: "Remote / SF", team: "Engineering" },
              { title: "ML Research Engineer", location: "Remote", team: "Research" },
              { title: "Product Designer", location: "Remote / Berlin", team: "Design" },
              { title: "Developer Advocate", location: "Remote", team: "Marketing" },
            ].map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  href={`/careers/${role.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group flex items-center justify-between p-5 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all duration-300"
                >
                  <div>
                    <h3 className="text-[14px] font-semibold text-white/85 group-hover:text-white transition-colors">
                      {role.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-white/35">
                      <span>{role.team}</span>
                      <span className="text-white/10">·</span>
                      <span>{role.location}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
