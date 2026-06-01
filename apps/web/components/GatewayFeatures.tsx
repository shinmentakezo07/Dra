"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  Terminal,
  Activity,
  Globe,
  Zap,
  ArrowUpRight,
  Shield,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Palette ── */
const ACCENT = {
  hex: "#6366f1",
  statusHex: "#10b981",
  glow: "rgba(99,102,241,0.35)",
};

type FeatureVisual = "terminal" | "stats" | "globe" | "routing" | "pricing";

const FEATURES: ReadonlyArray<{
  id: string;
  icon: typeof Terminal;
  category: string;
  title: string;
  italic?: string;
  desc: string;
  span: string;
  visual: FeatureVisual;
}> = [
  {
    id: "unified",
    icon: Terminal,
    category: "Protocol",
    title: "Unified",
    italic: "API",
    desc: "One endpoint, every frontier model. Hot-swap providers without touching a line of transport code.",
    span: "lg:col-span-2 lg:row-span-2",
    visual: "terminal",
  },
  {
    id: "routing",
    icon: Zap,
    category: "Policy",
    title: "Smart",
    italic: "Routing",
    desc: "Cost-optimized, latency-optimized, or fallback-chained.",
    span: "lg:col-span-1 lg:row-span-1",
    visual: "routing",
  },
  {
    id: "edge",
    icon: Globe,
    category: "Infrastructure",
    title: "Edge",
    italic: "Network",
    desc: "50+ regions. Sub-50ms p95. Four-nines availability.",
    span: "lg:col-span-1 lg:row-span-1",
    visual: "globe",
  },
  {
    id: "analytics",
    icon: Activity,
    category: "Observability",
    title: "Real-time",
    italic: "Analytics",
    desc: "Live cost, latency, and usage telemetry across every provider.",
    span: "lg:col-span-2 lg:row-span-1",
    visual: "stats",
  },
  {
    id: "pricing",
    icon: Shield,
    category: "Billing",
    title: "Transparent",
    italic: "Pricing",
    desc: "Per-token cost visible before you send a single request.",
    span: "lg:col-span-3 lg:row-span-1",
    visual: "pricing",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ── Magnetic hover (hero only) ── */
function useMagneticHover(strength = 0.06) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      rotateX.set(-((e.clientY - rect.top) / rect.height - 0.5) * 8 * strength);
      rotateY.set(((e.clientX - rect.left) / rect.width - 0.5) * 8 * strength);
      x.set(((e.clientX - rect.left) / rect.width - 0.5) * 6 * strength);
      y.set(((e.clientY - rect.top) / rect.height - 0.5) * 6 * strength);
    },
    [strength, x, y, rotateX, rotateY],
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    x.set(0);
    y.set(0);
  }, [x, y, rotateX, rotateY]);

  return { ref, x, y, rotateX, rotateY, handleMouseMove, handleMouseLeave };
}

/* ── Glass card primitive (shared) ── */
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

