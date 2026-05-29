"use client";

import { motion } from "framer-motion";
import { Webhook } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function WebhooksPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="webhooks" icon={Webhook} title="Webhooks" accent="amber">
        <p>
          Webhooks allow you to receive real-time HTTP callbacks when events
          occur in your account. Configure endpoints to receive POST
          notifications for request completions, credit purchases, and other
          platform events. Each webhook can filter specific event types and
          includes HMAC-signed payloads for authenticity verification.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Available Events
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            {
              event: "request.completed",
              desc: "An API chat or embedding request finished processing. Includes model, token counts, and cost.",
            },
            {
              event: "credits.purchased",
              desc: "Credits were added to your account via purchase or admin grant. Includes amount and new balance.",
            },
          ].map((evt) => (
            <div
              key={evt.event}
              className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.07] hover:border-white/[0.1] transition-all duration-200"
            >
              <code className="text-blue-400 font-mono text-xs font-bold">
                {evt.event}
              </code>
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                {evt.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h4 className="text-white font-semibold text-sm mb-3">
            Example Payload
          </h4>
          <CodeBlock
            language="json"
            code={`{
  "type": "request.completed",
  "timestamp": "2026-05-13T14:30:00Z",
  "payload": {
    "user_id": "usr_abc123",
    "model": "openai/gpt-4o",
    "input_tokens": 450,
    "output_tokens": 820,
    "cost": 3600,
    "api_key_id": "key_def456"
  }
}`}
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Managing Webhooks
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/api/webhooks"
            description="List all configured webhook endpoints for your account, including their event subscriptions, active status, and recent delivery status."
          />
          <EndpointCard
            method="POST"
            path="/api/webhooks"
            description="Create a new webhook endpoint. Requires a target URL and at least one event type. Optionally set a secret for HMAC signing and custom headers."
          >
            <p className="text-sm text-white/30 mb-3">Request body fields:</p>
            <ul className="text-xs text-white/40 space-y-1 mb-4 pl-4 list-disc">
              <li>
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  url
                </code>{" "}
                (required) — Target URL that receives POST requests
              </li>
              <li>
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  events
                </code>{" "}
                (required) — Array of event types to subscribe to
              </li>
              <li>
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  secret
                </code>{" "}
                (optional) — Secret key for HMAC-SHA256 signature generation
              </li>
              <li>
                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">
                  headers
                </code>{" "}
                (optional) — Custom HTTP headers included in each delivery
              </li>
            </ul>
            <CodeBlock
              language="json"
              code={`curl -X POST ${BASE_URL}/api/webhooks \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "url": "https://api.myapp.com/webhooks/yapapa",
    "events": ["request.completed", "credits.purchased"],
    "secret": "whsec_your_secret_here",
    "headers": {
      "Authorization": "Bearer my-custom-token"
    }
  }'`}
            />
          </EndpointCard>
          <EndpointCard
            method="GET"
            path="/api/webhooks/{id}"
            description="Get a single webhook endpoint configuration, including its event subscriptions, custom headers, active status, and delivery history."
          />
          <EndpointCard
            method="PUT"
            path="/api/webhooks/{id}"
            description="Update an existing webhook endpoint. Accepts the same fields as Create. Supports partial updates to URL, events, secret, and headers."
          >
            <CodeBlock
              language="json"
              code={`curl -X PUT ${BASE_URL}/api/webhooks/{id} \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "url": "https://api.myapp.com/webhooks/yapapa-v2",
    "events": ["request.completed"],
    "headers": {}
  }'`}
            />
          </EndpointCard>
          <EndpointCard
            method="DELETE"
            path="/api/webhooks/{id}"
            description="Permanently delete a webhook endpoint. All pending deliveries are cancelled and no further events will be sent."
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Delivery & Retry Mechanism
        </h3>
        <p className="text-sm text-white/50 leading-relaxed">
          Webhook deliveries use HTTP POST with a 30-second timeout. Failed
          deliveries are retried up to 3 times using exponential backoff with
          jitter. Client errors (4xx) other than 429 abort the retry cycle
          immediately, while server errors (5xx) and timeouts are retried.
        </p>

        <div className="mt-6 p-5 rounded-xl bg-white/[0.01] border border-white/[0.07]">
          <h4 className="text-white font-semibold text-sm mb-3">
            Retry Schedule
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Attempt
                  </th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Delay
                  </th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Trigger
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr className="text-white/40 text-xs">
                  <td className="py-2 px-3 font-mono">1</td>
                  <td className="py-2 px-3 font-mono">~2s + jitter</td>
                  <td className="py-2 px-3">Initial delivery</td>
                </tr>
                <tr className="text-white/40 text-xs">
                  <td className="py-2 px-3 font-mono">2</td>
                  <td className="py-2 px-3 font-mono">~4s + jitter</td>
                  <td className="py-2 px-3">5xx, timeout, or 429</td>
                </tr>
                <tr className="text-white/40 text-xs">
                  <td className="py-2 px-3 font-mono">3</td>
                  <td className="py-2 px-3 font-mono">~8s + jitter</td>
                  <td className="py-2 px-3">5xx, timeout, or 429</td>
                </tr>
                <tr className="text-white/40 text-xs">
                  <td className="py-2 px-3 font-mono">4</td>
                  <td className="py-2 px-3 font-mono">
                    ~16s + jitter (capped at 60s)
                  </td>
                  <td className="py-2 px-3">
                    Final attempt — aborts on failure
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Security & Headers
        </h3>
        <p className="text-sm text-white/50 leading-relaxed">
          Each webhook delivery includes security headers to help you verify
          authenticity. When a secret is configured, the payload is signed using
          HMAC-SHA256 and the signature is sent in the request headers.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
            <h4 className="text-white font-semibold text-sm mb-2">
              Request Headers
            </h4>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-white/60 font-mono">Content-Type</dt>
                <dd className="text-white/30">application/json</dd>
              </div>
              <div>
                <dt className="text-white/60 font-mono">X-Webhook-ID</dt>
                <dd className="text-white/30">Unique delivery identifier</dd>
              </div>
              <div>
                <dt className="text-white/60 font-mono">X-Event-Type</dt>
                <dd className="text-white/30">
                  The event type being delivered
                </dd>
              </div>
              <div>
                <dt className="text-white/60 font-mono">X-Webhook-Timestamp</dt>
                <dd className="text-white/30">Unix timestamp of the event</dd>
              </div>
              <div>
                <dt className="text-white/60 font-mono">X-Webhook-Signature</dt>
                <dd className="text-white/30">
                  HMAC-SHA256 signature (
                  <code className="text-white/40">sha256=...</code>)
                </dd>
              </div>
            </dl>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200">
            <h4 className="text-white font-semibold text-sm mb-2">
              Signature Verification
            </h4>
            <p className="text-xs text-white/40 mb-3">
              Verify incoming webhooks using your secret:
            </p>
            <CodeBlock
              language="javascript"
              code={`const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  const expected = "sha256=" + hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Event Filtering",
              desc: "Subscribe only to specific event types. Use the events array when creating a webhook. Unsubscribed events are silently ignored.",
            },
            {
              title: "Custom Headers",
              desc: "Attach custom HTTP headers to every delivery. Useful for bearer tokens or API keys your endpoint requires.",
            },
            {
              title: "Delivery Status",
              desc: "Each webhook tracks delivery status, attempt count, HTTP response codes, and error messages for debugging.",
            },
            {
              title: "Concurrency Limit",
              desc: "A maximum of 20 concurrent webhook deliveries are allowed across all endpoints to prevent overwhelming your servers.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200"
            >
              <h4 className="text-white font-semibold text-sm mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-white/40 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <TipBox>
          Always verify the{" "}
          <code className="text-blue-400 font-mono text-xs">
            X-Webhook-Signature
          </code>{" "}
          header using your webhook secret before processing incoming webhooks.
          Store secrets securely — they are returned only at creation time.
        </TipBox>
      </Section>
    </motion.div>
  );
}
