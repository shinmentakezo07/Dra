"use client";

import { motion } from "framer-motion";
import { Boxes } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function ConversationsPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="conversations" icon={Boxes} title="Conversations">
        <p>
          Create and manage multi-turn conversations. Each conversation stores message history and can be resumed later. The conversation API manages message threading automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h4 className="text-white font-semibold text-sm mb-2">Create</h4>
            <p className="text-xs text-muted-foreground">POST /api/conversations</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h4 className="text-white font-semibold text-sm mb-2">List</h4>
            <p className="text-xs text-muted-foreground">GET /api/conversations</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h4 className="text-white font-semibold text-sm mb-2">Send Message</h4>
            <p className="text-xs text-muted-foreground">POST /api/conversations/{`{id}`}/messages</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h4 className="text-white font-semibold text-sm mb-2">Delete</h4>
            <p className="text-xs text-muted-foreground">DELETE /api/conversations/{`{id}`}</p>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}
