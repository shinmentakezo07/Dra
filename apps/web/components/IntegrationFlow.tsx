"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  UserPlus,
  KeyRound,
  Code2,
  Rocket,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Palette ── */
const ACCENT = {
  hex: "#6366f1",
  statusHex: "#10b981",
  glow: "rgba(99,102,241,0.35)",
};

/* ── Step metadata ── */
interface Step {
  id: string;
  title: string;
  italic?: string;
  desc: string;
  duration: string;
  icon: typeof UserPlus;
}

const STEPS: Step[] = [
  {
    id: "01",
    title: "Create",
    italic: "account",
    desc: "Email or OAuth. Zero friction, no card, no approval queue.",
    duration: "15s",
    icon: UserPlus,
  },
  {
    id: "02",
    title: "Provision",
    italic: "your key",
    desc: "Generate credentials from the dashboard. Instant, no waiting room.",
    duration: "instant",
    icon: KeyRound,
  },
  {
    id: "03",
    title: "Connect",
    italic: "the SDK",
    desc: "Drop-in replacement for OpenAI. Change one line, unlock 100+ models.",
    duration: "5 min",
    icon: Code2,
  },
  {
    id: "04",
    title: "Ship",
    italic: "to production",
    desc: "Monitor usage, set budgets, optimize cost — all from one pane of glass.",
    duration: "continuous",
    icon: Rocket,
  },
];

/* ── Syntax highlighter ── */
type TokenType = "kw" | "id" | "str" | "punct" | "t" | "fn";
interface Token {
  type: TokenType;
  text: string;
}

const INTEGRATE_CODE: { tokens: Token[] }[] = [
  {
    tokens: [
      { type: "kw", text: "import" },
      { type: "t", text: " " },
      { type: "id", text: "OpenAI" },
      { type: "t", text: " " },
      { type: "kw", text: "from" },
      { type: "t", text: " " },
      { type: "str", text: '"openai"' },
      { type: "punct", text: ";" },
    ],
  },
  { tokens: [{ type: "t", text: "" }] },
  {
    tokens: [
      { type: "kw", text: "const" },
      { type: "t", text: " " },
      { type: "id", text: "client" },
      { type: "t", text: " = " },
      { type: "kw", text: "new" },
      { type: "t", text: " " },
      { type: "id", text: "OpenAI" },
      { type: "punct", text: "({" },
    ],
  },
  {
    tokens: [
      { type: "t", text: "  " },
      { type: "id", text: "apiKey" },
      { type: "punct", text: ":" },
      { type: "t", text: " " },
      { type: "id", text: "process" },
      { type: "punct", text: "." },
      { type: "id", text: "env" },
      { type: "punct", text: "." },
      { type: "id", text: "YAPAPA_KEY" },
      { type: "punct", text: "," },
    ],
  },
  {
    tokens: [
      { type: "t", text: "  " },
      { type: "id", text: "baseURL" },
      { type: "punct", text: ":" },
      { type: "t", text: " " },
      { type: "str", text: '"https://api.yapa.up.railway.app/v1"' },
      { type: "punct", text: "," },
    ],
  },
  { tokens: [{ type: "punct", text: "});" }] },
];

const TOKEN_STYLES: Record<TokenType, string> = {
  kw: "text-indigo-300",
  id: "text-white/85",
  str: "text-amber-300/95",
  punct: "text-white/30",
  t: "text-white/55",
  fn: "text-emerald-300",
};

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // best-effort
    }
  }, []);

  return { copied, copy };
}

const CODE_PLAIN = INTEGRATE_CODE
  .map((line) => line.tokens.map((t) => t.text).join(""))
  .join("\n");

