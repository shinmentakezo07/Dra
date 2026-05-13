import Link from "next/link"
import Image from "next/image"

export default function AdminTopBar() {
  return (
    <div className="h-16 border-b border-white/[0.05] bg-[#000000] flex items-center px-6">
      <Link href="/admin/dashboard" className="group flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
          <Image src="/admin-logo.jpg" alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-white tracking-tight">Yapapa</h1>
          <span className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-blue-400/60 bg-blue-500/10 rounded-full px-2.5 py-0.5">
            Admin
          </span>
        </div>
      </Link>
    </div>
  )
}
