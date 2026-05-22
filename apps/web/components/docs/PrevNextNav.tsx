"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavItem } from "@/components/docs/types";

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Getting Started",
    items: [
      { id: "quickstart", label: "Quick Start", icon: undefined as never },
      { id: "authentication", label: "Authentication", icon: undefined as never },
      { id: "api-reference", label: "API Reference", icon: undefined as never },
      { id: "self-hosting", label: "Self-Hosting", icon: undefined as never },
    ],
  },
  {
    label: "Core Features",
    items: [
      { id: "chat", label: "Chat & Streaming", icon: undefined as never },
      { id: "embeddings", label: "Embeddings", icon: undefined as never },
      { id: "conversations", label: "Conversations", icon: undefined as never },
      { id: "prompts", label: "Prompt Templates", icon: undefined as never },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "batch", label: "Batch API", icon: undefined as never },
      { id: "files", label: "File Upload", icon: undefined as never },
      { id: "webhooks", label: "Webhooks", icon: undefined as never },
      { id: "rate-limits", label: "Rate Limits", icon: undefined as never },
      { id: "error-handling", label: "Error Handling", icon: undefined as never },
      { id: "organizations", label: "Organizations", icon: undefined as never },
    ],
  },
  {
    label: "Reference",
    items: [
      { id: "models", label: "Available Models", icon: undefined as never },
      { id: "pricing", label: "Pricing & Credits", icon: undefined as never },
      { id: "dashboard", label: "Dashboard", icon: undefined as never },
      { id: "security", label: "Security", icon: undefined as never },
      { id: "examples", label: "Code Examples", icon: undefined as never },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function PrevNextNav({ currentId }: { currentId: string }) {
  const currentIndex = ALL_ITEMS.findIndex((i) => i.id === currentId);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? ALL_ITEMS[currentIndex - 1] : null;
  const next = currentIndex < ALL_ITEMS.length - 1 ? ALL_ITEMS[currentIndex + 1] : null;

  return (
    <nav
      aria-label="Documentation page navigation"
      className="mt-20 pt-10 border-t border-white/[0.05]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {prev && (
            <Link
              href={`/docs/${prev.id}`}
              className="group block text-left"
            >
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider block mb-2">
                Previous
              </span>
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200">
                <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors truncate">
                  {prev.label}
                </span>
              </div>
            </Link>
          )}
        </div>
        <div className="flex-1 min-w-0 flex justify-end">
          {next && (
            <Link
              href={`/docs/${next.id}`}
              className="group block text-right"
            >
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider block mb-2">
                Next
              </span>
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200">
                <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors truncate">
                  {next.label}
                </span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
