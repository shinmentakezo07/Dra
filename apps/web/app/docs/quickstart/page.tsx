"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function QuickstartPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="quickstart" icon={Zap} title="Quick Start">
        <p className="text-lg text-white/80">
          Get started with Yapapa AI Gateway in under 5 minutes. The backend runs on{" "}
          <code className="px-1.5 py-0.5 rounded bg-blue-500/[0.08] text-blue-400 font-mono text-xs border border-blue-500/[0.1]">
            {BASE_URL}
          </code>{" "}
          and the frontend on{" "}
          <code className="px-1.5 py-0.5 rounded bg-blue-500/[0.08] text-blue-400 font-mono text-xs border border-blue-500/[0.1]">
            http://localhost:3000
          </code>
          .
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { step: "1", title: "Create an Account", desc: "Sign up at /signup or call POST /auth/signup with name, email, and password." },
            { step: "2", title: "Get Your API Key", desc: "Navigate to the Dashboard and generate a new API key with a recognizable name." },
            { step: "3", title: "Make Your First Request", desc: "Use your API key to call any supported model through the unified API." },
          ].map((card) => (
            <div key={card.step} className="group relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-blue-500/[0.15] transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/[0.08] text-blue-400 text-xs font-bold font-mono">{card.step}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1.5 group-hover:text-blue-400 transition-colors">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        <TipBox>
          All API requests require authentication via the <code className="text-blue-400 font-mono text-xs">X-Api-Key</code> header or a valid JWT session cookie.
        </TipBox>
      </Section>
    </motion.div>
  );
}
