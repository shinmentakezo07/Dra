"use client";

import { motion } from "framer-motion";
import { BarChart3, CheckCircle } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function DashboardPage() {
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
        id="dashboard"
        icon={BarChart3}
        title="Dashboard"
       
      >
        <p>
          The dashboard provides real-time visibility into your API usage,
          credit balance, and request history. All data is served through the
          API — integrate the same endpoints into your own monitoring tools.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">Key features</h3>
        <ul className="space-y-3 mb-8">
          {[
            "Real-time usage analytics with charts and metrics",
            "API key management — create, revoke, and monitor keys",
            "Request log viewer with filtering and search",
            "Credit balance and transaction history",
            "Model performance and latency monitoring",
          ].map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-white/30"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400/70 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h3 className="text-lg font-bold text-white mb-4">Usage analytics</h3>
        <p className="text-sm text-white/50 mb-4">
          Retrieve usage metrics including total requests, token counts, and
          costs over custom time ranges.
        </p>
        <EndpointCard
          method="GET"
          path="/api/analytics"
          description="Get usage analytics: requests, tokens, costs over time."
        >
          <CodeBlock
            examples={{
              curl: `curl ${BASE_URL}/api/analytics?period=7d \\
  -H "X-Api-Key: YOUR_API_KEY"`,
              js: `const res = await fetch(
  "${BASE_URL}/api/analytics?period=30d",
  { headers: { "X-Api-Key": "YOUR_API_KEY" } }
);
const analytics = await res.json();
console.log(analytics);`,
              python: `res = requests.get(
    f"{BASE_URL}/api/analytics",
    params={"period": "7d"},
    headers=HEADERS,
)
print(res.json())`,
              go: `req, _ := http.NewRequest(
    "GET",
    "${BASE_URL}/api/analytics?period=7d",
    nil,
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")`,
            }}
          />
        </EndpointCard>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Credit balance
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Check your current credit balance, daily spending, and budget limits
          at any time.
        </p>
        <EndpointCard
          method="GET"
          path="/api/credits"
          description="Get current credit balance and spending."
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
    f"{BASE_URL}/api/credits",
    headers=HEADERS,
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

        <div className="mt-6">
          <h4 className="text-white font-semibold text-sm mb-3">
            Credit response
          </h4>
          <CodeBlock
            language="json"
            code={`{
  "balance": 15000,
  "totalPurchased": 50000,
  "totalSpent": 35000,
  "monthlyBudget": 100000,
  "dailyBudget": 5000,
  "dailySpent": 1200,
  "monthlySpent": 28000
}`}
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Request logs
        </h3>
        <p className="text-sm text-white/50 mb-4">
          View paginated request history with filtering by model, status, date
          range, and more.
        </p>
        <EndpointCard
          method="GET"
          path="/api/logs"
          description="Paginated request logs with model, status, tokens."
        >
          <CodeBlock
            examples={{
              curl: `curl "${BASE_URL}/api/logs?page=1&limit=20" \\
  -H "X-Api-Key: YOUR_API_KEY"`,
              js: `const res = await fetch(
  "${BASE_URL}/api/logs?page=1&limit=50&model=openai/gpt-4o",
  { headers: { "X-Api-Key": "YOUR_API_KEY" } }
);
const logs = await res.json();
console.log(logs.data, logs.meta);`,
              python: `res = requests.get(
    f"{BASE_URL}/api/logs",
    params={"page": 1, "limit": 20},
    headers=HEADERS,
)
print(res.json())`,
              go: `req, _ := http.NewRequest(
    "GET",
    "${BASE_URL}/api/logs?page=1&limit=20",
    nil,
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")`,
            }}
          />
        </EndpointCard>

        <TipBox>
          The dashboard data refreshes automatically. Analytics data is
          available for the last 90 days. Use pagination parameters (
          <code className="text-blue-400 font-mono text-xs">page</code>,{" "}
          <code className="text-blue-400 font-mono text-xs">limit</code>) when
          fetching logs and transaction history.
        </TipBox>
      </Section>
    </motion.div>
  );
}
