"use client";

import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function FilesPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="files" icon={UploadCloud} title="File Upload" accent="amber">
        <p>Upload images for vision/multimodal model support. Files are validated, typed, and returned as base64 data URIs.</p>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 hover:border-white/[0.1] transition-colors">
          <EndpointCard method="POST" path="/api/files/upload" description="Upload image files for vision/multimodal models.">
            <p className="text-sm text-muted-foreground mb-4">
              Multipart upload. Max file size: 10MB. Supported formats: PNG, JPEG, WebP, GIF.
            </p>
            <CodeBlock
              code={`curl ${BASE_URL}/api/files/upload \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -F "files=@image.png" \\
  -F "files=@photo.jpg"`}
            />
          </EndpointCard>
        </div>
      </Section>
    </motion.div>
  );
}
