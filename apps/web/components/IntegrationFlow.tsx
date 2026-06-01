"use client";

import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  UserPlus,
  KeyRound,
  Code2,
  Rocket,
  ArrowRight,
  Copy,
  Check,
  BookOpen,
  Activity,
  Clock,
  ShieldCheck,
  Database,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   Section 02 — Zero to Production
   Asymmetric bento: sticky scroll-spy tracker, per-step micro-viz,
   trust strip, dual-action CTA. AAA contrast, reduced-motion safe.
   ═══════════════════════════════════════════════════════════════════ */

const ACCENT = {
  hex: "#6366f1",
  hexSoft: "#a5b4fc",
  statusHex: "#10b981",
  statusHexSoft: "#6ee7b7",
  glow: "rgba(99,102,241,0.35)",
  ringGlow: "0 0 0 1px rgba(99,102,241,0.4), 0 0 24px rgba(99,102,241,0.25)",
};

type StepId = "01" | "02" | "03" | "04";
type MicroVizKind = "live-signup" | "key-reveal" | "code-tabs" | "mini-dash";

interface Step {
  id: StepId;
  title: string;
  italic: string;
  desc: string;
  duration: string;
  icon: typeof UserPlus;
  micro: MicroVizKind;
}

const STEPS: ReadonlyArray<Step> = [
  {
    id: "01",
    title: "Create",
    italic: "account",
    desc: "Email or OAuth. Zero friction, no card, no approval queue — start coding in under fifteen seconds.",
    duration: "15s",
    icon: UserPlus,
    micro: "live-signup",
  },
  {
    id: "02",
    title: "Provision",
    italic: "your key",
    desc: "Generate credentials from the dashboard. Instant, no waiting room, scoped to your workspace.",
    duration: "instant",
    icon: KeyRound,
    micro: "key-reveal",
  },
  {
    id: "03",
    title: "Connect",
    italic: "the SDK",
    desc: "Drop-in replacement for OpenAI. Change one line, unlock 100+ models — TypeScript, Python, or cURL.",
    duration: "5 min",
    icon: Code2,
    micro: "code-tabs",
  },
  {
    id: "04",
    title: "Ship",
    italic: "to production",
    desc: "Monitor usage, set budgets, optimize cost — all from one pane of glass, with sub-50ms p95.",
    duration: "continuous",
    icon: Rocket,
    micro: "mini-dash",
  },
];

const TRUST_METRICS: ReadonlyArray<{
  label: string;
  value: string;
  icon: typeof Activity;
}> = [
  { label: "Requests / min", value: "8.4M", icon: Activity },
  { label: "p50 latency", value: "12ms", icon: Clock },
  { label: "Uptime", value: "99.99%", icon: ShieldCheck },
  { label: "Models", value: "100+", icon: Database },
  { label: "Engineers", value: "12.4k", icon: Users },
];

type TokenType = "kw" | "id" | "str" | "punct" | "t" | "fn";
interface Token {
  type: TokenType;
  text: string;
}

const TOKEN_STYLES: Record<TokenType, string> = {
  kw: "text-indigo-300",
  id: "text-white/85",
  str: "text-amber-300/95",
  punct: "text-white/30",
  t: "text-white/55",
  fn: "text-emerald-300",
};

type Lang = "ts" | "py" | "curl";

