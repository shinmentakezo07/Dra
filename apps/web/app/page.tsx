"use client";

import { motion } from "framer-motion";
import {
    Terminal, Activity, UserPlus, Search, TrendingUp,
    Globe, Zap, Award, Code2, Check, Star, Crown, Shield, Sparkles, ArrowRight
} from "lucide-react";
import { Hero } from "../components/Hero";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-[#000000] text-foreground selection:bg-primary/30 selection:text-white">

      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- FEATURES SECTION --- */}
      <section className="w-full py-32 px-4 relative z-20 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl bg-primary/5 rounded-full blur-[120px] -z-10" />

          <div className="max-w-7xl mx-auto">
             <div className="mb-20 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-block mb-4 px-4 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-mono font-bold tracking-widest uppercase"
                >
                    Gateway Features
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight"
                >
                    One API, Every Model
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground text-lg max-w-2xl mx-auto"
                >
                    Route requests to GPT-4, Claude, Gemini, Llama, and 100+ models through a single unified interface.
                </motion.p>
             </div>

             <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
             >
                {/* API Gateway Card */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 row-span-2 glass-card rounded-[32px] p-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="h-full bg-[#0A0A0A] rounded-[28px] p-8 flex flex-col justify-between border border-white/5 relative z-10">
                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-500">
                                <Terminal className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-bold mb-3 text-white">Unified API</h3>
                            <p className="text-muted-foreground text-lg">One endpoint for all models. Switch between GPT-4, Claude, Gemini instantly without code changes.</p>
                        </div>
                        <div className="w-full mt-8 rounded-xl bg-black border border-white/10 p-5 font-mono text-sm text-green-400 shadow-2xl">
                            <div className="flex gap-2 mb-4 opacity-50">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="space-y-2">
                                <p className="flex"><span className="text-blue-400 mr-2">$</span> curl https://api.shinmen-takzo.ai/v1/chat</p>
                                <p className="text-gray-500">Routing to optimal model...</p>
                                <p className="text-green-400">✓ Response from claude-opus-4</p>
                                <p className="animate-pulse flex"><span className="text-blue-400 mr-2">$</span> _</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Card */}
                <motion.div variants={itemVariants} className="col-span-1 row-span-2 glass-card rounded-[32px] p-1 group">
                     <div className="h-full bg-[#0A0A0A] rounded-[28px] p-8 flex flex-col justify-between border border-white/5 relative z-10 overflow-hidden">
                        <div className="relative z-20">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-400 ring-1 ring-blue-500/20">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Real-time Analytics</h3>
                            <p className="text-muted-foreground text-sm">Monitor usage, costs, and latency.</p>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-48">
                             <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{stopColor:'rgb(59, 130, 246)', stopOpacity:0.2}} />
                                        <stop offset="100%" style={{stopColor:'rgb(59, 130, 246)', stopOpacity:0}} />
                                    </linearGradient>
                                </defs>
                                <path d="M0 100 C 20 80, 40 90, 60 60 S 80 20, 100 10 V 100 Z" fill="url(#grad1)" />
                                <path d="M0 100 C 20 80, 40 90, 60 60 S 80 20, 100 10" fill="none" stroke="#3b82f6" strokeWidth="2" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            </svg>
                        </div>
                     </div>
                </motion.div>

                {/* Feature Cards */}
                <motion.div variants={itemVariants} className="col-span-1 glass-card rounded-[32px] p-8 flex flex-col justify-center hover:-translate-y-1 transition-transform bg-[#0A0A0A] border border-white/5">
                    <Globe className="w-10 h-10 mb-6 text-purple-500" />
                    <h3 className="text-xl font-bold mb-2">Global Edge Network</h3>
                    <p className="text-sm text-muted-foreground">Low-latency access from 50+ regions worldwide.</p>
                </motion.div>

                <motion.div variants={itemVariants} className="col-span-1 glass-card rounded-[32px] p-8 flex flex-col justify-center hover:-translate-y-1 transition-transform bg-[#0A0A0A] border border-white/5">
                    <Zap className="w-10 h-10 mb-6 text-yellow-500" />
                    <h3 className="text-xl font-bold mb-2">Smart Routing</h3>
                    <p className="text-sm text-muted-foreground">Auto-route to fastest, cheapest, or best model.</p>
                </motion.div>

                 <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 glass-card rounded-[32px] p-8 flex items-center justify-between relative overflow-hidden group bg-[#0A0A0A] border border-white/5">
                    <div className="relative z-10 max-w-xs">
                        <h3 className="text-2xl font-bold mb-3">Transparent Pricing</h3>
                        <p className="text-muted-foreground">See exact per-token costs for every model. No hidden fees, no surprises.</p>
                    </div>
                    <div className="relative z-10 p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                        <Award className="w-12 h-12 text-emerald-500" />
                    </div>
                    <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors" />
                </motion.div>
             </motion.div>
          </div>
      </section>

      {/* Integration Workflow Section */}
      <section className="w-full py-24 px-4 relative z-20">
        <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center">
                <h2 className="text-3xl md:text-5xl font-mono font-bold mb-6 text-white">Integration Flow</h2>
                <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-8">
                    Get started in minutes. Sign up, grab your API key, and start routing requests to 100+ models through one unified endpoint.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />

                {[
                    {
                        step: "01",
                        title: "Sign Up",
                        desc: "Create account in 30 seconds",
                        icon: UserPlus,
                        color: "text-purple-400",
                        bg: "bg-purple-500/10",
                        border: "border-purple-500/20"
                    },
                    {
                        step: "02",
                        title: "Get API Key",
                        desc: "Generate your credentials",
                        icon: Search,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        border: "border-blue-500/20"
                    },
                    {
                        step: "03",
                        title: "Integrate",
                        desc: "Drop-in OpenAI replacement",
                        icon: Code2,
                        color: "text-green-400",
                        bg: "bg-green-500/10",
                        border: "border-green-500/20"
                    },
                    {
                        step: "04",
                        title: "Scale",
                        desc: "Monitor usage & optimize costs",
                        icon: TrendingUp,
                        color: "text-yellow-400",
                        bg: "bg-yellow-500/10",
                        border: "border-yellow-500/20"
                    }
                ].map((item, i) => (
                    <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.2 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center text-center group"
                    >
                        <div className="relative mb-6">
                            <div className={`w-24 h-24 rounded-[2rem] ${item.bg} border ${item.border} flex items-center justify-center relative z-10 group-hover:scale-110 transition-all duration-300 shadow-2xl`}>
                                <item.icon className={`w-10 h-10 ${item.color}`} />
                            </div>
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white font-mono font-bold text-xs border border-white/10 z-20 shadow-lg">
                                {item.step}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed px-4">
                            {item.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      <footer className="w-full py-12 border-t border-white/10 bg-[#050505] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground relative z-10 font-mono text-sm">
            <p className="flex items-center justify-center gap-2">
                <span>&copy; 2026 Yapapa</span>
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span>Universal LLM Gateway</span>
            </p>
        </div>
      </footer>
    </div>
  );
}
