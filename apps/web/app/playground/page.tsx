"use client";

import {
  motion,
  useMotionValue,
  useMotionTemplate,
  AnimatePresence,
} from "framer-motion";
import {
  Edit3,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import openRouterModels from "../models/openrouter-models-2026.json";
import { getProviderLogo } from "@/lib/provider-logos";
import {
  HistoryChat,
  ChatSession,
  Message,
  EnrichedModel,
} from "@/components/playground/types";
import ModelSelector from "@/components/playground/ModelSelector";
import ChatInterface from "@/components/playground/ChatInterface";
import { getProviderColor } from "@/components/playground/ProviderColors";
import { getSDK, configureSDK, ChatMessage } from "@/lib/api/sdk";

const HISTORY_KEY = "yapapa.playground.history.v2";
const ACTIVE_KEY = "yapapa.playground.activeChatId.v2";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
  modelId: z.string().optional(),
});

const EnrichedModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable().optional(),
  provider: z.string(),
  context_length: z.number().optional(),
  pricing: z
    .object({
      prompt: z.string().optional(),
      completion: z.string().optional(),
    })
    .optional(),
  description: z.string().optional(),
});

const ChatSessionSchema = z.object({
  id: z.string(),
  model: EnrichedModelSchema,
  messages: z.array(MessageSchema),
  isTyping: z.boolean(),
});

const HistoryChatSchema = z.object({
  id: z.string(),
  title: z.string(),
  sharedMessages: z.array(MessageSchema),
  sessions: z.array(ChatSessionSchema),
  selectedModels: z.array(EnrichedModelSchema),
  updatedAt: z.number(),
});

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  const raw = first?.content || "New Chat";
  return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
}

function enrichModels(models: any[]): EnrichedModel[] {
  return models.map((model) => ({
    id: model.id,
    name: model.name,
    logo: getProviderLogo(model.id),
    provider: model.id.split("/")[0],
    context_length: model.context_length,
    pricing: model.pricing,
    description: model.description,
  }));
}

