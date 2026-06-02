# Docs Restructure — Multi-Page Split

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic 1631-line `/docs` single-page app into separate pages for each category, sharing components through a docs component library.

**Architecture:** Extract 6 shared components (CodeBlock, EndpointCard, Section, TipBox, ScrollProgress, SearchModal) from the mega-page into `components/docs/`. Create a docs layout at `app/docs/layout.tsx` with sidebar + search. Each of the 16 sections gets its own route under `/docs/<section>`.

**Tech Stack:** Next.js 16 App Router, Framer Motion, Tailwind CSS v4, Lucide icons

---

## File Structure

```
apps/web/
├── components/
│   └── docs/
│       ├── CodeBlock.tsx        # CodeBlock + highlightJson/Bash/Python/Go/JS
│       ├── EndpointCard.tsx     # EndpointCard + MethodBadge
│       ├── Section.tsx          # Section wrapper
│       ├── TipBox.tsx           # TipBox callout
│       ├── ScrollProgress.tsx   # Scroll progress bar
│       └── SearchModal.tsx      # Search modal (shared across pages)
└── app/
    └── docs/
        ├── layout.tsx           # Docs layout: sidebar + top bar + search + footer CTA
        ├── page.tsx             # Docs index/landing page (nav cards, no content sections)
        ├── quickstart/page.tsx
        ├── authentication/page.tsx
        ├── api-reference/page.tsx
        ├── chat/page.tsx
        ├── embeddings/page.tsx
        ├── conversations/page.tsx
        ├── prompts/page.tsx
        ├── batch/page.tsx
        ├── files/page.tsx
        ├── rate-limits/page.tsx
        ├── error-handling/page.tsx
        ├── models/page.tsx
        ├── pricing/page.tsx
        ├── dashboard/page.tsx
        ├── security/page.tsx
        └── examples/page.tsx
```

---

### Task 1: Extract CodeBlock + highlight helpers

**Files:**

- Create: `apps/web/components/docs/CodeBlock.tsx`

- [ ] **Step 1: Create CodeBlock.tsx**

Extract from `apps/web/app/docs/page.tsx` lines 52-347:

- `highlightJson`, `highlightBash`, `highlightPython`, `highlightGo`, `highlightJS` functions
- `getHighlighted` dispatcher
- `CodeExample` type, `Lang` type
- `CodeBlock` component itself

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Copy } from "lucide-react";

type Lang = "curl" | "js" | "python" | "go";

interface CodeExample {
  curl: string;
  js: string;
  python: string;
  go: string;
}

interface CodeBlockProps {
  code?: string;
  language?: string;
  examples?: CodeExample;
  title?: string;
}

function highlightJson(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+\.?\d*\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-sky-300">
          {match[1]}
        </span>,
      );
      parts.push(<span key={key++}>:</span>);
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      parts.push(
        <span key={key++} className="text-purple-300">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[5]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

function highlightBash(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go)(?=\s|$)|("(?:[^"\\]|\\.)*")|(-[a-zA-Z]|--[a-zA-Z-]+)|((?:https?:\/\/|localhost)\S*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(
        <span key={key++} className="text-green-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-blue-300">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span
          key={key++}
          className="text-cyan-300 underline underline-offset-2 decoration-white/10"
        >
          {match[5]}
        </span>,
      );
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
  const regex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None)\b)|(#.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[5]}
        </span>,
      );
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
  const regex =
    /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|any)\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
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
  const regex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[5]}
        </span>,
      );
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

