"use client";

import { motion } from "framer-motion";
import {
    Terminal, Activity, UserPlus, Search, TrendingUp,
    Globe, Zap, Award, Code2, ArrowRight
} from "lucide-react";
import { Hero } from "../components/Hero";
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
      <section className="w-full py-32 px-4 relative z-20 overflow-hidden">
        {/* Deep background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_60%)]" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-primary/6 to-transparent rounded-full blur-[150px] -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-20 lg:mb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
              <div className="lg:col-span-5">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="sticky top-32"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-mono font-bold tracking-[0.2em] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Zero to Production
                  </div>
                  <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[0.9]">
                    Integration
                    <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-blue-400 to-purple-400">Flow</span>
                  </h2>
                  <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-sm">
                    Get started in minutes. Sign up, grab your API key, and start routing requests to 100+ models through one unified endpoint.
                  </p>
                </motion.div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                {[
                  {
                    step: "01",
                    title: "Sign Up",
                    desc: "Create your account in under 30 seconds — no credit card required.",
                    icon: UserPlus,
                    accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
                    border: "border-emerald-500/20",
                    text: "text-emerald-400",
                    gradient: "from-emerald-400 to-emerald-600",
                    size: "default",
                    code: null,
                  },
                  {
                    step: "02",
                    title: "Get API Key",
                    desc: "Generate your credentials from the dashboard. Instant, zero-wait provisioning.",
                    icon: Search,
                    accent: "from-blue-500/20 via-blue-500/5 to-transparent",
                    border: "border-blue-500/20",
                    text: "text-blue-400",
                    gradient: "from-blue-400 to-cyan-600",
                    size: "wide",
                    code: null,
                  },
                  {
                    step: "03",
                    title: "Integrate",
                    desc: "Drop-in replacement for OpenAI. Change one line of code, unlock 100+ models.",
                    icon: Code2,
                    accent: "from-violet-500/20 via-violet-500/5 to-transparent",
                    border: "border-violet-500/20",
                    text: "text-violet-400",
                    gradient: "from-violet-400 to-purple-600",
                    size: "tall",
                    code: [
                      "const client = new OpenAI({",
                      '  apiKey: process.env.YAPAPA_KEY,',
                      '  baseURL: "https://api.yapa.up.railway.app/v1"',
                      "});",
                    ],
                  },
                  {
                    step: "04",
                    title: "Scale",
                    desc: "Monitor usage, set budgets, and optimize costs across every provider from one pane.",
                    icon: TrendingUp,
                    accent: "from-amber-500/20 via-amber-500/5 to-transparent",
                    border: "border-amber-500/20",
                    text: "text-amber-400",
                    gradient: "from-amber-400 to-orange-600",
                    size: "default",
                    code: null,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="relative group">
                      <div className={`absolute -inset-1 bg-gradient-to-br ${item.accent} rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                      <div className={`relative bg-[#0A0A0A] rounded-[2rem] border ${item.border} backdrop-blur-xl overflow-hidden ${
                        item.size === "tall" ? "p-8 lg:p-10" : "p-6 lg:p-8"
                      }`}>
                        <div className={`flex ${item.size === "tall" ? "flex-col lg:flex-row lg:items-start gap-6" : "items-center gap-5"}`}>
                          {/* Icon */}
                          <div className={`shrink-0 ${
                            item.size === "tall" ? "w-14 h-14" : "w-12 h-12"
                          } rounded-2xl bg-gradient-to-br ${item.accent} border ${item.border} flex items-center justify-center`}>
                            <item.icon className={`${item.size === "tall" ? "w-7 h-7" : "w-6 h-6"} ${item.text}`} />
                          </div>

                          <div className={`flex-1 min-w-0 ${item.size === "tall" ? "" : "flex items-center justify-between gap-4"}`}>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className={`text-xs font-mono font-bold tracking-widest ${item.text}`}>
                                  STEP {item.step}
                                </span>
                                <div className={`w-0.5 h-3 bg-gradient-to-b ${item.gradient} rounded-full`} />
                              </div>
                              <h3 className={`font-bold text-white ${item.size === "tall" ? "text-2xl" : "text-xl"}`}>
                                {item.title}
                              </h3>
                              <p className="text-muted-foreground text-sm leading-relaxed mt-1 max-w-md">
                                {item.desc}
                              </p>
                            </div>

                            {item.size !== "tall" && (
                              <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${item.accent} border ${item.border} flex items-center justify-center`}>
                                <span className={`text-sm font-mono font-bold ${item.text}`}>{item.step}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Code block for Integrate step */}
                        {item.code && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="mt-6 lg:mt-8 p-5 rounded-2xl bg-black/60 border border-white/5 font-mono text-sm overflow-hidden"
                          >
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                              <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                              </div>
                              <span className="text-[10px] text-white/20 font-mono ml-2">client.js</span>
                            </div>
                            <code className="block text-xs leading-relaxed">
                              {item.code.map((line, li) => {
                                if (line.includes("apiKey")) {
                                  return <div key={li}><span className="text-gray-400">  apiKey</span>: <span className="text-amber-300">process.env.YAPAPA_KEY</span>,</div>;
                                }
                                if (line.includes("baseURL")) {
                                  return <div key={li}><span className="text-gray-400">  baseURL</span>: <span className="text-amber-300">"https://api.yapa.up.railway.app/v1"</span>,</div>;
                                }
                                return (
                                  <div key={li} className="text-green-300">
                                    {line.replace("const", "").replace("{", "").replace("});", "").trim() ? (
                                      <>
                                        <span className="text-blue-300">const</span> client = <span className="text-blue-300">new</span> OpenAI({"{"}
                                      </>
                                    ) : line === "});" ? (
                                      <span>{"}"});</span>
                                    ) : (
                                      <span>{line}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </code>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA — Full-width destination panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-1">
              {/* Inner glow */}
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />

              <div className="relative bg-[#050505] rounded-[2.3rem] p-10 lg:p-16 overflow-hidden">
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px]" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-emerald-300 font-mono font-bold tracking-widest uppercase">Beta — Free Forever</span>
                    </div>
                    <h3 className="text-3xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                      Ready to route?
                    </h3>
                    <p className="mt-4 text-muted-foreground text-base lg:text-lg leading-relaxed">
                      Full access, zero commitment. No credit card, no expiring trial, no time bombs.
                    </p>

                    {/* Stripped-down guarantees */}
                    <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                      {["No credit card", "No rate limits on free", "No surprise bills", "Instant provisioning"].map((g) => (
                        <div key={g} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-sm text-white/60 font-mono">{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href="/signup"
                      className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-bold text-lg overflow-hidden transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {/* Hover shine */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      <span className="relative z-10">Claim your key</span>
                      <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <p className="mt-2 text-[11px] text-white/20 font-mono text-center lg:text-right">
                      No signup friction. No hidden fees.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
