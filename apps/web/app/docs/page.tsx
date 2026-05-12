"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Book, Code2, Zap, Key, Database, Shield, TrendingUp,
  Terminal, Globe, CheckCircle, ArrowRight, Copy, ExternalLink,
  Layers, Settings, BarChart3, Lock, Sparkles, AlertTriangle,
  Activity, Webhook, Search, MessageSquare, FileText, Cpu,
  Boxes, UploadCloud, ChevronRight, X, Lightbulb, Eye,
  ChevronDown, ChevronLeft, Menu
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 }
  }
};

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" as const } }
};

const BASE_URL = "http://localhost:8080";

/* ------------------------------------------------------------------ */
/*  Syntax Highlighting Helper                                         */
/* ------------------------------------------------------------------ */

function highlightJson(code: string): JSX.Element {
  // Basic JSON/keyword highlighting via regex
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+\.?\d*\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      // key
      parts.push(<span key={key++} className="text-sky-300">{match[1]}</span>);
      parts.push(<span key={key++}>:</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-purple-300">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function highlightBash(code: string): JSX.Element {
  // Basic bash highlighting
  const parts: JSX.Element[] = [];
  const regex = /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go)(?=\s|$)|("(?:[^"\\]|\\.)*")|(-[a-zA-Z]|--[a-zA-Z-]+)|((?:https?:\/\/|localhost)\S*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<span key={key++} className="text-green-300 font-semibold">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-blue-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-cyan-300 underline underline-offset-2 decoration-white/10">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function highlightPython(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None)\b)|(#.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function highlightGo(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|any)\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function highlightJS(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function getHighlighted(code: string, lang: string): JSX.Element | string {
  if (lang === "json" || lang === "bash" || lang === "curl") {
    if (lang === "bash") return highlightBash(code);
    if (lang === "curl") return highlightBash(code);
    return highlightJson(code);
  }
  if (lang === "javascript" || lang === "js") return highlightJS(code);
  if (lang === "python") return highlightPython(code);
  if (lang === "go") return highlightGo(code);
  return code;
}

/* ------------------------------------------------------------------ */
/*  Code Block with Language Tabs + Line Numbers                       */
/* ------------------------------------------------------------------ */

type Lang = "curl" | "js" | "python" | "go";

interface CodeExample {
  curl: string;
  js: string;
  python: string;
  go: string;
}

