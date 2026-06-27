"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useInView,
  useSpring,
  useTransform,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  Shield,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

function CountUpNumber({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setCurrent(v));
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref}>
      {current}
      {suffix}
    </span>
  );
}

const trustItems = [
  { icon: Shield, label: "No credit card required" },
  { icon: Clock, label: "Credits never expire" },
  { icon: Users, label: "developers" },
];

export function PricingCTA() {
  const reduce = useReducedMotion();

  return (
    <section
      className="relative w-full py-24 md:py-32 px-4 overflow-hidden bg-[#000000]"
      aria-labelledby="cta-heading"
    >
      {/* Top gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      {/* Multi-layer background */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Primary glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] animate-glow-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[120px] animate-glow-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-fuchsia-600/5 rounded-full blur-[100px]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
      </div>

      {/* HUD corner brackets — matching CreditPackages */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden lg:block">
        <div className="absolute top-10 left-10 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-2xl" />
        <div className="absolute top-10 right-10 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-2xl" />
        <div className="absolute bottom-10 left-10 w-16 h-16 border-l-2 border-b-2 border-white/10 rounded-bl-2xl" />
        <div className="absolute bottom-10 right-10 w-16 h-16 border-r-2 border-b-2 border-white/10 rounded-br-2xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduce ? 0.1 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glass card wrapper */}
          <div className="glass-card rounded-[32px] p-1 relative overflow-hidden group">
            {/* Hover gradient glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-fuchsia-500/10" />

            {/* Inner content — concentric radius: 32px outer → 28px inner */}
            <div className="relative bg-[#0A0A0A] rounded-[28px] p-8 md:p-12 lg:p-16 border border-white/5 text-center">
              {/* Badge chip — matches CreditPackages header badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono font-bold tracking-widest uppercase mb-8"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Get Started
                <div
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                />
              </motion.div>

              {/* Heading — text-balance for even wrapping */}
              <h2
                id="cta-heading"
                className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.95] text-balance"
              >
                Start Building{" "}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Today
                </span>
              </h2>

              {/* Subtitle — text-pretty for short body text */}
              <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-4 font-light leading-relaxed text-pretty">
                Get $5 in free credits when you sign up. No credit card
                required.
              </p>

              {/* Animated developer count — tabular-nums for stable counter */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-500 font-mono mb-10 tabular-nums"
              >
                Join{" "}
                <span className="text-violet-400 font-bold">
                  <CountUpNumber value={10000} suffix="+" />
                </span>{" "}
                developers already building with Yapapa
              </motion.p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                {/* Primary CTA — enhanced with CyberButton corner brackets */}
                <Link href="/signup" className="cursor-pointer">
                  <motion.button
                    whileHover={{ scale: reduce ? 1 : 1.02 }}
                    whileTap={{ scale: reduce ? 1 : 0.97 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className="relative group/btn px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-mono text-sm font-bold tracking-wider uppercase overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.2)] hover:shadow-[0_0_60px_rgba(59,130,246,0.35)] transition-shadow duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[48px]"
                  >
                    {/* Shine sweep */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"
                      aria-hidden="true"
                    />
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40 rounded-tl" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40 rounded-br" />
                    <span className="relative z-10 flex items-center gap-3">
                      Get Started Free
                      <ArrowRight
                        className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </span>
                  </motion.button>
                </Link>

                {/* Secondary CTA — enhanced with hover corners */}
                <Link href="/models" className="cursor-pointer">
                  <motion.button
                    whileHover={{ scale: reduce ? 1 : 1.02 }}
                    whileTap={{ scale: reduce ? 1 : 0.97 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className="relative group/btn px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/20 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[48px]"
                  >
                    {/* Corner brackets — animate on hover */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 rounded-tl group-hover/btn:border-white/40 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 rounded-br group-hover/btn:border-white/40 transition-colors" />
                    <span className="relative z-10 flex items-center gap-3">
                      Explore Models
                      <Sparkles
                        className="w-4 h-4 text-violet-400"
                        aria-hidden="true"
                      />
                    </span>
                  </motion.button>
                </Link>
              </div>

              {/* Trust badges — card-style with icons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                {trustItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: 0.3 + index * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-colors duration-200"
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check
                        className="w-3.5 h-3.5 text-emerald-400"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">
                      {item.label === "developers"
                        ? "10,000+ developers"
                        : item.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
