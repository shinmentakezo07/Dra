"use client";

import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { EndpointCard } from "@/components/docs/EndpointCard";
import { TipBox } from "@/components/docs/TipBox";

import { getDocsBaseUrl } from "@/lib/docs-config";

const BASE_URL = getDocsBaseUrl();

export default function FilesPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <Section id="files" icon={UploadCloud} title="File Upload" accent="amber">
        <p>
          Upload images for vision and multimodal model support. Files are
          validated, typed, and returned as base64 data URIs that can be passed
          directly to chat endpoints.
        </p>

        <h3 className="text-lg font-bold text-white mb-4 mt-8">
          Uploading files
        </h3>

        <div className="p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A] mb-6 hover:border-white/[0.1] transition-colors">
          <EndpointCard
            method="POST"
            path="/api/files/upload"
            description="Upload image files for vision/multimodal models."
          >
            <p className="text-sm text-white/50 mb-4">
              Multipart upload. Max file size: 10MB. Supported formats: PNG,
              JPEG, WebP, GIF.
            </p>
            <CodeBlock
              examples={{
                curl: `curl -X POST ${BASE_URL}/api/files/upload \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -F "files=@image.png" \\
  -F "files=@photo.jpg"`,
                js: `const formData = new FormData();
formData.append("files", fileInput.files[0]);
formData.append("files", fileInput.files[1]);

const res = await fetch("${BASE_URL}/api/files/upload", {
  method: "POST",
  headers: { "X-Api-Key": "YOUR_API_KEY" },
  body: formData,
});
const files = await res.json();
console.log(files);`,
                python: `import requests

res = requests.post(
    "${BASE_URL}/api/files/upload",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    files=[
        ("files", ("image.png", open("image.png", "rb"))),
        ("files", ("photo.jpg", open("photo.jpg", "rb"))),
    ],
)
print(res.json())`,
                go: `var buf bytes.Buffer
w := multipart.NewWriter(&buf)

for _, filename := range []string{"image.png", "photo.jpg"} {
    fw, _ := w.CreateFormFile("files", filename)
    f, _ := os.Open(filename)
    io.Copy(fw, f)
    f.Close()
}
w.Close()

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/files/upload",
    &buf,
)
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
req.Header.Set("Content-Type", w.FormDataContentType())`,
              }}
            />
          </EndpointCard>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Response format
        </h3>
        <CodeBlock
          language="json"
          code={`{
  "files": [
    {
      "id": "file_abc123",
      "filename": "image.png",
      "mimeType": "image/png",
      "size": 245760,
      "dataUri": "data:image/png;base64,iVBORw0KGgo...",
      "createdAt": "2026-05-13T14:30:00Z"
    }
  ]
}`}
        />

        <h3 className="text-lg font-bold text-white mb-4 mt-10">
          Managing files
        </h3>
        <div className="space-y-2">
          <EndpointCard
            method="GET"
            path="/api/files"
            description="List all uploaded files for the current user. Returns file metadata including type, size, and creation date."
          />
        </div>

        <TipBox>
          Uploaded file data URIs can be used directly in chat messages for
          vision-capable models. Max 10MB per file, 5 files per upload.
          Supported MIME types:{" "}
          <code className="text-blue-400 font-mono text-xs">image/png</code>,{" "}
          <code className="text-blue-400 font-mono text-xs">image/jpeg</code>,{" "}
          <code className="text-blue-400 font-mono text-xs">image/webp</code>,{" "}
          <code className="text-blue-400 font-mono text-xs">image/gif</code>.
        </TipBox>
      </Section>
    </motion.div>
  );
}
