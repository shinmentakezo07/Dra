"use client";

interface AmbientBackgroundProps {
  accentColor?: string;
}

export function AmbientBackground({ accentColor = "#6366f1" }: AmbientBackgroundProps) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]" aria-hidden="true">
      <div className="absolute inset-0 mesh-gradient animate-mesh-shift" aria-hidden="true" />
      <div
        className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full blur-[120px] animate-glow-pulse"
        style={{ backgroundColor: `${accentColor}08` }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-glow-pulse"
        style={{ backgroundColor: `${accentColor}06`, animationDelay: "3s" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" aria-hidden="true" />
    </div>
  );
}
