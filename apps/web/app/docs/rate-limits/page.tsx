"use client";

import { motion } from "framer-motion";
import { Shield, Timer, Gauge, Users } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

export default function RateLimitsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section
        id="rate-limits"
        icon={Shield}
        title="Rate Limits"
        accent="amber"
      >
        <p>
          Rate limits protect the API from abuse and ensure fair usage. Limits
          are applied per-user based on API key or session, using a sliding
          window algorithm. The default limits can be configured via environment
          variables.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            {
              label: "Requests per minute",
              value: "60",
              desc: "Sliding window per API key",
              icon: Gauge,
            },
            {
              label: "Tokens per minute",
              value: "100K",
              desc: "Combined input + output tokens",
              icon: Timer,
            },
            {
              label: "Concurrent requests",
              value: "10",
              desc: "Simultaneous connections per user",
              icon: Users,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="relative p-5 rounded-xl bg-white/[0.01] border border-white/[0.07] text-center group hover:border-blue-500/[0.12] transition-all duration-300"
            >
              <stat.icon className="w-5 h-5 text-blue-400/60 mx-auto mb-3" />
              <div className="text-3xl font-black text-blue-400 mb-1 group-hover:scale-110 transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-sm text-white font-medium mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-white/35 leading-relaxed">
                {stat.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Rate limit headers
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Every response includes headers that indicate your current rate
            limit status. These can be used to implement client-side rate
            limiting.
          </p>
          <CodeBlock
            language="bash"
            code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1684567890
Retry-After: 2`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                <code className="text-white/70 font-mono text-xs">
                  X-RateLimit-Limit
                </code>
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Maximum requests allowed in the current window.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                <code className="text-white/70 font-mono text-xs">
                  X-RateLimit-Remaining
                </code>
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Number of requests remaining in the current window.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                <code className="text-white/70 font-mono text-xs">
                  X-RateLimit-Reset
                </code>
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Unix timestamp when the current window resets.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                <code className="text-white/70 font-mono text-xs">
                  Retry-After
                </code>
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Seconds to wait before retrying (only on 429 responses).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Rate limited response (429)
          </h3>
          <CodeBlock
            language="json"
            code={`HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1684567890
Retry-After: 2

{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Rate limit exceeded. Try again in 2 seconds."
}`}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Endpoint-specific limits
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Different endpoint groups have different rate limits. Auth endpoints
            have stricter limits to prevent brute force attacks.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Group
                  </th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Limit
                  </th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Window
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  {
                    group: "Auth (login, signup)",
                    limit: "10",
                    window: "1 minute",
                  },
                  { group: "API endpoints", limit: "60", window: "1 minute" },
                  {
                    group: "OpenAI-compatible proxy",
                    limit: "60",
                    window: "1 minute",
                  },
                  {
                    group: "Admin endpoints",
                    limit: "120",
                    window: "1 minute",
                  },
                ].map((row) => (
                  <tr
                    key={row.group}
                    className="text-white/40 text-xs hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      {row.group}
                    </td>
                    <td className="py-3 px-4 font-mono">{row.limit}</td>
                    <td className="py-3 px-4">{row.window}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TipBox>
          Rate limits are applied per-user based on API key or session. When
          using Redis (via{" "}
          <code className="text-blue-400 font-mono text-xs">REDIS_URL</code>),
          rate limit state is shared across instances for distributed rate
          limiting. Contact support for higher limits on paid plans.
        </TipBox>
      </Section>
    </motion.div>
  );
}
