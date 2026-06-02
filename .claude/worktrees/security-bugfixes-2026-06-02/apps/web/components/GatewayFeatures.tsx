"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  Terminal,
  Activity,
  Globe,
  Zap,
  Award,
  ArrowUpRight,
} from "lucide-react";

/* ── Design Tokens ── */
const C = {
  blue: "from-blue-500/20 via-blue-500/5 to-transparent",
  purple: "from-purple-500/20 via-purple-500/5 to-transparent",
  amber: "from-amber-500/20 via-amber-500/5 to-transparent",
  emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  slate: "from-white/[0.04] to-white/[0.01]",
};

const ACCENTS = {
  unified: {
    gradient: C.blue,
    border: "border-blue-500/20",
    text: "text-blue-400",
    glow: "bg-blue-500/10",
  },
  analytics: {
    gradient: C.blue,
    border: "border-blue-500/15",
    text: "text-blue-400",
    glow: "bg-blue-500/8",
  },
  edge: {
    gradient: C.purple,
    border: "border-purple-500/20",
    text: "text-purple-400",
    glow: "bg-purple-500/10",
  },
  routing: {
    gradient: C.amber,
    border: "border-amber-500/20",
    text: "text-amber-400",
    glow: "bg-amber-500/10",
  },
  pricing: {
    gradient: C.emerald,
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    glow: "bg-emerald-500/10",
  },
};

/* ── Stagger variants ── */
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ── Structured data ── */
const FEATURES = [
  {
    id: "unified",
    icon: Terminal,
    title: "Unified API",
    desc: "One endpoint, every frontier model. Hot-swap providers without touching a line of transport code.",
    accent: ACCENTS.unified,
    span: "lg:col-span-2 lg:row-span-2",
    visual: "terminal",
  },
  {
    id: "analytics",
    icon: Activity,
    title: "Real-time Analytics",
    desc: "Live cost, latency, and usage telemetry across every provider in a single pane.",
    accent: ACCENTS.analytics,
    span: "lg:col-span-1 lg:row-span-1",
    visual: "stats",
  },
  {
    id: "edge",
    icon: Globe,
    title: "Edge Network",
    desc: "50+ regions, sub-50 ms p95 latency, 99.99%可用性承诺.",
    accent: ACCENTS.edge,
    span: "lg:col-span-1 lg:row-span-1",
    visual: "minimal",
  },
  {
    id: "routing",
    icon: Zap,
    title: "Smart Routing",
    desc: "Cost-optimized, latency-optimized, or fallback-chained — define your policy, we execute it.",
    accent: ACCENTS.routing,
    span: "lg:col-span-1 lg:row-span-1",
    visual: "tags",
  },
  {
    id: "pricing",
    icon: Award,
    title: "Transparent Pricing",
    desc: "Per-token cost visible before you send a single request. No blended rates, no surprise bills.",
    accent: ACCENTS.pricing,
    span: "lg:col-span-3 lg:row-span-1",
    visual: "pricing",
  },
];

/* ── Sub-components ── */

