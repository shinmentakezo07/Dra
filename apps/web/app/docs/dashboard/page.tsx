"use client";

import { motion } from "framer-motion";
import { BarChart3, CheckCircle } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function DashboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="dashboard" icon={BarChart3} title="Dashboard">
        <p>
          The dashboard provides real-time visibility into your API usage, credit balance, and request history. Key features include:
        </p>
        <ul className="space-y-3 mt-4">
          {[
            "Real-time usage analytics with charts and metrics",
            "API key management — create, revoke, and monitor keys",
            "Request log viewer with filtering and search",
            "Credit balance and transaction history",
            "Model performance and latency monitoring",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/30">
              <CheckCircle className="w-4 h-4 text-emerald-400/70 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>
    </motion.div>
  );
}
