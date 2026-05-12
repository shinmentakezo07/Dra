"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform, useMotionValue } from "framer-motion";
import { Activity, ArrowRight } from "lucide-react";
import { featuredModels } from "@/lib/pricing-data";
import Image from "next/image";
import Link from "next/link";

function CountUpNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const motionValue = useMotionValue(0);
    const spring = useSpring(motionValue, { stiffness: 60, damping: 20 });
    const display = useTransform(spring, (v) => Math.round(v));
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [isInView, value, motionValue]);

    useEffect(() => {
        const unsubscribe = display.on("change", (v) => setCurrent(v));
        return unsubscribe;
    }, [display]);

    return (
        <span ref={ref}>
            {current}
            {suffix}
        </span>
    );
}

export function ModelShowcase() {
    return (
        <section className="relative w-full py-24 md:py-32 px-4 bg-[#000000] overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[140px] animate-glow-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[140px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-mono font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-md"
                    >
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Transparent Pricing
                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-6 leading-[0.95]"
                    >
                        One Gateway,{" "}
                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
                            Every Model
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-gray-400 max-w-2xl mx-auto font-light"
                    >
                        Access 100+ models with{" "}
                        <span className="text-blue-400 font-medium">transparent, per-token pricing</span>.
                        No subscriptions, no hidden fees.
                    </motion.p>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
                    {/* Left: Live Rates Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-3 relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/5 via-violet-500/3 to-purple-500/5 rounded-3xl blur-2xl" />
                        <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-sm p-6 md:p-8 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Live Rates</h3>
                                        <p className="text-xs text-gray-500 font-mono">Per 1K tokens</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono font-bold uppercase">
                                    100+ Models
                                </span>
                            </div>

                            {/* Model Rows */}
                            <div className="space-y-3">
                                {featuredModels.map((model, i) => (
                                    <motion.div
                                        key={model.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="group relative flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
                                    >
                                        {/* Hover accent bar */}
                                        <div
                                            className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                                i === 0 ? "bg-blue-500" :
                                                i === 1 ? "bg-violet-500" :
                                                i === 2 ? "bg-purple-500" :
                                                "bg-fuchsia-500"
                                            }`}
                                        />

                                        <div className="flex items-center gap-4 pl-2">
                                            <div className="relative w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                                {model.logo ? (
                                                    <Image
                                                        src={model.logo}
                                                        alt={`${model.provider} logo`}
                                                        width={24}
                                                        height={24}
                                                        className="object-contain"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <model.icon className={`w-5 h-5 ${model.color}`} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold text-sm">{model.name}</h4>
                                                <p className="text-xs text-gray-500 font-mono">{model.provider}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Input</p>
                                                <p className="text-blue-400 font-mono font-bold text-sm">{model.inputPrice}</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Output</p>
                                                <p className="text-violet-400 font-mono font-bold text-sm">{model.outputPrice}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Context</p>
                                                <p className="text-purple-400 font-mono font-bold text-sm">{model.context}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Bottom link */}
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <Link href="/models" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                                    View all 100+ models
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Stats & Benefits */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-2 relative space-y-8"
                    >
                        {/* Big Number */}
                        <div className="relative">
                            <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/5 to-violet-500/5 rounded-3xl blur-2xl" />
                            <div className="relative">
                                <p className="text-[100px] md:text-[140px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/10">
                                    <CountUpNumber value={100} suffix="+" />
                                </p>
                                <p className="text-xl md:text-2xl font-bold text-white -mt-2 ml-1">
                                    models, <span className="text-blue-400">one bill</span>
                                </p>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-4 pt-2">
                            {[
                                { text: "No monthly minimums or seat fees", color: "bg-blue-500" },
                                { text: "See exact cost per request in real-time", color: "bg-violet-500" },
                                { text: "Switch models instantly with zero config", color: "bg-purple-500" },
                                { text: "Credits never expire", color: "bg-fuchsia-500" },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.text}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.color} shadow-[0_0_8px_currentColor]`} />
                                    <p className="text-gray-300 text-sm">{item.text}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.6 }}
                        >
                            <Link href="/models">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-mono text-sm font-bold transition-all group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        Compare All Models
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </motion.button>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