const CODE_BY_LANG: Record<Lang, { tokens: Token[] }[]> = {
  ts: [
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
    { tokens: [{ type: "t", text: "" }] },
    {
      tokens: [
        { type: "kw", text: "const" },
        { type: "t", text: " " },
        { type: "id", text: "r" },
        { type: "t", text: " = " },
        { type: "kw", text: "await" },
        { type: "t", text: " " },
        { type: "id", text: "client" },
        { type: "punct", text: "." },
        { type: "fn", text: "chat" },
        { type: "punct", text: "." },
        { type: "fn", text: "completions" },
        { type: "punct", text: "." },
        { type: "fn", text: "create" },
        { type: "punct", text: "({" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "  " },
        { type: "id", text: "model" },
        { type: "punct", text: ":" },
        { type: "t", text: " " },
        { type: "str", text: '"auto"' },
        { type: "punct", text: "," },
      ],
    },
    {
      tokens: [
        { type: "t", text: "  " },
        { type: "id", text: "messages" },
        { type: "punct", text: ":" },
        { type: "t", text: " [{ " },
        { type: "id", text: "role" },
        { type: "punct", text: ":" },
        { type: "t", text: " " },
        { type: "str", text: '"user"' },
        { type: "punct", text: ", " },
        { type: "id", text: "content" },
        { type: "punct", text: ":" },
        { type: "t", text: " " },
        { type: "str", text: '"Ship it."' },
        { type: "t", text: " }]," },
      ],
    },
    { tokens: [{ type: "punct", text: "});" }] },
  ],
  py: [
    {
      tokens: [
        { type: "kw", text: "from" },
        { type: "t", text: " " },
        { type: "id", text: "openai" },
        { type: "t", text: " " },
        { type: "kw", text: "import" },
        { type: "t", text: " " },
        { type: "id", text: "OpenAI" },
      ],
    },
    { tokens: [{ type: "t", text: "" }] },
    {
      tokens: [
        { type: "id", text: "client" },
        { type: "t", text: " = " },
        { type: "id", text: "OpenAI" },
        { type: "punct", text: "(" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "    " },
        { type: "id", text: "api_key" },
        { type: "punct", text: "=" },
        { type: "id", text: "os" },
        { type: "punct", text: "." },
        { type: "id", text: "environ" },
        { type: "punct", text: "[" },
        { type: "str", text: '"YAPAPA_KEY"' },
        { type: "punct", text: "]," },
      ],
    },
    {
      tokens: [
        { type: "t", text: "    " },
        { type: "id", text: "base_url" },
        { type: "punct", text: "=" },
        { type: "str", text: '"https://api.yapa.up.railway.app/v1"' },
        { type: "punct", text: "," },
      ],
    },
    { tokens: [{ type: "punct", text: ")" }] },
    { tokens: [{ type: "t", text: "" }] },
    {
      tokens: [
        { type: "id", text: "r" },
        { type: "t", text: " = " },
        { type: "id", text: "client" },
        { type: "punct", text: "." },
        { type: "fn", text: "chat" },
        { type: "punct", text: "." },
        { type: "fn", text: "completions" },
        { type: "punct", text: "." },
        { type: "fn", text: "create" },
        { type: "punct", text: "(" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "    " },
        { type: "id", text: "model" },
        { type: "punct", text: "=" },
        { type: "str", text: '"auto"' },
        { type: "punct", text: "," },
      ],
    },
    {
      tokens: [
        { type: "t", text: "    " },
        { type: "id", text: "messages" },
        { type: "punct", text: "=[{" },
        { type: "id", text: "role" },
        { type: "punct", text: ":" },
        { type: "str", text: '"user"' },
        { type: "punct", text: ", " },
        { type: "id", text: "content" },
        { type: "punct", text: ":" },
        { type: "str", text: '"Ship it."' },
        { type: "punct", text: "}]," },
      ],
    },
    { tokens: [{ type: "punct", text: ")" }] },
  ],
  curl: [
    {
      tokens: [
        { type: "fn", text: "curl" },
        { type: "t", text: " " },
        { type: "punct", text: "-X" },
        { type: "t", text: " " },
        { type: "str", text: "POST" },
        { type: "t", text: " " },
        {
          type: "str",
          text: '"https://api.yapa.up.railway.app/v1/chat/completions"',
        },
        { type: "t", text: " \\" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "  " },
        { type: "punct", text: "-H" },
        { type: "t", text: " " },
        { type: "str", text: '"Authorization: Bearer $YAPAPA_KEY"' },
        { type: "t", text: " \\" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "  " },
        { type: "punct", text: "-H" },
        { type: "t", text: " " },
        { type: "str", text: '"Content-Type: application/json"' },
        { type: "t", text: " \\" },
      ],
    },
    {
      tokens: [
        { type: "t", text: "  " },
        { type: "punct", text: "-d" },
        { type: "t", text: " " },
        {
          type: "str",
          text: `'{"model":"auto","messages":[{"role":"user","content":"Ship it."}]}'`,
        },
      ],
    },
  ],
};

const LANG_META: Record<Lang, { label: string; file: string }> = {
  ts: { label: "TypeScript", file: "client.ts" },
  py: { label: "Python", file: "client.py" },
  curl: { label: "cURL", file: "request.sh" },
};

