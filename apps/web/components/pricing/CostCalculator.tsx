"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { Calculator, RotateCcw } from "lucide-react";
import Image from "next/image";
import { calculatorModels, calculatorPresets } from "@/lib/pricing-data";

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

function formatCurrency(n: number): string {
    if (n < 0.01) return `$${n.toFixed(4)}`;
    if (n < 1) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(2)}`;
}

function CustomSlider({
    label,
    value,
    min,
    max,
    step,
    onChange,
    colorClass,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    colorClass: string;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const percentage = ((value - min) / (max - min)) * 100;

    const handlePointer = useCallback(
        (clientX: number) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const raw = min + pct * (max - min);
            const stepped = Math.round(raw / step) * step;
            onChange(Math.max(min, Math.min(max, stepped)));
        },
        [min, max, step, onChange]
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: PointerEvent) => handlePointer(e.clientX);
        const onUp = () => setIsDragging(false);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [isDragging, handlePointer]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            onChange(Math.min(max, value + step));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            onChange(Math.max(min, value - step));
        } else if (e.key === "Home") {
            onChange(min);
        } else if (e.key === "End") {
            onChange(max);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-mono tracking-wide uppercase text-gray-500">{label}</span>
                <span className="text-xs font-mono font-bold text-white">{formatTokens(value)}</span>
            </div>
            <div
                ref={trackRef}
                role="slider"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-label={label}
                tabIndex={0}
                onPointerDown={(e) => {
                    setIsDragging(true);
                    handlePointer(e.clientX);
                }}
                onKeyDown={handleKeyDown}
                className="relative h-1.5 rounded-full bg-white/5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-full"
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-colors"
                    style={{
                        width: `${percentage}%`,
                        background: "linear-gradient(90deg, rgba(59,130,246,0.6), rgba(139,92,246,0.6))",
                    }}
                />
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-blue-500/20 border border-white/20"
                    style={{ left: `${percentage}%`, x: "-50%" }}
                    animate={{ scale: isDragging ? 1.2 : 1 }}
                    transition={{ duration: 0.15 }}
                />
                {/* Hover glow */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-blue-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `${percentage}%`, x: "-50%" }}
                />
            </div>
        </div>
    );
}

function AnimatedCost({ value }: { value: number }) {
    const motionValue = useMotionValue(0);
    const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
    const display = useTransform(spring, (v) => formatCurrency(v));
    const [text, setText] = useState(formatCurrency(0));

    useEffect(() => {
        motionValue.set(value);
    }, [value, motionValue]);

    useEffect(() => {
        const unsubscribe = display.on("change", (v) => setText(v));
        return unsubscribe;
    }, [display]);

    return <span>{text}</span>;
}

export function CostCalculator() {
    const [selectedModelIndex, setSelectedModelIndex] = useState(0);
    const [inputTokens, setInputTokens] = useState(4000);
    const [outputTokens, setOutputTokens] = useState(1000);
    const [activePreset, setActivePreset] = useState<string | null>("Chat");

    const model = calculatorModels[selectedModelIndex];

    const inputCost = (inputTokens / 1000) * model.inputPricePer1k;
    const outputCost = (outputTokens / 1000) * model.outputPricePer1k;
    const totalCost = inputCost + outputCost;

    const handlePreset = (preset: typeof calculatorPresets[0]) => {
        setInputTokens(preset.inputTokens);
        setOutputTokens(preset.outputTokens);
        setActivePreset(preset.label);
    };

    const handleReset = () => {
        setInputTokens(4000);
        setOutputTokens(1000);
        setActivePreset("Chat");
    };

    return (
        <section className="relative w-full py-24 md:py-32 px-4 bg-[#030303] overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-violet-600/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20 backdrop-blur-sm mb-6"
                    >
                        <Calculator className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-blue-400">
                            Calculator
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4"
                    >
                        Estimate Your{" "}
                        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Costs
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 max-w-lg mx-auto"
                    >
                        Select a model and token count to see exactly what you will pay.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    {/* Controls Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-3 relative"
                    >
                        <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-sm p-6 md:p-8 overflow-hidden">
                            {/* Subtle corner accent */}
                            <div className="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
                            <div className="absolute top-0 left-0 w-px h-20 bg-gradient-to-b from-blue-500/50 to-transparent" />

                            {/* Model Selector */}
                            <div className="mb-8">
                                <label className="text-xs font-mono tracking-wide uppercase text-gray-500 mb-3 block">
                                    Model
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {calculatorModels.map((m, i) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModelIndex(i)}
                                            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 group ${
                                                selectedModelIndex === i
                                                    ? "bg-white/5 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                                    : "bg-transparent border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                                            }`}
                                        >
                                            <div className="relative w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                                {m.logo ? (
                                                    <Image
                                                        src={m.logo}
                                                        alt={m.provider}
                                                        width={20}
                                                        height={20}
                                                        className="object-contain"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <m.icon className={`w-4 h-4 ${m.color}`} />
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] font-mono font-bold tracking-wide ${
                                                    selectedModelIndex === i ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                                                }`}
                                            >
                                                {m.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="space-y-6 mb-8">
                                <CustomSlider
                                    label="Input Tokens"
                                    value={inputTokens}
                                    min={1000}
                                    max={1_000_000}
                                    step={1000}
                                    onChange={setInputTokens}
                                    colorClass="bg-blue-500"
                                />
                                <CustomSlider
                                    label="Output Tokens"
                                    value={outputTokens}
                                    min={1000}
                                    max={500_000}
                                    step={1000}
                                    onChange={setOutputTokens}
                                    colorClass="bg-violet-500"
                                />
                            </div>

                            {/* Presets */}
                            <div>
                                <label className="text-xs font-mono tracking-wide uppercase text-gray-500 mb-3 block">
                                    Presets
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {calculatorPresets.map((preset) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => handlePreset(preset)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                                                activePreset === preset.label
                                                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                                    : "bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300"
                                            }`}
                                        >
                                            <preset.icon className="w-3 h-3" />
                                            {preset.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={handleReset}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-gray-500 border border-white/5 hover:border-white/15 hover:text-gray-300 transition-all"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Cost Display Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15 }}
                        className="lg:col-span-2 relative"
                    >
                        <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm p-6 md:p-8 flex flex-col overflow-hidden">
                            {/* Glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px]" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-violet-500/10 rounded-full blur-[60px]" />

                            <div className="relative flex-1 flex flex-col">
                                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-2">
                                    Estimated Cost
                                </span>
                                <div className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-2">
                                    <AnimatedCost value={totalCost} />
                                </div>
                                <p className="text-xs text-gray-500 font-mono mb-8">
                                    for {formatTokens(inputTokens)} input + {formatTokens(outputTokens)} output
                                </p>

                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <span className="text-xs text-gray-400">Input</span>
                                        </div>
                                        <span className="text-xs font-mono text-white">
                                            {formatCurrency(inputCost)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                            <span className="text-xs text-gray-400">Output</span>
                                        </div>
                                        <span className="text-xs font-mono text-white">
                                            {formatCurrency(outputCost)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-xs text-gray-500">Model Rate</span>
                                        <span className="text-[10px] font-mono text-gray-500">
                                            {model.inputPricePer1k}/1K in, {model.outputPricePer1k}/1K out
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                                        Credits deducted in real-time
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
