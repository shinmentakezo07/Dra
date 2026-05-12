"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Book, Code2, Zap, Key, Database, Shield, TrendingUp,
  Terminal, Globe, CheckCircle, ArrowRight, Copy, ExternalLink,
  Layers, Settings, BarChart3, Lock, Sparkles, AlertTriangle,
  Activity, Webhook, Search, MessageSquare, FileText, Cpu,
  Boxes, UploadCloud, ChevronRight, X, Lightbulb, Eye
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 }
  }
};

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const BASE_URL = "http://localhost:8080";

/* ------------------------------------------------------------------ */
/*  Code Block with Language Tabs                                      */
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

  return (
    <div className="relative group rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {examples ? (
            (Object.keys(examples) as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`text-xs font-mono font-medium px-2.5 py-1 rounded-md transition-all ${
                  activeLang === lang
                    ? "bg-primary/15 text-primary"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {langLabels[lang]}
              </button>
            ))
          ) : (
            <span className="text-xs font-mono font-medium text-white/40 uppercase">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-mono text-white/50 hover:text-white transition-all"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre className="p-5 overflow-x-auto font-mono text-[13px] leading-relaxed">
        <code className="text-green-400/90">{displayCode}</code>
      </pre>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Endpoint Card                                                      */
/* ------------------------------------------------------------------ */

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    POST: "bg-green-500/15 text-green-400 border-green-500/20",
    PUT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border ${
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
    <div className="rounded-xl border border-white/10 bg-[#0A0A0A] overflow-hidden hover:border-white/15 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <MethodBadge method={method} />
        <code className="text-white font-mono text-sm">{path}</code>
        {auth && (
          <Lock className="w-3.5 h-3.5 text-white/20 ml-auto flex-shrink-0" />
        )}
        <ChevronRight
          className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Section                                                            */
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
    className="mb-20 scroll-mt-28"
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
        {title}
      </h2>
    </div>
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      {children}
    </div>
  </motion.section>
);

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("quickstart");
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

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSearchOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-foreground relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] bg-blue-500/[0.04] rounded-full blur-[150px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/[0.03] rounded-full blur-[150px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                <Search className="w-5 h-5 text-white/30" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                />
                <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/40">
                  ESC
                </kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2 hero-scroll">
                {filteredNav.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-white/30">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  filteredNav.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
                    >
                      <item.icon className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors" />
                      <span className="text-sm text-white/70 group-hover:text-white">
                        {item.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto group-hover:text-white/40" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Documentation
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">
              Everything you need to integrate with the Yapapa AI Gateway. Explore endpoints, models, and code samples.
            </p>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/50 hover:text-white transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Search docs</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto playground-scroll pr-1">
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 px-3">
                On this page
              </h3>
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(item.id);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
                    activeSection === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      activeSection === item.id
                        ? "text-primary"
                        : "text-white/20 group-hover:text-white/40"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
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
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-mono text-xs">
                  {BASE_URL}
                </code>{" "}
                and the frontend on{" "}
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-mono text-xs">
                  http://localhost:3000
                </code>
                .
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    step: "1",
                    title: "Create an Account",
                    desc: "Sign up at /signup or call POST /auth/signup directly.",
                    link: "/signup",
                  },
                  {
                    step: "2",
                    title: "Authenticate",
                    desc: "Login via POST /auth/login to receive a JWT session cookie.",
                    link: "/login",
                  },
                  {
                    step: "3",
                    title: "Generate API Key",
                    desc: "Create a key at Dashboard → API Keys for programmatic access.",
                    link: "/dashboard/keys",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="relative p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm mb-4">
                      {s.step}
                    </div>
                    <h4 className="text-white font-semibold mb-2 text-sm">{s.title}</h4>
                    <p className="text-sm text-white/40 mb-4 leading-relaxed">{s.desc}</p>
                    <Link
                      href={s.link}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Go <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h4 className="text-white font-semibold mb-4">First API Call</h4>
                <CodeBlock
                  examples={{
                    curl: `curl -N ${BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Cookie: authjs.session-token=YOUR_JWT" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
                    js: `const res = await fetch("${BASE_URL}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const reader = res.body.getReader();
// handle SSE stream...`,
                    python: `import requests

res = requests.post(
    "${BASE_URL}/api/chat",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    },
    stream=True
)
for line in res.iter_lines():
    print(line.decode())`,
                    go: `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

body, _ := json.Marshal(map[string]any{
    "model": "openai/gpt-4o",
    "messages": []map[string]string{
        {"role": "user", "content": "Hello!"},
    },
})
req, _ := http.NewRequest("POST", "${BASE_URL}/api/chat", bytes.NewReader(body))
req.Header.Set("X-Api-Key", "YOUR_API_KEY")
resp, _ := http.DefaultClient.Do(req)`,
                  }}
                />
              </div>
            </Section>

            {/* Authentication */}
            <Section id="authentication" icon={Key} title="Authentication">
              <p>
                Yapapa supports two authentication methods: <strong>JWT Session Cookie</strong>{" "}
                (from NextAuth login) and <strong>API Key</strong> (for programmatic access).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <h4 className="text-white font-semibold text-sm">JWT Cookie Auth</h4>
                  </div>
                  <p className="text-sm text-white/40 mb-3">
                    Used by the web frontend. Pass the <code className="text-white/60">authjs.session-token</code> cookie automatically.
                  </p>
                  <CodeBlock code={`Cookie: authjs.session-token=eyJ...`} />
                </div>
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-green-400" />
                    <h4 className="text-white font-semibold text-sm">API Key Auth</h4>
                  </div>
                  <p className="text-sm text-white/40 mb-3">
                    For server-to-server calls. Include in the <code className="text-white/60">X-Api-Key</code> header.
                  </p>
                  <CodeBlock code={`X-Api-Key: yapapa_xxxxxxxxxxxxxxxx`} />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-500 font-semibold text-sm mb-2">Security Best Practices</h4>
                    <ul className="space-y-1.5 text-sm text-white/50">
                      <li>• Never commit API keys to version control</li>
                      <li>• Use environment variables to store keys</li>
                      <li>• Rotate keys regularly from the dashboard</li>
                      <li>• Revoke unused keys immediately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Section>

            {/* API Reference */}
            <Section id="api-reference" icon={Code2} title="API Reference">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-white/40">Base URL</span>
                <code className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-primary font-mono text-sm">
                  {BASE_URL}
                </code>
              </div>

              <h3 className="text-lg font-bold text-white mb-4">Public Endpoints</h3>
              <div className="space-y-3 mb-10">
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

              <h3 className="text-lg font-bold text-white mb-4">Protected Endpoints</h3>
              <div className="space-y-3">
                <EndpointCard method="GET" path="/auth/me" description="Get current authenticated user profile." />
                <EndpointCard method="PUT" path="/auth/profile" description="Update user name and email." />
                <EndpointCard method="PUT" path="/auth/password" description="Change password (requires current password)." />
                <EndpointCard method="GET" path="/api/keys" description="List all API keys for the current user." />
                <EndpointCard method="POST" path="/api/keys" description="Create a new API key with a name." />
                <EndpointCard method="DELETE" path="/api/keys/{id}" description="Permanently delete an API key." />
                <EndpointCard method="POST" path="/api/keys/{id}/revoke" description="Revoke an API key (soft delete)." />
                <EndpointCard method="GET" path="/api/credits" description="Get current credit balance and totals." />
                <EndpointCard method="POST" path="/api/credits/purchase" description="Purchase credits (demo mode)." />
                <EndpointCard method="GET" path="/api/transactions" description="Paginated credit transaction history." />
                <EndpointCard method="GET" path="/api/logs" description="Paginated API request logs with metrics." />
                <EndpointCard method="GET" path="/api/analytics" description="User analytics: usage, costs, model breakdown." />
                <EndpointCard method="GET" path="/api/models" description="List all available AI models from configured providers." />
              </div>

              <h3 className="text-lg font-bold text-white mb-4 mt-10">Admin Endpoints</h3>
              <div className="space-y-3">
                <EndpointCard method="GET" path="/api/admin/users" description="List all users (admin only)." />
                <EndpointCard method="GET" path="/api/admin/stats" description="Platform-wide statistics (admin only)." />
                <EndpointCard method="DELETE" path="/api/admin/users/{id}" description="Delete a user account (admin only)." />
              </div>
            </Section>

            {/* Chat & Streaming */}
            <Section id="chat" icon={MessageSquare} title="Chat & Streaming">
              <p>
                The <code className="text-white/60">POST /api/chat</code> endpoint proxies requests to configured LLM providers with automatic format translation, credit deduction, and request logging.
              </p>

              <div className="mt-6 space-y-4">
                <h4 className="text-white font-semibold">Request Body</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain quantum computing" }
  ]
}`}
                />

                <h4 className="text-white font-semibold pt-2">Streaming Response (SSE)</h4>
                <p className="text-sm text-white/40">
                  Responses are streamed as Server-Sent Events. Each chunk is prefixed with{" "}
                  <code className="text-white/60">data:</code> and the stream ends with{" "}
                  <code className="text-white/60">data: [DONE]</code>.
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
    "X-Api-Key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello!" }]
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  const lines = chunk.split("\\n").filter(l => l.trim());
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      const parsed = JSON.parse(data);
      const content = parsed.choices[0]?.delta?.content;
      if (content) process.stdout.write(content);
    }
  }
}`,
                    python: `import requests

res = requests.post(
    "${BASE_URL}/api/chat",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    },
    stream=True
)

for line in res.iter_lines():
    if line:
        text = line.decode("utf-8")
        if text.startswith("data: "):
            data = text[6:]
            if data == "[DONE]": break
            # parse JSON and extract content
            print(data)`,
                    go: `package main

import (
    "bufio"
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
)

func main() {
    body, _ := json.Marshal(map[string]any{
        "model": "openai/gpt-4o",
        "messages": []map[string]string{{"role": "user", "content": "Hello!"}},
    })
    req, _ := http.NewRequest("POST", "${BASE_URL}/api/chat", bytes.NewReader(body))
    req.Header.Set("X-Api-Key", "YOUR_API_KEY")
    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    scanner := bufio.NewScanner(resp.Body)
    for scanner.Scan() {
        line := scanner.Text()
        if strings.HasPrefix(line, "data: ") {
            data := strings.TrimPrefix(line, "data: ")
            if data == "[DONE]" { break }
            fmt.Println(data)
        }
    }
}`,
                  }}
                />
              </div>
            </Section>

            {/* Embeddings */}
            <Section id="embeddings" icon={Database} title="Embeddings">
              <p>
                Generate text embeddings via the <code className="text-white/60">POST /api/embeddings</code> endpoint. Currently powered by OpenAI-compatible providers.
              </p>

              <div className="mt-6 space-y-4">
                <h4 className="text-white font-semibold">Request</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "model": "text-embedding-3-small",
  "input": ["Hello world", "Quantum computing basics"]
}`}
                />
                <h4 className="text-white font-semibold pt-2">cURL Example</h4>
                <CodeBlock
                  code={`curl ${BASE_URL}/api/embeddings \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": ["Hello world"]
  }'`}
                />
              </div>
            </Section>

            {/* Conversations */}
            <Section id="conversations" icon={Boxes} title="Conversations">
              <p>
                Persist chat threads with the Conversations API. Each conversation stores a model choice, title, and associated messages.
              </p>

              <div className="mt-6 space-y-3">
                <EndpointCard method="POST" path="/api/conversations" description="Create a new conversation thread. Defaults to openai/gpt-4o if model is omitted." />
                <EndpointCard method="GET" path="/api/conversations" description="List conversations for the authenticated user with pagination." />
                <EndpointCard method="GET" path="/api/conversations/{id}" description="Get a single conversation with all messages." />
                <EndpointCard method="DELETE" path="/api/conversations/{id}" description="Delete a conversation and its messages." />
                <EndpointCard method="POST" path="/api/conversations/{id}/messages" description="Add a message to a conversation." />
              </div>

              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3">Example: Create & Add Message</h4>
                <CodeBlock
                  code={`# Create conversation
curl ${BASE_URL}/api/conversations \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{"title":"Project Ideas","model":"anthropic/claude-3-opus"}'

# Add message
curl ${BASE_URL}/api/conversations/CONV_ID/messages \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "role": "user",
    "content": "Suggest 5 SaaS ideas",
    "input_tokens": 5,
    "output_tokens": 0
  }'`}
                />
              </div>
            </Section>

            {/* Prompts */}
            <Section id="prompts" icon={FileText} title="Prompt Templates">
              <p>
                Store reusable prompt templates with variable substitution using{" "}
                <code className="text-white/60">{"{{variable}}"}</code> syntax. Render and execute templates in one call.
              </p>

              <div className="mt-6 space-y-3">
                <EndpointCard method="POST" path="/api/prompts" description="Create a named prompt template with optional model and config." />
                <EndpointCard method="GET" path="/api/prompts" description="List all prompt templates with pagination." />
                <EndpointCard method="GET" path="/api/prompts/{name}" description="Retrieve a prompt template by name." />
                <EndpointCard method="POST" path="/api/prompts/{name}/render" description="Render a template with variables and return the populated prompt." />
                <EndpointCard method="DELETE" path="/api/prompts/{name}" description="Delete all versions of a prompt template." />
              </div>

              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3">Example: Create & Render</h4>
                <CodeBlock
                  code={`# Create template
curl ${BASE_URL}/api/prompts \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "name": "code-review",
    "template": "Review this {{language}} code for bugs:\\n\\n{{code}}",
    "model": "openai/gpt-4o"
  }'

# Render template
curl ${BASE_URL}/api/prompts/code-review/render \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "variables": {
      "language": "Go",
      "code": "func main() { fmt.Println(\"hi\") }"
    }
  }'`}
                />
              </div>
            </Section>

            {/* Batch */}
            <Section id="batch" icon={Layers} title="Batch API">
              <p>
                Submit up to 100 chat requests in a single batch. Jobs are processed concurrently with configurable workers.
              </p>

              <div className="mt-6 space-y-3">
                <EndpointCard method="POST" path="/api/batch" description="Submit a batch of chat completion jobs. Max 100 items." />
                <EndpointCard method="GET" path="/api/batch/{id}" description="Get batch job status (placeholder)." />
              </div>

              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3">Batch Request</h4>
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

              <div className="mt-6 rounded-xl border border-white/10 bg-[#0A0A0A] p-5">
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
                    className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center"
                  >
                    <div className="text-3xl font-black text-primary mb-1">{stat.value}</div>
                    <div className="text-sm text-white font-medium mb-1">{stat.label}</div>
                    <div className="text-xs text-white/30">{stat.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-500 font-semibold text-sm mb-2">Rate Limit Headers</h4>
                    <p className="text-sm text-white/40 mb-3">Every response includes rate limit metadata:</p>
                    <CodeBlock code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000`} />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-500 font-semibold text-sm mb-2">Handling 429 Errors</h4>
                    <p className="text-sm text-white/40 mb-3">
                      When rate limited, retry with exponential backoff:
                    </p>
                    <CodeBlock
                      language="python"
                      code={`import time

def request_with_retry(fn, max_retries=3):
    for attempt in range(max_retries):
        resp = fn()
        if resp.status_code == 429:
            time.sleep(2 ** attempt)
            continue
        return resp
    raise Exception("Rate limited")`}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Error Handling */}
            <Section id="error-handling" icon={AlertTriangle} title="Error Handling">
              <p>
                Yapapa uses standard HTTP status codes with JSON error bodies. All errors follow a consistent envelope format.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  { code: "400", name: "Bad Request", desc: "Invalid JSON or missing required fields", border: "border-red-500/20", badge: "bg-red-500/15 text-red-400" },
                  { code: "401", name: "Unauthorized", desc: "Missing or invalid API key / JWT", border: "border-yellow-500/20", badge: "bg-yellow-500/15 text-yellow-400" },
                  { code: "402", name: "Insufficient Credits", desc: "Account balance too low for request", border: "border-orange-500/20", badge: "bg-orange-500/15 text-orange-400" },
                  { code: "403", name: "Forbidden", desc: "Access denied to this resource", border: "border-purple-500/20", badge: "bg-purple-500/15 text-purple-400" },
                  { code: "404", name: "Not Found", desc: "Resource does not exist", border: "border-blue-500/20", badge: "bg-blue-500/15 text-blue-400" },
                  { code: "429", name: "Rate Limited", desc: "Too many requests", border: "border-pink-500/20", badge: "bg-pink-500/15 text-pink-400" },
                  { code: "500", name: "Server Error", desc: "Internal server error", border: "border-red-500/20", badge: "bg-red-500/15 text-red-400" },
                  { code: "502", name: "Bad Gateway", desc: "Upstream provider error", border: "border-cyan-500/20", badge: "bg-cyan-500/15 text-cyan-400" },
                  { code: "503", name: "Service Unavailable", desc: "Provider temporarily down", border: "border-indigo-500/20", badge: "bg-indigo-500/15 text-indigo-400" },
                ].map((err) => (
                  <div
                    key={err.code}
                    className={`p-4 rounded-xl bg-[#0A0A0A] border ${err.border}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold ${err.badge}`}>
                        {err.code}
                      </span>
                      <h4 className="text-white font-semibold text-sm">{err.name}</h4>
                    </div>
                    <p className="text-xs text-white/40">{err.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3">Error Response Format</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "success": false,
  "error": "Invalid model specified",
  "data": null
}`}
                />
              </div>
            </Section>

            {/* Models */}
            <Section id="models" icon={Cpu} title="Available Models">
              <p>
                Yapapa provides access to 100+ models through OpenRouter and direct provider integrations. Use{" "}
                <code className="text-white/60">GET /api/models</code> to fetch the live list.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                  { name: "GPT-4o", provider: "OpenAI", context: "128K", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
                  { name: "Claude 3 Opus", provider: "Anthropic", context: "200K", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                  { name: "Gemini 1.5 Pro", provider: "Google", context: "1M", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                  { name: "Llama 3 70B", provider: "Meta", context: "8K", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                  { name: "DeepSeek V3", provider: "DeepSeek", context: "64K", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
                  { name: "Mistral Large", provider: "Mistral", context: "32K", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                ].map((model) => (
                  <div
                    key={model.name}
                    className={`p-5 rounded-xl bg-[#0A0A0A] border ${model.border} hover:bg-white/[0.02] transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">{model.name}</h4>
                      <span className={`px-2 py-0.5 rounded-lg ${model.bg} ${model.color} text-[11px] font-mono font-bold`}>
                        {model.context}
                      </span>
                    </div>
                    <p className="text-xs text-white/30">{model.provider}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/models"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium mt-6"
              >
                Browse all models <ExternalLink className="w-4 h-4" />
              </Link>
            </Section>

            {/* Pricing */}
            <Section id="pricing" icon={TrendingUp} title="Pricing & Credits">
              <p>
                Yapapa uses a pay-as-you-go credit system. Costs are calculated per token with transparent pricing.
              </p>

              <div className="mt-6 p-6 rounded-xl bg-[#0A0A0A] border border-white/10">
                <h4 className="text-white font-semibold mb-4">How Credits Work</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "1 credit = $0.000001 USD (1 microcent)",
                    "Costs calculated per token (input + output)",
                    "Real-time usage tracking in dashboard",
                    "No monthly fees or subscriptions",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-white/50">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium mt-6"
              >
                View detailed pricing <ExternalLink className="w-4 h-4" />
              </Link>
            </Section>

            {/* Dashboard */}
            <Section id="dashboard" icon={BarChart3} title="Dashboard">
              <p>
                Monitor usage, manage API keys, and track costs through the web dashboard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {[
                  { title: "Overview", desc: "Real-time metrics and quick stats", icon: BarChart3, link: "/dashboard" },
                  { title: "API Keys", desc: "Generate and manage access keys", icon: Key, link: "/dashboard/keys" },
                  { title: "Logs", desc: "Request history with full details", icon: Terminal, link: "/dashboard/logs" },
                  { title: "Analytics", desc: "Usage trends and cost analysis", icon: TrendingUp, link: "/dashboard/analytics" },
                ].map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.link}
                    className="p-5 rounded-xl bg-[#0A0A0A] border border-white/10 hover:border-primary/40 transition-all group"
                  >
                    <feature.icon className="w-7 h-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="text-white font-semibold text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-white/30">{feature.desc}</p>
                  </Link>
                ))}
              </div>
            </Section>

            {/* Security */}
            <Section id="security" icon={Lock} title="Security">
              <p>
                Yapapa implements multiple layers of security to protect your data and API access.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  { title: "TLS 1.3", desc: "All API traffic encrypted in transit" },
                  { title: "bcrypt Hashing", desc: "Passwords never stored in plaintext" },
                  { title: "JWT + API Keys", desc: "Dual authentication system" },
                  { title: "Sliding Window Rate Limits", desc: "Automatic abuse protection" },
                  { title: "CORS Protection", desc: "Configured allowed origins" },
                  { title: "Request Logging", desc: "Full audit trail with metrics" },
                ].map((s) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-medium text-sm">{s.title}</h4>
                      <p className="text-xs text-white/30 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Code Examples */}
            <Section id="examples" icon={Terminal} title="Code Examples">
              <p>
                Complete integration examples in popular languages. All examples assume{" "}
                <code className="text-white/60">{BASE_URL}</code> as the base URL.
              </p>

              <div className="mt-6 space-y-8">
                <motion.div variants={fadeIn}>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-[11px] font-mono font-bold">
                      Python
                    </span>
                  </h4>
                  <CodeBlock
                    language="python"
                    code={`import requests

API_KEY = "YOUR_API_KEY"
BASE = "${BASE_URL}"

# Chat completion (non-streaming)
res = requests.post(
    f"{BASE}/api/chat",
    headers={"X-Api-Key": API_KEY},
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)
print(res.json())

# List models
models = requests.get(f"{BASE}/api/models", headers={"X-Api-Key": API_KEY})
print(models.json())

# Get credits
credits = requests.get(f"{BASE}/api/credits", headers={"X-Api-Key": API_KEY})
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
              className="relative rounded-2xl p-10 md:p-14 border border-white/10 text-center overflow-hidden mt-20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent" />
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                  Ready to Build?
                </h3>
                <p className="text-white/40 mb-8 max-w-lg mx-auto text-sm md:text-base">
                  Start integrating with 100+ AI models through one unified, credit-based API.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="px-7 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all flex items-center gap-2"
                  >
                    Sign Up Free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/playground"
                    className="px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all"
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
