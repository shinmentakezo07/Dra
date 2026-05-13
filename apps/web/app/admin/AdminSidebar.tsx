'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Server, BrainCircuit, CreditCard,
  Settings, Shield, FileText, Bell, Gift, UserCog,
  BarChart3, Radio, Wrench, LogOut, ChevronLeft, Search,
  Activity, Key, ClipboardList, type LucideIcon,
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

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={`bg-[#0A0A0A] border-r border-white/5 flex flex-col h-screen transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/5">
        {collapsed ? (
          <span className="text-blue-400 font-bold text-lg mx-auto">A</span>
        ) : (
          <span className="text-white font-semibold text-lg tracking-tight">Admin</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-white/30 px-2 mb-1.5">
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
                    className={`flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-white/5 text-white/30 hover:text-white/60 transition-colors"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  )
}
