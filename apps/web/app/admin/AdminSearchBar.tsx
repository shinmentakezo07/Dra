'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import type { AdminUserDetail } from '@/types/admin'

const ROLE_STYLES: Record<string, string> = {
  superadmin: 'bg-purple-500/15 text-purple-400',
  admin: 'bg-blue-500/15 text-blue-400',
  support: 'bg-emerald-500/15 text-emerald-400',
  analyst: 'bg-amber-500/15 text-amber-400',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default function AdminSearchBar() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUserDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setSearched(false)

    const controller = new AbortController()

    getAdminSDK()
      .listUsers({ query: debouncedQuery, limit: 5 })
      .then((res) => {
        if (!controller.signal.aborted) {
          setResults(res.data ?? [])
          setSearched(true)
          setLoading(false)
          setSelectedIndex(-1)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResults([])
          setSearched(true)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [debouncedQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (userId: string) => {
      setOpen(false)
      setQuery('')
      setResults([])
      setSearched(false)
      router.push(`/admin/users/${userId}`)
    },
    [router],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [open, results, selectedIndex, handleSelect],
  )

  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search users, providers, models..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-sm text-white/40">Searching...</span>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-white/40">No results found</p>
              <p className="mt-0.5 text-xs text-white/20">
                Try a different search term
              </p>
            </div>
          ) : (
            <ul role="listbox" className="py-1">
              {results.map((user, index) => (
                <li
                  key={user.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelect(user.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-500/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/50">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {user.name || 'Unknown'}
                      </span>
                      <span
                        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none ${
                          ROLE_STYLES[user.role] ?? 'bg-white/5 text-white/40'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="truncate text-xs text-white/40">{user.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
