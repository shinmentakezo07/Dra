"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavItem } from "@/components/docs/types";

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Getting Started",
    items: [
      { id: "quickstart", label: "Quick Start", icon: undefined as never },
      {
        id: "authentication",
        label: "Authentication",
        icon: undefined as never,
      },
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
      {
        id: "error-handling",
        label: "Error Handling",
        icon: undefined as never,
      },
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
  const next =
    currentIndex < ALL_ITEMS.length - 1 ? ALL_ITEMS[currentIndex + 1] : null;

  return (
    <nav
      aria-label="Documentation page navigation"
      className="mt-20 pt-10 border-t border-white/[0.08]"
    >
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex-1 min-w-0">
          {prev && (
            <Link
              href={`/docs/${prev.id}`}
              className="group block text-left h-full"
            >
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em] block mb-2.5">
                Previous
              </span>
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/10 transition-all duration-200 h-full">
                <ChevronLeft className="w-4 h-4 text-white/30 group-hover:text-emerald-400/60 group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
                <span className="text-sm text-white/60 group-hover:text-white/85 transition-colors truncate font-medium">
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
              className="group block text-right h-full"
            >
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em] block mb-2.5">
                Next
              </span>
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/10 transition-all duration-200 h-full">
                <span className="text-sm text-white/60 group-hover:text-white/85 transition-colors truncate font-medium">
                  {next.label}
                </span>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-emerald-400/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
