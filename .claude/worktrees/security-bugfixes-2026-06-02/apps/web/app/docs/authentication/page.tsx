"use client";

import { motion } from "framer-motion";
import { Key, Lock, Shield } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

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
        title="Authentication"
        accent="emerald"
      >
        <p>
          Yapapa supports three authentication methods. Choose the one that fits
          your use case.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          {[
            {
              title: "API Key (Recommended)",
              desc: "Generate keys from the Dashboard for server-side integration. Include via X-Api-Key header.",
              icon: Key,
              highlight: true,
            },
            {
              title: "JWT Session",
              desc: "Browser-based auth via NextAuth. Automatically handled when logged into the dashboard.",
              icon: Lock,
              highlight: false,
            },
            {
              title: "Bearer Token",
              desc: "Alternative for OAuth-style integration. Pass JWT via Authorization: Bearer header.",
              icon: Shield,
              highlight: false,
            },
          ].map((method) => (
            <div
              key={method.title}
              className={`p-5 rounded-xl border transition-all duration-200 ${method.highlight ? "bg-blue-500/[0.03] border-blue-500/[0.12]" : "bg-white/[0.02] border-white/[0.07] hover:border-white/[0.12]"}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${method.highlight ? "bg-blue-500/[0.08] border border-blue-500/[0.12]" : "bg-white/[0.03] border border-white/[0.07]"}`}
              >
                <method.icon
                  className={`w-4 h-4 ${method.highlight ? "text-blue-400" : "text-white/35"}`}
                />
              </div>
              <h3 className="text-white font-semibold text-sm mb-2">
                {method.title}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                {method.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Using your API Key
          </h3>
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

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            OAuth Login
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Users can authenticate via OAuth providers. The OAuth endpoint
            creates or links a user account and returns a session token.
          </p>
          <CodeBlock
            code={`curl ${BASE_URL}/auth/oauth \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "User Name",
    "provider": "google"
  }'`}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-white/95 font-semibold text-sm mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
            Forgot / Reset Password
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Users can request a password reset email and complete the reset with
            a token. The token is sent via email when SMTP is configured.
          </p>
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white font-semibold text-sm mb-2">
                Request Reset
              </h4>
              <p className="text-xs text-white/40 mb-2">
                POST /auth/forgot-password - sends reset link to email
              </p>
              <CodeBlock
                language="json"
                code={`{
  "email": "user@example.com"
}`}
              />
            </div>
            <div className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
              <h4 className="text-white font-semibold text-sm mb-2">
                Complete Reset
              </h4>
              <p className="text-xs text-white/40 mb-2">
                POST /auth/reset-password - reset password with token
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
        </div>
      </Section>
    </motion.div>
  );
}
