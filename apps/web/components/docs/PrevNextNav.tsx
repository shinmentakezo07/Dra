"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { NavItem } from "@/components/docs/types";
import { cn } from "@/lib/utils";

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

  const Card = ({
    href,
    label,
    direction,
  }: {
    href: string;
    label: string;
    direction: "prev" | "next";
  }) => (
    <Link
      href={href}
      className={cn(
        "group relative block h-full flex-1 min-w-0",
        "p-5 rounded-2xl",
        "border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        "hover:border-indigo-500/25 hover:from-indigo-500/[0.04]",
        "hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "transition-all duration-300",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 mb-2.5",
          direction === "next" && "flex-row-reverse",
        )}
      >
        {direction === "prev" ? (
          <ChevronLeft className="w-3 h-3 text-white/30 group-hover:text-indigo-200 group-hover:-translate-x-0.5 transition-all" />
        ) : (
          <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all" />
        )}
        <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-white/30 group-hover:text-indigo-200/70 transition-colors">
          {direction === "prev" ? "Previous" : "Next"}
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-3",
          direction === "next" && "flex-row-reverse",
        )}
      >
        <p className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">
          {label}
        </p>
        <ArrowRight
          className={cn(
            "w-3.5 h-3.5 text-white/15 group-hover:text-indigo-200 transition-all flex-shrink-0",
            direction === "prev"
              ? "group-hover:-translate-x-1"
              : "group-hover:translate-x-1 rotate-180",
          )}
        />
      </div>
    </Link>
  );

  return (
    <nav
      aria-label="Documentation page navigation"
      className="mt-20 pt-10 border-t border-white/[0.06]"
    >
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex-1 min-w-0 flex">
          {prev ? <Card href={`/docs/${prev.id}`} label={prev.label} direction="prev" /> : <div className="flex-1" />}
        </div>
        <div className="flex-1 min-w-0 flex justify-end">
          {next ? <Card href={`/docs/${next.id}`} label={next.label} direction="next" /> : <div className="flex-1" />}
        </div>
      </div>
    </nav>
  );
}
