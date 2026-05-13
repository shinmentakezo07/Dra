export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]">
      <div className="absolute inset-0 mesh-gradient animate-mesh-shift" />
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: "3s" }} />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
    </div>
  );
}
