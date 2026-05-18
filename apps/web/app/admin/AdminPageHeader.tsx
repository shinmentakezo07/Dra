'use client'

import { motion } from 'framer-motion'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  action?: React.ReactNode
  children?: React.ReactNode
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
} as const

export default function AdminPageHeader({ title, subtitle, badge, action, children }: AdminPageHeaderProps) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
              {badge && (
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-blue-400/50 bg-blue-500/10 rounded-full border border-blue-500/30 px-3 py-1">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-white/30 font-mono tracking-wide">{subtitle}</p>}
          </div>
        </div>
        {action && <motion.div variants={itemVariants}>{action}</motion.div>}
      </motion.div>
      {children}
    </motion.div>
  )
}

export { containerVariants, itemVariants }
