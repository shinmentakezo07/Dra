"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Cpu, Code2, BookOpen, CreditCard } from "lucide-react";
import Image from "next/image";

const leftItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Models", href: "/models", icon: Cpu },
];

const rightItems = [
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Pricing", href: "/pricing", icon: CreditCard },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const renderNavItem = (item: { label: string; href: string; icon: any }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className="relative flex flex-col items-center justify-center gap-1 w-16 py-1 group"
      >
        {active && (
          <motion.div
            layoutId="mobile-nav-active"
            className="absolute -top-px left-2 right-2 h-[2px] bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <div className="relative">
          <Icon
            className={`w-5 h-5 transition-colors duration-200 ${
              active
                ? "text-cyan-400"
                : "text-gray-500 group-hover:text-gray-300"
            }`}
          />
          {active && (
            <div className="absolute inset-0 blur-md bg-cyan-500/30 -z-10" />
          )}
        </div>
        <span
          className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${
            active
              ? "text-cyan-400"
              : "text-gray-500 group-hover:text-gray-300"
          }`}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" role="navigation" aria-label="Mobile navigation">
      {/* Top edge glow line */}
      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/30 to-transparent" />

      <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#3b82f6]/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {/* Left nav items */}
          {leftItems.map(renderNavItem)}

          {/* Center logo - matching main navbar CyberpunkLogo */}
          <Link
            href="/"
            className="relative flex items-center justify-center group"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-[-4px] rounded-full bg-[#3b82f6]/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Logo container with scanline effect */}
            <div className="relative w-11 h-11 flex items-center justify-center bg-black border border-[#3b82f6]/30 rounded-lg overflow-hidden">
              {/* Tech grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:3px_3px]" />

              {/* Rotating tech ring */}
              <motion.div
                className="absolute inset-0.5 border border-[#3b82f6]/40 rounded border-t-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-1.5 border border-[#a855f7]/30 rounded border-b-transparent border-r-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />

              {/* Scanline sweep */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7c3aed]/15 to-transparent h-[30%]"
                animate={{ top: ["-30%", "130%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              {/* Logo image */}
              <Image
                src="/nervous-cat.jpg"
                alt="Yapapa"
                width={32}
                height={32}
                className="rounded object-cover relative z-10"
              />

              {/* Bottom glow accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-[#3b82f6]/20 to-transparent" />
            </div>
          </Link>

          {/* Right nav items */}
          {rightItems.map(renderNavItem)}
        </div>

        {/* Safe area padding for phones with home indicators */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