/* ── Atmospheric background (shared) ── */
function AtmosphericBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1, y: 0 }}
        whileInView={{ scale: [1, 1.08, 1], y: [0, -30, 0] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1, x: 0 }}
        whileInView={{ scale: [1, 1.1, 1], x: [0, 30, 0] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
        initial={{ scale: 1 }}
        whileInView={{ scale: [1, 1.05, 1] }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
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

/* ── Terminal visual ── */
function TerminalBlock() {
  const [lines, setLines] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const terminalLines: { type: string; text: string }[] = [
    {
      type: "cmd",
      text: "$ curl -X POST https://api.yapa.up/v1/chat/completions",
    },
    { type: "header", text: '  -H "Authorization: Bearer sk-stz-..." ' },
    { type: "body", text: '  -d \'{"model":"auto","messages":[...]}\' ' },
    { type: "status", text: "routing to optimal model..." },
    { type: "success", text: "200 OK — claude-opus-4 (324ms)" },
    { type: "meta", text: "tokens: 1,247 in / 89 out | cost: $0.0042" },
  ];

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < terminalLines.length) {
        const idx = i;
        setLines((prev) => [...prev, terminalLines[idx].text]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 380);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div
      ref={ref}
      className="relative mt-6 w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 font-mono text-[11px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_20px_40px_-15px_rgba(0,0,0,0.5)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #ff8b8b 0%, #ef4444 70%, #991b1b 100%)",
            }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #ffd87b 0%, #f59e0b 70%, #92400e 100%)",
            }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #7bf0a3 0%, #10b981 70%, #065f46 100%)",
            }}
          />
        </div>
        <span className="text-[9px] text-white/30 font-mono">
          api-request.sh
        </span>
      </div>
      <div className="p-4 space-y-1 leading-relaxed min-h-[160px]">
        {lines.map((line, i) => {
          const type = terminalLines[i]?.type;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                type === "cmd" && "text-white/75",
                (type === "header" || type === "body") && "text-white/35",
                type === "status" &&
                  "text-indigo-300/80 flex items-center gap-2",
                type === "success" && "flex items-center gap-2",
                type === "meta" && "text-white/35",
              )}
              style={
                type === "success" ? { color: ACCENT.statusHex } : undefined
              }
            >
              {type === "status" && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400/80 animate-pulse" />
              )}
              {type === "success" && (
                <span style={{ color: ACCENT.statusHex }}>&#10003;</span>
              )}
              {line}
            </motion.div>
          );
        })}
        <span
          className="inline-block w-[7px] h-[14px] bg-indigo-400/80 animate-pulse"
          style={{ boxShadow: `0 0 6px ${ACCENT.glow}` }}
        />
      </div>
    </div>
  );
}

/* ── Stats visual ── */
function StatsBlock() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const metrics = [
    { label: "LATENCY P50", value: "124ms", pct: 0.25, color: ACCENT.hex },
    { label: "REQUESTS/M", value: "12.4K", pct: 0.62, color: ACCENT.hex },
    { label: "COST/DAY", value: "$247", pct: 0.41, color: ACCENT.statusHex },
    { label: "ERRORS", value: "0.02%", pct: 0.01, color: ACCENT.hex },
  ];

  return (
    <div ref={ref} className="mt-auto space-y-3">
      <svg
        className="w-full h-10"
        viewBox="0 0 240 40"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sparkAnalytics" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT.hex} stopOpacity="0.35" />
            <stop offset="100%" stopColor={ACCENT.hex} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 35 L12 32 L24 28 L36 30 L48 22 L60 25 L72 18 L84 20 L96 14 L108 16 L120 10 L132 12 L144 8 L156 10 L168 6 L180 7 L192 4 L204 5 L216 3 L228 4 L240 2"
          fill="none"
          stroke={ACCENT.hex}
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        <path
          d="M0 35 L12 32 L24 28 L36 30 L48 22 L60 25 L72 18 L84 20 L96 14 L108 16 L120 10 L132 12 L144 8 L156 10 L168 6 L180 7 L192 4 L204 5 L216 3 L228 4 L240 2 L240 40 L0 40 Z"
          fill="url(#sparkAnalytics)"
        />
      </svg>

      <div className="space-y-1.5">
        {metrics.map((m, i) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="w-[72px] text-[9px] font-mono tracking-widest text-white/30 shrink-0">
              {m.label}
            </span>
            <div className="flex-1 h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full rounded-full origin-left"
                style={{ backgroundColor: m.color }}
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: m.pct } : {}}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>
            <span
              className="text-[11px] font-mono font-semibold tabular-nums w-14 text-right"
              style={{ color: m.color }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Globe visual ── */
function GlobeVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const nodes = [
    { cx: 50, cy: 30, label: "US" },
    { cx: 25, cy: 35, label: "EU" },
    { cx: 75, cy: 25, label: "AP" },
    { cx: 40, cy: 55, label: "AF" },
    { cx: 80, cy: 50, label: "OC" },
    { cx: 15, cy: 50, label: "SA" },
  ];

  const connections: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [0, 5],
    [1, 2],
    [3, 4],
  ];

  return (
    <div ref={ref} className="mt-auto">
      <svg
        viewBox="0 0 100 70"
        className="w-full h-auto opacity-70 group-hover:opacity-95 transition-opacity duration-500"
      >
        {connections.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a].cx}
            y1={nodes[a].cy}
            x2={nodes[b].cx}
            y2={nodes[b].cy}
            stroke="rgba(99,102,241,0.2)"
            strokeWidth="0.3"
            strokeDasharray="2 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <motion.circle
              cx={n.cx}
              cy={n.cy}
              r="2"
              fill="rgba(99,102,241,0.4)"
              stroke="rgba(99,102,241,0.7)"
              strokeWidth="0.5"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{
                delay: 0.3 + i * 0.08,
                type: "spring",
                stiffness: 300,
              }}
            />
            <text
              x={n.cx}
              y={n.cy + 7}
              textAnchor="middle"
              className="fill-white/30 text-[4px] font-mono"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex items-center gap-3 text-[10px] font-mono">
        <span
          className="flex items-center gap-1.5"
          style={{ color: ACCENT.statusHex }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: ACCENT.statusHex }}
          />
          99.99% uptime
        </span>
        <span className="text-white/15">|</span>
        <span className="text-indigo-300/60">&lt;50ms p95</span>
      </div>
    </div>
  );
}

