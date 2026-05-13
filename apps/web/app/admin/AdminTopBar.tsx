import Link from "next/link"

export default function AdminTopBar() {
  return (
    <div className="h-16 border-b border-white/[0.05] bg-[#000000] flex items-center px-6">
      <Link href="/admin/dashboard" className="group flex items-center gap-3">
        <div className="relative w-9 h-9 flex items-center justify-center bg-black border border-blue-500/30 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:4px_4px]" />
          <span className="relative z-10 text-blue-400 font-black text-xl italic drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">P</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic" style={{ textShadow: "2px 2px 0px rgba(59, 130, 246, 0.3)" }}>
            YAPAPA
          </h1>
          <span className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-blue-400/60 bg-blue-500/10 rounded-full px-2.5 py-0.5">
            Admin
          </span>
        </div>
      </Link>
    </div>
  )
}