const CodeBlock = ({
  code,
  language = "bash",
  examples,
  title,
}: {
  code?: string;
  language?: string;
  examples?: CodeExample;
  title?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>("curl");

  const displayCode =
    examples ? examples[activeLang] : code ?? "";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langLabels: Record<Lang, string> = {
    curl: "cURL",
    js: "JavaScript",
    python: "Python",
    go: "Go",
  };

  const langMap: Record<string, string> = {
    curl: "curl",
    js: "javascript",
    python: "python",
    go: "go",
  };

  const lines = displayCode.split("\n");
  const lineNumWidth = String(lines.length).length;

  const highlightedCode = (() => {
    const langKey = examples ? langMap[activeLang] : language;
    return getHighlighted(displayCode, langKey);
  })();

  return (
    <motion.div
      layout
      className="relative group rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:border-white/[0.12]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.015]">
        <div className="flex items-center gap-2">
          {examples ? (
            (Object.keys(examples) as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`relative text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  activeLang === lang
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                }`}
              >
                {activeLang === lang && (
                  <motion.div
                    layoutId="langTab"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{langLabels[lang]}</span>
              </button>
            ))
          ) : (
            <span className="text-xs font-mono font-medium text-white/30 uppercase tracking-wider">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[11px] text-white/20 font-mono hidden sm:block">{title}</span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-white/40 hover:text-white/70 transition-all duration-200"
          >
            {copied ? (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5"
              >
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </motion.span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </span>
            )}
          </button>
        </div>
      </div>
      {/* Code with line numbers */}
      <div className="flex">
        {/* Line numbers */}
        <div
          className="flex-shrink-0 text-right pr-4 pl-4 py-5 select-none font-mono text-[13px] leading-relaxed text-white/[0.08] border-r border-white/[0.03]"
          style={{ minWidth: `${lineNumWidth + 2}ch` }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code content */}
        <pre className="flex-1 p-5 overflow-x-auto font-mono text-[13px] leading-relaxed">
          <code className="text-green-400/85">
            {typeof highlightedCode === "string" ? displayCode : highlightedCode}
          </code>
        </pre>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Endpoint Card with Enhanced Visuals                                 */
/* ------------------------------------------------------------------ */

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5",
    PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
    PATCH: "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border shadow-sm ${
        colors[method] || colors.GET
      }`}
    >
      {method}
    </span>
  );
};

const EndpointCard = ({
  method,
  path,
  description,
  auth = true,
  children,
}: {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/[0.08] bg-[#0A0A0A] overflow-hidden transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.01]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left group"
      >
        <MethodBadge method={method} />
        <code className="text-white font-mono text-sm tracking-tight group-hover:text-white/90 transition-colors">
          {path}
        </code>
        <div className="ml-auto flex items-center gap-2">
          {auth && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-medium text-white/20">
              <Lock className="w-2.5 h-2.5" />
              Auth
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-white/20 mt-px">▸</span>
                <span>{description}</span>
              </p>
              <div className="pl-3 border-l border-white/[0.06]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Section with Enhanced Header                                       */
/* ------------------------------------------------------------------ */

const Section = ({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.section
    id={id}
    variants={itemVariants}
    className="mb-20 scroll-mt-28 group/section"
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="relative w-11 h-11 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary ring-1 ring-primary/[0.15] overflow-hidden group-hover/section:ring-primary/[0.25] transition-all duration-300">
        <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover/section:opacity-100 transition-opacity duration-300" />
        <Icon className="w-5 h-5 relative z-10" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
        {title}
      </h2>
      <div className="hidden lg:block flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent ml-4" />
    </div>
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      {children}
    </div>
  </motion.section>
);

/* ------------------------------------------------------------------ */
/*  Tip / Callout Box                                                  */
/* ------------------------------------------------------------------ */

const TipBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/[0.04] border border-primary/[0.1] text-sm text-primary/80">
    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/60" />
    <span>{children}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Scroll Progress Indicator                                          */
/* ------------------------------------------------------------------ */

const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-white/[0.03] pointer-events-none">
      <motion.div
        className="h-full bg-gradient-to-r from-primary via-purple-400 to-primary"
        style={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("quickstart");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const navItems = [
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

  /* Active section tracking */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  /* Keyboard shortcut: Cmd/Ctrl + K */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Close mobile sidebar on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSearchOpen(false);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-foreground relative">
      {/* Scroll progress indicator */}
      <ScrollProgress />

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/4 w-[800px] h-[800px] bg-blue-500/[0.04] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-1/4 w-[700px] h-[700px] bg-violet-500/[0.03] rounded-full blur-[180px] animate-pulse-slow" style={{ animationDuration: "10s", animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[150px] animate-pulse-slow" style={{ animationDuration: "12s", animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.03)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]" />
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-xl bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                <Search className="w-5 h-5 text-white/25" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/30">
                  <span className="text-white/20">⌘</span>K
                </kbd>
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2 hero-scroll">
                {filteredNav.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <Search className="w-6 h-6 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">No results for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredNav.map((item, i) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        onClick={() => scrollTo(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] text-left transition-all duration-150 group"
                      >
                        <item.icon className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                        <span className="ml-auto text-[10px] text-white/15 font-mono group-hover:text-white/30 transition-colors">
                          Jump to <ArrowRight className="w-2.5 h-2.5 inline ml-0.5" />
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                )}
              </div>
              <div className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center gap-3 text-[10px] text-white/20">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">ESC</kbd>
                    Close
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar toggle */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-12 h-12 rounded-full bg-primary shadow-lg shadow-primary/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
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
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">
                Sections
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(item.id);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    activeSection === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/[0.08] flex items-center justify-center text-primary ring-1 ring-primary/[0.15]">
                <Book className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-white/30 uppercase tracking-widest">Documentation</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Yapapa API
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-400 to-primary/60 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl leading-relaxed">
              Everything you need to integrate with 100+ AI models through one unified, credit-based API.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200"
            >
              <Search className="w-4 h-4" />
              <span>Search docs...</span>
              <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/20">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 scrollbar-thin">
              <div className="relative">
                {/* Active indicator bar */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.04]" />
                <motion.div
                  className="absolute left-0 w-px bg-gradient-to-b from-primary via-purple-400 to-primary"
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    top: `${navItems.findIndex((i) => i.id === activeSection) * 40 + 4}px`,
                    height: "32px",
                  }}
                />
                <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mb-4 px-3 pt-1">
                  On this page
                </h3>
                {navItems.map((item, idx) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(item.id);
                    }}
                    className={`relative flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm transition-all duration-200 group ${
                      activeSection === item.id
                        ? "text-primary font-medium"
                        : "text-white/30 hover:text-white/60 hover:bg-white/[0.02]"
                    }`}
                  >
                    <item.icon
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-200 ${
                        activeSection === item.id
                          ? "text-primary"
                          : "text-white/15 group-hover:text-white/30"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          {/* Documentation Content */}
          <motion.div
            ref={contentRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-9 space-y-8"
          >
            {/* Quick Start */}
            <Section id="quickstart" icon={Zap} title="Quick Start">
              <p className="text-lg text-white/80">
                Get started with Yapapa AI Gateway in under 5 minutes. The backend runs on{" "}
                <code className="px-1.5 py-0.5 rounded bg-primary/[0.08] text-primary font-mono text-xs border border-primary/[0.1]">
                  {BASE_URL}
                </code>{" "}
                and the frontend on{" "}
                <code className="px-1.5 py-0.5 rounded bg-primary/[0.08] text-primary font-mono text-xs border border-primary/[0.1]">
                  http://localhost:3000
                </code>
                .
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    step: "1",
                    title: "Create an Account",
                    desc: "Sign up at /signup or call POST /auth/signup with name, email, and password.",
                  },
                  {
                    step: "2",
                    title: "Get Your API Key",
                    desc: "Navigate to the Dashboard and generate a new API key with a recognizable name.",
                  },
                  {
                    step: "3",
                    title: "Make Your First Request",
                    desc: "Use your API key to call any supported model through the unified API.",
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.step}
                    variants={scaleIn}
                    className="group relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-primary/[0.15] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/[0.08] text-primary text-xs font-bold font-mono">
                        {card.step}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </motion.div>
                ))}
              </div>

              <TipBox>
                All API requests require authentication via the <code className="text-primary font-mono text-xs">X-Api-Key</code> header or a valid JWT session cookie.
              </TipBox>
            </Section>

            {/* Authentication */}
            <Section id="authentication" icon={Key} title="Authentication">
              <p>
                Yapapa supports three authentication methods. Choose the one that fits your use case.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {[
                  {
                    title: "API Key (Recommended)",
                    desc: "Generate keys from the Dashboard for server-side integration. Include via X-Api-Key header.",
                    icon: Key,
                  },
                  {
                    title: "JWT Session",
                    desc: "Browser-based auth via NextAuth. Automatically handled when logged into the dashboard.",
                    icon: Lock,
                  },
                  {
                    title: "Bearer Token",
                    desc: "Alternative for OAuth-style integration. Pass JWT via Authorization: Bearer header.",
                    icon: Shield,
                  },
                ].map((method) => (
                  <div
                    key={method.title}
                    className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <method.icon className="w-5 h-5 text-primary mb-3" />
                    <h3 className="text-white font-semibold text-sm mb-1.5">{method.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{method.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-white font-semibold mb-3">Using your API Key</h3>
                <CodeBlock
                  code={`curl ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Hello!" }
    ]
  }'`}
                />
              </div>
            </Section>

            {/* API Reference */}
            <Section id="api-reference" icon={Code2} title="API Reference">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-white/30 font-mono">Base URL</span>
                <code className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-primary font-mono text-sm">
                  {BASE_URL}
                </code>
              </div>

              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                Public Endpoints
              </h3>
              <div className="space-y-2 mb-10">
                <EndpointCard method="GET" path="/health" description="Health check including database connectivity." auth={false}>
                  <CodeBlock code={`curl ${BASE_URL}/health`} />
                </EndpointCard>
                <EndpointCard method="POST" path="/auth/signup" description="Register a new user account." auth={false}>
                  <CodeBlock
                    code={`curl ${BASE_URL}/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'`}
                  />
                </EndpointCard>
                <EndpointCard method="POST" path="/auth/login" description="Authenticate and receive JWT session." auth={false}>
                  <CodeBlock
                    code={`curl ${BASE_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123"}'`}
                  />
                </EndpointCard>
                <EndpointCard method="GET" path="/api/providers/health" description="Health status of all configured LLM providers." auth={false} />
              </div>

              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                Protected Endpoints
              </h3>
              <div className="space-y-2">
                <EndpointCard method="GET" path="/auth/me" description="Get current authenticated user profile." />
                <EndpointCard method="PUT" path="/auth/profile" description="Update user name and email." />
                <EndpointCard method="PUT" path="/auth/password" description="Change password (requires current password)." />
                <EndpointCard method="GET" path="/api/keys" description="List all API keys for the current user." />
                <EndpointCard method="POST" path="/api/keys" description="Create a new API key with a name." />
                <EndpointCard method="DELETE" path="/api/keys/{id}" description="Permanently delete an API key." />
                <EndpointCard method="POST" path="/api/keys/{id}/revoke" description="Revoke an API key (immediately disables it)." />
                <EndpointCard method="GET" path="/api/logs" description="Paginated request logs with model, status, tokens." />
                <EndpointCard method="GET" path="/api/analytics" description="Usage analytics: requests, tokens, costs over time." />
                <EndpointCard method="GET" path="/api/credits" description="Get current credit balance." />
                <EndpointCard method="POST" path="/api/credits/purchase" description="Purchase additional credits." />
                <EndpointCard method="GET" path="/api/transactions" description="List all credit transactions." />
                <EndpointCard method="POST" path="/api/chat" description="Unified AI chat endpoint. Streams SSE responses." />
                <EndpointCard method="POST" path="/api/embeddings" description="Generate embeddings from supported providers." />
                <EndpointCard method="POST" path="/api/conversations" description="Create a new conversation thread." />
                <EndpointCard method="GET" path="/api/conversations" description="List recent conversations." />
                <EndpointCard method="GET" path="/api/conversations/{id}" description="Get full conversation with messages." />
                <EndpointCard method="DELETE" path="/api/conversations/{id}" description="Delete a conversation." />
                <EndpointCard method="POST" path="/api/conversations/{id}/messages" description="Add message and get AI response." />
                <EndpointCard method="POST" path="/api/prompts" description="Create a new prompt template." />
                <EndpointCard method="GET" path="/api/prompts" description="List saved prompt templates." />
                <EndpointCard method="PUT" path="/api/prompts/{id}" description="Update a prompt template." />
                <EndpointCard method="DELETE" path="/api/prompts/{id}" description="Delete a prompt template." />
                <EndpointCard method="POST" path="/api/batch" description="Process multiple requests in a single batch." />
                <EndpointCard method="GET" path="/api/batch/{id}" description="Check batch job status and results." />
                <EndpointCard method="POST" path="/api/files/upload" description="Upload files for multimodal model support." />
                <EndpointCard method="GET" path="/api/models" description="List all available AI models." />
                <EndpointCard method="GET" path="/api/models/{provider}" description="List models for a specific provider." />
                <EndpointCard method="GET" path="/api/admin/users" description="[Admin] List all platform users." />
                <EndpointCard method="GET" path="/api/admin/stats" description="[Admin] Get platform-wide statistics." />
              </div>
            </Section>

            {/* Chat & Streaming */}
            <Section id="chat" icon={MessageSquare} title="Chat & Streaming">
              <p>
                The chat endpoint supports both standard JSON response and Server-Sent Events (SSE) streaming. Streaming is enabled by setting <code className="text-white/60">stream: true</code>.
              </p>

              <CodeBlock
                examples={{
                  curl: `curl -N ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
                  js: `const response = await fetch("${BASE_URL}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});

const data = await response.json();
console.log(data);`,
                  python: `import requests

BASE = "${BASE_URL}"
API_KEY = "YOUR_API_KEY"

res = requests.post(
    f"{BASE}/api/chat",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
    },
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}],
    },
)
print(res.json())`,
                  go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]any{
        "model": "openai/gpt-4o",
        "messages": []map[string]string{
            {"role": "user", "content": "Hello!"},
        },
    })

    req, _ := http.NewRequest(
        "POST",
        "${BASE_URL}/api/chat",
        bytes.NewReader(body),
    )
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-Api-Key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("%+v\\n", result)
}`,
                }}
              />

              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.01] p-5">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-mono font-bold">
                    SSE
                  </span>
                  Streaming Response
                </h4>
                <p className="text-sm text-muted-foreground">
                  Set <code className="text-white/60">stream: true</code> in your request body to enable SSE. Each chunk is prefixed with <code className="text-white/60">data:</code> and the stream ends with <code className="text-white/60">data: [DONE]</code>.
                </p>
              </div>
            </Section>

            {/* Embeddings */}
            <Section id="embeddings" icon={Database} title="Embeddings">
              <p>
                Generate text embeddings from supported providers including OpenAI, Anthropic, Cohere, NVIDIA NIM, and Gemini.
              </p>

              <div className="mt-6">
                <CodeBlock
                  examples={{
                    curl: `curl ${BASE_URL}/api/embeddings \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "openai/text-embedding-3-small",
    "input": "The quick brown fox jumps over the lazy dog"
  }'`,
                    js: `const res = await fetch("${BASE_URL}/api/embeddings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY",
  },
  body: JSON.stringify({
    model: "openai/text-embedding-3-small",
    input: "Hello world",
  }),
});
const data = await res.json();
console.log(data.embeddings);`,
                    python: `import requests

res = requests.post(
    "${BASE_URL}/api/embeddings",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "YOUR_API_KEY",
    },
    json={
        "model": "openai/text-embedding-3-small",
        "input": "Hello world",
    },
)
print(res.json()["embeddings"])`,
                    go: `body, _ := json.Marshal(map[string]any{
    "model": "openai/text-embedding-3-small",
    "input": "Hello world",
})

req, _ := http.NewRequest(
    "POST",
    "${BASE_URL}/api/embeddings",
    bytes.NewReader(body),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Api-Key", "YOUR_API_KEY")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]any
json.NewDecoder(resp.Body).Decode(&result)
embeddings := result["embeddings"]
fmt.Printf("%+v\\n", embeddings)`,
                  }}
                />
              </div>
            </Section>

            {/* Conversations */}
            <Section id="conversations" icon={Boxes} title="Conversations">
              <p>
                Create and manage multi-turn conversations. Each conversation stores message history and can be resumed later. The conversation API manages message threading automatically.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-white font-semibold text-sm mb-2">Create</h4>
                  <p className="text-xs text-muted-foreground">POST /api/conversations</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-white font-semibold text-sm mb-2">List</h4>
                  <p className="text-xs text-muted-foreground">GET /api/conversations</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-white font-semibold text-sm mb-2">Send Message</h4>
                  <p className="text-xs text-muted-foreground">POST /api/conversations/{`{id}`}/messages</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-white font-semibold text-sm mb-2">Delete</h4>
                  <p className="text-xs text-muted-foreground">DELETE /api/conversations/{`{id}`}</p>
                </div>
              </div>
            </Section>

            {/* Prompt Templates */}
            <Section id="prompts" icon={FileText} title="Prompt Templates">
              <p>
                Save and reuse prompt templates with variable interpolation. Templates use <code className="text-white/60">{`{{variable}}`}</code> syntax for dynamic content. Create, list, update, and delete templates through dedicated endpoints.
              </p>

              <h4 className="text-white font-semibold mt-6">Available endpoints</h4>
              <div className="space-y-2 mt-3">
                <EndpointCard method="POST" path="/api/prompts" description="Create a new prompt template with name, content, and optional variables." />
                <EndpointCard method="GET" path="/api/prompts" description="List all saved prompt templates for the current user." />
                <EndpointCard method="PUT" path="/api/prompts/{id}" description="Update an existing prompt template." />
                <EndpointCard method="DELETE" path="/api/prompts/{id}" description="Delete a prompt template." />
              </div>
            </Section>

            {/* Batch API */}
            <Section id="batch" icon={Layers} title="Batch API">
              <p>
                Process multiple chat requests in a single batch request. Batch API reduces overhead when you need to process multiple independent requests. Each item in the batch is processed independently.
              </p>

              <div className="mt-6">
                <CodeBlock
                  language="json"
                  code={`{
  "items": [
    {
      "model": "openai/gpt-4o",
      "messages": [{"role": "user", "content": "Summarize this article"}]
    },
    {
      "model": "anthropic/claude-3-opus",
      "messages": [{"role": "user", "content": "Translate to French"}]
    }
  ]
}`}
                />
              </div>
            </Section>

            {/* Files */}
            <Section id="files" icon={UploadCloud} title="File Upload">
              <p>
                Upload images for vision/multimodal model support. Files are validated, typed, and returned as base64 data URIs.
              </p>

              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 hover:border-white/[0.1] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <MethodBadge method="POST" />
                  <code className="text-white font-mono text-sm">/api/files/upload</code>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Multipart upload. Max file size: 10MB. Supported formats: PNG, JPEG, WebP, GIF.
                </p>
                <CodeBlock
                  code={`curl ${BASE_URL}/api/files/upload \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -F "files=@image.png" \\
  -F "files=@photo.jpg"`}
                />
              </div>
            </Section>

            {/* Rate Limits */}
            <Section id="rate-limits" icon={Shield} title="Rate Limits">
              <p>
                Rate limits protect the API from abuse and ensure fair usage. Limits are configurable via the{" "}
                <code className="text-white/60">RATE_LIMIT_RPM</code> environment variable.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {[
                  { label: "Requests / minute", value: "60", desc: "Default sliding window" },
                  { label: "Tokens / minute", value: "100K", desc: "Combined input + output" },
                  { label: "Concurrent requests", value: "10", desc: "Simultaneous connections" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center group hover:border-primary/[0.12] transition-all duration-300"
                  >
                    <div className="text-3xl font-black text-primary mb-1 group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
                    <div className="text-sm text-white font-medium mb-1">{stat.label}</div>
                    <div className="text-xs text-white/30">{stat.desc}</div>
                  </div>
                ))}
              </div>

              <TipBox>
                Rate limits are applied per-user based on API key or session. Contact support for higher limits.
              </TipBox>
            </Section>

            {/* Error Handling */}
            <Section id="error-handling" icon={AlertTriangle} title="Error Handling">
              <p>
                The API returns consistent error responses with descriptive messages. All errors include a <code className="text-white/60">detail</code> field with a human-readable explanation and an <code className="text-white/60">error</code> field with the error type.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  { code: "400", title: "Bad Request", desc: "Invalid request body or parameters." },
                  { code: "401", title: "Unauthorized", desc: "Missing or invalid API key / JWT." },
                  { code: "403", title: "Forbidden", desc: "Insufficient permissions for resource." },
                  { code: "404", title: "Not Found", desc: "The requested resource does not exist." },
                  { code: "429", title: "Rate Limited", desc: "Too many requests. Retry after backoff." },
                  { code: "500", title: "Server Error", desc: "Internal server error. Contact support." },
                  { code: "502", title: "Bad Gateway", desc: "Upstream LLM provider returned an error." },
                  { code: "503", title: "Service Unavailable", desc: "Service temporarily unavailable." },
                ].map((err) => (
                  <div
                    key={err.code}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.06]"
                  >
                    <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold font-mono">
                      {err.code}
                    </span>
                    <div className="min-w-0">
                      <div className="text-white font-medium text-sm">{err.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{err.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Available Models */}
            <Section id="models" icon={Cpu} title="Available Models">
              <p>
                Yapapa routes requests to the optimal model based on your selected provider prefix. Use the <code className="text-white/60">/api/models</code> endpoint to get the full, up-to-date list.
              </p>

              <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Provider</th>
                      <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Prefix</th>
                      <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Example Models</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      { provider: "OpenAI", prefix: "openai/", models: "GPT-4o, GPT-4o-mini, o3, o4-mini" },
                      { provider: "Anthropic", prefix: "anthropic/", models: "Claude 3.5 Sonnet, Claude 3 Opus, Claude 3.7 Sonnet" },
                      { provider: "Groq", prefix: "groq/", models: "Llama 3, Mixtral, Gemma 2" },
                      { provider: "Gemini", prefix: "gemini/", models: "Gemini 2.0 Flash, Gemini 2.5 Pro" },
                      { provider: "NVIDIA NIM", prefix: "nvidia/", models: "Nemotron, Llama 3.1 NIM" },
                    ].map((row) => (
                      <tr key={row.provider} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{row.provider}</td>
                        <td className="py-3 px-4">
                          <code className="text-primary font-mono text-xs">{row.prefix}</code>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{row.models}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Pricing & Credits */}
            <Section id="pricing" icon={TrendingUp} title="Pricing & Credits">
              <p>
                Yapapa uses a credit-based pricing system. Credits are deducted per request based on the model and token usage. Purchase credits through the dashboard or API.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {[
                  { label: "Credit balance", endpoint: "GET /api/credits", desc: "Check your current balance anytime." },
                  { label: "Purchase credits", endpoint: "POST /api/credits/purchase", desc: "Add credits to your account." },
                  { label: "Transaction history", endpoint: "GET /api/transactions", desc: "View all past credit transactions." },
                  { label: "Usage analytics", endpoint: "GET /api/analytics", desc: "Track your usage and costs over time." },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <h3 className="text-white font-semibold text-sm mb-1">{item.label}</h3>
                    <code className="text-primary font-mono text-xs">{item.endpoint}</code>
                    <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Dashboard */}
            <Section id="dashboard" icon={BarChart3} title="Dashboard">
              <p>
                The dashboard provides real-time visibility into your API usage, credit balance, and request history. Key features include:
              </p>
              <ul className="space-y-3 mt-4">
                {[
                  "Real-time usage analytics with charts and metrics",
                  "API key management — create, revoke, and monitor keys",
                  "Request log viewer with filtering and search",
                  "Credit balance and transaction history",
                  "Model performance and latency monitoring",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400/70 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Security */}
            <Section id="security" icon={Lock} title="Security">
              <p>
                Security is built into every layer of Yapapa. All data in transit is encrypted via TLS. API keys are hashed using bcrypt before storage.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                  { title: "Encryption in Transit", desc: "TLS 1.3 for all API endpoints", icon: Lock },
                  { title: "Key Hashing", desc: "bcrypt hashing for all stored API keys", icon: Shield },
                  { title: "Rate Limiting", desc: "Per-user sliding window rate limits", icon: Activity },
                  { title: "CORS Protection", desc: "Strict CORS policy with allowed origins", icon: Globe },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <item.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Code Examples */}
            <Section id="examples" icon={Terminal} title="Code Examples">
              <p className="text-white/80">
                Full working examples in multiple languages to help you integrate quickly.
              </p>

              <div className="space-y-10 mt-6">
                <motion.div variants={fadeIn}>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-green-500/15 text-green-400 text-[11px] font-mono font-bold">
                      Python
                    </span>
                    Full Client Example
                  </h4>
                  <CodeBlock
                    language="python"
                    code={`import requests

BASE = "${BASE_URL}"
API_KEY = "YOUR_API_KEY"
HEADERS = {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY,
}

# Chat completion
res = requests.post(
    f"{BASE}/api/chat",
    headers=HEADERS,
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)
print(res.json())

# List models
models = requests.get(f"{BASE}/api/models", headers=HEADERS)
print(models.json())

# Get credits
credits = requests.get(f"{BASE}/api/credits", headers=HEADERS)
print(credits.json())`}
                  />
                </motion.div>

                <motion.div variants={fadeIn}>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 text-[11px] font-mono font-bold">
                      JavaScript
                    </span>
                  </h4>
                  <CodeBlock
                    language="javascript"
                    code={`const API_KEY = "YOUR_API_KEY";
const BASE = "${BASE_URL}";

async function chat(model, messages) {
  const res = await fetch(\`\${BASE}/api/chat\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify({ model, messages }),
  });
  return res.json();
}

// Usage
const data = await chat("openai/gpt-4o", [
  { role: "user", content: "Explain async/await" },
]);
console.log(data);`}
                  />
                </motion.div>

                <motion.div variants={fadeIn}>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 text-[11px] font-mono font-bold">
                      Go
                    </span>
                  </h4>
                  <CodeBlock
                    language="go"
                    code={`package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]any{
        "model": "openai/gpt-4o",
        "messages": []map[string]string{
            {"role": "user", "content": "Hello!"},
        },
    })

    req, _ := http.NewRequest("POST", "${BASE_URL}/api/chat", bytes.NewReader(body))
    req.Header.Set("X-Api-Key", "YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("%+v\\n", result)
}`}
                  />
                </motion.div>
              </div>
            </Section>

            {/* Footer CTA */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-2xl p-10 md:p-14 border border-white/[0.06] text-center overflow-hidden mt-20 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-purple-500/[0.03] to-transparent" />
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[120px] group-hover:bg-primary/[0.08] transition-all duration-700" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.03)_0%,_transparent_60%)]" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center text-primary ring-1 ring-primary/[0.15] mx-auto mb-6"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                  Ready to Build?
                </h3>
                <p className="text-white/40 mb-8 max-w-lg mx-auto text-sm md:text-base">
                  Start integrating with 100+ AI models through one unified, credit-based API.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="group/btn relative px-7 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all flex items-center gap-2 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
                    <span className="relative z-10">Sign Up Free</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/playground"
                    className="px-7 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-white font-semibold text-sm transition-all hover:border-white/[0.12]"
                  >
                    Try Playground
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
