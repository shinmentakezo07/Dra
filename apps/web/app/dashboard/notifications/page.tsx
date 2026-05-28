"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSDK } from "@/lib/api/sdk";

interface NotificationItem {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const SKIP_TYPES = new Set(["connected", "ping"]);

function mapEventType(rawType: string): NotificationItem["type"] {
  if (rawType.includes("error") || rawType.includes("fail")) return "error";
  if (rawType.includes("success") || rawType.includes("complete"))
    return "success";
  if (rawType.includes("warn") || rawType.includes("new_message"))
    return "warning";
  if (rawType.includes("new_announcement")) return "info";
  return "info";
}

function showBrowserToast(title: string, message: string, type: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    const icon =
      type === "error"
        ? "🔴"
        : type === "success"
          ? "🟢"
          : type === "warning"
            ? "🟡"
            : "🔵";
    new Notification(`${icon} ${title}`, { body: message, tag: title });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body: message, tag: title });
      }
    });
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const connectStream = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const stream = getSDK().notificationsStream();

      setConnected(true);

      for await (const event of stream) {
        if (controller.signal.aborted) break;

        // Skip heartbeat and connection events
        if (SKIP_TYPES.has(event.type)) continue;

        const notif: NotificationItem = {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: mapEventType(event.type),
          title:
            event.title ||
            event.payload?.title ||
            event.payload?.type ||
            event.type,
          message:
            event.message ||
            event.payload?.body ||
            event.payload?.message ||
            "",
          timestamp: new Date().toISOString(),
          read: false,
        };

        setNotifications((prev) => [notif, ...prev].slice(0, 200));
        showBrowserToast(notif.title, notif.message, notif.type);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setConnected(false);
      setTimeout(() => connectStream(), 5000);
    }
  }, []);

  useEffect(() => {
    connectStream();
    return () => {
      abortRef.current?.abort();
    };
  }, [connectStream]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-400" : "text-red-400"}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
            />
            {connected ? "Live" : "Disconnected"}
          </span>
          {!connected && (
            <button
              onClick={() => connectStream()}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <WifiOff className="w-3 h-3" />
              Reconnect
            </button>
          )}
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllRead}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Mark all read
              </button>
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`bg-[#0A0A0A] border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                n.read ? "border-white/5 opacity-60" : "border-white/10"
              }`}
              onClick={() => markAsRead(n.id)}
            >
              <NotificationIcon type={n.type} />
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{n.title}</p>
                <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 bg-primary rounded-full mt-1.5" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {notifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>
              {connected
                ? "No notifications yet."
                : "Connecting to notification stream..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  switch (type) {
    case "success":
      return <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />;
    case "error":
      return <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />;
    default:
      return <Info className="w-5 h-5 text-blue-400 mt-0.5" />;
  }
}
