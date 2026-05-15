"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Book, Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, Search, Menu, Users, Webhook, X,
} from "lucide-react";
import { ScrollProgress } from "@/components/docs/ScrollProgress";
import { SearchModal } from "@/components/docs/SearchModal";
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

const SIDEBAR_WIDTH = "w-72";

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

  const renderSidebarContent = (mobile = false) => (
    <>
      {mobile && (
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">Sections</h3>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={`p-3 space-y-4 ${mobile ? "" : "pt-4"}`}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-[10px] uppercase tracking-widest text-white/20 font-mono px-3 pb-1">{group.label}</h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = currentSectionId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-left transition-all duration-200 ${
                      isActive
                        ? "text-blue-400 font-medium bg-blue-500/[0.04]"
                        : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
                    }`}
                  >
                    {isActive && !mobile && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-400" : "text-white/15"}`} />
                    <span className="truncate">{item.label}</span>
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
    <div className="min-h-screen bg-[#050505] text-foreground relative">
      <ScrollProgress />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute top-[-10%] left-1/4 w-[800px] h-[800px] bg-blue-500/[0.04] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-1/4 w-[700px] h-[700px] bg-violet-500/[0.03] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "10s", animationDelay: "2s" }} />
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} items={allNavItems} onNavigate={navigateTo} />

      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="w-12 h-12 rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
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
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#0a0a0a] border-l border-white/[0.06] lg:hidden overflow-y-auto"
          >
            {renderSidebarContent(true)}
          </motion.aside>
        )}
      </AnimatePresence>

      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 ${SIDEBAR_WIDTH} border-r border-white/[0.04] bg-[#050505]/90 backdrop-blur-sm z-30`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.04]">
          <div className="w-7 h-7 rounded-lg bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15]">
            <Book className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white/70">Yapapa API</span>
            <span className="text-[10px] text-white/20 ml-1.5 font-mono">docs</span>
          </div>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              placeholder="Filter..."
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-xs text-white/50 placeholder:text-white/15 font-mono outline-none focus:border-blue-500/20 focus:bg-blue-500/[0.02] transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {filteredNavGroups.length > 0 ? (
            filteredNavGroups.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="text-[10px] uppercase tracking-widest text-white/15 font-mono px-3 pt-3 pb-1">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentSectionId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left transition-all duration-150 ${
                          isActive
                            ? "text-blue-400 font-medium bg-blue-500/[0.04]"
                            : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1 bottom-1 w-px bg-blue-400 rounded-full"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <item.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-blue-400" : "text-white/15"}`} />
                        <span className="truncate text-[13px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-white/15 text-center py-8 font-mono">No matching sections</div>
          )}
        </nav>
      </aside>

      <div className={`lg:ml-72 relative z-10`}>
        <header className="sticky top-0 z-20 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/30">Docs</span>
              <span className="text-white/10">/</span>
              <span className="text-sm text-white/60 font-medium">
                {allNavItems.find(i => i.id === currentSectionId)?.label || "Overview"}
              </span>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/30 hover:text-white/50 hover:bg-white/[0.05] transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-white/15">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
