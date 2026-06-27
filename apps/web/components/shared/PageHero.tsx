"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  italic?: string;
  description: string;
  icon?: LucideIcon;
  primaryCta?: { label: string; href: string; icon?: LucideIcon };
  secondaryCta?: { label: string; href: string };
  stats?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.08 + i * 0.06,
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function PageHero({
  eyebrow,
  title,
  italic,
  description,
  icon: Icon,
  primaryCta,
  secondaryCta,
  stats,
  children,
}: PageHeroProps) {
  return (
    <section className="relative pt-2 sm:pt-4 pb-16 sm:pb-24">
      {/* Atmospheric orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-6 sm:-mx-10">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.07] blur-[120px] animate-[breathe_14s_ease-in-out_infinite]" />
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] blur-[120px] animate-[breathe_18s_ease-in-out_infinite_3s]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Eyebrow */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="flex items-center gap-3 mb-10"
        >
          {Icon && (
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Icon className="w-4 h-4 text-indigo-200" />
            </div>
          )}
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">
            {eyebrow}
          </span>
          <div className="h-px w-12 bg-gradient-to-r from-white/[0.1] to-transparent" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="text-[2.5rem] sm:text-[3.5rem] lg:text-[4.25rem] font-semibold tracking-[-0.04em] leading-[0.98] mb-8 max-w-4xl"
        >
          <span className="text-white/95">{title}</span>
          {italic && (
            <>
              {" "}
              <span className="font-display italic font-normal bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 via-violet-200 to-indigo-300">
                {italic}
              </span>
            </>
          )}
          <span className="text-white/40">.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="text-[15px] sm:text-[17px] text-white/50 max-w-2xl leading-[1.75] mb-10"
        >
          {description}
        </motion.p>

        {/* CTAs */}
        {(primaryCta || secondaryCta) && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-wrap items-center gap-3 mb-12"
          >
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className={cn(
                  "group flex items-center gap-2 px-5 py-2.5 rounded-xl",
                  "bg-gradient-to-br from-indigo-500/20 via-indigo-500/12 to-violet-500/10",
                  "border border-indigo-500/25",
                  "text-[13px] font-medium text-white/85 hover:text-white",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(99,102,241,0.4)]",
                  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(99,102,241,0.55)]",
                  "hover:border-indigo-400/40",
                  "transition-all duration-300 relative overflow-hidden",
                )}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                {primaryCta.icon && (
                  <primaryCta.icon className="w-3.5 h-3.5 text-indigo-200" />
                )}
                {primaryCta.label}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/45 hover:text-white/75 transition-colors"
              >
                {secondaryCta.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
        )}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <motion.dl
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04]"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#06060a] px-5 py-5 hover:bg-indigo-500/[0.04] transition-colors duration-300"
              >
                <dt className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1.5">
                  {stat.label}
                </dt>
                <dd className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] text-white/95 font-display">
                  {stat.value}
                </dd>
              </div>
            ))}
          </motion.dl>
        )}

        {children}
      </div>
    </section>
  );
}
