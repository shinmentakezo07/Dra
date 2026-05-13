"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { EndpointCard } from "@/components/docs/EndpointCard";

export default function PromptsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="prompts" icon={FileText} title="Prompt Templates">
        <p>
          Save and reuse prompt templates with variable interpolation. Templates use <code className="text-white/60">{`{{variable}}`}</code> syntax for dynamic content. Create, list, update, and delete templates through dedicated endpoints.
        </p>

        <h4 className="text-white font-semibold mt-6">Available endpoints</h4>
        <div className="space-y-2 mt-3">
          <EndpointCard method="POST" path="/api/prompts" description="Create a new prompt template with name, content, and optional variables." />
          <EndpointCard method="GET" path="/api/prompts" description="List all saved prompt templates for the current user." />
          <EndpointCard method="PUT" path="/api/prompts/{id}" description="Update an existing prompt template." />
          <EndpointCard method="DELETE" path="/api/prompts/{id}" description="Delete a prompt template." />
        </div>
      </Section>
    </motion.div>
  );
}
