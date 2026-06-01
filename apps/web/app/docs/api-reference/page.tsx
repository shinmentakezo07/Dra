"use client";

import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function ApiReferencePage() {
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
        id="api-reference"
        icon={Code2}
        title="API Reference"
       
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-white/35 font-mono">Base URL</span>
          <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-blue-400/90 font-mono text-sm">
            {BASE_URL}
          </code>
        </div>

        <h3 className="text-lg font-bold text-white/95 mb-4 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
          Public Endpoints
        </h3>
        <div className="space-y-2 mb-10">
          <EndpointCard
            method="GET"
            path="/health"
            description="Health check including database connectivity."
            auth={false}
          >
            <CodeBlock code={`curl ${BASE_URL}/health`} />
          </EndpointCard>
          <EndpointCard
            method="POST"
            path="/auth/signup"
            description="Register a new user account."
            auth={false}
          >
            <CodeBlock
              code={`curl ${BASE_URL}/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'`}
            />
          </EndpointCard>
          <EndpointCard
            method="POST"
            path="/auth/login"
            description="Authenticate and receive JWT session."
            auth={false}
          >
            <CodeBlock
              code={`curl ${BASE_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123"}'`}
            />
          </EndpointCard>
          <EndpointCard
            method="GET"
            path="/api/providers/health"
            description="Health status of all configured LLM providers."
            auth={false}
          />
          <EndpointCard
            method="GET"
            path="/health/providers"
            description="Health status of all configured LLM providers with latency and last-checked info."
            auth={false}
          />
        </div>

        <h3 className="text-lg font-bold text-white/95 mb-4 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
          Protected Endpoints
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/auth/me"
            description="Get current authenticated user profile."
          />
          <EndpointCard
            method="PUT"
            path="/auth/profile"
            description="Update user name and email."
          />
          <EndpointCard
            method="PUT"
            path="/auth/password"
            description="Change password (requires current password)."
          />
          <EndpointCard
            method="GET"
            path="/api/keys"
            description="List all API keys for the current user."
          />
          <EndpointCard
            method="POST"
            path="/api/keys"
            description="Create a new API key with a name."
          />
          <EndpointCard
            method="DELETE"
            path="/api/keys/{id}"
            description="Permanently delete an API key."
          />
          <EndpointCard
            method="POST"
            path="/api/keys/{id}/revoke"
            description="Revoke an API key (immediately disables it)."
          />
          <EndpointCard
            method="GET"
            path="/api/logs"
            description="Paginated request logs with model, status, tokens."
          />
          <EndpointCard
            method="GET"
            path="/api/analytics"
            description="Usage analytics: requests, tokens, costs over time."
          />
          <EndpointCard
            method="GET"
            path="/api/credits"
            description="Get current credit balance."
          />
          <EndpointCard
            method="POST"
            path="/api/credits/purchase"
            description="Purchase additional credits."
          />
          <EndpointCard
            method="GET"
            path="/api/transactions"
            description="List all credit transactions."
          />
          <EndpointCard
            method="POST"
            path="/api/chat"
            description="Unified AI chat endpoint. Streams SSE responses."
          />
          <EndpointCard
            method="POST"
            path="/api/embeddings"
            description="Generate embeddings from supported providers."
          />
          <EndpointCard
            method="POST"
            path="/api/conversations"
            description="Create a new conversation thread."
          />
          <EndpointCard
            method="GET"
            path="/api/conversations"
            description="List recent conversations."
          />
          <EndpointCard
            method="GET"
            path="/api/conversations/{id}"
            description="Get full conversation with messages."
          />
          <EndpointCard
            method="DELETE"
            path="/api/conversations/{id}"
            description="Delete a conversation."
          />
          <EndpointCard
            method="POST"
            path="/api/conversations/{id}/messages"
            description="Add message and get AI response."
          />
          <EndpointCard
            method="POST"
            path="/api/prompts"
            description="Create a new prompt template with name, content, and optional variables."
          />
          <EndpointCard
            method="GET"
            path="/api/prompts"
            description="List saved prompt templates."
          />
          <EndpointCard
            method="GET"
            path="/api/prompts/{name}"
            description="Get a specific prompt template by name."
          />
          <EndpointCard
            method="POST"
            path="/api/prompts/{name}/render"
            description="Render a prompt template with variable substitution and model selection."
          />
          <EndpointCard
            method="DELETE"
            path="/api/prompts/{name}"
            description="Delete a prompt template by name."
          />
          <EndpointCard
            method="POST"
            path="/api/batch"
            description="Process multiple requests in a single batch."
          />
          <EndpointCard
            method="GET"
            path="/api/batch/{id}"
            description="Check batch job status and results."
          />
          <EndpointCard
            method="POST"
            path="/api/files/upload"
            description="Upload files for multimodal model support."
          />
          <EndpointCard
            method="GET"
            path="/api/models"
            description="List all available AI models."
          />
          <EndpointCard
            method="GET"
            path="/api/models/{provider}"
            description="List models for a specific provider."
          />
          <EndpointCard
            method="GET"
            path="/api/credits/budget"
            description="Get daily and monthly budget limits with current spending."
          />
          <EndpointCard
            method="PUT"
            path="/api/credits/budget"
            description="Set daily and/or monthly budget limits."
          />
          <EndpointCard
            method="GET"
            path="/api/files"
            description="List all uploaded files for the current user."
          />
          <EndpointCard
            method="POST"
            path="/api/validate"
            description="Validate structured output schemas and constraints."
          />
          <EndpointCard
            method="GET"
            path="/api/notifications/stream"
            description="Real-time Server-Sent Events (SSE) stream for live notifications."
          />
          <EndpointCard
            method="GET"
            path="/api/webhooks"
            description="List all configured webhook endpoints."
          />
          <EndpointCard
            method="POST"
            path="/api/webhooks"
            description="Create a new webhook endpoint with event types and target URL."
          />
          <EndpointCard
            method="GET"
            path="/api/webhooks/{id}"
            description="Get webhook configuration details and delivery status."
          />
          <EndpointCard
            method="PUT"
            path="/api/webhooks/{id}"
            description="Update webhook endpoint URL, events, or settings."
          />
          <EndpointCard
            method="DELETE"
            path="/api/webhooks/{id}"
            description="Delete a webhook endpoint."
          />
          <EndpointCard
            method="GET"
            path="/api/organizations"
            description="List organizations you belong to or manage."
          />
          <EndpointCard
            method="POST"
            path="/api/organizations"
            description="Create a new organization."
          />
          <EndpointCard
            method="GET"
            path="/api/organizations/{id}"
            description="Get organization details and membership."
          />
          <EndpointCard
            method="GET"
            path="/api/organizations/{id}/members"
            description="List members in an organization."
          />
          <EndpointCard
            method="POST"
            path="/api/organizations/{id}/invite"
            description="Invite a user to your organization."
          />
          <EndpointCard
            method="POST"
            path="/api/organizations/{id}/members/{userId}"
            description="Remove a member from the organization."
          />
          <EndpointCard
            method="POST"
            path="/api/invites/accept"
            description="Accept a pending organization invitation."
          />
        </div>

        <h3 className="text-lg font-bold text-white/95 mb-4 flex items-center gap-2.5 mt-10">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70" />
          OpenAI-Compatible Endpoints
        </h3>
        <div className="space-y-2 mb-10">
          <EndpointCard
            method="POST"
            path="/v1/chat/completions"
            description="OpenAI-compatible chat completions endpoint. Accepts standard OpenAI request format with streaming support."
          />
          <EndpointCard
            method="POST"
            path="/v1/embeddings"
            description="OpenAI-compatible embeddings endpoint. Returns embeddings in OpenAI response format."
          />
          <EndpointCard
            method="GET"
            path="/v1/models"
            description="OpenAI-compatible models list. Returns available models in OpenAI format."
          />
        </div>

        <h3 className="text-lg font-bold text-white/95 mb-4 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
          Admin Endpoints
        </h3>
        <div className="space-y-2 mb-10">
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              User Management
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="GET"
                path="/api/admin/users"
                description="[Admin] List all platform users with pagination and search."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/users/{id}"
                description="[Admin] Get detailed user information including role, status, and usage."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/users/{id}/keys"
                description="[Admin] List all API keys for a specific user."
              />
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              Billing &amp; Credits
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="POST"
                path="/api/admin/users/{id}/credits"
                description="[Admin] Adjust user credit balance (add or deduct credits)."
              />
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              System Settings
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="GET"
                path="/api/admin/settings"
                description="[Admin] Get platform-wide settings including rate limits, features, and branding."
              />
              <EndpointCard
                method="PUT"
                path="/api/admin/settings"
                description="[Admin] Update platform settings."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/feature-flags"
                description="[Admin] List all feature flags and their current state."
              />
              <EndpointCard
                method="PUT"
                path="/api/admin/feature-flags/{flag}"
                description="[Admin] Enable or disable a specific feature flag."
              />
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              LLM &amp; Providers
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="GET"
                path="/api/admin/circuit-breakers"
                description="[Admin] View circuit breaker states for all LLM providers."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/providers"
                description="[Admin] List all configured LLM providers with health status."
              />
              <EndpointCard
                method="POST"
                path="/api/admin/providers"
                description="[Admin] Add or update an LLM provider configuration."
              />
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              Audit &amp; Monitoring
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="GET"
                path="/api/admin/stats"
                description="[Admin] Get platform-wide statistics: total users, requests, credits spent."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/logs"
                description="[Admin] View platform-wide request logs with user context."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/audit-logs"
                description="[Admin] Access audit trail of all admin actions for compliance."
              />
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-mono text-white/25 uppercase tracking-wider mb-2 px-1">
              Announcements &amp; Content
            </h4>
            <div className="space-y-2">
              <EndpointCard
                method="GET"
                path="/api/admin/announcements"
                description="[Admin] List all platform announcements."
              />
              <EndpointCard
                method="POST"
                path="/api/admin/announcements"
                description="[Admin] Create a new platform announcement."
              />
              <EndpointCard
                method="GET"
                path="/api/admin/analytics"
                description="[Admin] Get comprehensive analytics data across all users."
              />
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white/95 mb-4 flex items-center gap-2.5 mt-10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
          Webhooks
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="POST"
            path="/webhooks/stripe"
            description="Stripe webhook endpoint. Receives payment events (requires Stripe signature verification)."
            auth={false}
          />
        </div>
      </Section>
    </motion.div>
  );
}
