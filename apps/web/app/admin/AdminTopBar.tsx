'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import type { AdminUserDetail } from '@/types/admin'
import { Search, Loader2, User, X } from 'lucide-react'

export default function AdminTopBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUserDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getAdminSDK().listUsers({ query, limit: 5 })
        setResults(res.data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timerRef.current)
  }, [query])

  return (
    <div className="h-14 border-b border-white/5 bg-[#0A0A0A] flex items-center px-4 gap-4">
      <div ref={ref} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setOpen(false) }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-white/30 hover:text-white/60" />
          </button>
        )}

        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0A0A0A] border border-white/10 rounded-xl z-50 shadow-2xl overflow-hidden">
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => { router.push(`/admin/users/${user.id}`); setOpen(false); setQuery('') }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.name || 'Unknown'}</p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-white/30 bg-white/5 rounded-md px-2 py-0.5">
                  {user.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {open && query && results.length === 0 && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0A0A0A] border border-white/10 rounded-xl z-50 shadow-2xl p-4 text-center">
            <p className="text-sm text-white/40">No users found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
