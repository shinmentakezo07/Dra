export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
        <p className="text-[11px] font-mono tracking-[0.14em] uppercase text-[var(--admin-text-dim)]">
          Loading
        </p>
      </div>
    </div>
  );
}
