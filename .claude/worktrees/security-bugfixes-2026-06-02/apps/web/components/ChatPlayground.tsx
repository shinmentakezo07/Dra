"use client";

import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Bot,
  Brain,
  ChevronDown,
  ChevronUp,
  Code2,
  Layout,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  StopCircle,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Mermaid from "./Mermaid";
import { AIThinkingProcess } from "./AIThinkingProcess";
import { GlassCard } from "./ui/glass-card";

interface StoredMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: number;
  [key: string]: unknown;
}

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
  notes?: string;
};

const STORAGE_KEY = "shinmen.chat.sessions.v1";
const ACTIVE_SESSION_KEY = "shinmen.chat.activeSessionId.v1";

function now() {
  return Date.now();
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function newId() {
  // Good enough for client-only session ids
  return `chat_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function deriveTitle(messages: StoredMessage[]): string {
  const firstUser = messages.find(
    (m) => m?.role === "user" && typeof m?.content === "string",
  );
  const raw = (firstUser?.content || "New Chat").trim();
  if (!raw) return "New Chat";
  return raw.length > 36 ? `${raw.slice(0, 36)}…` : raw;
}

export default function ChatPlayground() {
  const { messages, status, sendMessage, stop, setMessages } = useChat({
    api: "/api/chat",
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  // UI
  const [input, setInput] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);

  // Scrolling
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const isSwitchingRef = useRef(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Sessions: load on mount
  useEffect(() => {
    const loaded = safeJsonParse<ChatSession[]>(
      localStorage.getItem(STORAGE_KEY),
      [],
    );
    const storedActive = localStorage.getItem(ACTIVE_SESSION_KEY);

    if (loaded.length === 0) {
      const initial: ChatSession = {
        id: newId(),
        title: "New Chat",
        createdAt: now(),
        updatedAt: now(),
        messages: [],
        notes: "",
      };
      setSessions([initial]);
      setActiveSessionId(initial.id);
      setMessages([]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initial]));
      localStorage.setItem(ACTIVE_SESSION_KEY, initial.id);
      return;
    }

    setSessions(loaded);

    const pick = loaded.some((s) => s.id === storedActive)
      ? storedActive
      : loaded[0].id;
    setActiveSessionId(pick);

    const initialMessages = loaded.find((s) => s.id === pick)?.messages ?? [];
    setMessages(initialMessages);
  }, [setMessages]);

  // Persist active session id
  useEffect(() => {
    if (!activeSessionId) return;
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId]);

  // Persist messages into active session (autosave)
  useEffect(() => {
    if (isSwitchingRef.current) {
      isSwitchingRef.current = false;
      return;
    }
    if (!activeSessionId) return;
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const updatedMessages = messages as StoredMessage[];
        const nextTitle = deriveTitle(updatedMessages);
        return {
          ...s,
          title: nextTitle,
          updatedAt: now(),
          messages: updatedMessages,
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [messages, activeSessionId]);

  // ---- Scroll behavior
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowJumpToBottom(!atBottom);
  }, []);

  // Autoscroll only if user is already at bottom
  useEffect(() => {
    if (isAtBottom) scrollToBottom("smooth");
  }, [messages, isAtBottom, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Textarea autoresize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 220);
    el.style.height = `${next}px`;
  }, [input]);

  // ---- Actions
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput("");

    await sendMessage({ role: "user", content: text });
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleNewChat = () => {
    const session: ChatSession = {
      id: newId(),
      title: "New Chat",
      createdAt: now(),
      updatedAt: now(),
      messages: [],
      notes: "",
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    setActiveSessionId(session.id);
    setMessages([]);
    setInput("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleDeleteChat = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const safeNext = next.length
        ? next
        : [
            {
              id: newId(),
              title: "New Chat",
              createdAt: now(),
              updatedAt: now(),
              messages: [],
              notes: "",
            },
          ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeNext));

      // If we deleted active, move to next
      if (id === activeSessionId) {
        const newActive = safeNext[0].id;
        setActiveSessionId(newActive);
        setMessages(safeNext[0].messages);
      }

      return safeNext;
    });
  };

  const handleSwitchChat = (id: string) => {
    if (id === activeSessionId) return;
    isSwitchingRef.current = true;
    const session = sessions.find((s) => s.id === id);
    setActiveSessionId(id);
    setMessages(session?.messages ?? []);
    setInput("");
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      textareaRef.current?.focus();
    });
  };

  const handleQuickAction = (action: "review" | "explain" | "plan") => {
    const prompts: Record<typeof action, string> = {
      review:
        "Review the following code for correctness, efficiency (Big O), and style. Be strict like a senior engineer:\n\n",
      explain:
        "Explain this concept using a real-world analogy and a diagram:\n",
      plan: "Create a structured learning path/curriculum for: ",
    };

    setInput(prompts[action]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="flex h-[calc(100vh-140px)] max-w-7xl mx-auto w-full gap-4 p-4">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:flex flex-col gap-4 shrink-0"
          >
            <GlassCard className="flex flex-col overflow-hidden !bg-[#0A0A0A]/90 border-white/5">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  Sessions
                </h3>

                <button
                  onClick={handleNewChat}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="New chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 flex-1 overflow-y-auto space-y-1 hero-scroll">
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      className={
                        "group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer " +
                        (isActive
                          ? "bg-white/10 border-white/10"
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5")
                      }
                      onClick={() => handleSwitchChat(s.id)}
                    >
                      <div
                        className={
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border " +
                          (isActive
                            ? "bg-gradient-to-br from-violet-600 to-indigo-600 border-white/10"
                            : "bg-black/40 border-white/10")
                        }
                      >
                        <Bot
                          className={
                            "w-4 h-4 " +
                            (isActive ? "text-white" : "text-gray-300")
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-200 truncate">
                          {s.title || "New Chat"}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {new Date(s.updatedAt).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
                <div className="text-[10px] text-gray-500 font-mono uppercase">
                  Neural Processing
                </div>
                <AIThinkingProcess
                  steps={[
                    { title: "Context Analysis", status: "completed" },
                    { title: "Knowledge Retrieval", status: "completed" },
                    {
                      title: "Structure Generation",
                      status: isLoading ? "active" : "completed",
                    },
                    {
                      title: "Response Formatting",
                      status: isLoading ? "pending" : "completed",
                    },
                  ]}
                />
              </div>
            </GlassCard>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <GlassCard className="flex-1 flex flex-col overflow-hidden relative border-white/10 shadow-2xl bg-[#050505]/80">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/60 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors hidden md:block"
              title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/20 blur-lg rounded-full" />
                <div className="relative p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/20 border border-white/10">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Shinmen{" "}
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono">
                    v2.1
                  </span>
                </h2>
                <p className="text-[10px] text-gray-400 font-mono">
                  {activeSession?.title || "Research Assistant"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                onClick={() => stop?.()}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-colors flex items-center gap-2"
                title="Stop generating"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleClearChat}
                className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-gray-500 transition-colors border border-transparent hover:border-red-500/20"
                title="Clear current chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pt-20 pb-4 px-4 md:px-8 space-y-8 hero-scroll"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="max-w-xl">
                <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-violet-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  Chat ready
                </h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  Start a new conversation or use a quick action to guide
                  Shinmen.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        icon: Code2,
                        label: "Code Review",
                        action: "review" as const,
                      },
                      {
                        icon: Layout,
                        label: "Curriculum",
                        action: "plan" as const,
                      },
                      {
                        icon: Brain,
                        label: "Deep Dive",
                        action: "explain" as const,
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleQuickAction(item.action)}
                      className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 transition-all text-left"
                    >
                      <div className="mb-3 p-2 w-fit rounded-lg bg-black/40 border border-white/10 group-hover:border-violet-500/50 transition-colors">
                        <item.icon className="w-4 h-4 text-gray-300 group-hover:text-violet-300" />
                      </div>
                      <div className="text-sm font-semibold text-gray-100">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Tap to prefill prompt
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((mRaw: any) => {
              const m = mRaw;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role !== "user" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col max-w-[85%] gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">
                      {m.role === "user" ? "You" : "Shinmen"}
                    </span>

                    <div
                      className={`p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-sm ${
                        m.role === "user"
                          ? "bg-white/10 border border-white/10 text-white rounded-tr-none"
                          : "bg-black/40 border border-white/5 text-gray-200 rounded-tl-none"
                      }`}
                    >
                      {(
                        m as { toolInvocations?: Array<{ toolCallId: string }> }
                      ).toolInvocations?.map((toolInvocation: any) => {
                        const toolCallId = toolInvocation.toolCallId;
                        return null;
                      })}

                      {m.role === "user" ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                          {m.content}
                        </p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-300 prose-strong:text-white prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/10">
                          <ReactMarkdown
                            components={{
                              code(props) {
                                const { children, className, ...rest } =
                                  props as {
                                    children: React.ReactNode;
                                    className?: string;
                                    [key: string]: unknown;
                                  };
                                const match = /language-(\w+)/.exec(
                                  className || "",
                                );
                                const language = match ? match[1] : "";

                                if (language === "mermaid") {
                                  return <Mermaid chart={String(children)} />;
                                }

                                return match ? (
                                  <SyntaxHighlighter
                                    {...rest}
                                    PreTag="div"
                                    language={language}
                                    style={atomDark}
                                    customStyle={{
                                      margin: 0,
                                      borderRadius: "0.5rem",
                                      padding: "1.25rem",
                                      background: "transparent",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-200 font-mono text-xs border border-white/5">
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 justify-start"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-black/40 p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-3">
                <span className="text-xs text-gray-500 font-mono">
                  Thinking...
                </span>
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Jump to bottom */}
        <AnimatePresence>
          {showJumpToBottom && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-24 right-6 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/15 transition-colors flex items-center gap-2"
              title="Jump to latest"
            >
              <ChevronDown className="w-4 h-4" />
              Latest
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/5">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 max-w-4xl mx-auto w-full"
          >
            <div className="relative flex-1 group bg-white/5 rounded-2xl border border-white/10 focus-within:border-violet-500/50 focus-within:bg-black/60 transition-all overflow-hidden shadow-inner">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent text-white p-4 pr-12 max-h-[220px] min-h-[56px] focus:outline-none placeholder:text-gray-600 text-sm resize-none hero-scroll"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as React.FormEvent);
                  }
                }}
                placeholder="Ask Shinmen complex technical questions..."
                disabled={isLoading}
                rows={1}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title="Attach Context"
                >
                  <Layout className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/20 border border-violet-500/50 active:scale-95 h-[56px] w-[56px] flex items-center justify-center"
              title="Send"
            >
              {isLoading ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </form>

          <div className="text-center mt-3 flex justify-center items-center gap-4 text-[10px] text-gray-600 font-mono">
            <span className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              Shinmen
            </span>
            <span>•</span>
            <span>Markdown</span>
            <span>•</span>
            <span>Mermaid</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
