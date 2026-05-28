"use client";

import { useState, useEffect } from "react";

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
        className="h-full bg-gradient-to-r from-blue-500/80 via-purple-500/60 to-emerald-500/50 transition-[width] duration-75 shadow-sm shadow-blue-500/20"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};
