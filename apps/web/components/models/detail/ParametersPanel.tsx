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
            className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] last:border-0"
          >
            <span className="font-mono text-[12px] text-gray-400">{param}</span>
            <span className="font-mono text-[11px] text-gray-700">supported</span>
          </div>
        ))}
      </div>
    </section>
  );
}
