"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderTheme } from "@/lib/model-utils";
import { AmbientBackground } from "./AmbientBackground";
import { ModelIdentity } from "./ModelIdentity";
import { PerformancePanel } from "./PerformancePanel";
import { ArchitecturePanel } from "./ArchitecturePanel";
import { PricingPanel } from "./PricingPanel";
import { ParametersPanel } from "./ParametersPanel";
import { QuickStartCard } from "./QuickStartCard";
import { cn } from "@/lib/utils";

interface ModelDetailClientProps {
    model: OpenRouterModelData | null;
    providerId: string | null;
}

const containerEase = [0.16, 1, 0.3, 1] as const;

const sections = [
    { id: "about", label: "About" },
    { id: "performance", label: "Performance" },
    { id: "architecture", label: "Architecture" },
    { id: "pricing", label: "Pricing" },
    { id: "parameters", label: "Parameters" },
    { id: "quickstart", label: "Quick Start" },
] as const;

function fadeUp(delay = 0) {
    return {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" } as const,
        transition: { duration: 0.5, ease: containerEase, delay },
    };
}

export function ModelDetailClient({ model, providerId }: ModelDetailClientProps) {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<string>("about");
    const theme = model && providerId ? getProviderTheme(model.id) : null;

    if (!model || !theme) {
        return (
            <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center relative overflow-hidden">
                <AmbientBackground accentColor={theme?.accent} />
                <div className="text-center relative z-10">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"
                    >
                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
        <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
            <AmbientBackground accentColor={theme.accent} />

            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6, ease: containerEase }}
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06]"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => router.push("/models")}
                            className="shrink-0 text-[10px] font-mono text-gray-500 hover:text-gray-300 tracking-[0.15em] uppercase transition-colors pr-4 border-r border-white/[0.06] mr-2"
                        >
                            ← All
                        </button>
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setActiveSection(s.id);
                                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className={cn(
                                    "shrink-0 px-3 py-1.5 rounded-md text-[11px] font-mono tracking-wider uppercase transition-all duration-200",
                                    activeSection === s.id
                                        ? "text-white bg-white/[0.08]"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.nav>

            <div className="relative z-10 pt-20 pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ModelIdentity model={model} theme={theme} onBack={() => router.push("/models")} />

            <div className="h-px bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-transparent my-16" />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3 space-y-16">
                            {model.description && (
                                <motion.section {...fadeUp()} aria-label="About this model" id="about">
                                    <SectionHeading>About</SectionHeading>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <p className="text-gray-300 text-[15px] leading-[1.85]">{model.description}</p>
                                    </div>
                                </motion.section>
                            )}

                            <PerformancePanel model={model} />
                            <ArchitecturePanel model={model} />
                        </div>

                <div className="lg:col-span-2">
                            <div className="lg:sticky lg:top-20 space-y-10">
                                <PricingPanel model={model} />
                                <ParametersPanel params={model.supported_parameters} />
                                <QuickStartCard model={model} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-[10px] font-mono text-gray-500 tracking-[0.25em] uppercase mb-5 flex items-center gap-3">
            <span className="w-4 h-px bg-gray-600" />
            {children}
        </h2>
    );
}
