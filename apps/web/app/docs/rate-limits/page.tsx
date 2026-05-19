"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { TipBox } from "@/components/docs/TipBox";

export default function RateLimitsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="rate-limits" icon={Shield} title="Rate Limits">
        <p>
          Rate limits protect the API from abuse and ensure fair usage. Limits are configurable via the{" "}
          <code className="text-white/60">RATE_LIMIT_RPM</code> environment variable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { label: "Requests / minute", value: "60", desc: "Default sliding window" },
            { label: "Tokens / minute", value: "100K", desc: "Combined input + output" },
            { label: "Concurrent requests", value: "10", desc: "Simultaneous connections" },
          ].map((stat) => (
            <div key={stat.label} className="relative p-5 rounded-xl bg-white/[0.01] border border-white/[0.05] text-center group hover:border-blue-500/[0.12] transition-all duration-300">
              <div className="text-3xl font-black text-blue-400 mb-1 group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
              <div className="text-sm text-white font-medium mb-1">{stat.label}</div>
              <div className="text-xs text-white/30">{stat.desc}</div>
            </div>
          ))}
        </div>

        <TipBox>Rate limits are applied per-user based on API key or session. Contact support for higher limits.</TipBox>
      </Section>
    </motion.div>
  );
}
