'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Server, BrainCircuit, CreditCard,
  Settings, Shield, FileText, Bell, Gift, UserCog,
  BarChart3, Radio, Wrench, ChevronLeft,
  type LucideIcon,
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
      { href: '/admin/cost', label: 'Cost Intel', icon: BarChart3 },
      { href: '/admin/promos', label: 'Promos', icon: Gift },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/admin/security', label: 'Security', icon: Shield },
      { href: '/admin/audit', label: 'Audit', icon: FileText },
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
      { href: '/admin/messages', label: 'Messages', icon: Bell },
      { href: '/admin/announcements', label: 'Announcements', icon: FileText },
      { href: '/admin/changelog', label: 'Changelog', icon: FileText },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/admins', label: 'Admins', icon: UserCog },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/sso', label: 'SSO', icon: Shield },
    ],
  },
]

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-[var(--admin-surface)] flex flex-col fixed left-0 top-0 h-screen transition-all duration-300 z-40 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Subtle top-left glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/[0.04] rounded-full blur-[60px] pointer-events-none" />

      {/* Logo */}
      <div className="h-[72px] flex items-center px-5 relative">
        {collapsed ? (
          <div className="mx-auto w-9 h-9 rounded-[10px] overflow-hidden ring-1 ring-white/[0.06]">
            <Image src="/admin-logo.jpg" alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[12px] overflow-hidden ring-1 ring-white/[0.06] flex-shrink-0">
              <Image src="/admin-logo.jpg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">Yapapa</h1>
              <span className="text-[9px] font-mono font-semibold tracking-[0.18em] uppercase text-indigo-400/50">Control</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 admin-scroll">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2.5 mb-2.5 admin-label">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-[9px] rounded-[12px] text-[13px] transition-all duration-200 relative ${
                      active
                        ? 'text-indigo-300 bg-indigo-500/[0.06]'
                        : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-white/[0.02]'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <motion.div
                        layoutId="admin-active-nav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-400 rounded-r-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
                      active ? 'text-indigo-400' : 'text-white/20 group-hover:text-white/40'
                    }`} />
                    {!collapsed && (
                      <span className="truncate font-medium tracking-[-0.01em]">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.02] transition-all duration-200 text-[11px] font-mono tracking-wider"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  )
}
