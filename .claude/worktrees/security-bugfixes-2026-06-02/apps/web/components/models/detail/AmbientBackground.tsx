"use client";

import { useEffect, useRef } from "react";

interface AmbientBackgroundProps {
  accentColor?: string;
}

export function AmbientBackground({
  accentColor = "#6366f1",
}: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion — show static glow only
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let animId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Parse accent into RGB
    let ar = 99,
      ag = 102,
      ab = 241;
    const hex = accentColor.replace("#", "");
    if (hex.length === 6) {
      ar = parseInt(hex.slice(0, 2), 16);
      ag = parseInt(hex.slice(2, 4), 16);
      ab = parseInt(hex.slice(4, 6), 16);
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Single centered glow
      const g = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.35,
        0,
        canvas.width * 0.5,
        canvas.height * 0.35,
        Math.max(canvas.width, canvas.height) * 0.6,
      );
      g.addColorStop(0, `rgba(${ar},${ag},${ab},0.04)`);
      g.addColorStop(0.4, `rgba(${ar},${ag},${ab},0.02)`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    if (prefersReduced) {
      drawStatic();
      window.addEventListener("resize", drawStatic);
      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", resize);
        window.removeEventListener("resize", drawStatic);
      };
    }

    // Animated mode — fewer particles on mobile
    const count = Math.min(
      Math.floor((canvas.width * canvas.height) / 40000),
      45,
    );
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.25 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Glow orb — top right (asymmetric)
      const g1 = ctx.createRadialGradient(
        canvas.width * 0.72,
        canvas.height * 0.18,
        0,
        canvas.width * 0.72,
        canvas.height * 0.18,
        500,
      );
      g1.addColorStop(0, `rgba(${ar},${ag},${ab},0.055)`);
      g1.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.025)`);
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Glow orb — bottom left (cross-axis)
      const g2 = ctx.createRadialGradient(
        canvas.width * 0.28,
        canvas.height * 0.82,
        0,
        canvas.width * 0.28,
        canvas.height * 0.82,
        400,
      );
      g2.addColorStop(0, `rgba(${ag},${ab},${ar},0.04)`);
      g2.addColorStop(0.5, `rgba(${ag},${ab},${ar},0.015)`);
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${p.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [accentColor]);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-[#000000]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-grid-pattern opacity-[0.02]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#000_85%)]"
        aria-hidden="true"
      />
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
