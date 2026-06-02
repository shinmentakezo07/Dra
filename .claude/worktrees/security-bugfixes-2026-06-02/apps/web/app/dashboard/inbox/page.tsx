"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSDK } from "@/lib/api/sdk";
import {
  Mail,
  CheckCheck,
  Bell,
  AlertTriangle,
  Info,
  Shield,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRIORITY_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  critical: { icon: Shield, color: "text-red-400", bg: "border-red-500/20" },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "border-yellow-500/20",
  },
  info: { icon: Info, color: "text-blue-400", bg: "border-blue-500/20" },
  low: { icon: Bell, color: "text-gray-400", bg: "border-white/10" },
  normal: { icon: Bell, color: "text-gray-400", bg: "border-white/10" },
};

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["user", "messages"],
    queryFn: () => getSDK().getUserMessages(),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["user", "messages", "unread"],
    queryFn: () => getSDK().getUserMessageUnreadCount(),
  });

  const { data: announcements } = useQuery({
    queryKey: ["user", "announcements"],
    queryFn: () => getSDK().getUserAnnouncements(),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => getSDK().markMessageRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "messages"] });
      queryClient.invalidateQueries({
        queryKey: ["user", "messages", "unread"],
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => getSDK().markAllMessagesRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "messages"] });
      queryClient.invalidateQueries({
        queryKey: ["user", "messages", "unread"],
      });
    },
  });

  const messages = data ?? [];
  const unreadCount = unreadData?.unread ?? 0;
  const activeAnnouncements = announcements ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Announcements Section */}
      {activeAnnouncements.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setAnnouncementsExpanded(!announcementsExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors w-full"
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Announcements ({activeAnnouncements.length})</span>
            {announcementsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>

          <AnimatePresence>
            {announcementsExpanded &&
              activeAnnouncements.map((a) => {
                const config =
                  PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.info;

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`bg-[#0A0A0A] border rounded-xl p-4 flex items-start gap-3 ${config.bg} hover:bg-white/[0.02] transition-colors`}
                  >
                    <Megaphone
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">
                          {a.title}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${config.color} ${config.bg}`}
                        >
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                        {a.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>
                          {new Date(a.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {a.endDate && (
                          <span className="text-yellow-500/60">
                            Ends {new Date(a.endDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      )}

      {/* Messages Section */}
      <div className="space-y-2">
        {activeAnnouncements.length > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400 pt-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span>Messages</span>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const config =
              PRIORITY_CONFIG[msg.priority] || PRIORITY_CONFIG.info;
            const Icon = config.icon;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`bg-[#0A0A0A] border rounded-xl p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  msg.isRead
                    ? "border-white/5 opacity-60"
                    : `${config.bg} hover:bg-white/[0.02]`
                }`}
                onClick={() => {
                  if (!msg.isRead) {
                    markRead.mutate(msg.id);
                  }
                }}
              >
                <Icon
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm truncate">
                      {msg.title}
                    </p>
                    {!msg.isRead && (
                      <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                    {msg.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{msg.senderEmail}</span>
                    <span>
                      {new Date(msg.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.expiresAt && (
                      <span className="text-yellow-500/60">
                        Expires {new Date(msg.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && activeAnnouncements.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No messages</p>
            <p className="text-xs mt-1 text-gray-600">
              Admin messages and announcements will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
