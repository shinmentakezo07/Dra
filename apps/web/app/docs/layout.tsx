"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Book,
  Zap,
  Key,
  Code2,
  MessageSquare,
  Database,
  Boxes,
  FileText,
  Layers,
  UploadCloud,
  Shield,
  AlertTriangle,
  Cpu,
  TrendingUp,
  BarChart3,
  Lock,
  Terminal,
  Search,
  Users,
  Webhook,
  X,
  ChevronRight,
  ArrowUpRight,
  Globe,
} from "lucide-react";
import { ScrollProgress } from "@/components/docs/ScrollProgress";
import { SearchModal } from "@/components/docs/SearchModal";
import { DocsNavbar } from "@/components/docs/DocsNavbar";
import { DocsPageShell } from "@/components/docs/DocsPageShell";
import type { NavItem } from "@/components/docs/types";

/* ── Section color system ── */
const SECTION_COLORS = {
  "Getting Started": {
    accent: "emerald",
    ring: "ring-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/[0.04]",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20",
  },
  "Core Features": {
    accent: "blue",
    ring: "ring-blue-500/20",
    text: "text-blue-400",
    bg: "bg-blue-500/[0.04]",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20",
  },
  Platform: {
    accent: "amber",
    ring: "ring-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/[0.04]",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20",
  },
  Reference: {
    accent: "violet",
    ring: "ring-violet-500/20",
    text: "text-violet-400",
    bg: "bg-violet-500/[0.04]",
    border: "border-violet-500/20",
    gradient: "from-violet-500/20",
  },
} as const;

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { id: "quickstart", label: "Quick Start", icon: Zap },
      { id: "authentication", label: "Authentication", icon: Key },
      { id: "api-reference", label: "API Reference", icon: Code2 },
      { id: "self-hosting", label: "Self-Hosting", icon: Globe },
    ],
  },
  {
    label: "Core Features",
    items: [
      { id: "chat", label: "Chat & Streaming", icon: MessageSquare },
      { id: "embeddings", label: "Embeddings", icon: Database },
      { id: "conversations", label: "Conversations", icon: Boxes },
      { id: "prompts", label: "Prompt Templates", icon: FileText },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "batch", label: "Batch API", icon: Layers },
      { id: "files", label: "File Upload", icon: UploadCloud },
      { id: "webhooks", label: "Webhooks", icon: Webhook },
      { id: "rate-limits", label: "Rate Limits", icon: Shield },
      { id: "error-handling", label: "Error Handling", icon: AlertTriangle },
      { id: "organizations", label: "Organizations", icon: Users },
    ],
  },
  {
    label: "Reference",
    items: [
      { id: "models", label: "Available Models", icon: Cpu },
      { id: "pricing", label: "Pricing & Credits", icon: TrendingUp },
      { id: "dashboard", label: "Dashboard", icon: BarChart3 },
      { id: "security", label: "Security", icon: Lock },
      { id: "examples", label: "Code Examples", icon: Terminal },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

function getSectionColor(
  label: string,
): (typeof SECTION_COLORS)[keyof typeof SECTION_COLORS] {
  for (const [groupName, color] of Object.entries(SECTION_COLORS)) {
    if (
      navGroups
        .find((g) => g.label === groupName)
        ?.items.some((i) => i.label === label)
    ) {
      return color;
    }
  }
  return SECTION_COLORS["Reference"];
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState("");

  const currentSectionId =
    pathname.replace("/docs/", "").replace("/", "") || "index";
  const currentItem = allNavItems.find((i) => i.id === currentSectionId);
  const currentColor = currentItem
    ? getSectionColor(currentItem.label)
    : SECTION_COLORS["Getting Started"];

  const filteredNavGroups = sidebarFilter
    ? navGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) =>
            i.label.toLowerCase().includes(sidebarFilter.toLowerCase()),
          ),
        }))
        .filter((g) => g.items.length > 0)
    : navGroups;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigateTo = useCallback(
    (id: string) => {
      router.push(`/docs/${id}`);
      setSearchOpen(false);
      setSidebarOpen(false);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-[#08080a] text-foreground relative selection:bg-blue-500/20 selection:text-white">
      <ScrollProgress />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={allNavItems}
        onNavigate={navigateTo}
      />

      <DocsNavbar
        onSearchOpen={() => setSearchOpen(true)}
        onMobileMenuClick={() => setSidebarOpen(true)}
        currentSectionLabel={currentItem?.label}
        currentColor={currentColor}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#0c0c0e] border-l border-white/[0.08] lg:hidden overflow-y-auto"
          >
            <SidebarContent
              mobile
              onClose={() => setSidebarOpen(false)}
              navGroups={filteredNavGroups}
              filter={sidebarFilter}
              setFilter={setSidebarFilter}
              currentSectionId={currentSectionId}
              navigateTo={navigateTo}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-[58px] bottom-0 w-[260px] border-r border-white/[0.07] bg-[#08080a] z-20">
        <SidebarContent
          navGroups={filteredNavGroups}
          filter={sidebarFilter}
          setFilter={setSidebarFilter}
          currentSectionId={currentSectionId}
          navigateTo={navigateTo}
          currentColor={currentColor}
        />
      </aside>

      {/* Main content */}
      <div className="lg:ml-[260px] relative z-10">
        <main className="max-w-[800px] mx-auto px-6 sm:px-10 pt-[80px] pb-20">
          <DocsPageShell>{children}</DocsPageShell>
        </main>
      </div>
    </div>
  );
}

/* ── Sidebar content (shared between mobile + desktop) ── */

function SidebarContent({
  mobile,
  onClose,
  navGroups,
  filter,
  setFilter,
  currentSectionId,
  navigateTo,
  currentColor,
}: {
  mobile?: boolean;
  onClose?: () => void;
  navGroups: NavGroup[];
  filter?: string;
  setFilter: (v: string) => void;
  currentSectionId: string;
  navigateTo: (id: string) => void;
  currentColor?: (typeof SECTION_COLORS)[keyof typeof SECTION_COLORS];
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl ${currentColor?.bg || "bg-blue-500/[0.08]"} border ${currentColor?.border || "border-blue-500/[0.12]"} flex items-center justify-center shadow-sm`}
          >
            <Book
              className={`w-4 h-4 ${currentColor?.text || "text-blue-400/70"}`}
            />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-white/75 block leading-tight">
              Documentation
            </span>
            <span className="text-[10px] font-mono text-white/25">v1.0</span>
          </div>
        </div>
        {mobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter documentation pages"
            className={`w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white/60 placeholder:text-white/25 font-mono outline-none focus:border-white/[0.16] focus:bg-white/[0.04] transition-all duration-200`}
          />
        </div>
      </div>

      {/* Nav groups */}
      <nav
        className="flex-1 overflow-y-auto py-3"
        role="navigation"
        aria-label="Documentation navigation"
      >
        {navGroups.length > 0 ? (
          navGroups.map((group) => {
            const groupColor =
              SECTION_COLORS[group.label as keyof typeof SECTION_COLORS];
            return (
              <div key={group.label} className="mb-1">
                <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
                  <span
                    className={`text-[9px] font-mono font-semibold uppercase tracking-[0.18em] ${groupColor.text} opacity-60`}
                  >
                    {group.label}
                  </span>
                  <div
                    className={`h-px flex-1 bg-gradient-to-r ${groupColor.gradient} to-transparent`}
                  />
                </div>
                <div className="space-y-px px-2">
                  {group.items.map((item) => {
                    const isActive = currentSectionId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-3 px-3 py-[10px] rounded-xl text-sm w-full text-left transition-all duration-200 cursor-pointer group ${
                          isActive
                            ? `text-white ${groupColor.bg} border ${groupColor.border}/25`
                            : "text-white/40 hover:text-white/65 hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full ${groupColor.text} opacity-80`}
                            transition={{
                              type: "spring",
                              stiffness: 350,
                              damping: 30,
                            }}
                          />
                        )}
                        <item.icon
                          className={`w-[14px] h-[14px] flex-shrink-0 transition-colors duration-200 ${
                            isActive
                              ? groupColor.text
                              : "text-white/25 group-hover:text-white/45"
                          }`}
                        />
                        <span className="truncate text-[13px] font-medium">
                          {item.label}
                        </span>
                        {isActive && (
                          <ChevronRight
                            className={`w-3 h-3 ${groupColor.text} opacity-40 ml-auto flex-shrink-0`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-white/20 text-center py-10 font-mono">
            No matching pages
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-mono text-white/35 hover:text-white/55 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
        >
          <ArrowUpRight className="w-3 h-3" />
          <span>Report an issue</span>
        </a>
      </div>
    </>
  );
}
