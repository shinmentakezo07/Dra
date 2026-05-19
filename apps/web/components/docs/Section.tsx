"use client";

import { motion } from "framer-motion";

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 }
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
    className="mb-24 scroll-mt-28"
  >
    <h2 className="text-2xl md:text-[1.75rem] font-semibold text-white tracking-tight mb-1">
      {title}
    </h2>
    <div className="h-px w-12 bg-white/10 mb-8" />
    <div className="space-y-5 text-[15px] text-white/50 leading-[1.7]">
      {children}
    </div>
  </motion.section>
);
