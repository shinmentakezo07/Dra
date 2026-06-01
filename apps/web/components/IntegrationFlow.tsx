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

/* ── Single-accent palette: indigo. Green reserved for status/success. ── */
const ACCENT = {
  text: "text-indigo-300",
  textSoft: "text-indigo-300/70",
  border: "border-indigo-500/15",
  borderHover: "border-indigo-500/30",
  glow: "rgba(99,102,241,0.08)",
  hex: "#6366f1",
  statusHex: "#10b981",
};

/* ── Step metadata ── */
type StepId = "01" | "02" | "03" | "04";

interface Step {
  id: StepId;
  title: string;
  desc: string;
  duration: string;
  icon: typeof UserPlus;
}

const STEPS: Step[] = [
  {
    id: "01",
    title: "Create account",
    desc: "Email or OAuth. Zero friction, no card, no approval queue.",
    duration: "15s",
    icon: UserPlus,
  },
  {
    id: "02",
    title: "Provision your key",
    desc: "Generate credentials from the dashboard. Instant, no waiting room.",
    duration: "instant",
    icon: KeyRound,
  },
  {
    id: "03",
    title: "Connect the SDK",
    desc: "Drop-in replacement for OpenAI. Change one line, unlock 100+ models.",
    duration: "5 min",
    icon: Code2,
  },
  {
    id: "04",
    title: "Ship to production",
    desc: "Monitor usage, set budgets, optimize cost — all from one pane of glass.",
    duration: "continuous",
    icon: Rocket,
  },
];

/* ── Token-based syntax highlighter for the Integrate step ── */
type TokenType = "kw" | "id" | "str" | "punct" | "t" | "comment" | "fn";
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
  id: "text-white/80",
  str: "text-amber-300",
  punct: "text-white/30",
  t: "text-white/55",
  comment: "text-white/25 italic",
  fn: "text-emerald-300",
};

/* ── Copy-to-clipboard (modern API; works on HTTPS + localhost secure contexts) ── */
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
      // best-effort: clipboard blocked, user can select manually
    }
  }, []);

  return { copied, copy };
}

