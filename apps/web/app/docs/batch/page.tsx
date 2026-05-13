"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function BatchPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="batch" icon={Layers} title="Batch API">
        <p>
          Process multiple chat requests in a single batch request. Batch API reduces overhead when you need to process multiple independent requests. Each item in the batch is processed independently.
        </p>

        <div className="mt-6">
          <CodeBlock
            language="json"
            code={`{
  "items": [
    {
      "model": "openai/gpt-4o",
      "messages": [{"role": "user", "content": "Summarize this article"}]
    },
    {
      "model": "anthropic/claude-3-opus",
      "messages": [{"role": "user", "content": "Translate to French"}]
    }
  ]
}`}
          />
        </div>
      </Section>
    </motion.div>
  );
}
