"use client";

interface ParametersPanelProps {
  params: string[]
}

export function ParametersPanel({ params }: ParametersPanelProps) {
  if (!params || params.length === 0) return null;

  return (
    <section aria-label="Supported parameters">
      <div className="text-[10px] font-mono text-gray-600 tracking-[0.25em] uppercase mb-4">Parameters</div>
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
        {params.map((param, i) => (
          <div
            key={param}
            className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] last:border-0 transition-colors duration-150 hover:bg-white/[0.02]"
          >
            <span className="font-mono text-[12px] text-gray-400">{param}</span>
            <svg className="w-3.5 h-3.5 text-emerald-500/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ))}
      </div>
    </section>
  );
}
