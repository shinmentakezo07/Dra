"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function PricingPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="pricing" icon={TrendingUp} title="Pricing & Credits">
        <p>
          Yapapa uses a credit-based pricing system. Credits are deducted per request based on the model and token usage. Purchase credits through the dashboard or API.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            { label: "Credit balance", endpoint: "GET /api/credits", desc: "Check your current balance anytime." },
            { label: "Purchase credits", endpoint: "POST /api/credits/purchase", desc: "Add credits to your account." },
            { label: "Transaction history", endpoint: "GET /api/transactions", desc: "View all past credit transactions." },
            { label: "Usage analytics", endpoint: "GET /api/analytics", desc: "Track your usage and costs over time." },
          ].map((item) => (
            <div key={item.label} className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <h3 className="text-white font-semibold text-sm mb-1">{item.label}</h3>
              <code className="text-blue-400 font-mono text-xs">{item.endpoint}</code>
              <p className="text-xs text-white/30 mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
