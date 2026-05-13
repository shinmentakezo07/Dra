"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Book, Zap, Key, Code2, MessageSquare, Database, Boxes, FileText,
  Layers, UploadCloud, Shield, AlertTriangle, Cpu, TrendingUp,
  BarChart3, Lock, Terminal, Search, Menu, X,
} from "lucide-react";
import { ScrollProgress } from "@/components/docs/ScrollProgress";
import { SearchModal } from "@/components/docs/SearchModal";
import type { NavItem } from "@/components/docs/types";

const navItems: NavItem[] = [
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "api-reference", label: "API Reference", icon: Code2 },
  { id: "chat", label: "Chat & Streaming", icon: MessageSquare },
  { id: "embeddings", label: "Embeddings", icon: Database },
  { id: "conversations", label: "Conversations", icon: Boxes },
  { id: "prompts", label: "Prompt Templates", icon: FileText },
  { id: "batch", label: "Batch API", icon: Layers },
  { id: "files", label: "File Upload", icon: UploadCloud },
  { id: "rate-limits", label: "Rate Limits", icon: Shield },
  { id: "error-handling", label: "Error Handling", icon: AlertTriangle },
  { id: "models", label: "Available Models", icon: Cpu },
  { id: "pricing", label: "Pricing & Credits", icon: TrendingUp },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "security", label: "Security", icon: Lock },
  { id: "examples", label: "Code Examples", icon: Terminal },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSectionId = pathname.replace("/docs/", "").replace("/", "") || "index";

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

  return (
    <div className="min-h-screen bg-[#000000] text-foreground relative">
      <ScrollProgress />

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/4 w-[800px] h-[800px] bg-blue-500/[0.04] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-1/4 w-[700px] h-[700px] bg-violet-500/[0.03] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "10s", animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[150px] animate-pulse-slow" style={{ animationDuration: "12s", animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.03)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]" />
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} items={navItems} onNavigate={navigateTo} />

      {/* Mobile sidebar toggle */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-12 h-12 rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile sidebar backdrop */}
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

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#0a0a0a] border-l border-white/[0.06] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">Sections</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                    currentSectionId === item.id
                      ? "bg-blue-500/10 text-blue-400 font-medium"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15]">
              <Book className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                  Yapapa API
                </span>
                <span className="text-white/30 mx-2">/</span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400/60 bg-clip-text text-transparent">
                  {navItems.find(i => i.id === currentSectionId)?.label || "Docs"}
                </span>
              </h1>
            </div>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            <span>Search docs...</span>
            <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/20">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 hero-scroll">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.04]" />
                {navItems.map((item) => {
                  const isActive = currentSectionId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`relative flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm w-full text-left transition-all duration-200 group ${
                        isActive
                          ? "text-blue-400 font-medium"
                          : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <item.icon
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-200 ${
                          isActive
                            ? "text-blue-400"
                            : "text-white/15 group-hover:text-white/30"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Page content */}
          <main className="lg:col-span-9 min-h-[60vh]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
