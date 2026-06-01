"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Editorial Section with Glass Atelier treatment ── */
export const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
};

export const Section = ({
  id,
  icon: Icon,
  eyebrow,
  title,
  italic,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  italic?: string;
  description?: string;
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      variants={itemVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="mb-24 lg:mb-32 scroll-mt-24"
    >
      {/* Editorial header */}
      <header className="mb-10 lg:mb-12">
        <div className="flex items-center gap-4 mb-6">
          {/* Glass icon */}
          <div
            className={cn(
              "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border border-indigo-500/15",
              "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(99,102,241,0.25)]",
              "relative overflow-hidden",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <Icon className="w-5 h-5 text-indigo-200 relative z-10" />
          </div>

          {eyebrow && (
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono tracking-[0.22em] uppercase text-indigo-200/55 mb-1.5">
                {eyebrow}
              </span>
              <h2 className="text-[1.75rem] sm:text-[2.1rem] lg:text-[2.6rem] font-semibold tracking-[-0.035em] leading-[1.02] text-white">
                {title}
                {italic && (
                  <>
                    {" "}
                    <span className="font-display italic font-normal text-indigo-200/95">
                      {italic}
                    </span>
                  </>
                )}
              </h2>
            </div>
          )}
        </div>

        {/* Hairline + section id */}
        <div className="flex items-center gap-3">
          <div className="h-[2px] w-16 bg-gradient-to-r from-indigo-400/70 via-indigo-400/30 to-transparent rounded-full" />
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/20">
            §{id}
          </span>
        </div>

        {description && (
          <p className="mt-6 text-[15px] text-white/55 leading-[1.85] max-w-2xl">
            {description}
          </p>
        )}
      </header>

      <div className="space-y-5 text-[15px] text-white/60 leading-[1.85] [&_p]:text-white/60 [&_strong]:text-white/85 [&_strong]:font-medium [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:bg-indigo-500/[0.08] [&_code]:text-indigo-200/95 [&_code]:font-mono [&_code]:text-[13px] [&_code]:border [&_code]:border-indigo-500/[0.12]">
        {children}
      </div>
    </motion.section>
  );
};
