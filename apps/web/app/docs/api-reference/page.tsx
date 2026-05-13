"use client";

import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function ApiReferencePage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="api-reference" icon={Code2} title="API Reference">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-white/30 font-mono">Base URL</span>
          <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-blue-400 font-mono text-sm">{BASE_URL}</code>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          Public Endpoints
        </h3>
        <div className="space-y-2 mb-10">
          <EndpointCard method="GET" path="/health" description="Health check including database connectivity." auth={false}>
            <CodeBlock code={`curl ${BASE_URL}/health`} />
          </EndpointCard>
          <EndpointCard method="POST" path="/auth/signup" description="Register a new user account." auth={false}>
            <CodeBlock code={`curl ${BASE_URL}/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'`} />
          </EndpointCard>
          <EndpointCard method="POST" path="/auth/login" description="Authenticate and receive JWT session." auth={false}>
            <CodeBlock code={`curl ${BASE_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123"}'`} />
          </EndpointCard>
          <EndpointCard method="GET" path="/api/providers/health" description="Health status of all configured LLM providers." auth={false} />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
          Protected Endpoints
        </h3>
        <div className="space-y-2">
          <EndpointCard method="GET" path="/auth/me" description="Get current authenticated user profile." />
          <EndpointCard method="PUT" path="/auth/profile" description="Update user name and email." />
          <EndpointCard method="PUT" path="/auth/password" description="Change password (requires current password)." />
          <EndpointCard method="GET" path="/api/keys" description="List all API keys for the current user." />
          <EndpointCard method="POST" path="/api/keys" description="Create a new API key with a name." />
          <EndpointCard method="DELETE" path="/api/keys/{id}" description="Permanently delete an API key." />
          <EndpointCard method="POST" path="/api/keys/{id}/revoke" description="Revoke an API key (immediately disables it)." />
          <EndpointCard method="GET" path="/api/logs" description="Paginated request logs with model, status, tokens." />
          <EndpointCard method="GET" path="/api/analytics" description="Usage analytics: requests, tokens, costs over time." />
          <EndpointCard method="GET" path="/api/credits" description="Get current credit balance." />
          <EndpointCard method="POST" path="/api/credits/purchase" description="Purchase additional credits." />
          <EndpointCard method="GET" path="/api/transactions" description="List all credit transactions." />
          <EndpointCard method="POST" path="/api/chat" description="Unified AI chat endpoint. Streams SSE responses." />
          <EndpointCard method="POST" path="/api/embeddings" description="Generate embeddings from supported providers." />
          <EndpointCard method="POST" path="/api/conversations" description="Create a new conversation thread." />
          <EndpointCard method="GET" path="/api/conversations" description="List recent conversations." />
          <EndpointCard method="GET" path="/api/conversations/{id}" description="Get full conversation with messages." />
          <EndpointCard method="DELETE" path="/api/conversations/{id}" description="Delete a conversation." />
          <EndpointCard method="POST" path="/api/conversations/{id}/messages" description="Add message and get AI response." />
          <EndpointCard method="POST" path="/api/prompts" description="Create a new prompt template." />
          <EndpointCard method="GET" path="/api/prompts" description="List saved prompt templates." />
          <EndpointCard method="PUT" path="/api/prompts/{id}" description="Update a prompt template." />
          <EndpointCard method="DELETE" path="/api/prompts/{id}" description="Delete a prompt template." />
          <EndpointCard method="POST" path="/api/batch" description="Process multiple requests in a single batch." />
          <EndpointCard method="GET" path="/api/batch/{id}" description="Check batch job status and results." />
          <EndpointCard method="POST" path="/api/files/upload" description="Upload files for multimodal model support." />
          <EndpointCard method="GET" path="/api/models" description="List all available AI models." />
          <EndpointCard method="GET" path="/api/models/{provider}" description="List models for a specific provider." />
          <EndpointCard method="GET" path="/api/admin/users" description="[Admin] List all platform users." />
          <EndpointCard method="GET" path="/api/admin/stats" description="[Admin] Get platform-wide statistics." />
        </div>
      </Section>
    </motion.div>
  );
}