/* ── Routing visual ── */
function RoutingVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const policies = [
    { name: "Fastest", active: true },
    { name: "Cheapest", active: false },
    { name: "Fallback", active: false },
    { name: "Custom", active: false },
  ];

  return (
    <div ref={ref} className="mt-auto space-y-3">
      <svg viewBox="0 0 200 24" className="w-full h-6 opacity-65">
        <motion.path
          d="M0 12 C40 12, 40 4, 80 4 C120 4, 120 20, 160 20 C180 20, 190 12, 200 12"
          fill="none"
          stroke={ACCENT.hex}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <motion.circle
          r="2.5"
          fill={ACCENT.hex}
          filter="url(#glowRoute)"
          initial={{ offsetDistance: "0%" }}
          animate={isInView ? { offsetDistance: "100%" } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            offsetPath:
              'path("M0 12 C40 12, 40 4, 80 4 C120 4, 120 20, 160 20 C180 20, 190 12, 200 12")',
          }}
        />
        <defs>
          <filter id="glowRoute">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="flex flex-wrap gap-1.5">
        {policies.map((p, i) => (
          <motion.span
            key={p.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.6 + i * 0.08 }}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-mono font-medium tracking-wider transition-all duration-300",
              p.active
                ? "bg-indigo-500/15 border border-indigo-400/30 text-indigo-200"
                : "bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/65 hover:border-white/15",
            )}
          >
            {p.name}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ── Pricing visual ── */
