"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileSidebar } from "@/components/MobileSidebar";

export function MainLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: any;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isDashboardRoute = pathname?.startsWith("/dashboard");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const isFullScreenRoute = pathname === "/playground";
  const isAdminRoute = pathname?.startsWith("/admin");
  const isDocsRoute = pathname?.startsWith("/docs");

  return (
    <div
      className="min-h-screen bg-background font-sans antialiased selection:bg-primary/30"
      suppressHydrationWarning
    >
      {!isDashboardRoute &&
        !isAuthRoute &&
        !isFullScreenRoute &&
        !isAdminRoute &&
        !isDocsRoute && (
          <Header onMenuClick={() => setSidebarOpen(true)} user={user} sidebarOpen={sidebarOpen} />
        )}

      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div
        className={`flex ${isDashboardRoute || isAuthRoute || isFullScreenRoute || isDocsRoute ? "" : "pt-16 md:pt-20 pb-20 md:pb-0"}`}
      >
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>

      {/* Mobile bottom tab bar - visible on phones for public pages */}
      {!isDashboardRoute &&
        !isAuthRoute &&
        !isFullScreenRoute &&
        !isAdminRoute &&
        !isDocsRoute && <MobileBottomNav />}
    </div>
  );
}
