"use client";

import { motion } from "framer-motion";
import { Boxes } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function ConversationsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="conversations" icon={Boxes} title="Conversations">
        <p>
          Create and manage multi-turn conversations. Each conversation stores
          message history and can be resumed later. The conversation API manages
          message threading automatically — subsequent messages are appended to
          the history so the model retains context.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Creating a conversation
        </h3>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="POST"
            path="/api/conversations"
            description="Create a new conversation thread. Returns the conversation ID for subsequent messages."
          >
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/conversations \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "title": "My Conversation",
    "model": "openai/gpt-4o"
  }'`,
                js: `const res = await fetch("${BASE_URL}/api/conversations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    title: "My Conversation",
    model: "openai/gpt-4o",
  }),
});
const conversation = await res.json();
console.log(conversation.id);`,
                python: `import requests

res = requests.post(
    f"${BASE_URL}/api/conversations",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "YOUR_API_KEY",
    },
    json={
        "title": "My Conversation",
        "model": "openai/gpt-4o",
    },
)
conversation = res.json()
print(conversation["id"])`,
                go: `body, _ := json.Marshal(map[string]any{
    "title": "My Conversation",
    "model": "openai/gpt-4o",
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/conversations",
    bytes.NewReader(body),
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", "application/json")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()`,
              }}
            />
          </EndpointCard>
        </div>

        <div className="mt-8">
          <h3 className="text-white font-semibold text-sm mb-3">Response</h3>
          <CodeBlock
            language="json"
            code={`{
  "id": "conv_abc123",
  "title": "My Conversation",
  "model": "openai/gpt-4o",
  "userId": "usr_def456",
  "createdAt": "2026-05-13T10:00:00Z",
  "messageCount": 0
}`}
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Sending messages
        </h3>
        <div className="space-y-2 mb-6">
          <EndpointCard
            method="POST"
            path="/api/conversations/{id}/messages"
            description="Add a message to a conversation and get the AI response. The full message history is sent to the model for context-aware replies."
          >
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/conversations/conv_abc123/messages \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "content": "What is the capital of France?"
  }'`,
                js: `const res = await fetch(
  "${BASE_URL}/api/conversations/conv_abc123/messages",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "YOUR_API_KEY",
    },
    body: JSON.stringify({
      content: "What is the capital of France?",
    }),
  }
);
const reply = await res.json();
console.log(reply.response);`,
                python: `res = requests.post(
    f"${BASE_URL}/api/conversations/conv_abc123/messages",
    headers=HEADERS,
    json={"content": "What is the capital of France?"},
)
print(res.json()["response"])`,
                go: `body, _ := json.Marshal(map[string]string{
    "content": "What is the capital of France?",
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/conversations/conv_abc123/messages",
    bytes.NewReader(body),
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", "application/json")`,
              }}
            />
          </EndpointCard>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Managing conversations
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/api/conversations"
            description="List all recent conversations. Returns summary with message count and last activity timestamp."
          />
          <EndpointCard
            method="GET"
            path="/api/conversations/{id}"
            description="Get the full conversation history including all messages. Returns ordered message array with roles and timestamps."
          />
          <EndpointCard
            method="DELETE"
            path="/api/conversations/{id}"
            description="Delete a conversation and all its messages. This action is permanent and cannot be undone."
          />
        </div>

        <TipBox>
          Conversations maintain full message history. Be mindful of context
          length limits — very long conversations may exceed the model's maximum
          context window. The message count is returned in the conversation
          object for monitoring.
        </TipBox>
      </Section>
    </motion.div>
  );
}
