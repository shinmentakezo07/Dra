"use client";

import { motion } from "framer-motion";

/* ── Section variants by accent type ── */
const ACCENTS = {
  default: {
    iconBg: "bg-blue-500/[0.06] border-blue-500/[0.1]",
    iconColor: "text-blue-400/60",
    bar: "from-blue-500/30",
    heading: "text-white",
  },
  emerald: {
    iconBg: "bg-emerald-500/[0.06] border-emerald-500/[0.1]",
    iconColor: "text-emerald-400/60",
    bar: "from-emerald-500/30",
    heading: "text-white",
  },
  amber: {
    iconBg: "bg-amber-500/[0.06] border-amber-500/[0.1]",
    iconColor: "text-amber-400/60",
    bar: "from-amber-500/30",
    heading: "text-white",
  },
  violet: {
    iconBg: "bg-violet-500/[0.06] border-violet-500/[0.1]",
    iconColor: "text-violet-400/60",
    bar: "from-violet-500/30",
    heading: "text-white",
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
      {/* Gradient page title */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${a.iconColor}`} />
          </div>
          <h2 className={`text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] font-bold tracking-tight leading-tight ${a.heading}`}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-px w-20 bg-gradient-to-r ${a.bar} to-transparent`} />
          <div className="h-px flex-1 bg-white/[0.03]" />
        </div>
      </div>
      <div className="mt-8 space-y-6 text-[15px] text-white/50 leading-[1.8]">
        {children}
      </div>
    </motion.section>
  );
};