function CardGlow({ accent }: { accent: typeof ACCENTS.unified }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -inset-1 rounded-[2rem] opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100 ${accent.glow}`}
    />
  );
}

function IconWrap({
  accent,
  children,
  size = "default",
}: {
  accent: typeof ACCENTS.unified;
  children: React.ReactNode;
  size?: "default" | "sm";
}) {
  const dim = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  return (
    <div
      className={`shrink-0 ${dim} rounded-xl bg-gradient-to-br ${accent.gradient} border ${accent.border} flex items-center justify-center ${accent.text} ring-1 ring-white/[0.04]`}
    >
      {children}
    </div>
  );
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono font-semibold tracking-[0.15em] uppercase text-white/40 ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Terminal Visual ── */
function TerminalBlock() {
  return (
    <div className="relative mt-6 w-full rounded-xl bg-black/60 border border-white/[0.06] p-4 font-mono text-xs shadow-2xl overflow-hidden">
      <div className="flex gap-1.5 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
      </div>
      <div className="space-y-1.5 leading-relaxed">
        <p>
          <span className="text-white/30">$</span>{" "}
          <span className="text-white/60">curl</span>{" "}
          <span className="text-blue-300">-X POST</span>{" "}
          <span className="text-green-300/70">
            https://api.yapa.up/v1/chat/completions
          </span>
        </p>
        <p className="flex items-center gap-2 text-white/25">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500/60 animate-pulse" />{" "}
          routing to optimal model…
        </p>
        <p className="text-green-400/80 flex items-center gap-2">
          <span className="text-green-400">{"✓"}</span> 200 — claude-opus-4 (324
          ms)
        </p>
        <p className="text-white/30">
          <span className="text-white/30">$</span>{" "}
          <span className="inline-block w-2 h-3.5 bg-green-400/60 animate-pulse" />
        </p>
      </div>
    </div>
  );
}

/* ── Stats Visual ── */
function StatsBlock() {
  const rows = [
    { label: "LATENCY P50", value: "124ms", color: "text-green-400" },
    { label: "REQUESTS/M", value: "12.4K", color: "text-blue-400" },
    { label: "COST/DAY", value: "$247.32", color: "text-amber-400" },
  ];
  return (
    <div className="mt-auto space-y-2">
      <svg
        className="w-full h-8"
        viewBox="0 0 200 32"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sparkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 28 L8 26 L18 22 L30 24 L44 16 L58 19 L72 12 L86 14 L100 8 L114 10 L128 5 L144 7 L160 3 L176 5 L192 2 L200 3"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          className="drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]"
        />
        <path
          d="M0 28 L8 26 L18 22 L30 24 L44 16 L58 19 L72 12 L86 14 L100 8 L114 10 L128 5 L144 7 L160 3 L176 5 L192 2 L200 3 L200 32 L0 32 Z"
          fill="url(#sparkG)"
        />
      </svg>
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-3 py-2"
          >
            <span className="text-[10px] font-mono tracking-widest text-white/30">
              {r.label}
            </span>
            <span className={`text-xs font-mono font-semibold ${r.color}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Pricing Visual ── */
function PricingBlock() {
  const items = [
    { model: "GPT-4o", price: "2.50", dot: "bg-blue-500" },
    { model: "Claude Opus", price: "15.00", dot: "bg-purple-500" },
    { model: "Gemini Pro", price: "0.35", dot: "bg-teal-500" },
    { model: "Llama 3", price: "0.20", dot: "bg-amber-500" },
  ];

  return (
    <div className="mt-6 lg:mt-8 relative">
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {items.map((m, i) => (
          <motion.div
            key={m.model}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3.5 group cursor-default"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-1.5 h-1.5 rounded-full ${m.dot} opacity-60 group-hover:opacity-100 transition-opacity`}
              />
              <span className="text-sm text-white/50 font-mono tracking-wide group-hover:text-white transition-colors">
                {m.model}
              </span>
            </div>

            <div className="text-right">
              <span className="text-lg lg:text-xl font-semibold text-white font-mono tracking-tighter group-hover:text-white transition-colors">
                ${m.price}
              </span>
            </div>

            <div className="w-12 text-right">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                /1M
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Edge / Routing minimal visual ── */
function EdgeVisual() {
  return (
    <div className="mt-4 flex items-center gap-3 text-[10px] font-mono">
      <span className="flex items-center gap-1.5 text-green-400/80">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        99.99% uptime
      </span>
      <span className="text-white/10">·</span>
      <span className="text-white/30">&lt;50ms p95</span>
    </div>
  );
}

function RoutingTags() {
  const tags = ["Fastest", "Cheapest", "Fallback", "Latency"];
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono font-medium text-white/40 tracking-wider"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* ── Animated Counter Hook ── */
function useCountUp(
  end: number,
  duration: number = 2000,
  decimals: number = 0,
) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number | null = null;
    let frame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, end, duration, decimals]);

  return { count, ref };
}

/* ── Stat Display ── */
interface StatDisplayConfig {
  rawValue: number;
  suffix: string;
  label: string;
  gradient: string;
  decimals: number;
  customValue?: string;
}

const STATS_DISPLAY: StatDisplayConfig[] = [
  {
    rawValue: 100,
    suffix: "+",
    label: "Models",
    gradient: "from-blue-300 to-cyan-300",
    decimals: 0,
  },
  {
    rawValue: 50,
    suffix: "+",
    label: "Regions",
    gradient: "from-purple-300 to-pink-300",
    decimals: 0,
  },
  {
    rawValue: 99.99,
    suffix: "%",
    label: "Uptime",
    gradient: "from-emerald-300 to-teal-300",
    decimals: 2,
  },
  {
    rawValue: 0,
    suffix: "",
    label: "SDK",
    gradient: "from-amber-300 to-orange-300",
    decimals: 0,
    customValue: "OpenAI-compat",
  },
];

function StatCounter({ stat }: { stat: (typeof STATS_DISPLAY)[number] }) {
  const { count, ref } = useCountUp(stat.rawValue, 2400, stat.decimals);
  return (
    <div className="flex flex-col items-center">
      <span
        ref={ref}
        className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b ${stat.gradient} font-mono tabular-nums tracking-tight`}
      >
        {stat.customValue ?? `${count}${stat.suffix}`}
      </span>
      <span className="mt-1.5 text-[10px] font-mono tracking-[0.2em] uppercase text-white/20">
        {stat.label}
      </span>
    </div>
  );
}

/* ── Main Card ── */
function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  const Icon = feature.icon;

  return (
    <motion.div variants={fadeUp} className={`relative group ${feature.span}`}>
      <CardGlow accent={feature.accent} />
      <div
        className={`relative h-full bg-[#0A0A0A] rounded-2xl border ${feature.accent.border} border-white/[0.04] p-6 lg:p-8 flex flex-col overflow-hidden transition-colors duration-500`}
      >
        {/* Whisper grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:100%_4px]" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between">
            <IconWrap
              accent={feature.accent}
              size={feature.visual === "terminal" ? "default" : "sm"}
            >
              <Icon
                className={
                  feature.visual === "terminal" ? "w-6 h-6" : "w-5 h-5"
                }
              />
            </IconWrap>
            <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors duration-300" />
          </div>

          <h3 className="mt-4 text-xl lg:text-2xl font-bold text-white tracking-tight">
            {feature.title}
          </h3>
          <p className="mt-2 text-sm text-white/50 leading-relaxed max-w-md">
            {feature.desc}
          </p>

          {/* Conditional visual */}
          {feature.visual === "terminal" && <TerminalBlock />}
          {feature.visual === "stats" && <StatsBlock />}
          {feature.visual === "minimal" && <EdgeVisual />}
          {feature.visual === "tags" && <RoutingTags />}
          {feature.visual === "pricing" && <PricingBlock />}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Section ── */
export function GatewayFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 0.4, 0.4, 0],
  );

  return (
    <section
      ref={ref}
      className="relative w-full py-24 lg:py-40 px-4 overflow-hidden"
    >
      {/* Parallax atmosphere */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/8 via-blue-500/4 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-purple-500/6 to-transparent rounded-full blur-[120px]" />
      </motion.div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 lg:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <Pill>Platform Capabilities</Pill>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[0.92] max-w-3xl"
          >
            One API,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-amber-200">
              every frontier model.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-base lg:text-lg text-white/40 max-w-xl leading-relaxed"
          >
            Route requests to GPT-4o, Claude Opus 4.5, Gemini 2.5 Pro, Llama 4,
            and 100+ models through a single OpenAI-compatible endpoint. No SDK
            lock-in, no migration pain.
          </motion.p>
        </div>

        {/* Bento grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 auto-rows-[minmax(200px,auto)]"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
        </motion.div>

        {/* Bottom stat strip — numbers only, no containers */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 lg:mt-24 relative"
        >
          {/* Single hairline */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="pt-10 pb-4 flex items-start justify-between px-2">
            {STATS_DISPLAY.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.1 + i * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <StatCounter stat={s} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
