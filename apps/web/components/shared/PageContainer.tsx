"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageContainer — wraps non-docs pages with a consistent dark indigo backdrop,
 * top padding (for global header), and shared atmosphere.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-screen bg-[#06060a] text-foreground selection:bg-indigo-500/25 selection:text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * PageSection — editorial section header with eyebrow + title + italic.
 */
export function PageSection({
  id,
  icon: Icon,
  eyebrow,
  title,
  italic,
  description,
  children,
  className,
}: {
  id?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  italic?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative mb-20 sm:mb-28 last:mb-0 scroll-mt-24", className)}
    >
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          {Icon && (
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Icon className="w-4 h-4 text-indigo-200" />
            </div>
          )}
          {eyebrow && (
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-indigo-200/55">
              {eyebrow}
            </span>
          )}
        </div>

        <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-[-0.03em] leading-[1.05] text-white max-w-3xl">
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

        {description && (
          <p className="mt-4 text-[15px] text-white/55 leading-[1.8] max-w-2xl">
            {description}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="h-[2px] w-12 bg-gradient-to-r from-indigo-400/60 via-indigo-400/20 to-transparent rounded-full" />
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

/**
 * FeatureCard — small editorial card with icon + title + body.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative p-6 rounded-2xl overflow-hidden",
        "border border-white/[0.06] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        "hover:border-indigo-500/25 hover:from-indigo-500/[0.04]",
        "hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            "conic-gradient(from 220deg, rgba(99,102,241,0.18), transparent 30%, transparent 70%, rgba(99,102,241,0.1))",
          filter: "blur(20px)",
        }}
      />
      <div className="relative">
        <div className="w-11 h-11 rounded-xl border border-white/[0.06] bg-white/[0.02] group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06] flex items-center justify-center mb-5 transition-all duration-300">
          <Icon className="w-[18px] h-[18px] text-white/45 group-hover:text-indigo-200 transition-colors" />
        </div>
        <h3 className="text-[15px] font-semibold text-white/85 group-hover:text-white transition-colors tracking-[-0.01em] mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-white/40 group-hover:text-white/55 leading-[1.7] transition-colors">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * StatBlock — single inline stat with label + value.
 */
export function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
        {label}
      </div>
      <div className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.04em] text-white/95 font-display">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] font-mono text-white/30 mt-1.5">{hint}</div>
      )}
    </div>
  );
}
