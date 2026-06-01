"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ── Indigo-only scroll progress with glow ── */
export const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
      <div
        className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        className="relative h-full bg-gradient-to-r from-indigo-400/90 via-indigo-300/80 to-violet-300/70 shadow-[0_0_12px_2px_rgba(99,102,241,0.4)]"
        style={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
};
