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
    className="mb-20 scroll-mt-28 group/section"
  >
    <div className="relative mb-10">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.06),transparent)]" />
      </div>

      <div className="relative flex items-center gap-5 pb-6">
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 flex items-center justify-center text-violet-400 ring-1 ring-violet-500/20 overflow-hidden group-hover/section:ring-violet-500/30 group-hover/section:shadow-[0_0_30px_-8px_rgba(139,92,246,0.2)] transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover/section:opacity-100 transition-opacity duration-500" />
          <Icon className="w-6 h-6 relative z-10" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-violet-500/30 via-fuchsia-500/15 to-transparent" />
    </div>

    <div className="space-y-6 text-gray-400 leading-relaxed">
      {children}
    </div>
  </motion.section>
);
