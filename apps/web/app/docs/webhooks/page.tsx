"use client";

import { motion } from "framer-motion";
import { Webhook } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function WebhooksPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="webhooks" icon={Webhook} title="Webhooks">
        <p>
          Webhooks allow you to receive real-time HTTP callbacks when events occur in your account.
          Configure endpoints to receive notifications for request completions, credit purchases, and more.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">Events</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { event: "request.completed", desc: "An API request finished processing" },
            { event: "credits.purchased", desc: "Credits were added to your account" },
          ].map((evt) => (
            <div key={evt.event} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <code className="text-blue-400 font-mono text-xs">{evt.event}</code>
              <p className="text-xs text-muted-foreground mt-1.5">{evt.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">Managing Webhooks</h3>
        <div className="space-y-2">
          <EndpointCard method="GET" path="/api/webhooks" description="List all configured webhook endpoints with their event subscriptions and delivery status." />
          <EndpointCard method="POST" path="/api/webhooks" description="Create a new webhook endpoint. Specify target URL and event types to subscribe to.">
            <CodeBlock
              language="json"
              code={`{
  "url": "https://example.com/webhooks/yapapa",
  "events": ["request.completed", "credits.purchased"],
  "description": "Production endpoint"
}`}
            />
          </EndpointCard>
          <EndpointCard method="GET" path="/api/webhooks/{id}" description="Get webhook configuration details, delivery history, and status." />
          <EndpointCard method="PUT" path="/api/webhooks/{id}" description="Update webhook endpoint URL, subscribed events, or description." />
          <EndpointCard method="DELETE" path="/api/webhooks/{id}" description="Delete a webhook endpoint and stop deliveries." />
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-bold text-white mb-4">Security & Delivery</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "HMAC Signature", desc: "Each payload includes an HMAC-SHA256 signature in the X-Signature header for verification." },
              { title: "Retry Logic", desc: "Failed deliveries are retried with exponential backoff. Delivery status is tracked per webhook." },
              { title: "Event Filtering", desc: "Subscribe only to the event types your application needs." },
              { title: "Delivery Log", desc: "View delivery history including status codes, timestamps, and response bodies." },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <TipBox>
          Webhook payloads include a <code className="text-blue-400 font-mono text-xs">X-Signature</code> header. Verify signatures using your webhook secret to ensure payload authenticity.
        </TipBox>
      </Section>
    </motion.div>
  );
}
