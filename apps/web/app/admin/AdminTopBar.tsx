import Link from "next/link"
import Image from "next/image"
import AdminSearchBar from "./AdminSearchBar"

export default function AdminTopBar() {
  return (
    <div className="h-[72px] bg-[var(--admin-surface)]/80 backdrop-blur-md flex items-center px-6 gap-6 sticky top-0 z-30">
      <Link href="/admin/dashboard" className="group flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-[9px] overflow-hidden ring-1 ring-white/[0.06] flex-shrink-0">
          <Image src="/admin-logo.jpg" alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[15px] font-semibold text-[var(--admin-text)] tracking-[-0.01em]">Yapapa</h1>
          <span className="text-[9px] font-mono font-semibold tracking-[0.16em] uppercase text-indigo-400/50 bg-indigo-500/[0.08] rounded-md px-2 py-[3px] border border-indigo-500/10">
            Admin
          </span>
        </div>
      </Link>

      <div className="flex-1 max-w-md ml-4">
        <AdminSearchBar />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="admin-pulse-dot" />
        <span className="text-[10px] font-mono font-semibold tracking-[0.12em] uppercase text-indigo-400/40">Live</span>
      </div>
    </div>
  )
}
