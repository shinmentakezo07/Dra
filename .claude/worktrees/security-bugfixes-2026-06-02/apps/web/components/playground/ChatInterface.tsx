"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Bot,
  Orbit,
  Zap,
  Check,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Message, ChatSession, EnrichedModel } from "./types";
import { getProviderColor, getProviderColorClass } from "./ProviderColors";

type ModelInfo = EnrichedModel;

interface ChatInterfaceProps {
  sessions: ChatSession[];
  sharedMessages: Message[];
  inputMessage: string;
  setInputMessage: (v: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onReset: () => void;
  onAddModel: () => void;
  streamingContent?: Record<string, string>;
  streamErrors?: Record<string, string>;
}

function EmptyState({ onAddModel }: { onAddModel: () => void }) {
  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      {/* Orbital animation background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[500px] h-[500px]">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border border-white/[0.02]" />
          <motion.div
            className="absolute inset-0 rounded-full border border-white/[0.02]"
            animate={{ rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500/20" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-500/15" />
          </motion.div>
          {/* Middle ring */}
          <motion.div
            className="absolute inset-10 rounded-full border border-white/[0.03]"
            animate={{ rotate: -360 }}
            transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-500/20" />
            <div className="absolute top-1/4 right-0 translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-500/15" />
          </motion.div>
          {/* Inner ring */}
          <motion.div
            className="absolute inset-20 rounded-full border border-white/[0.04]"
            animate={{ rotate: 360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-500/20" />
          </motion.div>
          {/* Center glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/8 to-violet-500/8 blur-2xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="relative z-10 text-center max-w-md mx-auto px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 border border-blue-500/15 flex items-center justify-center mx-auto mb-6"
        >
          <Orbit className="w-8 h-8 text-blue-400/80" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
          className="text-2xl font-bold text-white/90 tracking-tight mb-3"
        >
          Neural Command Center
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
          className="text-sm text-gray-500 leading-relaxed mb-8"
        >
          Select AI models to compare their responses side-by-side. Test prompts
          across multiple providers simultaneously.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAddModel}
          className="relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600/90 to-violet-600/90 hover:from-blue-500 hover:to-violet-500 rounded-xl font-semibold text-sm text-white shadow-[0_0_28px_rgba(59,130,246,0.15)] hover:shadow-[0_0_36px_rgba(59,130,246,0.3)] transition-shadow overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Zap className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Select Models to Start</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

function UserMessageBubble({ message }: { message: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="flex justify-end mb-6"
    >
      <div className="relative max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
        <div className="absolute -inset-[1px] bg-gradient-to-br from-cyan-500/15 to-blue-500/8 rounded-2xl blur-sm opacity-50" />
        <div className="relative px-5 py-3.5 bg-gradient-to-br from-[#0d1117] to-[#0a0e14] border border-cyan-500/15 rounded-2xl rounded-tr-sm">
          <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <span className="block text-[10px] text-gray-700 font-mono mt-2 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ModelResponseCard({
  model,
  message,
  streamingContent,
  isStreaming,
  error,
}: {
  model: ModelInfo;
  message?: Message;
  streamingContent: string;
  isStreaming: boolean;
  error?: string;
}) {
  const [copied, setCopied] = useState(false);
  const content = message?.content || streamingContent;

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerColor = getProviderColor(model.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="relative group"
    >
      <div
        className="absolute -inset-[1px] rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${providerColor}20, ${providerColor}08)`,
        }}
      />
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-[#060608]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div
          className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]"
          style={{
            background: `linear-gradient(135deg, ${providerColor}08, transparent 60%)`,
          }}
        >
          <div className="flex items-center gap-2.5">
            {model.logo && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-white/[0.03] ring-1 ring-white/[0.06]">
                <Image
                  src={model.logo}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white/80 truncate max-w-[120px]">
                {model.name.split(":")[0]}
              </span>
              <span className="text-[10px] text-gray-600 font-mono truncate max-w-[120px]">
                {model.id.split(":").slice(-1)[0]}
              </span>
            </div>
          </div>

          {content && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="relative p-1.5 rounded-lg text-gray-600 hover:text-white/80 hover:bg-white/[0.04] transition-all"
              title="Copy response"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </motion.button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3 min-h-[120px]">
          {!content && !isStreaming && (
            <div className="flex items-center justify-center h-[120px] text-gray-700 text-sm">
              Waiting for response...
            </div>
          )}

          {isStreaming && !content && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-gray-600"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-gray-600"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.15,
                  }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-gray-600"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3,
                  }}
                />
              </div>
              <span className="text-xs text-gray-700">Thinking...</span>
            </div>
          )}

          {error && !content && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="text-xs text-red-400">Error: {error}</span>
            </div>
          )}

          {content && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
              {isStreaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChatSessionCard({
  session,
  message,
}: {
  session: ChatSession;
  message?: Message;
}) {
  const [copied, setCopied] = useState(false);
  const color = getProviderColor(session.model.id);
  const colorClass = getProviderColorClass(session.model.id);

  const handleCopy = async () => {
    if (!message?.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
        style={{
          background: `linear-gradient(135deg, ${color}15, transparent)`,
        }}
      />

      <div className="relative rounded-2xl border border-white/[0.06] bg-[#08080a]/90 backdrop-blur-sm overflow-hidden">
        {/* Provider accent line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden">
              {session.model.logo ? (
                <Image
                  src={session.model.logo}
                  alt=""
                  width={18}
                  height={18}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Bot className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {session.model.name}
              </p>
              <p className={`text-[10px] font-mono ${colorClass}`}>
                {session.model.provider}
              </p>
            </div>
          </div>

          {session.isTyping ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ backgroundColor: color }}
                />
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Generating
              </span>
            </div>
          ) : message ? (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="px-4 py-4 min-h-[80px]">
          {session.isTyping && !message ? (
            <div className="flex items-center gap-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-mono">
                Processing request...
              </span>
            </div>
          ) : message ? (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatInterface({
  sessions,
  sharedMessages,
  inputMessage,
  setInputMessage,
  isLoading,
  onSend,
  onReset,
  onAddModel,
  streamingContent = {},
  streamErrors = {},
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sharedMessages, sessions]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [inputMessage]);

  if (sessions.length === 0) {
    return <EmptyState onAddModel={onAddModel} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 playground-scroll">
        {sharedMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-sm text-gray-500 font-mono">
                Send a message to compare models
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* For each user message, show the model response cards */}
            {sharedMessages
              .map((msg, idx) => ({ msg, idx }))
              .filter(({ msg }) => msg.role === "user")
              .map(({ msg, idx }) => {
                const isLast =
                  idx ===
                  sharedMessages.filter((m) => m.role === "user").length - 1;

                return (
                  <div key={idx} className="space-y-6">
                    <UserMessageBubble message={msg} />
                    <div
                      className={`grid gap-4 ${
                        sessions.length === 1
                          ? "grid-cols-1"
                          : sessions.length === 2
                            ? "grid-cols-1 md:grid-cols-2"
                            : sessions.length === 3
                              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                              : "grid-cols-1 md:grid-cols-2"
                      }`}
                    >
                      {sessions.map((session) => {
                        // Find the response for this user message turn
                        const responseIndex = sharedMessages
                          .slice(0, idx + 1)
                          .filter((m) => m.role === "user").length;
                        const response = session.messages[responseIndex - 1];
                        const isCurrentlyStreaming =
                          session.isTyping && !!streamingContent[session.id];

                        return (
                          <ModelResponseCard
                            key={session.id}
                            model={session.model}
                            message={response}
                            streamingContent={
                              streamingContent[session.id] || ""
                            }
                            isStreaming={isCurrentlyStreaming}
                            error={streamErrors[session.id]}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative border-t border-white/[0.04] bg-[#030305]/60 backdrop-blur-2xl shrink-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/8 to-transparent" />
        <div className="max-w-4xl mx-auto p-4">
          <div className="relative group">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-violet-500/0 group-focus-within:from-cyan-500/20 group-focus-within:via-blue-500/20 group-focus-within:to-violet-500/20 transition-all duration-500 blur-sm" />
            <div className="relative flex items-end gap-2 p-2 bg-[#0a0a0d]/90 border border-white/[0.06] group-focus-within:border-white/[0.12] rounded-2xl transition-colors">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Send a message..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 resize-none outline-none px-2 py-1.5 max-h-32 min-h-[40px]"
                disabled={isLoading}
              />
              <motion.button
                type="button"
                onClick={onSend}
                disabled={!inputMessage.trim() || isLoading}
                whileHover={{
                  scale: inputMessage.trim() && !isLoading ? 1.05 : 1,
                }}
                whileTap={{
                  scale: inputMessage.trim() && !isLoading ? 0.95 : 1,
                }}
                className="relative p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white disabled:opacity-20 disabled:cursor-not-allowed disabled:from-gray-800 disabled:to-gray-800 transition-all overflow-hidden shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-focus-within:translate-x-full transition-transform duration-700" />
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                ) : (
                  <Send className="w-4 h-4 relative z-10" />
                )}
              </motion.button>
            </div>
          </div>
          <p className="text-[10px] text-gray-800 text-center mt-2 font-mono">
            Responses may be inaccurate. Verify critical information.
          </p>
        </div>
      </div>
    </div>
  );
}