const CODE_PLAIN = INTEGRATE_CODE
  .map((line) => line.tokens.map((t) => t.text).join(""))
  .join("\n");

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
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        delay: 0.1 + index * 0.06,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative"
    >
      {/* Timeline dot on the rail */}
      <motion.div
        aria-hidden
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ delay: 0.2 + index * 0.06, type: "spring", stiffness: 280 }}
        className="absolute -left-[5px] top-8 z-10 hidden lg:flex items-center justify-center"
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: ACCENT.hex,
            boxShadow: `0 0 12px ${ACCENT.glow}, 0 0 0 4px rgba(99,102,241,0.1)`,
          }}
        />
      </motion.div>

      <div
        className={cn(
          "group relative bg-[#0A0A0A]/90 backdrop-blur-sm rounded-2xl border border-indigo-500/10",
          "p-6 lg:p-8 transition-[border-color,box-shadow,background] duration-500",
          "hover:border-indigo-500/30 hover:bg-[#0C0C12]",
        )}
      >
        {/* Top hairline accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-8 right-8 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
          }}
        />

        <div className="flex items-start gap-5 lg:gap-7">
          {/* Number */}
          <div className="shrink-0">
            <div
              className={cn(
                "text-5xl lg:text-6xl font-bold leading-none tracking-tight tabular-nums",
                "text-transparent bg-clip-text bg-gradient-to-b from-indigo-200/60 to-indigo-500/20",
                "group-hover:from-indigo-200/90 group-hover:to-indigo-400/40 transition-all duration-500",
              )}
            >
              {step.id}
            </div>
            <div className="mt-1 text-[9px] font-mono tracking-[0.18em] uppercase text-indigo-300/40">
              Step
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                {step.title}
              </h3>
              <div
                className={cn(
                  "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent",
                  "border border-indigo-500/15 text-indigo-300",
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <p className="text-[14px] text-white/45 leading-relaxed max-w-prose group-hover:text-white/55 transition-colors duration-300">
              {step.desc}
            </p>

            {/* Time chip */}
            <div className="mt-4 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-indigo-300/60">
                {step.duration}
              </span>
            </div>

            {/* Code block (Integrate step only) */}
            {isIntegrate && (
              <div className="mt-6 relative rounded-xl bg-black/70 border border-indigo-500/10 font-mono text-[12px] shadow-2xl overflow-hidden group/code">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="text-[10px] text-white/25 font-mono ml-2">
                      client.ts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(CODE_PLAIN)}
                    aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono",
                      "transition-all duration-200",
                      "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05]",
                      copied
                        ? "text-emerald-300 border-emerald-500/30"
                        : "text-white/40 hover:text-white/70",
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
                <pre className="p-4 lg:p-5 overflow-x-auto leading-[1.7]">
                  <code>
                    {INTEGRATE_CODE.map((line, li) => (
                      <div key={li} className="flex">
                        <span className="w-6 shrink-0 text-right pr-3 text-white/15 select-none tabular-nums">
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
      </div>
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
  const fillHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 lg:py-40 px-4 overflow-hidden"
      aria-labelledby="integration-heading"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-indigo-600/6 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px]" />
      </div>

      {/* Grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-16 lg:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          {/* Left: meta + title (sticky on desktop) */}
          <div className="lg:col-span-7 relative lg:sticky lg:top-32">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 -left-2 lg:-left-6 text-[10rem] lg:text-[16rem] font-bold leading-none text-white/[0.025] select-none"
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
              <span className="w-6 h-px bg-indigo-400/60" />
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-indigo-300/70">
                Section 02 — Zero to Production
              </span>
            </motion.div>

            <motion.h2
              id="integration-heading"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[2.75rem] sm:text-6xl lg:text-[6rem] font-bold text-white tracking-[-0.04em] leading-[0.88]"
            >
              From signup to
              <br />
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-100 via-indigo-300 to-indigo-500">
                  first request.
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-2 left-0 w-full h-2"
                  viewBox="0 0 300 8"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M0 4 Q75 0, 150 4 T300 4"
                    fill="none"
                    stroke="rgba(99,102,241,0.4)"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
              </span>
            </motion.h2>
          </div>

          {/* Right: subtitle + step count */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-5 lg:pb-2"
          >
            <p className="text-base lg:text-lg text-white/40 max-w-md leading-relaxed">
              No SDK lock-in, no migration pain, no waiting on sales. The whole
              path from blank terminal to live request — four steps, less than
              ten minutes, zero paperwork.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/25">
                4 steps
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="flex items-center gap-2">
                {STEPS.map((s) => (
                  <span
                    key={s.id}
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Steps with timeline rail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 lg:col-start-5 relative">
            {/* Rail base (faint) */}
            <div
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/10 via-indigo-500/15 to-transparent hidden lg:block"
            />
            {/* Rail fill (scroll-driven) */}
            <motion.div
              aria-hidden
              className="absolute left-0 top-0 w-px origin-top hidden lg:block"
              style={{
                height: fillHeight,
                background:
                  "linear-gradient(180deg, rgba(99,102,241,0.6) 0%, rgba(99,102,241,0.2) 100%)",
              }}
            />

            <div className="space-y-6 lg:space-y-7 lg:pl-10">
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
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 lg:mt-28"
        >
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-indigo-500/10 p-1">
            <div
              aria-hidden
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
              style={{ background: "rgba(99,102,241,0.12)" }}
            />
            <div
              aria-hidden
              className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-[100px]"
              style={{ background: "rgba(99,102,241,0.08)" }}
            />

            <div className="relative bg-[#050505] rounded-[2.3rem] p-10 lg:p-16 overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px]"
              />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: ACCENT.statusHex }}
                    />
                    <span className="text-[11px] text-emerald-300 font-mono font-bold tracking-widest uppercase">
                      Beta — Free Forever
                    </span>
                  </div>
                  <h3 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                    Ready to ship?
                  </h3>
                  <p className="mt-4 text-white/45 text-base lg:text-lg leading-relaxed">
                    Full access, zero commitment. No credit card, no expiring
                    trial, no time bombs.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 max-w-md">
                    {[
                      "No credit card",
                      "No rate limits on free",
                      "No surprise bills",
                      "Instant provisioning",
                    ].map((g) => (
                      <div key={g} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: ACCENT.statusHex }}
                          />
                        </div>
                        <span className="text-sm text-white/60 font-mono">
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
                    )}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <span className="relative z-10">Claim your key</span>
                    <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <p className="mt-2 text-[11px] text-white/25 font-mono text-center lg:text-right">
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
