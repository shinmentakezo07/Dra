"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Book, Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, Search, Menu, Users, Webhook, X,
  ChevronRight, ArrowUpRight, Globe,
} from "lucide-react";
import { ScrollProgress } from "@/components/docs/ScrollProgress";
import { SearchModal } from "@/components/docs/SearchModal";
import { DocsNavbar } from "@/components/docs/DocsNavbar";
import type { NavItem } from "@/components/docs/types";

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

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState("");

  const currentSectionId = pathname.replace("/docs/", "").replace("/", "") || "index";

  const filteredNavGroups = sidebarFilter
    ? navGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) =>
            i.label.toLowerCase().includes(sidebarFilter.toLowerCase())
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

  const navigateTo = useCallback((id: string) => {
    router.push(`/docs/${id}`);
    setSearchOpen(false);
    setSidebarOpen(false);
  }, [router]);

  const currentItem = allNavItems.find(i => i.id === currentSectionId);

  const renderSidebarContent = (mobile = false) => (
    <>
      {mobile && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono text-white/40 uppercase tracking-[0.2em]">Navigation</span>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={`px-3 space-y-5 ${mobile ? "" : "pt-5"}`}>
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 px-3 pb-2">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">{group.label}</span>
              {groupIdx === 0 && (
                <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
              )}
            </div>
            <div className="space-y-px">
              {group.items.map((item) => {
                const isActive = currentSectionId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm w-full text-left transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? "text-white bg-white/[0.06]"
                        : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-500/80"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon className={`w-[14px] h-[14px] flex-shrink-0 transition-colors duration-200 ${isActive ? "text-blue-400/70" : "text-white/15 group-hover:text-white/30"}`} />
                    <span className="truncate text-[13px] font-medium">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3 h-3 text-white/20 ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#08080a] text-foreground relative">
      <ScrollProgress />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} items={allNavItems} onNavigate={navigateTo} />

      <DocsNavbar
        onSearchOpen={() => setSearchOpen(true)}
        onMobileMenuClick={() => setSidebarOpen(true)}
        currentSectionLabel={currentItem?.label}
      />

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

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#0c0c0e] border-l border-white/[0.06] lg:hidden overflow-y-auto"
          >
            {renderSidebarContent(true)}
          </motion.aside>
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex flex-col fixed left-0 top-[64px] bottom-0 w-[260px] border-r border-white/[0.05] bg-[#08080a] z-20">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center">
            <Book className="w-3.5 h-3.5 text-blue-400/70" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-white/70 block leading-tight">Documentation</span>
            <span className="text-[10px] font-mono text-white/20">v1.0</span>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              placeholder="Filter pages..."
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
              aria-label="Filter documentation pages"
              className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg pl-9 pr-3 py-2 text-xs text-white/50 placeholder:text-white/15 font-mono outline-none focus:border-blue-500/20 focus:bg-white/[0.04] transition-all duration-200"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" role="navigation" aria-label="Documentation navigation">
          {filteredNavGroups.length > 0 ? (
            filteredNavGroups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className="text-[10px] font-mono text-white/15 uppercase tracking-[0.2em]">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-white/[0.04]" />
                </div>
                <div className="space-y-px px-2">
                  {group.items.map((item) => {
                    const isActive = currentSectionId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm w-full text-left transition-all duration-200 cursor-pointer group ${
                          isActive
                            ? "text-white bg-white/[0.06]"
                            : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-500/80"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <item.icon className={`w-[14px] h-[14px] flex-shrink-0 transition-colors duration-200 ${isActive ? "text-blue-400/70" : "text-white/15 group-hover:text-white/30"}`} />
                        <span className="truncate text-[13px] font-medium">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-white/20 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-white/15 text-center py-10 font-mono">No matching pages</div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.05]">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono text-white/20 hover:text-white/40 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer"
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>Report an issue</span>
          </a>
        </div>
      </aside>

      <div className="lg:ml-[260px] relative z-10">
        <main className="max-w-[720px] mx-auto px-5 sm:px-8 pt-[72px] pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
