export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border border-white/10 border-t-white/40 rounded-full animate-spin" />
        <p className="text-xs font-mono text-white/20">Loading logs…</p>
      </div>
    </div>
  );
}
