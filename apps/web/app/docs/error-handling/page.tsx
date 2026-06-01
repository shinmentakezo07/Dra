"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Activity, ShieldAlert } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

const errors = [
  {
    code: "400",
    title: "Bad Request",
    desc: "Invalid request body or parameters. Check your JSON syntax and required fields.",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  {
    code: "401",
    title: "Unauthorized",
    desc: "Missing or invalid API key or JWT. Check your X-Api-Key or Authorization header.",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
  },
  {
    code: "403",
    title: "Forbidden",
    desc: "Insufficient permissions for the requested resource. Verify your API key scopes.",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
  },
  {
    code: "404",
    title: "Not Found",
    desc: "The requested resource does not exist. Check the endpoint path and resource ID.",
    color: "text-white/70",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.1]",
  },
  {
    code: "409",
    title: "Conflict",
    desc: "Resource already exists (e.g., email already registered). Use a different identifier.",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  {
    code: "429",
    title: "Rate Limited",
    desc: "Too many requests. Retry after the time specified in the Retry-After header.",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  {
    code: "500",
    title: "Server Error",
    desc: "Internal server error. Check server logs and contact support if the issue persists.",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
  },
  {
    code: "502",
    title: "Bad Gateway",
    desc: "Upstream LLM provider returned an error. The provider may be experiencing issues.",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
  },
  {
    code: "503",
    title: "Service Unavailable",
    desc: "Service is temporarily unavailable. This may be due to maintenance or overload.",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
  },
];

const errorCodeTypes = [
  {
    icon: ShieldAlert,
    label: "4xx — Client errors",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/15",
    desc: "These never get better with retries. Fix the request — wrong API key, missing field, bad URL.",
  },
  {
    icon: RotateCcw,
    label: "429 — Rate limit",
    color: "text-indigo-200",
    bg: "bg-indigo-500/[0.06]",
    border: "border-indigo-500/15",
    desc: "Honor the Retry-After header. Exponential backoff is mandatory. Most SDKs handle this automatically.",
  },
  {
    icon: Activity,
    label: "5xx — Server errors",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.06]",
    border: "border-rose-500/15",
    desc: "Retry with backoff up to 3 times. If the upstream provider is down, the circuit breaker will fail fast.",
  },
];

export default function ErrorHandlingPage() {
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
        id="error-handling"
        icon={AlertTriangle}
        eyebrow="Platform"
        title="Error"
        italic="handling"
        description="Every endpoint returns the same JSON envelope on failure. A consistent shape means you can build a single error handler for the entire API."
      >
        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-6 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Response format
        </h3>
        <p>
          All errors return a JSON body with a{" "}
          <code>success</code> field set to <code>false</code>, an{" "}
          <code>error</code> field with the error type code, and a
          human-readable <code>message</code>. Optional <code>details</code>{" "}
          carries structured context (validation errors, quota state, etc).
        </p>
        <div className="mt-5">
          <CodeBlock
            language="json"
            code={`{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Invalid request body: 'model' is required",
  "details": {
    "field": "model",
    "constraint": "required"
  }
}`}
          />
        </div>

        {/* Error type groups */}
        <h3 className="text-white/95 font-semibold text-sm mb-5 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Error families
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {errorCodeTypes.map((t) => (
            <div
              key={t.label}
              className={`p-5 rounded-2xl border ${t.border} ${t.bg} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]`}
            >
              <div
                className={`w-9 h-9 rounded-xl border ${t.border} ${t.bg} flex items-center justify-center mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]`}
              >
                <t.icon className={`w-4 h-4 ${t.color}`} />
              </div>
              <h4 className={`text-[13px] font-semibold mb-1.5 ${t.color}`}>
                {t.label}
              </h4>
              <p className="text-xs text-white/50 leading-[1.65]">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* All status codes */}
        <h3 className="text-white/95 font-semibold text-sm mb-5 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          All status codes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {errors.map((err) => (
            <div
              key={err.code}
              className={`flex items-start gap-3 p-4 rounded-2xl border ${err.border} bg-gradient-to-br from-white/[0.02] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]`}
            >
              <span
                className={`flex-shrink-0 w-10 h-10 rounded-xl ${err.bg} border ${err.border} flex items-center justify-center text-[11px] font-bold font-mono ${err.color} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]`}
              >
                {err.code}
              </span>
              <div className="min-w-0">
                <div className="text-white font-medium text-sm tracking-[-0.01em]">
                  {err.title}
                </div>
                <div className="text-xs text-white/45 mt-1 leading-[1.55]">
                  {err.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Failed request example */}
        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Example: failed request
        </h3>
        <p>
          Here is the response when making a request with an invalid API key.
          The <code>error</code> code is the machine-readable identifier — the{" "}
          <code>message</code> is for humans and should not be parsed.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="bash"
            code={
              "curl " +
              BASE_URL +
              '/api/chat \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: INVALID_KEY" \\\n  -d \'{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Hi"}]}\'\n\n# Response (401):\n# {\n#   "success": false,\n#   "error": "UNAUTHORIZED",\n#   "message": "Invalid API key",\n#   "requestId": "req_8f3a1b2c"\n# }'
            }
          />
        </div>

        {/* Retry strategy */}
        <h3 className="text-white/95 font-semibold text-sm mb-4 mt-14 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(165,180,252,0.6)]" />
          Retry strategy
        </h3>
        <p>
          Implement exponential backoff for <code>429</code> (rate limit) and{" "}
          <code>5xx</code> responses. Start at 1s, double each retry, cap at
          60s. Do not retry on <code>400</code> or <code>401</code> — those
          indicate a client-side issue that needs fixing.
        </p>
        <div className="mt-5">
          <CodeBlock
            language="python"
            code={`import time
import requests

def api_call_with_retry(url, headers, json, max_retries=3):
    for attempt in range(max_retries):
        res = requests.post(url, headers=headers, json=json)

        if res.status_code == 429:
            # Honor Retry-After if provided, else exponential backoff
            wait = int(res.headers.get("Retry-After", 2 ** attempt))
            time.sleep(min(wait, 60))
            continue

        if 500 <= res.status_code < 600:
            time.sleep(min(2 ** attempt, 60))
            continue

        if not res.ok:
            # 4xx — don't retry
            raise Exception(f"API error {res.status_code}: {res.text}")

        return res.json()

    raise Exception(f"Max retries ({max_retries}) exceeded")`}
          />
        </div>

        <TipBox variant="warning">
          Always log the <code>requestId</code> from error responses. It is
          the only way for support to trace a specific call through the
          gateway, provider, and billing pipeline.
        </TipBox>

        <TipBox variant="info">
          The gateway wraps upstream provider errors with extra context. A
          Claude <code>529 Overloaded</code> surfaces as a 502 with{" "}
          <code>error: "UPSTREAM_OVERLOADED"</code> and the original provider
          name in <code>details.provider</code>.
        </TipBox>
      </Section>
    </motion.div>
  );
}
