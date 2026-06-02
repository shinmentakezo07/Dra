"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function ModelsHero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#000000]">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient animate-mesh-shift" />
        {/* Radial orbs */}
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-blue-600/8 rounded-full blur-[140px] animate-glow-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px] animate-glow-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] animate-glow-pulse"
          style={{ animationDelay: "4s" }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
      </div>

      {/* Orbiting Elements */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="absolute w-3 h-3 rounded-full bg-blue-500/40 blur-[2px]"
          style={{ originX: 0.5, originY: 0.5 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -top-[60px] -left-[60px]" />
        </motion.div>
        <div className="absolute w-2 h-2 rounded-full bg-violet-400/50 animate-orbit" />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-fuchsia-400/40 animate-orbit-reverse" />
        <div
          className="absolute w-2.5 h-2.5 rounded-sm bg-blue-400/20 rotate-45 animate-orbit"
          style={{ animationDuration: "30s" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-gray-400">
            Registry
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-[11px] font-mono tracking-[0.15em] uppercase text-gray-500">
            100+ Models
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] text-white mb-8"
        >
          <span className="block">Model</span>
          <span className="block">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Registry
            </span>
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed mb-4"
        >
          Browse every model available through the Yapapa gateway.{" "}
          <span className="text-white font-medium">Transparent pricing</span>,{" "}
          <span className="text-white font-medium">real-time availability</span>
          , and unified access.
        </motion.p>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-24 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mx-auto mt-10"
        />

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-gray-600">
            Scroll
          </span>
          <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-1 h-1.5 rounded-full bg-white/50"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
