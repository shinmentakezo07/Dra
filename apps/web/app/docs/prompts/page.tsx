"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function PromptsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="prompts" icon={FileText} title="Prompt Templates">
        <p>
          Save and reuse prompt templates with variable interpolation. Templates
          use{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">{`{{variable}}`}</code>{" "}
          syntax for dynamic content. Create, list, update, and delete templates
          through dedicated endpoints.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Creating a template
        </h3>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="POST"
            path="/api/prompts"
            description="Create a prompt template with name, content, and variable placeholders."
          >
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/prompts \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "name": "translate",
    "content": "Translate the following {{language}} text:\\n\\n{{text}}",
    "variables": ["language", "text"]
  }'`,
                js: `const res = await fetch("${BASE_URL}/api/prompts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    name: "translate",
    content: "Translate the following {{language}} text:\\n\\n{{text}}",
    variables: ["language", "text"],
  }),
});`,
                python: `import requests

res = requests.post(
    f"${BASE_URL}/api/prompts",
    headers=HEADERS,
    json={
        "name": "translate",
        "content": "Translate the following {{language}} text:\\n\\n{{text}}",
        "variables": ["language", "text"],
    },
)`,
                go: `body, _ := json.Marshal(map[string]any{
    "name":      "translate",
    "content":   "Translate the following {{language}} text:\\n\\n{{text}}",
    "variables": []string{"language", "text"},
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/prompts",
    bytes.NewReader(body),
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", "application/json")`,
              }}
            />
          </EndpointCard>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Rendering a template
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Use the render endpoint to substitute variables and get the final
          prompt text. The template engine replaces{" "}
          <code className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/70 font-mono text-xs">{`{{variable}}`}</code>{" "}
          placeholders with the provided values.
        </p>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="POST"
            path="/api/prompts/{name}/render"
            description="Render a template with variable values. Returns the interpolated prompt text ready for use in a chat request."
          >
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/prompts/translate/render \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "variables": {
      "language": "French",
      "text": "Hello, how are you?"
    }
  }'`,
                js: `const res = await fetch(
  "${BASE_URL}/api/prompts/translate/render",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "YOUR_API_KEY",
    },
    body: JSON.stringify({
      variables: {
        language: "French",
        text: "Hello, how are you?",
      },
    }),
  }
);
const rendered = await res.json();
console.log(rendered.content);`,
                python: `res = requests.post(
    f"${BASE_URL}/api/prompts/translate/render",
    headers=HEADERS,
    json={
        "variables": {
            "language": "French",
            "text": "Hello, how are you?",
        },
    },
)
print(res.json()["content"])`,
                go: `body, _ := json.Marshal(map[string]any{
    "variables": map[string]string{
        "language": "French",
        "text":     "Hello, how are you?",
    },
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/prompts/translate/render",
    bytes.NewReader(body),
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", "application/json")`,
              }}
            />
          </EndpointCard>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Managing templates
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/api/prompts"
            description="List all saved prompt templates for the current user. Returns name, content, variables, and timestamps."
          />
          <EndpointCard
            method="GET"
            path="/api/prompts/{name}"
            description="Get a specific prompt template by name including its content and variable definitions."
          />
          <EndpointCard
            method="PUT"
            path="/api/prompts/{id}"
            description="Update an existing prompt template's content or variables. Supports partial updates."
          />
          <EndpointCard
            method="DELETE"
            path="/api/prompts/{name}"
            description="Delete a prompt template by name. This action is permanent."
          />
        </div>

        <TipBox>
          Templates use Go-style{" "}
          <code className="text-blue-400 font-mono text-xs">{`{{variable}}`}</code>{" "}
          syntax. Variable names must match exactly between the template content
          and the render request. When rendering, all variables defined in the
          template must be provided.
        </TipBox>
      </Section>
    </motion.div>
  );
}
