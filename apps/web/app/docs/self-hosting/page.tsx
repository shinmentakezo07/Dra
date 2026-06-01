"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";
import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function SelfHostingPage() {
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
        id="self-hosting"
        icon={Globe}
        title="Self-Hosting & Configuration"
       
      >
        <p>
          When self-hosting Yapapa, you need to configure the base URL so that
          documentation code examples point to your own API endpoint instead of{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
            localhost:8080
          </code>
          .
        </p>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Setting the Docs Base URL
          </h3>
          <p>
            There are two ways to change the base URL shown in all docs code
            examples:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-5 rounded-xl border border-emerald-500/[0.12] bg-emerald-500/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold">
                  ENV
                </span>
                <h4 className="text-white font-semibold text-sm">
                  Environment Variable
                </h4>
              </div>
              <p className="text-xs text-white/40 mb-4">
                Set the{" "}
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  NEXT_PUBLIC_DOCS_BASE_URL
                </code>{" "}
                env var before building the web app. This is the recommended
                approach for deployments.
              </p>
              <CodeBlock
                language="bash"
                code={`# In apps/web/.env.local
NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com`}
              />
            </div>

            <div className="p-5 rounded-xl border border-blue-500/[0.12] bg-blue-500/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-mono font-bold">
                  ADMIN
                </span>
                <h4 className="text-white font-semibold text-sm">
                  Admin Settings Panel
                </h4>
              </div>
              <p className="text-xs text-white/40 mb-4">
                Navigate to{" "}
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  /admin/settings
                </code>{" "}
                and edit the Docs Base URL card. Changes are saved to the
                database immediately.
              </p>
              <CodeBlock
                language="bash"
                code={`# The setting key in system_settings
docs_base_url = "https://api.yourdomain.com"`}
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Fallback chain
          </h3>
          <p className="mb-4">The base URL is resolved in this order:</p>
          <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.04]">
              <span className="text-[11px] font-mono text-white/20 uppercase tracking-wider">
                Priority
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                {
                  priority: "1",
                  key: "NEXT_PUBLIC_DOCS_BASE_URL",
                  desc: "Explicit docs URL — highest priority",
                  example: "https://api.yourdomain.com",
                },
                {
                  priority: "2",
                  key: "NEXT_PUBLIC_BACKEND_URL",
                  desc: "Backend URL — used if docs URL is not set",
                  example: "http://localhost:8080",
                },
                {
                  priority: "3",
                  key: "Default fallback",
                  desc: "Hardcoded default when neither env var is set",
                  example: "http://localhost:8080",
                },
              ].map((item) => (
                <div
                  key={item.priority}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <span className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[11px] font-mono font-bold text-white/30">
                    {item.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-[13px] text-white/70 font-mono">
                      {item.key}
                    </code>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <code className="text-[12px] text-blue-400/60 font-mono hidden sm:block">
                    {item.example}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Full deployment example
          </h3>
          <CodeBlock
            examples={{
              curl: `# 1. Clone the repo
git clone https://github.com/shinmentakezo07/owsiwa.git
cd owsiwa

# 2. Configure your docs base URL
echo "NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com" \\
  >> apps/web/.env.local

# 3. Build and start
docker compose up -d`,
              js: `# Next.js .env.local (apps/web/.env.local)
# ──────────────────────────────────────
BACKEND_URL=http://localhost:8080

# Docs Base URL — shown in all code examples
NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com

# Auth
AUTH_SECRET=your-auth-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com`,
              python: `# docker-compose.override.yml
# ──────────────────────────────────────
services:
  web:
    environment:
      - NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com
      - BACKEND_URL=http://backend:8080
      - AUTH_SECRET=\${AUTH_SECRET}
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://yourdomain.com`,
              go: `# .env (root)
# ──────────────────────────────────────
DATABASE_URL=postgresql://user:pass@db:5432/dra_platform
AUTH_SECRET=your-auth-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com
BACKEND_URL=http://backend:8080

# Self-hosted: set this so docs show YOUR api url
NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com`,
            }}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Docker Compose environment
          </h3>
          <p className="text-sm text-white/50 mb-4">
            When deploying with Docker Compose, configure these environment
            variables for the backend service:
          </p>
          <CodeBlock
            language="bash"
            code={`# Backend environment (docker-compose.yml or .env)
DATABASE_URL=postgresql://user:pass@db:5432/dra_platform
AUTH_SECRET=your-auth-secret
ENV=production

# At least one AI provider key is required
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# NVIDIA_API_KEY=nvapi-...
# GROQ_API_KEY=gsk_...
# GEMINI_API_KEY=AIza...

# Optional: Redis for distributed rate limiting + caching
# REDIS_URL=redis://redis:6379

# Optional: Stripe for credit purchases
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Verifying the base URL
          </h3>
          <p className="mb-4">
            After configuring, visit any docs page with code examples. The base
            URL in curl commands, fetch calls, and Python/Go examples should
            reflect your configured value:
          </p>
          <CodeBlock
            language="bash"
            code={`# Before (default)
curl http://localhost:8080/api/chat ...

# After (with NEXT_PUBLIC_DOCS_BASE_URL=https://api.yourdomain.com)
curl https://api.yourdomain.com/api/chat ...`}
          />
        </div>

        <div className="mt-8">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Post-deployment verification
          </h3>
          <p className="text-sm text-white/50 mb-4">
            After deploying, run a quick smoke test to verify that everything is
            wired correctly:
          </p>
          <CodeBlock
            language="bash"
            code={`# Run the project's smoke test
bash scripts/smoke-test.sh

# Verify health endpoint
curl https://api.yourdomain.com/health

# Check that providers are configured
curl https://api.yourdomain.com/health/providers

# Test a simple chat request
curl https://api.yourdomain.com/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Hello"}]}'`}
          />
        </div>

        <TipBox variant="info">
          The{" "}
          <code className="text-blue-400 font-mono text-xs">
            NEXT_PUBLIC_DOCS_BASE_URL
          </code>{" "}
          env var is baked in at build time. If you change it, rebuild the web
          app with{" "}
          <code className="text-blue-400 font-mono text-xs">npm run build</code>{" "}
          or restart the dev server. The admin settings value in{" "}
          <code className="text-blue-400 font-mono text-xs">
            system_settings
          </code>{" "}
          can be changed at runtime but only affects server-rendered pages — for
          full coverage, set the env var.
        </TipBox>
      </Section>
    </motion.div>
  );
}
