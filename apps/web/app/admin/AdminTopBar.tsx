'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Search, Loader2, User, X, Sparkles } from 'lucide-react'

export default function AdminTopBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getAdminSDK().listUsers({ query, limit: 6 })
        setResults(res.data)
        setOpen(true)
      } catch { setResults([]) } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  return (
    <div className="h-16 border-b border-white/[0.05] bg-[#000000] flex items-center px-6 gap-4 relative">
      <div ref={ref} className="relative flex-1 max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-[16px] pl-11 pr-10 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setOpen(false) }} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />
          </button>
        )}

        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#000000] border border-white/[0.05] rounded-[20px] z-50 shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-1.5 space-y-0.5">
                {results.map((user, i) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                    onClick={() => { router.push(`/admin/users/${user.id}`); setOpen(false); setQuery('') }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[14px] hover:bg-white/[0.03] text-left transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 rounded-[12px] bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate font-medium">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-white/30 truncate">{user.email}</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-blue-400/50 bg-blue-500/5 rounded-full px-2.5 py-1">
                      {user.role}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && query && results.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#000000] border border-white/[0.05] rounded-[20px] z-50 shadow-2xl p-6 text-center"
            >
              <p className="text-sm text-white/30">No users found for &quot;{query}&quot;</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 text-white/20 text-xs font-mono tracking-wider ml-auto">
        <Sparkles className="w-3.5 h-3.5 text-blue-400/40" />
        <span>Admin Panel v1.0</span>
      </div>
    </div>
  )
}