export function CodeBlock({
  code,
  language = "bash",
  examples,
  title,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>("curl");

  const displayCode = examples ? examples[activeLang] : (code ?? "");

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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.015]">
        <div className="flex items-center gap-2">
          {examples ? (
            (Object.keys(examples) as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`relative text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  activeLang === lang
                    ? "text-blue-400 bg-blue-500/10 shadow-sm"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                }`}
              >
                {activeLang === lang && (
                  <motion.div
                    layoutId="langTab"
                    className="absolute inset-0 rounded-lg bg-blue-500/10"
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
            <span className="text-[11px] text-white/20 font-mono hidden sm:block">
              {title}
            </span>
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
      <div className="flex">
        <div
          className="flex-shrink-0 text-right pr-4 pl-4 py-5 select-none font-mono text-[13px] leading-relaxed text-white/[0.08] border-r border-white/[0.03]"
          style={{ minWidth: `${lineNumWidth + 2}ch` }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 p-5 overflow-x-auto font-mono text-[13px] leading-relaxed">
          <code className="text-green-400/85">
            {typeof highlightedCode === "string"
              ? displayCode
              : highlightedCode}
          </code>
        </pre>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `tsc --noEmit --pretty false` in `apps/web/` to confirm no type errors.

---

### Task 2: Extract EndpointCard

**Files:**

- Create: `apps/web/components/docs/EndpointCard.tsx`

- [ ] **Step 1: Create EndpointCard.tsx**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5",
    PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
    PATCH:
      "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5",
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
}

interface EndpointCardProps {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  children?: React.ReactNode;
}

export function EndpointCard({
  method,
  path,
  description,
  auth = true,
  children,
}: EndpointCardProps) {
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
}
```

---

### Task 3: Extract TipBox, Section, ScrollProgress

**Files:**

- Create: `apps/web/components/docs/TipBox.tsx`
- Create: `apps/web/components/docs/Section.tsx`
- Create: `apps/web/components/docs/ScrollProgress.tsx`

- [ ] **Step 1: Create TipBox.tsx**

```tsx
"use client";

import { Lightbulb } from "lucide-react";

export function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.1] text-sm text-blue-400/80">
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400/60" />
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create Section.tsx**

```tsx
"use client";

import { motion } from "framer-motion";

interface SectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 },
  },
};

export function Section({ id, icon: Icon, title, children }: SectionProps) {
  return (
    <motion.section
      id={id}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="mb-20 scroll-mt-28 group/section"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-11 h-11 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] overflow-hidden group-hover/section:ring-blue-500/[0.25] transition-all duration-300">
          <div className="absolute inset-0 bg-blue-500/[0.03] opacity-0 group-hover/section:opacity-100 transition-opacity duration-300" />
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
}
```

- [ ] **Step 3: Create ScrollProgress.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-white/[0.03] pointer-events-none">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-400 to-blue-500"
        style={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}
```

---

### Task 4: Create search modal component

**Files:**

- Create: `apps/web/components/docs/SearchModal.tsx`

- [ ] **Step 1: Create SearchModal.tsx**

The search modal is shared across all docs pages. It receives a nav items list and a scrollTo callback.

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { NavItem } from "./types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (id: string) => void;
}

export function SearchModal({
  open,
  onClose,
  items,
  onNavigate,
}: SearchModalProps) {
  const [query, setQuery] = useState("");

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-md"
          onClick={onClose}
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/30">
                <span className="text-white/20">⌘</span>K
              </kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2 hero-scroll">
              {filtered.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Search className="w-6 h-6 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filtered.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => {
                        onNavigate(item.id);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] text-left transition-all duration-150 group"
                    >
                      <item.icon className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                      <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                      <span className="ml-auto text-[10px] text-white/15 font-mono group-hover:text-white/30 transition-colors">
                        Jump to{" "}
                        <ArrowRight className="w-2.5 h-2.5 inline ml-0.5" />
                      </span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
            <div className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                    ↵
                  </kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                    ESC
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create shared types file**

`apps/web/components/docs/types.ts`:

```ts
import type { ElementType } from "react";

export interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
}
```

---

### Task 5: Create docs layout

**Files:**

- Create: `apps/web/app/docs/layout.tsx`

This layout wraps all docs pages with the sidebar, scroll progress, search modal, and ambient background.

- [ ] **Step 1: Create layout.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu,
  X,
  ArrowRight,
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

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSectionId =
    pathname.replace("/docs/", "").replace("/", "") || "index";

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
    <div className="min-h-screen bg-[#000000] text-foreground relative">
      <ScrollProgress />

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-1/4 w-[800px] h-[800px] bg-blue-500/[0.04] rounded-full blur-[180px] animate-pulse-slow"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-10%] right-1/4 w-[700px] h-[700px] bg-violet-500/[0.03] rounded-full blur-[180px] animate-pulse-slow"
          style={{ animationDuration: "10s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[150px] animate-pulse-slow"
          style={{ animationDuration: "12s", animationDelay: "4s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.03)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]" />
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={navItems}
        onNavigate={navigateTo}
      />

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
                  {navItems.find((i) => i.id === currentSectionId)?.label ||
                    "Docs"}
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
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
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
          <main className="lg:col-span-9 min-h-[60vh]">{children}</main>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: Create docs landing/index page

**Files:**

- Modify: `apps/web/app/docs/page.tsx`

Replace the monolithic page with a compact index/landing page with cards linking to each section.

- [ ] **Step 1: Write the new index page**

```tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
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
  ArrowRight,
  Book,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const sections = [
  {
    id: "quickstart",
    label: "Quick Start",
    icon: Zap,
    desc: "Get up and running in under 5 minutes.",
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: Key,
    desc: "API keys, JWT, and bearer token auth.",
  },
  {
    id: "api-reference",
    label: "API Reference",
    icon: Code2,
    desc: "Complete endpoint documentation.",
  },
  {
    id: "chat",
    label: "Chat & Streaming",
    icon: MessageSquare,
    desc: "SSE streaming and standard chat.",
  },
  {
    id: "embeddings",
    label: "Embeddings",
    icon: Database,
    desc: "Generate text embeddings.",
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: Boxes,
    desc: "Multi-turn conversation management.",
  },
  {
    id: "prompts",
    label: "Prompt Templates",
    icon: FileText,
    desc: "Reusable prompt templates.",
  },
  {
    id: "batch",
    label: "Batch API",
    icon: Layers,
    desc: "Process multiple requests at once.",
  },
  {
    id: "files",
    label: "File Upload",
    icon: UploadCloud,
    desc: "Upload images for vision models.",
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    icon: Shield,
    desc: "Usage limits and throttling.",
  },
  {
    id: "error-handling",
    label: "Error Handling",
    icon: AlertTriangle,
    desc: "Error codes and responses.",
  },
  {
    id: "models",
    label: "Available Models",
    icon: Cpu,
    desc: "Supported providers and models.",
  },
  {
    id: "pricing",
    label: "Pricing & Credits",
    icon: TrendingUp,
    desc: "Credit system and costs.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    desc: "Usage analytics and monitoring.",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    desc: "Encryption, hashing, and CORS.",
  },
  {
    id: "examples",
    label: "Code Examples",
    icon: Terminal,
    desc: "Full examples in Python, JS, Go.",
  },
];

export default function DocsIndexPage() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className="mb-10">
        <h2 className="text-3xl font-black tracking-tight text-white mb-3">
          Documentation
        </h2>
        <p className="text-gray-500 text-sm font-mono max-w-lg">
          Everything you need to integrate with 100+ AI models through one
          unified API.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {sections.map((section) => (
          <motion.div key={section.id} variants={cardVariants}>
            <Link
              href={`/docs/${section.id}`}
              className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-[#0A0A0A] hover:border-blue-500/[0.15] hover:bg-white/[0.01] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] flex-shrink-0 group-hover:ring-blue-500/[0.25] transition-all duration-300">
                <section.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">
                    {section.label}
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-blue-400/60 transition-all duration-300 -mr-1" />
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {section.desc}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative rounded-2xl p-10 md:p-14 border border-white/[0.06] text-center overflow-hidden mt-16 group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] via-purple-500/[0.03] to-transparent" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[120px] group-hover:bg-blue-500/[0.08] transition-all duration-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.03)_0%,_transparent_60%)]" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] mx-auto mb-6">
            <Book className="w-7 h-7" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
            Ready to Build?
          </h3>
          <p className="text-white/40 mb-8 max-w-lg mx-auto text-sm md:text-base">
            Start integrating with 100+ AI models through one unified,
            credit-based API.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group/btn relative px-7 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-500/90 text-white font-semibold text-sm transition-all flex items-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
              <span className="relative z-10">Sign Up Free</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

### Task 7: Create individual section pages

**Files:**

- Create: `apps/web/app/docs/quickstart/page.tsx`
- Create: `apps/web/app/docs/authentication/page.tsx`
- Create: `apps/web/app/docs/api-reference/page.tsx`
- ... (one per section, 16 total)

Each page imports shared components and contains its section's content extracted from the original mega-page.

The pattern for each page:

```tsx
"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Section } from "@/components/docs/Section";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { TipBox } from "@/components/docs/TipBox";
import { EndpointCard } from "@/components/docs/EndpointCard";

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export default function QuickstartPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {/* Section content extracted from original mega-page */}
    </motion.div>
  );
}
```

Each page content is identical to the original section body but wrapped in page layout.

---

### Task 8: Delete the old monolithic content from page.tsx

**Files:**

- Modify: `apps/web/app/docs/page.tsx`

The monolithic content is now replaced by the index page (Task 6). The old content (lines 15-1630) is deleted.

---

## Self-Review Checklist

- [ ] All 16 sections from the original page have corresponding route pages
- [ ] Shared components (CodeBlock, EndpointCard, Section, TipBox, ScrollProgress) are extracted
- [ ] Layout provides consistent sidebar, search, scroll progress across all docs pages
- [ ] Each page uses the same visual system as the original (colors, animations, typography)
- [ ] `prefers-reduced-motion` respected via globals.css (already done)
