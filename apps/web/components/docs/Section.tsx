"use client";

import { motion } from "framer-motion";

/* ── Section variants by accent type ── */
const ACCENTS = {
  default: {
    iconBg:
      "bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.04] border-blue-500/[0.15]",
    iconColor: "text-blue-400/80",
    bar: "from-blue-500/40",
    heading: "text-white",
    headingGradient: "from-blue-300 via-blue-200 to-blue-400",
    dot: "bg-blue-500",
  },
  emerald: {
    iconBg:
      "bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.04] border-emerald-500/[0.15]",
    iconColor: "text-emerald-400/80",
    bar: "from-emerald-500/40",
    heading: "text-white",
    headingGradient: "from-emerald-300 via-emerald-200 to-teal-400",
    dot: "bg-emerald-500",
  },
  amber: {
    iconBg:
      "bg-gradient-to-br from-amber-500/[0.12] to-amber-600/[0.04] border-amber-500/[0.15]",
    iconColor: "text-amber-400/80",
    bar: "from-amber-500/40",
    heading: "text-white",
    headingGradient: "from-amber-300 via-amber-200 to-orange-400",
    dot: "bg-amber-500",
  },
  violet: {
    iconBg:
      "bg-gradient-to-br from-violet-500/[0.12] to-violet-600/[0.04] border-violet-500/[0.15]",
    iconColor: "text-violet-400/80",
    bar: "from-violet-500/40",
    heading: "text-white",
    headingGradient: "from-violet-300 via-purple-200 to-purple-400",
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
        <div className="flex items-center gap-4 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl ${a.iconBg} flex items-center justify-center flex-shrink-0 border shadow-lg shadow-black/20`}
          >
            <Icon className={`w-5 h-5 ${a.iconColor}`} />
          </div>
          <h2
            className={`text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] font-bold tracking-tight leading-tight bg-gradient-to-r ${a.headingGradient} bg-clip-text text-transparent`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`h-[2px] w-24 bg-gradient-to-r ${a.bar} to-transparent rounded-full`}
          />
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.04] to-transparent" />
        </div>
      </div>
      <div className="mt-8 space-y-6 text-[15px] text-white/[0.55] leading-[1.85]">
        {children}
      </div>
    </motion.section>
  );
};