/* ── Glass card primitive ── */
function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-3xl overflow-hidden",
        "bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent",
        "border border-white/[0.08]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.5),0_0_80px_-30px_rgba(99,102,241,0.15)]",
        className,
      )}
      {...props}
    >
      {/* Top edge highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}

/* ── Atmospheric background ── */
function AtmosphericBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Primary indigo orb — top left */}
      <motion.div
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Violet orb — middle right */}
      <motion.div
        className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        animate={{ scale: [1, 1.1, 1], y: [0, -40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Deep teal — bottom center */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

/* ── Step card ── */
function StepCard({ step, index }: { step: Step; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-60px" });
  const Icon = step.icon;
  const isIntegrate = step.id === "03";
  const { copied, copy } = useCopy();

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        delay: 0.1 + index * 0.08,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative"
    >
      {/* Timeline dot on the rail */}
      <motion.div
        aria-hidden
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ delay: 0.25 + index * 0.08, type: "spring", stiffness: 280 }}
        className="absolute -left-[7px] top-10 z-10 hidden lg:flex items-center justify-center"
      >
        <div className="relative">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, #a5b4fc 0%, ${ACCENT.hex} 60%, #4338ca 100%)`,
              boxShadow: `0 0 16px ${ACCENT.glow}, 0 0 0 5px rgba(99,102,241,0.08)`,
            }}
          />
        </div>
      </motion.div>

      <GlassCard className="p-6 lg:p-9 transition-all duration-500 hover:border-indigo-400/30 group">
        {/* Conic glow on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 25%, transparent 75%, rgba(99,102,241,0.15) 100%)",
            filter: "blur(20px)",
            zIndex: -1,
          }}
        />

        <div className="flex items-start gap-6 lg:gap-8">
          {/* Icon */}
          <div
            className={cn(
              "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent",
              "border border-white/[0.08] text-indigo-200",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
              "group-hover:text-indigo-100 group-hover:border-indigo-300/40",
              "transition-all duration-500",
            )}
          >
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Step label row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-indigo-300/50">
                Step {step.id}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-white/30">
                {step.duration}
              </span>
            </div>

            {/* Title with italic emphasis on the second word */}
            <h3 className="text-2xl lg:text-[1.75rem] font-semibold text-white tracking-tight leading-[1.15]">
              {step.title}{" "}
              {step.italic && (
                <span className="font-display italic font-normal text-indigo-200/95">
                  {step.italic}
                </span>
              )}
            </h3>

            <p className="mt-3 text-[14px] text-white/50 leading-relaxed max-w-prose group-hover:text-white/65 transition-colors duration-500">
              {step.desc}
            </p>

            {/* Code block (Integrate step only) */}
            {isIntegrate && (
              <div className="mt-7 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_40px_-20px_rgba(0,0,0,0.6)]">
                {/* Top edge highlight */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                  }}
                />
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, #ff8b8b 0%, #ef4444 70%, #991b1b 100%)",
                          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.3)",
                        }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, #ffd87b 0%, #f59e0b 70%, #92400e 100%)",
                          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.3)",
                        }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, #7bf0a3 0%, #10b981 70%, #065f46 100%)",
                          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.3)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-mono ml-2">
                      client.ts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(CODE_PLAIN)}
                    aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono",
                      "transition-all duration-200",
                      "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]",
                      copied
                        ? "text-emerald-300 border-emerald-500/40"
                        : "text-white/45 hover:text-white/75",
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 lg:p-5 overflow-x-auto leading-[1.7] text-[12px]">
                  <code>
                    {INTEGRATE_CODE.map((line, li) => (
                      <div key={li} className="flex">
                        <span className="w-7 shrink-0 text-right pr-4 text-white/20 select-none tabular-nums border-r border-white/[0.05] mr-4">
                          {li + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          {line.tokens.length === 0 ? (
                            " "
                          ) : (
                            line.tokens.map((token, ti) => (
                              <span key={ti} className={TOKEN_STYLES[token.type]}>
                                {token.text || " "}
                              </span>
                            ))
                          )}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ── Section ── */
export function IntegrationFlow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 30%"],
  });
  const cometY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 lg:py-40 px-4 overflow-hidden"
      aria-labelledby="integration-heading"
    >
      <AtmosphericBackground />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-20 lg:mb-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7 relative lg:sticky lg:top-32">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 -left-3 lg:-left-8 text-[12rem] lg:text-[18rem] font-display italic font-normal text-white/[0.025] select-none leading-none"
            >
              02
            </span>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative inline-flex items-center gap-2.5 mb-6"
            >
              <span className="w-8 h-px bg-gradient-to-r from-indigo-400/0 via-indigo-300/80 to-indigo-300/0" />
              <span className="text-[10px] font-mono tracking-[0.28em] uppercase text-indigo-200/70">
                Section 02 — Zero to Production
              </span>
            </motion.div>

            <motion.h2
              id="integration-heading"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[2.75rem] sm:text-6xl lg:text-[6.5rem] font-semibold text-white tracking-[-0.04em] leading-[0.9]"
            >
              From signup to{" "}
              <span className="relative inline-block">
                <span className="font-display italic font-normal bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  first request.
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-3 left-0 w-full h-3"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M0 6 Q75 1, 150 6 T300 6"
                    fill="none"
                    stroke="rgba(99,102,241,0.5)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 1.4, ease: "easeOut" }}
                  />
                </svg>
              </span>
            </motion.h2>
          </div>

          {/* Right column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-5 lg:pb-2"
          >
            <p className="text-base lg:text-lg text-white/50 max-w-md leading-relaxed">
              The whole path from blank terminal to live request — four steps,
              under ten minutes, zero paperwork.{" "}
              <span className="font-display italic text-indigo-200/80">
                Designed for engineers, not procurement.
              </span>
            </p>

            {/* Step counter glass panel */}
            <div className="mt-8 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                }}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/30">
                  The journey
                </span>
                <span className="font-display italic text-indigo-200/70 text-sm">
                  4 steps
                </span>
              </div>
              <div className="flex items-center gap-2">
                {STEPS.map((s) => (
                  <div key={s.id} className="flex-1 flex items-center gap-2">
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, #a5b4fc 0%, ${ACCENT.hex} 70%)`,
                        boxShadow: `0 0 8px ${ACCENT.glow}`,
                      }}
                    />
                    <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                      {s.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Steps with timeline rail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <div className="lg:col-span-8 lg:col-start-4 relative">
            {/* Rail base */}
            <div
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
              style={{
                background:
                  "linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.2) 50%, rgba(99,102,241,0.05) 100%)",
              }}
            />
            {/* Rail outer glow */}
            <div
              aria-hidden
              className="absolute left-[-2px] top-0 bottom-0 w-[5px] hidden lg:block"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
                filter: "blur(3px)",
              }}
            />
            {/* Comet */}
            <motion.div
              aria-hidden
              className="absolute left-[-3px] w-[7px] h-[7px] rounded-full hidden lg:block z-20"
              style={{
                top: cometY,
                background: `radial-gradient(circle, #c7d2fe 0%, ${ACCENT.hex} 60%, transparent 100%)`,
                boxShadow: `0 0 12px ${ACCENT.glow}, 0 0 24px rgba(99,102,241,0.3)`,
              }}
            />

            <div className="space-y-6 lg:space-y-8 lg:pl-12">
              {STEPS.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 lg:mt-28"
        >
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/[0.08] p-1 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_40px_80px_-30px_rgba(0,0,0,0.6),0_0_120px_-40px_rgba(99,102,241,0.3)]">
            {/* Aurora background */}
            <motion.div
              aria-hidden
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 800px 400px at 30% 0%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(ellipse 600px 300px at 80% 100%, rgba(139,92,246,0.2) 0%, transparent 50%)",
                mixBlendMode: "screen",
              }}
              animate={{ opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative bg-gradient-to-br from-[#08080F]/90 to-[#0A0A14]/90 backdrop-blur-2xl rounded-[2.3rem] p-10 lg:p-16 overflow-hidden">
              {/* Top edge highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                }}
              />
              {/* Grid overlay */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full border border-emerald-400/30 bg-emerald-500/10 backdrop-blur">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        background: `radial-gradient(circle, ${ACCENT.statusHex} 0%, #047857 100%)`,
                        boxShadow: `0 0 8px ${ACCENT.statusHex}`,
                      }}
                    />
                    <span className="text-[11px] text-emerald-200 font-mono tracking-widest uppercase">
                      Beta — Free Forever
                    </span>
                  </div>
                  <h3 className="text-4xl lg:text-6xl font-semibold text-white tracking-[-0.03em] leading-[1.05]">
                    Ready to{" "}
                    <span className="font-display italic font-normal bg-gradient-to-br from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                      ship?
                    </span>
                  </h3>
                  <p className="mt-5 text-white/55 text-base lg:text-lg leading-relaxed">
                    Full access, zero commitment. No credit card, no expiring
                    trial, no time bombs.
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2.5 max-w-md">
                    {[
                      "No credit card",
                      "No rate limits",
                      "No surprise bills",
                      "Instant provisioning",
                    ].map((g) => (
                      <div key={g} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: `radial-gradient(circle, #6ee7b7 0%, ${ACCENT.statusHex} 100%)`,
                            }}
                          />
                        </div>
                        <span className="text-[13px] text-white/70 font-mono">
                          {g}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    href="/signup"
                    className={cn(
                      "group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl",
                      "bg-white text-black font-bold text-lg overflow-hidden",
                      "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                      "shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2),inset_0_1px_0_0_rgba(255,255,255,0.4)]",
                    )}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <span className="relative z-10">Claim your key</span>
                    <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <p className="mt-3 text-[11px] text-white/30 font-mono text-center lg:text-right">
                    No signup friction. No hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
