'use client'

import { Sparkles } from 'lucide-react'

export default function AdminTopBar() {
  return (
    <div className="h-16 border-b border-white/[0.05] bg-[#000000] flex items-center px-6 relative">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <span className="text-sm text-white/30 font-mono tracking-wide hidden sm:inline">Admin Panel</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-white/20 text-[10px] font-mono tracking-wider">
        <Sparkles className="w-3 h-3 text-blue-400/40" />
        <span className="hidden sm:inline">Control Panel</span>
      </div>
    </div>
  )
}
