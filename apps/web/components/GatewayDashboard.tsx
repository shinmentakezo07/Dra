"use client";

import { motion } from "framer-motion";
import { Activity, Zap, DollarSign, TrendingUp, Clock, Cpu, Globe, Shield, ChevronRight, Sparkles, BarChart3, Code2, Server } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface GatewayDashboardProps {
  user: any;
}

// Mock data - replace with real API calls
const models = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    contextWindow: "128K",
    inputPrice: "$10.00",
    outputPrice: "$30.00",
    speed: "Fast",
    quality: 95,
    category: "flagship"
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    contextWindow: "200K",
    inputPrice: "$15.00",
    outputPrice: "$75.00",
    speed: "Medium",
    quality: 98,
    category: "flagship"
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    contextWindow: "32K",
    inputPrice: "$0.50",
    outputPrice: "$1.50",
    speed: "Very Fast",
    quality: 88,
    category: "balanced"
  },
  {
    id: "llama-3-70b",
    name: "Llama 3 70B",
    provider: "Meta",
    contextWindow: "8K",
    inputPrice: "$0.70",
    outputPrice: "$0.90",
    speed: "Fast",
    quality: 85,
    category: "balanced"
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    contextWindow: "32K",
    inputPrice: "$4.00",
    outputPrice: "$12.00",
    speed: "Fast",
    quality: 90,
    category: "flagship"
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    contextWindow: "16K",
    inputPrice: "$0.50",
    outputPrice: "$1.50",
    speed: "Very Fast",
    quality: 75,
    category: "budget"
  }
];

const usageStats = {
  totalRequests: 45678,
  totalTokens: 12456789,
  totalCost: 234.56,
  avgLatency: 1.2,
  successRate: 99.8,
  topModel: "GPT-4 Turbo"
};

export default function GatewayDashboard({ user }: GatewayDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const filteredModels = selectedCategory === "all" 
    ? models 
    : models.filter(m => m.category === selectedCategory);

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505] relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono font-medium mb-3 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            GATEWAY ONLINE // ALL SYSTEMS OPERATIONAL
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            LLM Gateway <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Dashboard</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base font-light">
            Unified access to <span className="text-white font-medium">{models.length} AI models</span> from leading providers
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stats Overview */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-green-500/50 bg-green-500/5 px-2 py-1 rounded">+24%</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Requests</p>
                  <h3 className="text-2xl font-bold text-white">{usageStats.totalRequests.toLocaleString()}</h3>
                  <p className="text-[10px] text-gray-500 mt-2">Last 30 days</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-purple-500/50 bg-purple-500/5 px-2 py-1 rounded">{usageStats.successRate}%</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Success Rate</p>
                  <h3 className="text-2xl font-bold text-white">{usageStats.successRate}%</h3>
                  <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                      style={{ width: `${usageStats.successRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-green-500/30 transition-colors shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Cost</p>
                  <h3 className="text-2xl font-bold text-white">${usageStats.totalCost}</h3>
                  <p className="text-[10px] text-gray-500 mt-2">This month</p>
                </div>
              </div>
            </motion.div>

            {/* Additional Stats Row */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Latency</p>
                  <p className="text-lg font-bold text-white font-mono">{usageStats.avgLatency}s</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Tokens</p>
                  <p className="text-lg font-bold text-white font-mono">{(usageStats.totalTokens / 1000000).toFixed(1)}M</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Top Model</p>
                  <p className="text-sm font-bold text-white">{usageStats.topModel}</p>
                </div>
              </div>
            </motion.div>

            {/* Model Catalog */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_#3b82f6]" />
                  Available Models
                </h2>
                <div className="flex gap-2">
                  {["all", "flagship", "balanced", "budget"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                        selectedCategory === cat
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="group relative p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 hover:from-blue-500/50 hover:to-purple-500/50 transition-all duration-300"
                  >
                    <div className="relative h-full bg-[#0e0e0e] rounded-[15px] p-6 group-hover:bg-[#050505] transition-colors">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {/* Model Icon */}
                        <div className="w-16 h-16 rounded-xl bg-[#151515] border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300 group-hover:border-blue-500/20">
                          <Sparkles className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                {model.name}
                              </h3>
                              <p className="text-sm text-gray-400 font-light">{model.provider}</p>
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-400 border border-white/5 uppercase tracking-wider">
                                {model.contextWindow}
                              </span>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
                                {model.speed}
                              </span>
                            </div>
                          </div>

                          {/* Quality Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-400 font-mono">Quality Score</span>
                              <span className="text-xs text-white font-mono font-bold">{model.quality}/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all duration-1000"
                                style={{ width: `${model.quality}%` }}
                              />
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Input</p>
                                <p className="text-sm font-bold text-white font-mono">{model.inputPrice}<span className="text-xs text-gray-500">/1M</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Output</p>
                                <p className="text-sm font-bold text-white font-mono">{model.outputPrice}<span className="text-xs text-gray-500">/1M</span></p>
                              </div>
                            </div>
                            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 text-white text-sm font-medium transition-all group/btn">
                              <span>Use Model</span>
                              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[#0A0A0A] border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 relative z-10 uppercase tracking-widest font-mono border-b border-white/5 pb-4">
                <Zap className="w-4 h-4 text-blue-500" />
                Quick Actions
              </h3>
              
              <div className="space-y-3 relative z-10">
                <Link href="/playground" className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white font-medium">Playground</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white font-medium">Analytics</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white font-medium">API Keys</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </motion.div>

            {/* Provider Status */}
            <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[#0A0A0A] border border-white/5 shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 relative z-10 uppercase tracking-widest font-mono border-b border-white/5 pb-4">
                <Globe className="w-4 h-4 text-green-500" />
                Provider Status
              </h3>
              
              <div className="space-y-4">
                {["OpenAI", "Anthropic", "Google", "Meta", "Mistral AI"].map((provider) => (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </div>
                      <span className="text-sm text-gray-300">{provider}</span>
                    </div>
                    <span className="text-xs font-mono text-green-400">ONLINE</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Security Notice */}
            <motion.div variants={itemVariants} className="p-1 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 relative overflow-hidden">
              <div className="bg-[#0A0A0A] rounded-[20px] p-6 h-full relative">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Secure Gateway</h3>
                    <p className="text-xs text-gray-400 mt-1">End-to-end encryption</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  All API requests are encrypted and routed through our secure gateway with automatic failover and load balancing.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
