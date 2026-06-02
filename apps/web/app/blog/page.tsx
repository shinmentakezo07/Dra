"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Clock,
  BookOpen,
  Code2,
  Cpu,
  Server,
  Gauge,
  Lock,
  Boxes,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: "Engineering" | "Product" | "Research" | "Security";
  author: string;
  date: string;
  readTime: string;
  icon: typeof Code2;
  featured?: boolean;
}

const posts: Post[] = [
  {
    slug: "anthropic-claude-4-streaming",
    title: "How we cut Claude 4 streaming latency by 40% with Anthropic's new event format",
    excerpt:
      "A deep dive into the SSE implementation that powers our chat endpoint — including how we handle tool-use deltas, citations, and usage accounting without buffering.",
    category: "Engineering",
    author: "Mira Vance",
    date: "2026-05-29",
    readTime: "8 min",
    icon: Code2,
    featured: true,
  },
  {
    slug: "semantic-cache-design",
    title: "Designing a semantic cache that survives prompt injection",
    excerpt:
      "Our embeddings-based cache is fast, but it must also be safe. Here is how we partition by tenant, validate intent, and never serve stale or poisoned responses.",
    category: "Engineering",
    author: "Ade Olusola",
    date: "2026-05-24",
    readTime: "12 min",
    icon: Boxes,
  },
  {
    slug: "pricing-by-token-not-vendor",
    title: "Why we price by token, not by vendor",
    excerpt:
      "OpenAI charges by the token. So does Anthropic. We charge by the token — but we charge fairly across vendors, with margin transparency.",
    category: "Product",
    author: "Hana Reuter",
    date: "2026-05-19",
    readTime: "6 min",
    icon: Gauge,
  },
  {
    slug: "rate-limits-explained",
    title: "A pragmatic guide to rate limits for LLM gateways",
    excerpt:
      "Token-bucket vs. leaky-bucket vs. fixed-window. We tried all three, ran benchmarks, and chose something boring — and explain why boring is best.",
    category: "Engineering",
    author: "Tomás Iriarte",
    date: "2026-05-14",
    readTime: "10 min",
    icon: Server,
  },
  {
    slug: "evaluating-llm-routers",
    title: "Benchmarking 14 model routers on real traffic",
    excerpt:
      "We replayed three months of customer traffic through every router we could find. The results surprised us. A breakdown of cost, latency, and quality.",
    category: "Research",
    author: "Priya Anand",
    date: "2026-05-08",
    readTime: "15 min",
    icon: Cpu,
  },
  {
    slug: "api-key-handling",
    title: "How Yapapa handles your API keys (and why we hash before logging)",
    excerpt:
      "Defense in depth, zero plaintext, and an open-source scanner for accidental key leaks in CI. A walkthrough of our key-management pipeline.",
    category: "Security",
    author: "Lior Bachar",
    date: "2026-05-02",
    readTime: "9 min",
    icon: Lock,
  },
  {
    slug: "bringing-gpt-5-to-gateway",
    title: "What it took to ship GPT-5 on day one",
    excerpt:
      "We integrated GPT-5 the morning of release. Here is the checklist, the tooling, and the on-call playbook that made a same-day launch possible.",
    category: "Engineering",
    author: "Mira Vance",
    date: "2026-04-26",
    readTime: "7 min",
    icon: Sparkles,
  },
];

const categoryStyles = {
  Engineering: "text-indigo-200 bg-indigo-500/[0.08] border-indigo-500/20",
  Product: "text-emerald-200 bg-emerald-500/[0.08] border-emerald-500/20",
  Research: "text-violet-200 bg-violet-500/[0.08] border-violet-500/20",
  Security: "text-amber-200 bg-amber-500/[0.08] border-amber-500/20",
};

export default function BlogPage() {
  const featured = posts.find((p) => p.featured);
  const rest = posts.filter((p) => !p.featured);

  return (
    <PageContainer>
      <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Blog"
          title="Notes from the"
          italic="gateway"
          description="Engineering deep dives, product decisions, and research from the team building the unified layer for every major LLM. We share what works, what doesn't, and why."
          icon={BookOpen}
          primaryCta={{ label: "Subscribe via RSS", href: "/blog/rss", icon: Sparkles }}
          secondaryCta={{ label: "Engineering Changelog", href: "/changelog" }}
        />

        {/* Featured post */}
        {featured && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-20 sm:mb-24"
          >
            <Link
              href={`/blog/${featured.slug}`}
              className="group block relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.06] via-white/[0.02] to-transparent p-8 sm:p-10 hover:border-indigo-500/25 transition-all duration-500"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/[0.12] blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-indigo-200/70">
                      Featured
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-[0.15em] border",
                        categoryStyles[featured.category],
                      )}
                    >
                      {featured.category}
                    </span>
                  </div>
                  <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] leading-[1.1] text-white mb-5 group-hover:text-white transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-[15px] text-white/55 leading-[1.8] max-w-2xl mb-7">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-white/40">
                    <span>{featured.author}</span>
                    <span className="text-white/10">·</span>
                    <span>{featured.date}</span>
                    <span className="text-white/10">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {featured.readTime} read
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 flex items-center justify-center">
                  <div className="relative w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent border border-white/[0.06] overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400/30 blur-2xl" />
                        <featured.icon className="w-20 h-20 text-indigo-200/70 relative" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 backdrop-blur border border-white/[0.06]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                      <span className="text-[10px] font-mono text-white/55">streaming &middot; live</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-7 flex items-center gap-2 text-[12px] font-mono text-indigo-200/70 group-hover:text-indigo-100 transition-colors">
                Read article
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </motion.section>
        )}

        {/* Latest posts grid */}
        <section className="mb-20 sm:mb-24">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              Latest posts
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
            <span className="text-[9px] font-mono text-white/25 tracking-[0.18em]">
              {rest.length} ARTICLES
            </span>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {rest.map((post, idx) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group relative block h-full p-5 rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent hover:border-indigo-500/25 hover:from-indigo-500/[0.04] hover:to-transparent hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2)] transition-all duration-300"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />

                  <div className="flex items-center justify-between mb-5">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-[0.15em] border",
                        categoryStyles[post.category],
                      )}
                    >
                      {post.category}
                    </span>
                    <div className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06] flex items-center justify-center transition-all">
                      <post.icon className="w-3.5 h-3.5 text-white/40 group-hover:text-indigo-200 transition-colors" />
                    </div>
                  </div>

                  <h3 className="text-[15px] font-semibold text-white/85 group-hover:text-white leading-[1.35] tracking-[-0.01em] mb-3">
                    {post.title}
                  </h3>
                  <p className="text-[12.5px] text-white/40 group-hover:text-white/55 leading-[1.65] mb-5 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-[10.5px] font-mono text-white/30 pt-4 border-t border-white/[0.05]">
                    <span className="truncate">{post.author}</span>
                    <span className="flex items-center gap-2.5">
                      <span>{post.date.slice(5)}</span>
                      <span className="text-white/10">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {post.readTime}
                      </span>
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
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
                Get new posts{" "}
                <span className="font-display italic font-normal text-indigo-200/95">
                  monthly
                </span>
                .
              </h3>
              <p className="text-[14px] text-white/55 leading-[1.7] max-w-md">
                No spam. One email a month with our best writing, plus the
                occasional launch announcement.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex items-center gap-2"
            >
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 bg-white/[0.025] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-indigo-500/30 focus:bg-indigo-500/[0.04] transition-all"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 text-[13px] font-medium text-indigo-100 hover:bg-indigo-500/[0.14] hover:border-indigo-500/35 transition-all whitespace-nowrap"
              >
                Subscribe
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
