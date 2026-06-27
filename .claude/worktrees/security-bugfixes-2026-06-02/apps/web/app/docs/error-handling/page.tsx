"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

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
        title="Error Handling"
        accent="amber"
      >
        <p>
          The API returns consistent error responses with descriptive messages.
          All errors return a JSON body with a{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            success
          </code>{" "}
          field set to{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            false
          </code>
          , an{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            error
          </code>{" "}
          field with the error type, and a human-readable{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            message
          </code>
          .
        </p>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Error response format
          </h3>
          <CodeBlock
            language="json"
            code={`{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Invalid request body: 'model' is required"
}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {[
            {
              code: "400",
              title: "Bad Request",
              desc: "Invalid request body or parameters. Check your JSON syntax and required fields.",
            },
            {
              code: "401",
              title: "Unauthorized",
              desc: "Missing or invalid API key or JWT. Check your X-Api-Key or Authorization header.",
            },
            {
              code: "403",
              title: "Forbidden",
              desc: "Insufficient permissions for the requested resource. Verify your API key scopes.",
            },
            {
              code: "404",
              title: "Not Found",
              desc: "The requested resource does not exist. Check the endpoint path and resource ID.",
            },
            {
              code: "409",
              title: "Conflict",
              desc: "Resource already exists (e.g., email already registered). Use a different identifier.",
            },
            {
              code: "429",
              title: "Rate Limited",
              desc: "Too many requests. Retry after the time specified in Retry-After header.",
            },
            {
              code: "500",
              title: "Server Error",
              desc: "Internal server error. Check server logs and contact support if the issue persists.",
            },
            {
              code: "502",
              title: "Bad Gateway",
              desc: "Upstream LLM provider returned an error. The provider may be experiencing issues.",
            },
            {
              code: "503",
              title: "Service Unavailable",
              desc: "Service is temporarily unavailable. This may be due to maintenance or overload.",
            },
          ].map((err) => (
            <div
              key={err.code}
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.07]"
            >
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold font-mono">
                {err.code}
              </span>
              <div className="min-w-0">
                <div className="text-white font-medium text-sm">
                  {err.title}
                </div>
                <div className="text-xs text-white/40 mt-0.5">{err.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Example: failed request
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Here is the response when making a request with an invalid API key:
          </p>
          <CodeBlock
            language="bash"
            code={
              "curl " +
              BASE_URL +
              '/api/chat \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: INVALID_KEY" \\\n  -d \'{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Hi"}]}\'\n\n# Response (401):\n# {\n#   "success": false,\n#   "error": "UNAUTHORIZED",\n#   "message": "Invalid API key"\n# }'
            }
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Retry strategy
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Implement exponential backoff for 429 (rate limit) and 5xx
            responses. Do not retry on 4xx errors other than 429.
          </p>
          <CodeBlock
            language="python"
            code={`
import time

def api_call_with_retry(url, headers, json, max_retries=3):
    for attempt in range(max_retries):
        res = requests.post(url, headers=headers, json=json)
        if res.status_code == 429:
            wait = int(res.headers.get("Retry-After", 2 ** attempt))
            time.sleep(wait)
            continue
        if res.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if not res.ok:
            raise Exception(f"API error: {res.status_code}")
        return res.json()
    raise Exception("Max retries exceeded")
`.trim()}
          />
        </div>

        <TipBox>
          Implement exponential backoff for 429 (rate limit) and 5xx responses.
          Start with 1s, double each retry, cap at 60s. Do not retry on 400 or
          401 — those indicate a client-side issue that needs fixing. The{" "}
          <code className="text-blue-400 font-mono text-xs">Retry-After</code>{" "}
          header is included on 429 responses.
        </TipBox>
      </Section>
    </motion.div>
  );
}
