"use client";

import { motion } from "framer-motion";

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 }
  }
};

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
    className="mb-16 scroll-mt-28 group/section"
  >
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-xl bg-blue-500/[0.08] flex items-center justify-center text-blue-400 ring-1 ring-blue-500/[0.15] overflow-hidden group-hover/section:ring-blue-500/[0.25] transition-all duration-300">
          <div className="absolute inset-0 bg-blue-500/[0.03] opacity-0 group-hover/section:opacity-100 transition-opacity duration-300" />
          <Icon className="w-5 h-5 relative z-10" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>
      {/* Decorative gradient line */}
      <div className="h-px bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-transparent" />
    </div>
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      {children}
    </div>
  </motion.section>
);
