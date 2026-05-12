"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Plus, Minus } from "lucide-react";
import { pricingFAQ } from "@/lib/pricing-data";

function FAQItem({ item, index }: { item: typeof pricingFAQ[0]; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left relative rounded-xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                        ? "bg-white/[0.03] border-white/15"
                        : "bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]"
                }`}
            >
                <div className="flex items-center justify-between p-5 md:p-6 gap-4">
                    <span className="text-sm md:text-base font-medium text-white leading-snug">
                        {item.question}
                    </span>
                    <div
                        className={`relative shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            isOpen
                                ? "bg-blue-500/10 border-blue-500/30"
                                : "bg-transparent border-white/10"
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {isOpen ? (
                                <motion.div
                                    key="minus"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Minus className="w-3 h-3 text-blue-400" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="plus"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Plus className="w-3 h-3 text-gray-500" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                                <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-4" />
                                <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                                    {item.answer}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
        </motion.div>
    );
}

export function PricingFAQ() {
    return (
        <section className="relative w-full py-24 md:py-32 px-4 bg-[#000000] overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/3 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-15" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/5 border border-violet-500/20 backdrop-blur-sm mb-6"
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-violet-400">
                            FAQ
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4"
                    >
                        Common{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Questions
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400"
                    >
                        Everything you need to know about pricing.
                    </motion.p>
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                    {pricingFAQ.map((item, i) => (
                        <FAQItem key={item.question} item={item} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
