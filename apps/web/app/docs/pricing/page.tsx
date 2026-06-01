"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function PricingPage() {
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
        id="pricing"
        icon={TrendingUp}
        title="Pricing & Credits"
       
      >
        <p>
          Yapapa uses a credit-based pricing system. Credits are deducted per
          request based on the model and token usage. Purchase credits through
          the dashboard or API.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Credit endpoints
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            {
              label: "Credit balance",
              endpoint: "GET /api/credits",
              desc: "Check your current balance anytime.",
            },
            {
              label: "Purchase credits",
              endpoint: "POST /api/credits/purchase",
              desc: "Add credits to your account.",
            },
            {
              label: "Transaction history",
              endpoint: "GET /api/transactions",
              desc: "View all past credit transactions.",
            },
            {
              label: "Budget limits",
              endpoint: "GET /api/credits/budget",
              desc: "Track your usage and costs over time.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-5 rounded-xl bg-white/[0.01] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-200"
            >
              <h3 className="text-white font-semibold text-sm mb-1">
                {item.label}
              </h3>
              <code className="text-blue-400 font-mono text-xs">
                {item.endpoint}
              </code>
              <p className="text-xs text-white/40 mt-2">{item.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Credit balance
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Retrieve your current credit balance and spending metrics at any time.
        </p>
        <EndpointCard
          method="GET"
          path="/api/credits"
          description="Get current credit balance."
        >
          <CodeBlock
            examples={{
              curl: `curl ${BASE_URL}/api/credits \\
  -H "X-Api-Key: YOUR_API_KEY"`,
              js: `const res = await fetch("${BASE_URL}/api/credits", {
  headers: { "X-Api-Key": "YOUR_API_KEY" },
});
const credits = await res.json();
console.log(credits.balance);`,
              python: `res = requests.get(
    f"${BASE_URL}/api/credits",
    headers={"X-Api-Key": "YOUR_API_KEY"},
)
print(res.json())`,
              go: `req, _ := http.NewRequest(
    "GET",
    "${BASE_URL}/api/credits",
    nil,
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")`,
            }}
          />
        </EndpointCard>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Transaction history
        </h3>
        <p className="text-sm text-white/50 mb-4">
          View all credit transactions including purchases, deductions, and
          system adjustments.
        </p>
        <EndpointCard
          method="GET"
          path="/api/transactions"
          description="List all credit transactions."
        >
          <CodeBlock
            language="json"
            code={`{
  "data": [
    {
      "id": "txn_abc123",
      "userId": "usr_def456",
      "amount": 10000,
      "type": "purchase",
      "description": "Credit purchase - 10,000 credits",
      "stripePaymentId": "pi_xxx",
      "createdAt": "2026-05-13T14:30:00Z"
    },
    {
      "id": "txn_def789",
      "userId": "usr_def456",
      "amount": -150,
      "type": "deduction",
      "description": "openai/gpt-4o - 450 in, 820 out",
      "relatedLogId": "log_xyz",
      "createdAt": "2026-05-13T14:35:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}`}
          />
        </EndpointCard>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Budget limits
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Set daily and monthly budget limits to control spending. Once reached,
          further requests are blocked or warned.
        </p>
        <EndpointCard
          method="GET"
          path="/api/credits/budget"
          description="Get daily and monthly budget limits with current spending."
        >
          <CodeBlock
            language="json"
            code={`{
  "dailyBudget": 5000,
  "monthlyBudget": 100000,
  "dailySpent": 1200,
  "monthlySpent": 28000,
  "budgetResetAt": "2026-05-14T00:00:00Z"
}`}
          />
        </EndpointCard>

        <TipBox>
          Credits are deducted per request based on input tokens, output tokens,
          and the model&apos;s per-token cost rate. Use the{" "}
          <code className="text-blue-400 font-mono text-xs">/api/logs</code>{" "}
          endpoint to view detailed cost breakdowns for each request.
        </TipBox>
      </Section>
    </motion.div>
  );
}
