"use client";

import { motion } from "framer-motion";
import { Key, Lock, Shield, Check } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

const methods = [
  {
    title: "API Key (Recommended)",
    desc: "Generate keys from the Dashboard for server-side integration. Include via X-Api-Key header.",
    icon: Key,
    highlight: true,
    code: `Authorization: X-Api-Key yk_live_…`,
  },
  {
    title: "JWT Session",
    desc: "Browser-based auth via NextAuth. Automatically handled when logged into the dashboard.",
    icon: Lock,
    highlight: false,
    code: `Cookie: authjs.session-token=…`,
  },
  {
    title: "Bearer Token",
    desc: "Alternative for OAuth-style integration. Pass JWT via Authorization: Bearer header.",
    icon: Shield,
    highlight: false,
    code: `Authorization: Bearer eyJhbGc…`,
  },
];

const scopes = [
  { name: "read:models", desc: "List and inspect available models." },
  { name: "write:chat", desc: "Send chat completions and streaming responses." },
  { name: "write:embeddings", desc: "Generate text embeddings for any model." },
  { name: "read:billing", desc: "View credit balance and per-model cost." },
  { name: "write:webhooks", desc: "Register and update webhook endpoints." },
  { name: "admin:org", desc: "Manage organization members and roles (admin only)." },
];

const bestPractices = [
  "Use a different key per environment (dev / staging / prod).",
  "Never commit keys to source control — load from a secret manager.",
  "Rotate keys at least every 90 days. Revoke compromised keys immediately.",
  "Set per-key spend limits in the Dashboard to cap blast radius.",
  "Scope keys to the minimum permissions your service actually needs.",
  "Use the sandbox key for local development to avoid touching real quota.",
];

export default function AuthPage() {
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
        id="authentication"
        icon={Key}
        eyebrow="Getting Started"
        title="Authen"
        italic="tication"
        description="Yapapa supports three authentication modes. Pick the one that matches where your code runs — server, browser, or OAuth consumer. All methods resolve to the same scoped identity on the backend."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          {methods.map((method) => (
            <div
              key={method.title}
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                method.highlight
                  ? "bg-indigo-500/[0.04] border-indigo-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_24px_-12px_rgba(99,102,241,0.2)]"
                  : "bg-gradient-to-br from-white/[0.02] to-transparent border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-white/[0.12]"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 border ${
                  method.highlight
                    ? "bg-indigo-500/[0.1] border-indigo-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "bg-white/[0.03] border-white/[0.07]"
                }`}
              >
                <method.icon
                  className={`w-4 h-4 ${
                    method.highlight ? "text-indigo-200" : "text-white/45"
                  }`}
                />
              </div>
              <h3 className="text-white font-semibold text-sm mb-2 tracking-[-0.01em]">
                {method.title}
              </h3>
              <p className="text-xs text-white/45 leading-[1.65] mb-3">
                {method.desc}
              </p>
              <code className="block text-[11px] font-mono text-indigo-200/70 bg-indigo-500/[0.04] border border-indigo-500/10 rounded-md px-2 py-1.5 truncate">
                {method.code}
              </code>
            </div>
          ))}
        </div>

        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-12 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Using your API key
        </h3>
        <p>
          Include the key as the <code>X-Api-Key</code> header on every request.
          Server-side code is the only safe place to keep a long-lived key —
          browsers and mobile clients should mint short-lived JWTs from your
          backend first.
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`curl ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Hello!" }
    ]
  }'`}
          />
        </div>

        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Scopes
        </h3>
        <p>
          API keys can be scoped to the minimum set of permissions the
          caller needs. Generate a key from the Dashboard and pick the scopes
          you want. A read-only key cannot send chat completions, and a
          billing-only key cannot touch webhooks.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-5">
          {scopes.map((s) => (
            <div
              key={s.name}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent"
            >
              <code className="text-[11px] font-mono text-indigo-200/85 bg-indigo-500/[0.06] border border-indigo-500/15 rounded-md px-2 py-1 whitespace-nowrap">
                {s.name}
              </code>
              <span className="text-xs text-white/45 leading-[1.55]">
                {s.desc}
              </span>
            </div>
          ))}
        </div>

        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Password reset
        </h3>
        <p>
          Users can request a password reset email and complete the reset with
          a token. The token is sent via email when SMTP is configured on the
          backend. Reset links expire after 1 hour.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <h4 className="text-white font-semibold text-sm mb-2 tracking-[-0.01em]">
              Request reset
            </h4>
            <p className="text-[11px] font-mono text-white/35 mb-3">
              POST /auth/forgot-password
            </p>
            <CodeBlock
              language="json"
              code={`{
  "email": "user@example.com"
}`}
            />
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <h4 className="text-white font-semibold text-sm mb-2 tracking-[-0.01em]">
              Complete reset
            </h4>
            <p className="text-[11px] font-mono text-white/35 mb-3">
              POST /auth/reset-password
            </p>
            <CodeBlock
              language="json"
              code={`{
  "token": "reset-token-from-email",
  "newPassword": "new-secure-password"
}`}
            />
          </div>
        </div>

        <h3 className="text-white/95 font-semibold text-sm mb-5 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Best practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {bestPractices.map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01]"
            >
              <div className="shrink-0 w-5 h-5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.08] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-emerald-300" />
              </div>
              <p className="text-xs text-white/55 leading-[1.6]">{p}</p>
            </div>
          ))}
        </div>

        <TipBox variant="warning">
          Treat your API keys like database passwords. A leaked key can rack
          up real spend in minutes — use the Dashboard&apos;s per-key spend
          limit to bound the blast radius before rotating.
        </TipBox>
      </Section>
    </motion.div>
  );
}
