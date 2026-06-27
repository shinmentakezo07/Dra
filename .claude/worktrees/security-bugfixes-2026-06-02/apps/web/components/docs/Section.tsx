"use client";

import { motion } from "framer-motion";

/* ── Section variants by accent type ── */
const ACCENTS = {
  default: {
    iconBg:
      "bg-blue-500/[0.1] border-blue-500/20",
    iconColor: "text-blue-400",
    bar: "from-blue-500/60",
    heading: "text-white",
    dot: "bg-blue-500",
  },
  emerald: {
    iconBg:
      "bg-emerald-500/[0.1] border-emerald-500/20",
    iconColor: "text-emerald-400",
    bar: "from-emerald-500/60",
    heading: "text-white",
    dot: "bg-emerald-500",
  },
  amber: {
    iconBg:
      "bg-amber-500/[0.1] border-amber-500/20",
    iconColor: "text-amber-400",
    bar: "from-amber-500/60",
    heading: "text-white",
    dot: "bg-amber-500",
  },
  violet: {
    iconBg:
      "bg-violet-500/[0.1] border-violet-500/20",
    iconColor: "text-violet-400",
    bar: "from-violet-500/60",
    heading: "text-white",
    dot: "bg-violet-500",
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
};

export const Section = ({
  id,
  icon: Icon,
  title,
  children,
  accent = "default",
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: keyof typeof ACCENTS;
}) => {
  const a = ACCENTS[accent];
  return (
    <motion.section
      id={id}
      variants={itemVariants}
      className="mb-28 scroll-mt-20"
    >
      {/* Section heading block */}
      <div className="mb-2">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl ${a.iconBg} flex items-center justify-center flex-shrink-0 border shadow-lg shadow-black/30`}
          >
            <Icon className={`w-5.5 h-5.5 ${a.iconColor}`} />
          </div>
          <h2
            className={`text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] font-bold tracking-tight leading-tight text-white`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`h-[2px] w-20 bg-gradient-to-r ${a.bar} to-transparent rounded-full`}
          />
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
      </div>
      <div className="mt-8 space-y-6 text-[15px] text-white/60 leading-[1.85]">
        {children}
      </div>
    </motion.section>
  );
};
