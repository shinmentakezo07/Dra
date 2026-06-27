"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme } from "@/lib/model-utils";
import { AmbientBackground } from "./AmbientBackground";
import { ModelIdentity } from "./ModelIdentity";
import { PerformancePanel } from "./PerformancePanel";
import { ArchitecturePanel } from "./ArchitecturePanel";
import { PricingPanel } from "./PricingPanel";
import { ParametersPanel } from "./ParametersPanel";
import { QuickStartCard } from "./QuickStartCard";

interface ModelDetailClientProps {
  model: OpenRouterModelData | null;
  providerId: string | null;
}

const containerEase = [0.16, 1, 0.3, 1] as const;

const sections = [
  { id: "about", label: "About", number: "01" },
  { id: "performance", label: "Performance", number: "02" },
  { id: "architecture", label: "Architecture", number: "03" },
  { id: "pricing", label: "Pricing", number: "04" },
  { id: "parameters", label: "Parameters", number: "05" },
  { id: "quickstart", label: "Quick Start", number: "06" },
] as const;

export function ModelDetailClient({
  model,
  providerId,
}: ModelDetailClientProps) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [activeSection, setActiveSection] = useState<string>("about");
  const theme = model && providerId ? getProviderTheme(model.id) : null;

  // Track which section is in view
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = sections.map((s) => s.id);
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!model || !theme) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center relative overflow-hidden">
        <AmbientBackground />
        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"
          >
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-3xl font-black tracking-tighter mb-3"
          >
            Model Not Found
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-gray-600 mb-8 text-sm font-mono"
          >
            The model you&apos;re looking for doesn&apos;t exist.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            onClick={() => router.push("/models")}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            ← Back to Models
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative">
      <AmbientBackground accentColor={theme.accent} />

      {/* Right-rail section navigator */}
      <nav
        className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end gap-4"
        aria-label="Section navigation"
      >
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="group flex items-center gap-3 cursor-pointer"
              aria-label={`Scroll to ${s.label}`}
              aria-current={isActive ? "true" : undefined}
            >
              <motion.span
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  x: isActive ? 0 : 4,
                }}
                transition={{ duration: 0.25 }}
                className="text-[9px] font-mono tracking-[0.2em] uppercase group-hover:!opacity-100 transition-opacity duration-200"
                style={{
                  color: isActive ? theme.accent : "rgba(255,255,255,0.25)",
                }}
              >
                {s.label}
              </motion.span>
              <motion.div
                className="h-px"
                initial={false}
                animate={{
                  width: isActive ? 32 : 16,
                  backgroundColor: isActive
                    ? theme.accent
                    : "rgba(255,255,255,0.06)",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            </button>
          );
        })}
      </nav>

      {/* Main content */}
      <div className="relative z-10 pt-16 sm:pt-20 pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ModelIdentity
            model={model}
            theme={theme}
            onBack={() => router.push("/models")}
          />

          {/* Bento grid: asymmetrical 12-column layout */}
          <div className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
            {/* About — spans 8 cols */}
            {model.description && (
              <div className="lg:col-span-8 lg:row-span-1">
                <motion.section
                  initial={prefersReduced ? undefined : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, ease: containerEase }}
                  aria-label="About this model"
                  id="about"
                >
                  <SectionHeading accent={theme.accent} number="01">
                    About
                  </SectionHeading>
                  <div
                    className="rounded-2xl border p-6 sm:p-8 relative overflow-hidden"
                    style={{
                      borderColor: `${theme.accent}15`,
                      backgroundColor: `${theme.accent}02`,
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent}30, transparent)`,
                      }}
                    />
                    <div
                      className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full"
                      style={{ backgroundColor: `${theme.accent}20` }}
                    />
                    <p className="text-[15px] sm:text-base leading-[1.85] text-gray-300 font-[425] pl-4">
                      {model.description}
                    </p>
                  </div>
                </motion.section>
              </div>
            )}

            {/* Performance — spans 4 cols */}
            <div className="lg:col-span-4 lg:row-span-1">
              <PerformancePanel model={model} />
            </div>

            {/* Architecture — spans 6 cols */}
            <div className="lg:col-span-6 lg:row-span-1">
              <ArchitecturePanel model={model} />
            </div>

            {/* Pricing — spans 3 cols */}
            <div className="lg:col-span-3 lg:row-span-1">
              <PricingPanel model={model} />
            </div>

            {/* Parameters — spans 3 cols */}
            <div className="lg:col-span-3 lg:row-span-1">
              <ParametersPanel
                params={model.supported_parameters}
                modelId={model.id}
              />
            </div>

            {/* Quick Start — full width */}
            <div className="lg:col-span-12 lg:row-span-1">
              <QuickStartCard model={model} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  children,
  accent,
  number,
}: {
  children: React.ReactNode;
  accent?: string;
  number?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {number && (
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: accent || "rgba(255,255,255,0.3)" }}
        >
          {number}
        </span>
      )}
      <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-500">
        {children}
      </h2>
      <span className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
}
