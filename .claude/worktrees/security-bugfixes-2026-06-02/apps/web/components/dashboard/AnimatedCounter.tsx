"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedCounterProps {
  target: number | string;
  duration?: number;
}

export function AnimatedCounter({
  target,
  duration = 800,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(
    typeof target === "number" ? 0 : target,
  );

  useEffect(() => {
    if (typeof target !== "number") {
      setCurrent(target);
      return;
    }

    const start = 0;
    const end = target;
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return (
    <motion.span
      key={current}
      initial={{ y: -4, opacity: 0.5 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {typeof current === "number" ? current.toLocaleString() : current}
    </motion.span>
  );
}
