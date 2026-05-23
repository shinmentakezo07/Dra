"use client";

import { useEffect, useRef } from "react";

interface AmbientBackgroundProps {
  accentColor?: string;
}

export function AmbientBackground({ accentColor = "#6366f1" }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate floating particles
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 30000), 60);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Parse accent into RGB for glow
      let r = 99, g = 102, b = 241;
      const hex = accentColor.replace("#", "");
      if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }

      // Glow orb 1 — top right
      const g1 = ctx.createRadialGradient(
        canvas.width * 0.75, canvas.height * 0.2, 0,
        canvas.width * 0.75, canvas.height * 0.2, 500
      );
      g1.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
      g1.addColorStop(0.5, `rgba(${r},${g},${b},0.03)`);
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Glow orb 2 — bottom left
      const g2 = ctx.createRadialGradient(
        canvas.width * 0.25, canvas.height * 0.8, 0,
        canvas.width * 0.25, canvas.height * 0.8, 400
      );
      g2.addColorStop(0, `rgba(${g},${b},${r},0.05)`);
      g2.addColorStop(0.5, `rgba(${g},${b},${r},0.02)`);
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [accentColor]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]" aria-hidden="true">
      {/* Canvas particles */}
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" aria-hidden="true" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#000_85%)]" aria-hidden="true" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
