'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, LogOut, Settings, User, ChevronDown } from 'lucide-react'
import AdminSearchBar from './AdminSearchBar'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/providers': 'Providers',
  '/admin/models': 'Models',
  '/admin/billing': 'Billing',
  '/admin/cost': 'Cost Intelligence',
  '/admin/promos': 'Promo Codes',
  '/admin/security': 'Security',
  '/admin/audit': 'Audit Log',
  '/admin/ip': 'IP Lists',
  '/admin/logs': 'Request Logs',
  '/admin/operations': 'Operations',
  '/admin/messages': 'Messages',
  '/admin/announcements': 'Announcements',
  '/admin/changelog': 'Changelog',
  '/admin/reports': 'Reports',
  '/admin/admins': 'Admin Users',
  '/admin/settings': 'Settings',
  '/admin/sso': 'SSO Configuration',
}

export default function AdminTopBar() {
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentPage = PAGE_TITLES[pathname] || 'Admin'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setShowUserMenu(false)
    setShowNotif(false)
  }, [pathname])

  return (
    <header className="relative z-30">
      <div className="flex items-center justify-between px-8 py-5">
        {/* Page title — typographic anchor */}
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-[var(--admin-text)] tracking-[-0.02em] leading-none">
            {currentPage}
          </h1>
          <p className="text-[11px] font-mono text-[var(--admin-text-dim)] mt-1.5 tracking-wide">
            /admin{pathname.replace('/admin', '')}
          </p>
        </div>

        {/* Search — constrained width, breathing room */}
        <div className="flex-1 max-w-sm mx-8">
          <AdminSearchBar />
        </div>

        {/* Actions — sparse, deliberate */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false) }}
              className="relative p-2.5 rounded-xl text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-white/[0.03] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-[5px] h-[5px] rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/[0.06] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/50 overflow-hidden"
                >
                  <div className="p-5">
                    <p className="text-[12px] text-[var(--admin-text-dim)] text-center">No new notifications</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false) }}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center ring-1 ring-white/[0.06]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.15))',
                }}
              >
                <User className="w-3.5 h-3.5" style={{ color: 'rgba(59,130,246,0.5)' }} />
              </div>
              <ChevronDown
                className={`w-3 h-3 text-[var(--admin-text-dim)] transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/[0.06] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/60 overflow-hidden"
                >
                  <div className="p-4 border-b border-white/[0.04]">
                    <p className="text-[13px] font-medium text-[var(--admin-text)]">Admin</p>
                    <p className="text-[11px] text-[var(--admin-text-dim)] font-mono truncate mt-0.5">admin@yapapa.io</p>
                  </div>

                  <div className="py-1.5">
                    <Link
                      href="/admin/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-white/[0.03] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <Link
                      href="/admin/admins"
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-white/[0.03] transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </div>

                  <div className="border-t border-white/[0.04] py-1.5">
                    <button className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.04] w-full transition-colors">
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hairline separator — only visual boundary */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mx-8" />
    </header>
  )
}
