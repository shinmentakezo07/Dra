"use client";

import { motion } from "framer-motion";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
} as const;

export default function AdminPageHeader({
  title,
  subtitle,
  badge,
  action,
  children,
}: AdminPageHeaderProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <h1 className="text-2xl font-semibold text-[var(--admin-text)] tracking-[-0.02em]">
                {title}
              </h1>
              {badge && (
                <span
                  className="admin-badge"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.06))",
                    border: "1px solid rgba(59,130,246,0.12)",
                    color: "rgba(59,130,246,0.7)",
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[13px] text-[var(--admin-text-muted)] font-mono tracking-wide">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <motion.div variants={itemVariants}>{action}</motion.div>}
      </motion.div>
      {children}
    </motion.div>
  );
}

export { containerVariants, itemVariants };
