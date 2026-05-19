"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function ErrorHandlingPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="error-handling" icon={AlertTriangle} title="Error Handling">
        <p>
          The API returns consistent error responses with descriptive messages. All errors include a <code className="text-white/60">detail</code> field with a human-readable explanation and an <code className="text-white/60">error</code> field with the error type.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {[
            { code: "400", title: "Bad Request", desc: "Invalid request body or parameters." },
            { code: "401", title: "Unauthorized", desc: "Missing or invalid API key / JWT." },
            { code: "403", title: "Forbidden", desc: "Insufficient permissions for resource." },
            { code: "404", title: "Not Found", desc: "The requested resource does not exist." },
            { code: "429", title: "Rate Limited", desc: "Too many requests. Retry after backoff." },
            { code: "500", title: "Server Error", desc: "Internal server error. Contact support." },
            { code: "502", title: "Bad Gateway", desc: "Upstream LLM provider returned an error." },
            { code: "503", title: "Service Unavailable", desc: "Service temporarily unavailable." },
          ].map((err) => (
            <div key={err.code} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold font-mono">{err.code}</span>
              <div className="min-w-0">
                <div className="text-white font-medium text-sm">{err.title}</div>
                <div className="text-xs text-white/30 mt-0.5">{err.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
