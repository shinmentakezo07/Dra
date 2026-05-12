"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export function PricingCTA() {
    return (
        <section className="relative w-full py-24 md:py-32 px-4 overflow-hidden bg-[#000000]">
            {/* Top gradient border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-fuchsia-600/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/10 mb-8">
                        <Zap className="w-5 h-5 text-blue-400" />
                    </div>

                    {/* Headline */}
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.95]">
                        Start Building{" "}
                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Today
                        </span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-10 font-light leading-relaxed">
                        Get $5 in free credits when you sign up. No credit card required.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-mono text-sm font-bold tracking-wider uppercase overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.2)] hover:shadow-[0_0_60px_rgba(59,130,246,0.35)] transition-shadow duration-500"
                            >
                                {/* Shine */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <span className="relative z-10 flex items-center gap-3">
                                    Get Started Free
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </motion.button>
                        </Link>

                        <Link href="/models">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                Explore Models
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