export default function PlaygroundPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedModels, setSelectedModels] = useState<EnrichedModel[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(isLoading);
  const [sharedMessages, setSharedMessages] = useState<Message[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [chatHistory, setChatHistory] = useState<HistoryChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [streamingContent, setStreamingContent] = useState<
    Record<string, string>
  >({});
  const [streamErrors, setStreamErrors] = useState<Record<string, string>>({});

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightBackground = useMotionTemplate`
    radial-gradient(
      700px circle at ${mouseX}px ${mouseY}px,
      rgba(59,130,246,0.08),
      transparent 55%
    )
  `;

  const allModels = enrichModels(openRouterModels);

  useEffect(() => {
    setIsMounted(true);
    configureSDK({
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080",
    });
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    const savedActive = localStorage.getItem(ACTIVE_KEY);
    if (savedHistory) {
      try {
        const raw = JSON.parse(savedHistory);
        const parsed = z.array(HistoryChatSchema).safeParse(raw);
        if (parsed.success) {
          const history = parsed.data;
          setChatHistory(history);
          if (savedActive && history.some((c) => c.id === savedActive)) {
            setActiveChatId(savedActive);
            const chat = history.find((c) => c.id === savedActive)!;
            setSharedMessages(chat.sharedMessages);
            setSessions(chat.sessions.map((s) => ({ ...s, isTyping: false })));
            setSelectedModels(chat.selectedModels);
          }
        }
      } catch {
        // ignore corrupt history
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory));
  }, [chatHistory, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(ACTIVE_KEY, activeChatId || "");
  }, [activeChatId, isMounted]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    function handleMouseMove({
      clientX,
      clientY,
    }: {
      clientX: number;
      clientY: number;
    }) {
      mouseX.set(clientX);
      mouseY.set(clientY);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const saveCurrentChat = useCallback(() => {
    if (sharedMessages.length === 0) return;
    const title = deriveTitle(sharedMessages);
    const chat: HistoryChat = {
      id:
        activeChatId ||
        `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      sharedMessages,
      sessions: sessions.map((s) => ({ ...s, isTyping: false })),
      selectedModels,
      updatedAt: Date.now(),
    };
    setChatHistory((prev) => {
      const filtered = prev.filter((c) => c.id !== chat.id);
      return [chat, ...filtered].slice(0, 50);
    });
    return chat.id;
  }, [sharedMessages, activeChatId, sessions, selectedModels]);

  const handleNewChat = useCallback(() => {
    if (sharedMessages.length > 0) {
      saveCurrentChat();
    }
    setSharedMessages([]);
    setSessions([]);
    setSelectedModels([]);
    const newId = `chat_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    setActiveChatId(newId);
  }, [sharedMessages, saveCurrentChat]);

  const handleLoadChat = useCallback(
    (chat: HistoryChat) => {
      if (chat.id === activeChatId) return;
      if (sharedMessages.length > 0) {
        saveCurrentChat();
      }
      setActiveChatId(chat.id);
      setSharedMessages(chat.sharedMessages);
      setSessions(chat.sessions.map((s) => ({ ...s, isTyping: false })));
      setSelectedModels(chat.selectedModels);
    },
    [activeChatId, sharedMessages, saveCurrentChat],
  );

  const handleDeleteChat = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setChatHistory((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        setActiveChatId(null);
        setSharedMessages([]);
        setSessions([]);
        setSelectedModels([]);
      }
    },
    [activeChatId],
  );

  const confirmModels = useCallback((models: EnrichedModel[]) => {
    // Replace selected models and rebuild sessions
    // Preserve session messages for models that were already selected
    setSelectedModels(models);
    setSessions((prevSessions) => {
      const newSessions: ChatSession[] = models.map((model) => {
        const existing = prevSessions.find((s) => s.id === model.id);
        if (existing) {
          return { ...existing, model };
        }
        return { id: model.id, model, messages: [], isTyping: false };
      });
      return newSessions;
    });
    setShowModelSelector(false);
  }, []);

  const removeModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => prev.filter((m) => m.id !== modelId));
    setSessions((prev) => prev.filter((s) => s.id !== modelId));
  }, []);

  const resetChat = useCallback(() => {
    if (sharedMessages.length > 0) {
      saveCurrentChat();
    }
    setSharedMessages([]);
    setSessions((prev) =>
      prev.map((s) => ({ ...s, messages: [], isTyping: false })),
    );
  }, [sharedMessages, saveCurrentChat]);

  const sendMessage = useCallback(async () => {
    if (
      !inputMessage.trim() ||
      selectedModels.length === 0 ||
      isLoadingRef.current
    )
      return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: Date.now(),
    };

    setSharedMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setStreamErrors({});
    setStreamingContent({});

    setSessions((prev) => prev.map((s) => ({ ...s, isTyping: true })));

    // Fire all model streams in parallel
    const promises = selectedModels.map(async (model) => {
      const messages: ChatMessage[] = sharedMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }))
        .concat({ role: "user", content: inputMessage });

      try {
        const stream = getSDK().chatStream({ model: model.id, messages });
        let accumulated = "";

        for await (const chunk of stream) {
          accumulated += chunk;
          setStreamingContent((prev) => ({ ...prev, [model.id]: accumulated }));
        }

        // Stream complete — save to session
        const assistantMessage: Message = {
          role: "assistant",
          content: accumulated,
          timestamp: Date.now(),
          modelId: model.id,
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === model.id
              ? {
                  ...s,
                  messages: [...s.messages, assistantMessage],
                  isTyping: false,
                }
              : s,
          ),
        );
        // Clear streaming content since it's now in the session
        setStreamingContent((prev) => {
          const next = { ...prev };
          delete next[model.id];
          return next;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setStreamErrors((prev) => ({ ...prev, [model.id]: errorMessage }));
        setSessions((prev) =>
          prev.map((s) => (s.id === model.id ? { ...s, isTyping: false } : s)),
        );
        setStreamingContent((prev) => {
          const next = { ...prev };
          delete next[model.id];
          return next;
        });
      }
    });

    // Wait for all streams, then clear loading
    await Promise.all(promises);
    setIsLoading(false);
  }, [inputMessage, selectedModels, sharedMessages]);

  if (!isMounted) return null;

  return (
    <div className="h-screen bg-[#020202] text-white relative overflow-hidden flex">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-[#050508] to-[#020202]" />
        {/* Grid with softer mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_40%,transparent_100%)]" />
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Spotlight follow */}
        <motion.div
          className="absolute inset-0 opacity-40"
          style={{ background: spotlightBackground }}
        />
        {/* Deep radial fade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,#020202_100%)]" />
        {/* Floating orbs — refined */}
        <motion.div
          className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/[0.04] blur-[140px]"
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full bg-violet-600/[0.03] blur-[120px]"
          animate={{ x: [0, -35, 0], y: [0, 25, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[60%] left-[60%] w-[300px] h-[300px] rounded-full bg-cyan-500/[0.02] blur-[100px]"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-20 flex flex-col border-r border-white/[0.04] bg-[#030305]/95 backdrop-blur-2xl overflow-hidden shrink-0"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/[0.06] group-hover:border-white/10 transition-colors">
                  <Image
                    src="/nervous-cat.jpg"
                    alt="Yapapa"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <span className="font-bold text-sm tracking-tight">
                    Yapapa
                  </span>
                  <span className="text-[9px] text-gray-600 block font-mono">
                    AI Playground
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 py-3">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/10 to-violet-600/10 hover:from-blue-600/20 hover:to-violet-600/20 border border-blue-500/10 hover:border-blue-500/20 text-sm font-semibold transition-all"
              >
                <Edit3 className="w-4 h-4" />
                New Chat
              </motion.button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 playground-scroll">
              <div className="space-y-0.5">
                {chatHistory.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <motion.div
                      key={chat.id}
                      onClick={() => handleLoadChat(chat)}
                      whileHover={{ scale: 1.005 }}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        isActive
                          ? "bg-white/[0.04] border-white/[0.06]"
                          : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/[0.03]"
                      }`}
                    >
                      <MessageSquare
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-white/80"
                            : "text-gray-700 group-hover:text-gray-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs truncate ${
                            isActive
                              ? "text-white/90 font-medium"
                              : "text-gray-500 group-hover:text-gray-400"
                          }`}
                        >
                          {chat.title}
                        </div>
                        <div className="text-[10px] text-gray-700 font-mono truncate">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-gray-700 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
                {chatHistory.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-800" />
                    <p className="text-xs text-gray-700 font-mono">
                      No chats yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar Toggle */}
      <AnimatePresence>
        {!showSidebar && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => setShowSidebar(true)}
            className="absolute top-4 left-4 z-30 p-2.5 rounded-xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/15 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4 text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="relative border-b border-white/[0.04] bg-[#030305]/70 backdrop-blur-2xl shrink-0">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div
                className={`flex items-center gap-4 ${!showSidebar ? "ml-14 md:ml-0" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/[0.06] shadow-[0_0_24px_rgba(59,130,246,0.08)]"
                  >
                    <Image
                      src="/nervous-cat.jpg"
                      alt="Yapapa"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-xl" />
                  </motion.div>
                  <div className="flex flex-col">
                    <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent tracking-tight">
                      AI Playground
                    </h1>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600 font-mono">
                        Compare Models
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Model Pills + Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {selectedModels.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 max-w-md overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      {selectedModels.map((model) => (
                        <motion.div
                          key={model.id}
                          layout
                          initial={{ opacity: 0, scale: 0.85, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -8 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          className="group flex items-center gap-2 pl-2 pr-1.5 py-1 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] rounded-full transition-colors"
                          style={{
                            boxShadow: `0 0 16px ${getProviderColor(model.id)}08`,
                          }}
                        >
                          {model.logo && (
                            <div className="relative w-4 h-4 rounded-full overflow-hidden bg-white/[0.03] shrink-0">
                              <Image
                                src={model.logo}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <span className="text-[11px] font-medium text-white/70 truncate max-w-[100px]">
                            {model.name.split(":")[0]}
                          </span>
                          <button
                            onClick={() => removeModel(model.id)}
                            className="p-0.5 rounded-full text-white/20 hover:text-white hover:bg-white/10 transition-colors"
                            title="Remove model"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Mobile model count */}
                {selectedModels.length > 0 && (
                  <div className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.02] border border-white/[0.04] text-xs font-medium text-white/60">
                    <span className="text-emerald-400">●</span>
                    {selectedModels.length}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowModelSelector(true)}
                  className="relative px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600/90 to-violet-600/90 hover:from-blue-500 hover:to-violet-500 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-[0_0_24px_rgba(59,130,246,0.12)] hover:shadow-[0_0_32px_rgba(59,130,246,0.25)] transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  <Plus className="w-4 h-4 relative z-10" />
                  <span className="hidden sm:inline relative z-10">
                    {selectedModels.length > 0 ? "Manage Models" : "Add Models"}
                  </span>
                  <span className="sm:hidden relative z-10">
                    {selectedModels.length > 0 ? "Manage" : "Add"}
                  </span>
                  {selectedModels.length > 0 && (
                    <span className="ml-0.5 text-[10px] font-bold opacity-60 relative z-10">
                      {selectedModels.length}/4
                    </span>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <ChatInterface
          sessions={sessions}
          sharedMessages={sharedMessages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          isLoading={isLoading}
          onSend={sendMessage}
          onReset={resetChat}
          onAddModel={() => setShowModelSelector(true)}
          streamingContent={streamingContent}
          streamErrors={streamErrors}
        />
      </div>

      {/* Model Selector Modal */}
      <ModelSelector
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        models={allModels}
        selectedModels={selectedModels}
        onConfirm={confirmModels}
      />
    </div>
  );
}
