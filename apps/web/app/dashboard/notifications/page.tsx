"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Simulate SSE connection for real-time notifications
    // In production, replace with actual EventSource to /api/notifications/stream
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const types: Notification["type"][] = ["info", "warning", "success", "error"];
        const newNotif: Notification = {
          id: `notif_${Date.now()}`,
          type: types[Math.floor(Math.random() * types.length)],
          title: "System Update",
          message: "A new event has occurred in the system.",
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    }, 15000);

    setConnected(true);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
          <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-400" : "text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {connected ? "Live" : "Disconnected"}
          </span>
          <button
            onClick={markAllRead}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Mark all read
          </button>
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
                <p className="text-gray-600 text-xs mt-1">{new Date(n.timestamp).toLocaleString()}</p>
              </div>
              {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5" />}
            </motion.div>
          ))}
        </AnimatePresence>
        {notifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
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
