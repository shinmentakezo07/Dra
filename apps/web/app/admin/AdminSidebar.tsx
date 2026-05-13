'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Server, BrainCircuit, CreditCard,
  Settings, Shield, FileText, Bell, Gift, UserCog,
  BarChart3, Radio, Wrench, ChevronLeft,
  Key, type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/providers', label: 'Providers', icon: Server },
      { href: '/admin/models', label: 'Models', icon: BrainCircuit },
    ],
  },
  {
    title: 'Financial',
    items: [
      { href: '/admin/billing', label: 'Billing', icon: CreditCard },
      { href: '/admin/cost', label: 'Cost Intelligence', icon: BarChart3 },
      { href: '/admin/promos', label: 'Promo Codes', icon: Gift },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/admin/security', label: 'Security', icon: Shield },
      { href: '/admin/audit', label: 'Audit Trail', icon: FileText },
      { href: '/admin/ip', label: 'IP Lists', icon: Radio },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { href: '/admin/logs', label: 'Logs', icon: FileText },
      { href: '/admin/operations', label: 'Operations', icon: Wrench },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/announcements', label: 'Announcements', icon: Bell },
      { href: '/admin/changelog', label: 'Changelog', icon: FileText },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/admins', label: 'Admin Users', icon: UserCog },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/sso', label: 'SSO', icon: Shield },
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`bg-[#000000] border-r border-white/[0.05] flex flex-col h-screen transition-all duration-300 relative ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Gradient orb decoration */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.05] relative">
        {collapsed ? (
          <span className="text-blue-400 font-bold text-lg mx-auto tracking-tight">A</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <span className="text-white font-semibold text-base tracking-tight">Admin</span>
              <span className="block text-[10px] font-mono text-blue-400/60 tracking-widest uppercase">Control Panel</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 mb-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-blue-400/50">
                {section.title}
              </p>
            )}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-0.5"
            >
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-[14px] text-sm transition-all duration-300 relative ${
                        active
                          ? 'text-blue-400 bg-blue-500/[0.04] ring-1 ring-blue-500/20'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                      } ${collapsed ? 'justify-center px-2' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 ${
                        active ? 'text-blue-400' : 'text-blue-400/50 group-hover:text-blue-400/80'
                      }`} />
                      {!collapsed && (
                        <span className="truncate font-medium tracking-tight">{item.label}</span>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="border-t border-white/[0.05] p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-[12px] text-white/20 hover:text-white/50 hover:bg-white/[0.02] transition-all duration-200 text-xs font-mono tracking-wider"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  )
}
