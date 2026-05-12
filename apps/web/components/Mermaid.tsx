"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  fontFamily: "monospace",
});

function sanitizeSvg(svg: string): string {
  let cleaned = svg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/javascript:/gi, "");
  return cleaned;
}

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    const renderChart = async () => {
      if (containerRef.current && chart) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          setSvg(sanitizeSvg(svg));
        } catch (error) {
          console.error("Mermaid rendering failed:", error);
          setSvg(`<div class="text-red-400 text-xs p-2 border border-red-500/20 rounded bg-red-500/10">Failed to render diagram</div>`);
        }
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="my-4 p-4 bg-white/5 rounded-lg border border-white/10 overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
