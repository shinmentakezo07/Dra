"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

const columns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Models", href: "/models" },
      { label: "Playground", href: "/playground" },
      { label: "Pricing", href: "/pricing" },
      { label: "Gateway", href: "/gateway" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Blog", href: "/blog" },
      { label: "Status", href: "/status" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal#terms" },
      { label: "Privacy", href: "/legal#privacy" },
      { label: "Security", href: "/docs/security" },
      { label: "Cookies", href: "/legal#cookies" },
    ],
  },
];

const social = [
  {
    label: "GitHub",
    href: "https://github.com/shinmentakezo07/owsiwa",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    ),
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/yapapa",
    icon: <X className="w-4 h-4" />,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/yapapa",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "relative w-full border-t border-white/[0.06] bg-[#05050a] overflow-hidden",
        className,
      )}
    >
      {/* Atmospheric glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-10">
        {/* Top: Logo + tagline + newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-white/[0.06]">
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2.5 group mb-6">
              <div className="relative w-9 h-9 rounded-[10px] bg-black border border-white/[0.08] overflow-hidden flex items-center justify-center group-hover:border-indigo-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:6px_6px]" />
                <Image
                  src="/nervous-cat.jpg"
                  alt="Yapapa"
                  width={26}
                  height={26}
                  className="rounded-[6px] object-cover relative z-10"
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[15px] font-extrabold tracking-[-0.04em] text-white/75 group-hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  YAPAPA
                </span>
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/[0.12] -mt-0.5 group-hover:text-indigo-200/60 transition-colors">
                  LLM Gateway
                </span>
              </div>
            </Link>

            <p className="text-[14px] text-white/45 leading-[1.7] max-w-md mb-7">
              One unified API for 100+ AI models. OpenAI-compatible drop-in
              replacement with credit-based billing, real-time analytics, and
              full conversation control.
            </p>

            {/* Newsletter form (visual) */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex items-center gap-2 max-w-md"
            >
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full bg-white/[0.025] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-indigo-500/30 focus:bg-indigo-500/[0.04] transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 text-[13px] font-medium text-indigo-100 hover:bg-indigo-500/[0.14] hover:border-indigo-500/35 transition-all duration-200"
              >
                Subscribe
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[10px] font-mono text-white/20 mt-2.5 tracking-wide">
              Monthly digest. No spam. Unsubscribe anytime.
            </p>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/30 mb-4">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-[13px] text-white/50 hover:text-white/90 transition-colors duration-200"
                      >
                        {link.label}
                        {link.external && (
                          <ArrowUpRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright + social + status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[11px] font-mono text-white/30">
              &copy; 2026 Yapapa, Inc.
            </span>
            <span className="text-white/10">·</span>
            <span className="text-[11px] font-mono text-white/30">
              Universal LLM Gateway
            </span>
            <span className="text-white/10">·</span>
            <Link
              href="/status"
              className="group flex items-center gap-1.5 text-[11px] font-mono text-white/40 hover:text-emerald-300 transition-colors"
            >
              <motion.span
                className="relative flex h-1.5 w-1.5"
                aria-hidden
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
              </motion.span>
              All systems operational
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