/* ── Hooks ── */

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );
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
        "contain-[layout_paint_style]",
        className,
      )}
      {...props}
    >
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
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1, x: 0 }}
        whileInView={{ scale: [1, 1.08, 1], x: [0, 30, 0] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1, y: 0 }}
        whileInView={{ scale: [1, 1.1, 1], y: [0, -40, 0] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-[58%] w-[600px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1 }}
        whileInView={{ scale: [1, 1.05, 1] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 100%)",
        }}
      />
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

/* ── Trust strip ── */

function TrustStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 lg:mt-14"
    >
      <GlassCard className="px-5 lg:px-8 py-4 lg:py-5">
        <ul
          role="list"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-2 lg:gap-x-4"
        >
          {TRUST_METRICS.map((m, i) => {
            const Icon = m.icon;
            return (
              <li
                key={m.label}
                className={cn(
                  "flex items-center gap-3 lg:gap-4",
                  i > 0 && "lg:pl-4 lg:border-l lg:border-white/[0.06]",
                )}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06] text-indigo-200/80"
                  aria-hidden
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg lg:text-xl font-semibold text-white tracking-tight tabular-nums leading-none">
                    {m.value}
                  </div>
                  <div className="mt-1 text-[10px] font-mono tracking-[0.18em] uppercase text-white/40 truncate">
                    {m.label}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </motion.div>
  );
}

/* ── Sticky Journey Tracker ── */

function JourneyTracker({
  activeId,
  progress,
}: {
  activeId: StepId | null;
  progress: number;
}) {
  return (
    <nav
      aria-label="Onboarding journey"
      className="hidden lg:block lg:sticky lg:top-32"
    >
      <div className="relative pl-7">
        <div
          aria-hidden
          className="absolute left-2.5 top-2 bottom-2 w-px"
          style={{
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.18) 50%, rgba(99,102,241,0.08) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute left-2.5 top-2 w-px origin-top"
          style={{
            height: "calc(100% - 1rem)",
            background: `linear-gradient(180deg, ${ACCENT.hex} 0%, ${ACCENT.hexSoft} 100%)`,
            transform: `scaleY(${progress})`,
            transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: 0.55,
          }}
        />
        <ol role="list" className="space-y-7">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = activeId === s.id;
            const isPast =
              activeId !== null &&
              STEPS.findIndex((x) => x.id === activeId) > i;
            return (
              <li key={s.id} className="relative">
                <div
                  aria-hidden
                  className="absolute -left-[18px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: isActive
                      ? `radial-gradient(circle at 30% 30%, #c7d2fe 0%, ${ACCENT.hex} 70%, #4338ca 100%)`
                      : isPast
                        ? `radial-gradient(circle at 30% 30%, #a5b4fc 0%, ${ACCENT.hex} 90%)`
                        : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 100%)",
                    boxShadow: isActive ? ACCENT.ringGlow : "none",
                  }}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-indigo-400/40" />
                  )}
                </div>
                <a
                  href={`#step-${s.id}`}
                  className={cn(
                    "block group transition-opacity duration-300",
                    !isActive && !isPast && "opacity-50 hover:opacity-80",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-mono tracking-[0.22em] uppercase",
                        isActive ? "text-indigo-200" : "text-white/35",
                      )}
                    >
                      Step {s.id}
                    </span>
                    <span className="text-[10px] font-mono text-white/25">
                      · {s.duration}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 transition-colors duration-300",
                        isActive
                          ? "text-indigo-200"
                          : isPast
                            ? "text-indigo-300/70"
                            : "text-white/40",
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <div
                      className={cn(
                        "text-[15px] font-medium tracking-tight transition-colors duration-300",
                        isActive ? "text-white" : "text-white/65",
                      )}
                    >
                      {s.title}{" "}
                      <span
                        className={cn(
                          "font-display italic font-normal",
                          isActive ? "text-indigo-200/95" : "text-white/45",
                        )}
                      >
                        {s.italic}
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/* ── Micro-viz: Step 01 — Live signup ── */

