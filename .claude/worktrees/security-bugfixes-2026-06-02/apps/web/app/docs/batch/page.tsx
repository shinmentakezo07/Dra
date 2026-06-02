"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function BatchPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="batch" icon={Layers} title="Batch API" accent="amber">
        <p>
          Process multiple chat requests in a single batch request. The Batch
          API reduces overhead when you need to process multiple independent
          requests. Each item in the batch is processed independently — failures
          in one item do not affect others.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Creating a batch
        </h3>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="POST"
            path="/api/batch"
            description="Submit a batch of chat requests. Each item specifies its own model and messages."
          >
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/batch \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "items": [
      {
        "model": "openai/gpt-4o",
        "messages": [
          {"role": "user", "content": "Summarize: AI is transforming..."}
        ]
      },
      {
        "model": "anthropic/claude-sonnet-4",
        "messages": [
          {"role": "user", "content": "Translate to French: Hello world"}
        ]
      }
    ]
  }'`,
                js: `const res = await fetch("${BASE_URL}/api/batch", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    items: [
      {
        model: "openai/gpt-4o",
        messages: [
          { role: "user", content: "Summarize: AI is transforming..." },
        ],
      },
      {
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "user", content: "Translate to French: Hello world" },
        ],
      },
    ],
  }),
});
const batch = await res.json();
console.log(batch.batchId);`,
                python: `res = requests.post(
    f"${BASE_URL}/api/batch",
    headers=HEADERS,
    json={
        "items": [
            {
                "model": "openai/gpt-4o",
                "messages": [
                    {"role": "user", "content": "Summarize: AI is transforming..."}
                ],
            },
            {
                "model": "anthropic/claude-sonnet-4",
                "messages": [
                    {"role": "user", "content": "Translate to French: Hello world"}
                ],
            },
        ],
    },
)
print(res.json())`,
                go: `type batchItem struct {
    Model    string
    Messages []map[string]string
}

body, _ := json.Marshal(map[string]any{
    "items": []batchItem{
        {"openai/gpt-4o", []map[string]string{{"role": "user", "content": "Hello"}}},
        {"anthropic/claude-sonnet-4", []map[string]string{{"role": "user", "content": "Bonjour"}}},
    },
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/batch",
    bytes.NewReader(body),
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", "application/json")`,
              }}
            />
          </EndpointCard>
        </div>

        <div className="mt-8">
          <h3 className="text-white font-semibold text-sm mb-3">
            Batch response
          </h3>
          <CodeBlock
            language="json"
            code={`{
  "batchId": "batch_xyz789",
  "status": "processing",
  "total": 2,
  "completed": 0,
  "failed": 0,
  "createdAt": "2026-05-13T14:30:00Z"
}`}
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Checking batch status
        </h3>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="GET"
            path="/api/batch/{id}"
            description="Check batch job status and retrieve results. Poll this endpoint until status is 'completed'."
          >
            <CodeBlock
              examples={{
                curl: `curl ${BASE_URL}/api/batch/batch_xyz789 \\
  -H "X-Api-Key: YOUR_API_KEY"`,
                js: `async function pollBatch(id) {
  while (true) {
    const res = await fetch(
      \`${BASE_URL}/api/batch/\${id}\`,
      { headers: { "X-Api-Key": "YOUR_API_KEY" } }
    );
    const batch = await res.json();
    if (batch.status === "completed") return batch;
    await new Promise(r => setTimeout(r, 2000));
  }
}

const results = await pollBatch("batch_xyz789");
console.log(results.items);`,
                python: `import time

def poll_batch(batch_id):
    while True:
        res = requests.get(
            f"{BASE_URL}/api/batch/{batch_id}",
            headers=HEADERS,
        )
        batch = res.json()
        if batch["status"] == "completed":
            return batch
        time.sleep(2)`,
                go: `for {
    resp, _ := http.Get(
        "${BASE_URL}/api/batch/batch_xyz789",
    )
    var batch map[string]any
    json.NewDecoder(resp.Body).Decode(&batch)
    resp.Body.Close()

    if batch["status"] == "completed" {
        break
    }
    time.Sleep(2 * time.Second)
}`,
              }}
            />
          </EndpointCard>
        </div>

        <TipBox>
          Batch processing is asynchronous. Use the batch ID returned from the
          create call to poll for completion. Items within a batch are
          independent — partial results are returned as they complete. Maximum
          batch size is 50 items per request.
        </TipBox>
      </Section>
    </motion.div>
  );
}
