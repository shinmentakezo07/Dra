"use client";

import { motion } from "framer-motion";
import { Lock, Shield, Activity, Globe, Key, FileCode } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

export default function SecurityPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="security" icon={Lock} title="Security">
        <p>
          Security is built into every layer of Yapapa. All data in transit is
          encrypted via TLS. API keys are hashed using HMAC-SHA256 before
          storage — the raw key is never persisted.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {[
            {
              title: "Encryption in Transit",
              desc: "TLS 1.3 for all API endpoints. All communication between clients and servers is encrypted.",
              icon: Lock,
            },
            {
              title: "Key Hashing",
              desc: "API keys stored as HMAC-SHA256 hashes with a server-side pepper. The raw key token is returned once at creation and never stored.",
              icon: Key,
            },
            {
              title: "Rate Limiting",
              desc: "Per-user sliding window rate limits with configurable RPM. Stricter limits on auth endpoints (10 req/min).",
              icon: Activity,
            },
            {
              title: "CORS Protection",
              desc: "Strict CORS policy. Only allowed origins can make browser requests to the API.",
              icon: Globe,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]"
            >
              <item.icon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {item.title}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            API Key Hashing
          </h3>
          <p className="text-sm text-white/50 mb-4">
            API keys are hashed using HMAC-SHA256 with a server-side pepper (
            <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
              AUTH_SECRET
            </code>
            ) before storage. This ensures that even if the database is
            compromised, raw API keys cannot be recovered. The key you receive
            at creation is the only time it is visible.
          </p>
          <CodeBlock
            language="javascript"
            code={`// Key hashing (server-side, pseudocode)
function hashAPIKey(key, pepper) {
  const hmac = createHmac("sha256", pepper);
  hmac.update(key);
  return hmac.digest("hex");
}

// Lookup: hash the incoming key and compare against stored hash
const storedHash = hashAPIKey(providedKey, AUTH_SECRET);`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            JWT Authentication
          </h3>
          <p className="text-sm text-white/50 mb-4">
            The platform uses HS256 JWTs for session-based authentication.
            Tokens include user ID, email, role, and an expiration timestamp.
            Session tokens expire after 7 days by default.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Algorithm
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                HS256 (HMAC with SHA-256). Signing method is strictly enforced.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Expiry
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                Tokens expire after 7 days. The{" "}
                <code className="px-1 py-0.5 rounded bg-white/[0.04] text-white/[0.55] font-mono text-xs">
                  exp
                </code>{" "}
                claim is validated on every request.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white/90 font-semibold text-xs mb-1.5">
                Shared Secret
              </h4>
              <p className="text-xs text-white/35 leading-relaxed">
                The{" "}
                <code className="px-1 py-0.5 rounded bg-white/[0.04] text-white/[0.55] font-mono text-xs">
                  AUTH_SECRET
                </code>{" "}
                must match between frontend and backend for token validation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Security Headers
          </h3>
          <p className="text-sm text-white/50 mb-4">
            The platform sets security headers on all responses to protect
            against common web vulnerabilities.
          </p>
          <CodeBlock
            language="bash"
            code={`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Additional Security Measures
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.07]">
              <FileCode className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-xs">
                  Body Size Limits
                </h4>
                <p className="text-xs text-white/35 leading-relaxed">
                  10MB limit on proxy endpoints, 1MB on API endpoints. Prevents
                  oversized payload attacks.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.07]">
              <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-xs">
                  Webhook Signatures
                </h4>
                <p className="text-xs text-white/35 leading-relaxed">
                  All webhook payloads include HMAC-SHA256 signatures via{" "}
                  <code className="px-1 py-0.5 rounded bg-white/[0.04] text-white/[0.55] font-mono text-xs">
                    X-Webhook-Signature
                  </code>{" "}
                  header for authenticity verification.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.07]">
              <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-xs">
                  Token Blacklist
                </h4>
                <p className="text-xs text-white/35 leading-relaxed">
                  JWT tokens can be blacklisted on logout, preventing reuse of
                  expired-but-valid tokens.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.07]">
              <Activity className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-xs">
                  Audit Logging
                </h4>
                <p className="text-xs text-white/35 leading-relaxed">
                  All admin actions are logged with user context for
                  accountability and incident investigation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <TipBox variant="warning">
          API keys are shown only once at creation. Store them securely — if
          lost, you must revoke and regenerate. The{" "}
          <code className="text-blue-400 font-mono text-xs">AUTH_SECRET</code>{" "}
          environment variable must be identical in both frontend and backend
          deployments for JWT validation to work.
        </TipBox>
      </Section>
    </motion.div>
  );
}
