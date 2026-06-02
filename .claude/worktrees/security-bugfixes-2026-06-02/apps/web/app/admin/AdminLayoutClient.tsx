"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

const SIDEBAR_WIDE = 260;
const SIDEBAR_COLLAPSED = 72;

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDE;

  return (
    <div
      data-admin
      className="h-screen bg-[var(--admin-bg)] relative z-0 overflow-hidden"
    >
      {/* Ambient background glow layers */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Blue glow top-left */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 60%)",
          }}
        />
        {/* Violet glow bottom-right */}
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 60%)",
          }}
        />
        {/* Purple mid-center ambient */}
        <div
          className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.02) 0%, transparent 60%)",
          }}
        />
      </div>

      <AdminSidebar
        collapsed={collapsed}
        onCollapseAction={() => setCollapsed(!collapsed)}
      />

      {/* Fixed header area */}
      <div
        className="fixed top-0 z-30 transition-all duration-300"
        style={{
          left: sidebarWidth,
          right: 0,
        }}
      >
        <AdminTopBar />
      </div>

      {/* Scrollable content */}
      <div
        className="h-screen pt-[65px] transition-all duration-300 relative"
        style={{ marginLeft: sidebarWidth, zIndex: 1 }}
      >
        <main className="h-full overflow-y-auto admin-scroll">
          <div className="p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
