"use client";

import { motion } from "framer-motion";
import { Key, Lock, Shield } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function AuthPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="authentication" icon={Key} title="Authentication">
        <p>Yapapa supports three authentication methods. Choose the one that fits your use case.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { title: "API Key (Recommended)", desc: "Generate keys from the Dashboard for server-side integration. Include via X-Api-Key header.", icon: Key },
            { title: "JWT Session", desc: "Browser-based auth via NextAuth. Automatically handled when logged into the dashboard.", icon: Lock },
            { title: "Bearer Token", desc: "Alternative for OAuth-style integration. Pass JWT via Authorization: Bearer header.", icon: Shield },
          ].map((method) => (
            <div key={method.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <method.icon className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-white font-semibold text-sm mb-1.5">{method.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{method.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-white font-semibold mb-3">Using your API Key</h3>
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
          <h3 className="text-white font-semibold mb-3">OAuth Login</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Users can authenticate via OAuth providers. The OAuth endpoint creates or links a user account and returns a session token.
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
          <h3 className="text-white font-semibold mb-3">Forgot / Reset Password</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Users can request a password reset email and complete the reset with a token. The token is sent via email when SMTP is configured.
          </p>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-white font-semibold text-sm mb-2">Request Reset</h4>
              <p className="text-xs text-muted-foreground mb-2">POST /auth/forgot-password - sends reset link to email</p>
              <CodeBlock
                language="json"
                code={`{
  "email": "user@example.com"
}`}
              />
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-white font-semibold text-sm mb-2">Complete Reset</h4>
              <p className="text-xs text-muted-foreground mb-2">POST /auth/reset-password - reset password with token</p>
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
