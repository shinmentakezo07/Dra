"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Cpu, Code2, BookOpen, CreditCard } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Models", href: "/models", icon: Cpu },
  { label: "Play", href: "/playground", icon: Code2 },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Pricing", href: "/pricing", icon: CreditCard },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" role="navigation" aria-label="Mobile navigation">
      {/* Top edge glow */}
      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-cyan-500/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1 w-16 py-1 group"
              >
                {/* Active indicator */}
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
                  {/* Glow effect for active icon */}
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
          })}
        </div>

        {/* Safe area padding for phones with home indicators */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