function LiveSignupViz() {
  const initial = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const [signups, setSignups] = useState<
    { initials: string; city: string; age: number; id: number }[]
  >(() => [
    { initials: "MK", city: "Berlin", age: 4, id: 1 },
    { initials: "JL", city: "San Francisco", age: 7, id: 2 },
    { initials: "SO", city: "Tokyo", age: 11, id: 3 },
  ]);
  const idRef = useRef(3);
  const ageRef = useRef(0);

  useEffect(() => {
    const cities = [
      "Berlin",
      "San Francisco",
      "Tokyo",
      "London",
      "Bengaluru",
      "Sao Paulo",
      "Seoul",
      "Toronto",
      "Sydney",
      "Lagos",
      "Paris",
      "Singapore",
    ];
    const interval = setInterval(() => {
      const a = initial[Math.floor(Math.random() * initial.length)];
      const b = initial[Math.floor(Math.random() * initial.length)];
      const c = cities[Math.floor(Math.random() * cities.length)];
      idRef.current += 1;
      setSignups((prev) =>
        [
          { initials: a + b, city: c, age: 0, id: idRef.current },
          ...prev,
        ].slice(0, 4),
      );
    }, 4000);

    const ageTimer = setInterval(() => {
      ageRef.current += 1;
      setSignups((prev) => prev.map((s) => ({ ...s, age: s.age + 1 })));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(ageTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 relative rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `radial-gradient(circle, ${ACCENT.statusHex} 0%, #047857 100%)`,
              boxShadow: `0 0 8px ${ACCENT.statusHex}`,
            }}
            aria-hidden
          />
          <span className="text-[10px] font-mono text-white/45 tracking-widest uppercase">
            Live · signups
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/25 tabular-nums">
          {signups.length * 23 + 18402} this hour
        </span>
      </div>
      <ul role="list" className="p-3 space-y-2">
        <AnimatePresence initial={false}>
          {signups.map((s) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold text-indigo-100 border border-indigo-300/30"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.4) 0%, rgba(67,56,202,0.6) 100%)",
                }}
                aria-hidden
              >
                {s.initials}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 text-[12px] font-mono">
                <span className="text-white/70 truncate">
                  anon@{s.city.toLowerCase().replace(/\s/g, "")}.dev
                </span>
                <span className="text-emerald-300/80">just signed up</span>
              </div>
              <span className="shrink-0 text-[10px] font-mono text-white/25 tabular-nums">
                {s.age}s ago
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ── Micro-viz: Step 02 — API key reveal ── */

function KeyRevealViz() {
  const [revealed, setRevealed] = useState(false);
  const fullKey = "sk-yap-7H4kL9pX2mN8qR5vB3wT1jF6yC0zD";
  const masked = "sk-yap-•••••••••••••••••••••••••••••";
  const { copied, copy } = useCopy();

  return (
    <div className="mt-6 relative rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
        }}
      />
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/45 tracking-widest uppercase">
          API Key · default
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-300/80">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `radial-gradient(circle, ${ACCENT.statusHex} 0%, #047857 100%)`,
              boxShadow: `0 0 6px ${ACCENT.statusHex}`,
            }}
            aria-hidden
          />
          active
        </span>
      </div>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <code
          className={cn(
            "flex-1 min-w-0 font-mono text-[12px] tracking-wide tabular-nums",
            "px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]",
            "motion-safe:transition-[filter,color,text-shadow] duration-500 select-all",
            revealed ? "text-white/85" : "text-white/55",
          )}
          style={{
            filter: revealed ? "blur(0)" : "blur(2.5px)",
            textShadow: revealed ? "none" : "0 0 8px rgba(255,255,255,0.15)",
          }}
        >
          {revealed ? fullKey : masked}
        </code>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            className={cn(
              "inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-lg text-[11px] font-mono",
              "motion-safe:transition-[background-color,border-color,color] duration-200",
              "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15]",
              "text-white/65 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60",
            )}
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button
            type="button"
            onClick={() => copy(fullKey)}
            aria-label={
              copied
                ? "API key copied to clipboard"
                : "Copy API key to clipboard"
            }
            className={cn(
              "inline-flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] px-3 rounded-lg text-[11px] font-mono",
              "motion-safe:transition-[background-color,border-color,color] duration-200",
              "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60",
              copied
                ? "text-emerald-300 border-emerald-500/40"
                : "text-white/65 hover:text-white",
            )}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Micro-viz: Step 03 — Code with language tabs ── */

function CodeBlockWithTabs() {
  const [lang, setLang] = useState<Lang>("ts");
  const tokens = CODE_BY_LANG[lang];
  const codePlain = useMemo(
    () =>
      tokens.map((line) => line.tokens.map((t) => t.text).join("")).join("\n"),
    [tokens],
  );
  const { copied, copy } = useCopy();
  const meta = LANG_META[lang];

  return (
    <div className="mt-7 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="hidden sm:flex gap-1.5 shrink-0">
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
          <div
            role="tablist"
            aria-label="Code language"
            className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.04] min-w-0"
          >
            {(Object.keys(LANG_META) as Lang[]).map((l) => {
              const active = l === lang;
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setLang(l)}
                  className={cn(
                    "min-h-[28px] px-2.5 text-[10px] font-mono uppercase tracking-wider rounded-md",
                    "motion-safe:transition-[background-color,color] duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    active
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-white/40 hover:text-white/70",
                  )}
                >
                  {LANG_META[l].label}
                </button>
              );
            })}
          </div>
          <span className="hidden md:inline text-[10px] text-white/30 font-mono truncate">
            {meta.file}
          </span>
        </div>
        <button
          type="button"
          onClick={() => copy(codePlain)}
          aria-label={
            copied ? "Code copied to clipboard" : "Copy code to clipboard"
          }
          className={cn(
            "shrink-0 inline-flex items-center justify-center min-h-[40px] min-w-[40px] gap-1.5 px-2.5 rounded-md text-[10px] font-mono",
            "motion-safe:transition-[background-color,border-color,color] duration-200",
            "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60",
            copied
              ? "text-emerald-300 border-emerald-500/40"
              : "text-white/45 hover:text-white/75",
          )}
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 lg:p-5 overflow-x-auto leading-[1.7] text-[12px]">
        <code>
          {tokens.map((line, li) => (
            <div key={li} className="flex">
              <span
                aria-hidden
                className="w-7 shrink-0 text-right pr-4 text-white/20 select-none tabular-nums border-r border-white/[0.05] mr-4"
              >
                {li + 1}
              </span>
              <span className="flex-1 min-w-0 whitespace-pre">
                {line.tokens.length === 0
                  ? " "
                  : line.tokens.map((token, ti) => (
                      <span key={ti} className={TOKEN_STYLES[token.type]}>
                        {token.text || " "}
                      </span>
                    ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

/* ── Micro-viz: Step 04 — Mini live dashboard ── */

function MiniDashViz() {
  const [reqPerMin, setReqPerMin] = useState(8421380);
  const [p95, setP95] = useState(47);

  useEffect(() => {
    const id = setInterval(() => {
      setReqPerMin((n) => n + Math.floor(Math.random() * 180) + 40);
      setP95((n) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(38, Math.min(58, n + delta));
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const spark = useMemo(
    () => [38, 42, 39, 45, 41, 44, 47, 43, 46, 44, 47, 45, 48, 46, 47],
    [],
  );
  const sparkMax = Math.max(...spark);
  const sparkPath = useMemo(
    () =>
      spark
        .map(
          (v, i) =>
            `${(i / (spark.length - 1)) * 100},${20 - (v / sparkMax) * 18}`,
        )
        .join(" "),
    [spark, sparkMax],
  );

  return (
    <div
      role="status"
      aria-live="off"
      className="mt-6 relative rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
        }}
      />
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `radial-gradient(circle, ${ACCENT.statusHex} 0%, #047857 100%)`,
              boxShadow: `0 0 6px ${ACCENT.statusHex}`,
            }}
            aria-hidden
          />
          <span className="text-[10px] font-mono text-white/45 tracking-widest uppercase">
            Gateway · live
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/25 tabular-nums">
          last 15m
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
        <div className="p-4">
          <div className="text-[10px] font-mono text-white/35 tracking-widest uppercase">
            Requests / min
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-white tracking-tight tabular-nums">
            {(reqPerMin / 1000000).toFixed(2)}M
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-300/80">
            <span aria-hidden>▲</span>
            <span className="tabular-nums">
              +{((reqPerMin % 999) / 100) | 0}.{reqPerMin % 100}%
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[10px] font-mono text-white/35 tracking-widest uppercase">
            p95 latency
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-white tracking-tight tabular-nums">
            {p95}
            <span className="text-sm text-white/45 ml-0.5">ms</span>
          </div>
          <svg
            viewBox="0 0 100 22"
            preserveAspectRatio="none"
            className="mt-2 w-full h-5"
            aria-hidden
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT.hex} stopOpacity="0.5" />
                <stop offset="100%" stopColor={ACCENT.hex} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={`0,20 ${sparkPath} 100,20`}
              fill="url(#sparkFill)"
              stroke="none"
            />
            <polyline
              points={sparkPath}
              fill="none"
              stroke={ACCENT.hexSoft}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Step card ── */

function StepCard({ step, index }: { step: Step; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-60px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={cardRef}
      id={`step-${step.id}`}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        delay: 0.08 + index * 0.07,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative scroll-mt-32"
    >
      <GlassCard className="p-6 lg:p-9 motion-safe:transition-[transform,border-color,box-shadow] duration-500 hover:border-indigo-400/30 group">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 motion-safe:transition-opacity duration-700"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 25%, transparent 75%, rgba(99,102,241,0.15) 100%)",
            filter: "blur(12px)",
            zIndex: -1,
          }}
        />

        <div className="flex items-start gap-5 lg:gap-7">
          <div
            className={cn(
              "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent",
              "border border-white/[0.08] text-indigo-200",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
              "group-hover:text-indigo-100 group-hover:border-indigo-300/40",
              "motion-safe:transition-[color,border-color] duration-500",
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-indigo-300/70">
                Step {step.id}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-white/40">
                {step.duration}
              </span>
            </div>

            <h3 className="text-2xl lg:text-[1.75rem] font-semibold text-white tracking-tight leading-[1.15] text-balance">
              {step.title}{" "}
              <span className="font-display italic font-normal text-indigo-200/95">
                {step.italic}
              </span>
            </h3>

            <p className="mt-3 text-[14px] text-white/55 leading-relaxed max-w-prose group-hover:text-white/70 motion-safe:transition-colors duration-500 text-pretty">
              {step.desc}
            </p>

            {step.micro === "live-signup" && <LiveSignupViz />}
            {step.micro === "key-reveal" && <KeyRevealViz />}
            {step.micro === "code-tabs" && <CodeBlockWithTabs />}
            {step.micro === "mini-dash" && <MiniDashViz />}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ── Section ── */

export function IntegrationFlow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 30%"],
  });
  const cometY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const [activeId, setActiveId] = useState<StepId | null>(null);
  const stepRefs = useRef<Record<StepId, HTMLElement | null>>({
    "01": null,
    "02": null,
    "03": null,
    "04": null,
  });

  useEffect(() => {
    const ids: StepId[] = STEPS.map((s) => s.id);
    let rafId: number | null = null;
    let scheduled = false;

    const compute = () => {
      scheduled = false;
      let bestId: StepId | null = null;
      let bestRatio = 0;
      for (const id of ids) {
        const el = stepRefs.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const top = Math.max(r.top, 0);
        const bottom = Math.min(r.bottom, vh);
        const visiblePx = Math.max(0, bottom - top);
        const ratio = visiblePx / Math.max(1, r.height);
        if (ratio > 0.25 && ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      setActiveId((prev) => (prev === bestId ? prev : bestId));
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const progress = useMemo(() => {
    if (!activeId) return 0;
    const idx = STEPS.findIndex((s) => s.id === activeId);
    return (idx + 0.5) / STEPS.length;
  }, [activeId]);

  const setStepRefs = useCallback((node: HTMLOListElement | null) => {
    if (!node) return;
    STEPS.forEach((s) => {
      stepRefs.current[s.id] = node.querySelector<HTMLElement>(`#step-${s.id}`);
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 lg:py-40 px-4 overflow-hidden"
      aria-labelledby="integration-heading"
    >
      <AtmosphericBackground />

      <div className="relative max-w-7xl mx-auto">
        {/* ── Header (asymmetric) ── */}
        <div className="mb-16 lg:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7 relative">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 lg:-top-24 -left-2 lg:-left-6 text-[10rem] lg:text-[18rem] font-display italic font-normal text-white/[0.025] select-none leading-none"
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
              transition={{
                delay: 0.08,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-[2.75rem] sm:text-6xl lg:text-[6.5rem] font-semibold text-white tracking-[-0.04em] leading-[0.9] text-balance"
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

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-5 lg:pb-2"
          >
            <p className="text-base lg:text-lg text-white/55 max-w-md leading-relaxed text-pretty">
              The whole path from blank terminal to live request — four steps,
              under ten minutes, zero paperwork.{" "}
              <span className="font-display italic text-indigo-200/85">
                Designed for engineers, not procurement.
              </span>
            </p>
          </motion.div>
        </div>

        {/* ── Trust strip ── */}
        <TrustStrip />

        {/* ── Steps + sticky tracker ── */}
        <div className="mt-16 lg:mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-3">
            <JourneyTracker activeId={activeId} progress={progress} />
          </div>

          <div className="lg:col-span-9 relative">
            <div
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-px hidden lg:block"
              style={{
                background:
                  "linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.2) 50%, rgba(99,102,241,0.05) 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute left-[-2px] top-0 bottom-0 w-[5px] hidden lg:block"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
                filter: "blur(3px)",
              }}
            />
            {!reducedMotion && (
              <motion.div
                aria-hidden
                className="absolute left-[-3px] w-[7px] h-[7px] rounded-full hidden lg:block z-20"
                style={{
                  top: cometY,
                  background: `radial-gradient(circle, #c7d2fe 0%, ${ACCENT.hex} 60%, transparent 100%)`,
                  boxShadow: `0 0 12px ${ACCENT.glow}, 0 0 24px rgba(99,102,241,0.3)`,
                }}
              />
            )}

            <ol ref={setStepRefs} className="space-y-6 lg:space-y-8 lg:pl-12">
              {STEPS.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
            </ol>
          </div>
        </div>

        {/* ── CTA panel (dual-action) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 lg:mt-28"
        >
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/[0.08] p-1 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_40px_80px_-30px_rgba(0,0,0,0.6),0_0_120px_-40px_rgba(99,102,241,0.3)]">
            <motion.div
              aria-hidden
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 800px 400px at 30% 0%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(ellipse 600px 300px at 80% 100%, rgba(139,92,246,0.2) 0%, transparent 50%)",
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 0.5 }}
              whileInView={{ opacity: [0.4, 0.6, 0.4] }}
              viewport={{ amount: 0.05 }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative bg-gradient-to-br from-[#08080F]/90 to-[#0A0A14]/90 backdrop-blur-2xl rounded-[2.3rem] p-10 lg:p-16 overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                }}
              />
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
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${ACCENT.statusHex} 0%, #047857 100%)`,
                        boxShadow: `0 0 8px ${ACCENT.statusHex}`,
                      }}
                    />
                    <span className="text-[11px] text-emerald-200 font-mono tracking-widest uppercase">
                      Beta — Free Forever
                    </span>
                  </div>
                  <h3 className="text-4xl lg:text-6xl font-semibold text-white tracking-[-0.03em] leading-[1.05] text-balance">
                    Ready to{" "}
                    <span className="font-display italic font-normal bg-gradient-to-br from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                      ship?
                    </span>
                  </h3>
                  <p className="mt-5 text-white/55 text-base lg:text-lg leading-relaxed text-pretty">
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

                <div className="shrink-0 flex flex-col items-stretch lg:items-end gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/signup"
                      className={cn(
                        "group relative inline-flex items-center justify-center gap-3 min-h-[52px] px-8 rounded-2xl",
                        "bg-white text-black font-bold text-base overflow-hidden",
                        "motion-safe:transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]",
                        "shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2),inset_0_1px_0_0_rgba(255,255,255,0.4)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A14]",
                      )}
                    >
                      <div
                        aria-hidden
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full motion-safe:transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      />
                      <span className="relative z-10">Claim your key</span>
                      <ArrowRight
                        className="relative z-10 w-5 h-5 motion-safe:transition-transform duration-300 group-hover:translate-x-1"
                        strokeWidth={2.25}
                      />
                    </Link>
                    <Link
                      href="/docs"
                      className={cn(
                        "group inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-2xl",
                        "bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/[0.18]",
                        "text-sm font-medium",
                        "motion-safe:transition-[background-color,border-color] duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A14]",
                      )}
                    >
                      <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                      <span>Read the docs</span>
                    </Link>
                  </div>
                  <p className="text-[11px] text-white/30 font-mono lg:text-right">
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
