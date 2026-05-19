"use client";

import { motion } from "framer-motion";

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 }
  }
};

export const Section = ({
  id,
  icon: _Icon,
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
    className="mb-28 scroll-mt-20"
  >
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 rounded-lg bg-blue-500/[0.06] border border-blue-500/[0.1] flex items-center justify-center flex-shrink-0">
        <_Icon className="w-4 h-4 text-blue-400/60" />
      </div>
      <h2 className="text-2xl md:text-[1.75rem] font-semibold text-white tracking-tight leading-tight">
        {title}
      </h2>
    </div>
    <div className="h-px w-16 bg-gradient-to-r from-blue-500/30 to-transparent mb-8" />
    <div className="space-y-5 text-[15px] text-white/50 leading-[1.75]">
      {children}
    </div>
  </motion.section>
);
