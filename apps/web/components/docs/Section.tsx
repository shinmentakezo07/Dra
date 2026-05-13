"use client";

import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Animation Variant                                                  */
/* ------------------------------------------------------------------ */

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 }
  }
};

/* ------------------------------------------------------------------ */
/*  Section with Enhanced Header                                       */
/* ------------------------------------------------------------------ */

export const Section = ({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.section
    id={id}
    variants={itemVariants}
    className="mb-20 scroll-mt-28 group/section"
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="relative w-11 h-11 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] overflow-hidden group-hover/section:ring-blue-500/[0.25] transition-all duration-300">
        <div className="absolute inset-0 bg-blue-500/[0.03] opacity-0 group-hover/section:opacity-100 transition-opacity duration-300" />
        <Icon className="w-5 h-5 relative z-10" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
        {title}
      </h2>
      <div className="hidden lg:block flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent ml-4" />
    </div>
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      {children}
    </div>
  </motion.section>
);