function PricingBlock() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const items = [
    { model: "GPT-4o", price: "2.50", bar: 0.17 },
    { model: "Claude Opus", price: "15.00", bar: 1.0 },
    { model: "Gemini Pro", price: "0.35", bar: 0.023 },
    { model: "Llama 3", price: "0.20", bar: 0.013 },
    { model: "Mistral", price: "0.25", bar: 0.017 },
  ];

  return (
    <div ref={ref} className="mt-6 lg:mt-8 relative">
      <div className="space-y-2.5">
        {items.map((m, i) => (
          <motion.div
            key={m.model}
            initial={{ opacity: 0, x: -16 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{
              delay: i * 0.1,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group/row"
          >
            <div className="flex items-center gap-4">
              <span className="w-20 text-[12px] text-white/50 font-mono tracking-wide group-hover/row:text-white transition-colors shrink-0">
                {m.model}
              </span>
              <div className="flex-1 h-[6px] rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div
                  className="h-full rounded-full origin-left"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 30%, rgba(165,180,252,0.9) 70%, rgba(99,102,241,0.4) 100%)`,
                    boxShadow: "0 0 12px rgba(99,102,241,0.4)",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: Math.max(m.bar, 0.02) } : {}}
                  transition={{
                    duration: 1,
                    delay: 0.3 + i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
              <div className="text-right w-16 shrink-0">
                <span className="text-[13px] font-semibold text-white font-mono tracking-tighter">
                  ${m.price}
                </span>
                <span className="text-[9px] font-mono text-white/20 ml-0.5">
                  /1M
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Count-up hook — writes directly to DOM, no React re-render ── */
function useCountUp(end: number, duration = 2200, decimals = 0) {
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
      const node = ref.current;
      if (node) node.textContent = (eased * end).toFixed(decimals);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, end, duration, decimals]);

  return ref;
}

/* ── Stat strip ── */
const STATS = [
  {
    rawValue: 100,
    suffix: "+",
    label: "Models",
    delta: "+12 this month",
    trend: "up" as const,
    decimals: 0,
  },
  {
    rawValue: 50,
    suffix: "+",
    label: "Regions",
    delta: "+4 this quarter",
    trend: "up" as const,
    decimals: 0,
  },
  {
    rawValue: 99.99,
    suffix: "%",
    label: "Uptime",
    delta: "30-day rolling",
    trend: "up" as const,
    decimals: 2,
  },
  {
    rawValue: 0,
    suffix: "",
    label: "SDK",
    delta: "OpenAI-compatible",
    trend: "neutral" as const,
    decimals: 0,
    customValue: "compat",
  },
];

function StatCounter({ stat }: { stat: (typeof STATS)[number] }) {
  const ref = useCountUp(stat.rawValue, 2200, stat.decimals);
  const TrendIcon = stat.trend === "up" ? TrendingUp : null;
  return (
    <div className="flex flex-col items-start">
      <span
        ref={ref}
        className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white font-display tabular-nums tracking-tight"
        suppressHydrationWarning
      >
        {stat.customValue ?? `0${stat.suffix}`}
      </span>
      <span className="mt-1.5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/30">
        {stat.label}
      </span>
      {TrendIcon && (
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono text-indigo-300/65">
          <TrendIcon className="w-3 h-3" />
          {stat.delta}
        </span>
      )}
      {!TrendIcon && (
        <span className="mt-1.5 text-[10px] font-mono text-indigo-300/50">
          {stat.delta}
        </span>
      )}
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({
  feature,
  isHero,
}: {
  feature: (typeof FEATURES)[number];
  isHero: boolean;
}) {
  const Icon = feature.icon;
  const magnetic = useMagneticHover(isHero ? 0.08 : 0);

  return (
    <motion.div
      variants={fadeUp}
      className={cn("relative group", feature.span)}
      style={{ perspective: 1000 }}
    >
      <GlassCard className="h-full p-6 lg:p-8 flex flex-col transition-all duration-500 group-hover:border-indigo-400/30">
        {/* Conic glow on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 25%, transparent 75%, rgba(99,102,241,0.15) 100%)",
            filter: "blur(12px)",
            zIndex: -1,
          }}
        />

        <motion.div
          ref={isHero ? magnetic.ref : undefined}
          onMouseMove={isHero ? magnetic.handleMouseMove : undefined}
          onMouseLeave={isHero ? magnetic.handleMouseLeave : undefined}
          style={
            isHero
              ? {
                  rotateX: magnetic.rotateX,
                  rotateY: magnetic.rotateY,
                  x: magnetic.x,
                  y: magnetic.y,
                }
              : undefined
          }
          className="relative z-10 flex flex-col h-full"
        >
          {/* Header row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "shrink-0 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent",
                  "border border-white/[0.08] text-indigo-200",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
                  isHero ? "w-14 h-14" : "w-11 h-11",
                )}
              >
                <Icon className={cn(isHero ? "w-6 h-6" : "w-5 h-5")} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-indigo-200/55">
                  {feature.category}
                </span>
                <span className="text-[9px] font-mono text-white/25">
                  {String(
                    FEATURES.findIndex((f) => f.id === feature.id) + 1,
                  ).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-white/45" />
            </div>
          </div>

          {/* Title with italic emphasis */}
          <h3
            className={cn(
              "font-semibold text-white tracking-[-0.02em] leading-[1.1]",
              isHero ? "text-3xl lg:text-4xl" : "text-xl lg:text-2xl",
            )}
          >
            {feature.title}{" "}
            {feature.italic && (
              <span className="font-display italic font-normal bg-gradient-to-br from-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                {feature.italic}
              </span>
            )}
          </h3>

          <p
            className={cn(
              "mt-3 text-[13px] text-white/50 leading-relaxed",
              isHero ? "max-w-md" : "max-w-[28ch]",
              "group-hover:text-white/65 transition-colors duration-500",
            )}
          >
            {feature.desc}
          </p>

          {/* Visual */}
          {feature.visual === "terminal" && <TerminalBlock />}
          {feature.visual === "stats" && <StatsBlock />}
          {feature.visual === "globe" && <GlobeVisual />}
          {feature.visual === "routing" && <RoutingVisual />}
          {feature.visual === "pricing" && <PricingBlock />}
        </motion.div>
      </GlassCard>
    </motion.div>
  );
}

/* ── Section ── */
export function GatewayFeatures() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 lg:py-40 px-4 overflow-hidden"
      aria-labelledby="capabilities-heading"
    >
      <AtmosphericBackground />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* ── Editorial header ── */}
        <div className="mb-16 lg:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-8 relative">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 -left-3 lg:-left-8 text-[12rem] lg:text-[18rem] font-display italic font-normal text-white/[0.025] select-none leading-none"
            >
              01
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
                Section 01 — Platform Capabilities
              </span>
            </motion.div>

            <motion.h2
              id="capabilities-heading"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.08,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-[2.75rem] sm:text-6xl lg:text-[6.5rem] font-semibold text-white tracking-[-0.04em] leading-[0.9]"
            >
              One API,{" "}
              <span className="relative inline-block">
                <span className="font-display italic font-normal bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  every frontier model.
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

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-8 text-base lg:text-lg text-white/50 max-w-xl leading-relaxed"
            >
              Route requests to GPT-4o, Claude Opus 4.5, Gemini 2.5 Pro, Llama
              4, and 100+ models through a single OpenAI-compatible endpoint.{" "}
              <span className="font-display italic text-indigo-200/85">
                No SDK lock-in, no migration pain.
              </span>
            </motion.p>
          </div>

          {/* Right: live status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-4 lg:pb-2"
          >
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/35">
                  System Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-indigo-200/75">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      background: `radial-gradient(circle, #6ee7b7 0%, ${ACCENT.statusHex} 100%)`,
                      boxShadow: `0 0 8px ${ACCENT.statusHex}`,
                    }}
                  />
                  LIVE
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { region: "us-east-1", latency: "32ms" },
                  { region: "eu-west-1", latency: "48ms" },
                  { region: "ap-south-1", latency: "41ms" },
                ].map((r, i) => (
                  <div
                    key={r.region}
                    className="flex items-center justify-between text-[11px] font-mono"
                  >
                    <span className="text-white/55">{r.region}</span>
                    <span className="flex items-center gap-2">
                      <span className="w-12 h-[2px] rounded-full overflow-hidden bg-white/[0.06]">
                        <motion.span
                          className="block h-full origin-left"
                          style={{
                            background: `linear-gradient(90deg, ${ACCENT.statusHex} 0%, #6ee7b7 100%)`,
                          }}
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: (30 + i * 12) / 100 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                        />
                      </span>
                      <span style={{ color: ACCENT.statusHex }}>
                        {r.latency}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ── Bento grid ── */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 auto-rows-[minmax(220px,auto)]"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} isHero={f.id === "unified"} />
          ))}
        </motion.div>

        {/* ── Stat strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 lg:mt-28"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
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

          <div className="mt-8 flex items-center justify-between text-[10px] font-mono text-white/25">
            <span>Updated continuously · System telemetry</span>
            <span className="hidden sm:inline">v2.4.0 · 2026.06</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
