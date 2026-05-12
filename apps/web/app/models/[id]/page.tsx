"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  DollarSign,
  Clock,
  Database,
  Code,
  Info,
  Sparkles,
  Star,
  Activity,
  Brain,
  Cpu,
  CheckCircle,
  Copy,
  ExternalLink,
  Layers,
  Terminal,
  ChevronRight,
  Hash,
} from "lucide-react";
import openRouterModels from "../openrouter-models-2026.json";
import { getProviderLogo } from "@/lib/provider-logos";

// ─────────────────────────────────────────────────────────────────────────────
// Provider theming
// ─────────────────────────────────────────────────────────────────────────────
const providerConfig: Record<
  string,
  { icon: typeof Cpu; color: string; gradient: string; accent: string }
> = {
  openai: { icon: Sparkles, color: "text-emerald-400", gradient: "from-emerald-500/20 to-green-500/20", accent: "#34d399" },
  anthropic: { icon: Zap, color: "text-orange-400", gradient: "from-orange-500/20 to-amber-500/20", accent: "#fb923c" },
  google: { icon: Star, color: "text-blue-400", gradient: "from-blue-500/20 to-cyan-500/20", accent: "#60a5fa" },
  moonshotai: { icon: Brain, color: "text-purple-400", gradient: "from-purple-500/20 to-pink-500/20", accent: "#c084fc" },
  moonshot: { icon: Brain, color: "text-purple-400", gradient: "from-purple-500/20 to-pink-500/20", accent: "#c084fc" },
  zhipu: { icon: Activity, color: "text-cyan-400", gradient: "from-cyan-500/20 to-teal-500/20", accent: "#22d3ee" },
  zhipuai: { icon: Activity, color: "text-cyan-400", gradient: "from-cyan-500/20 to-teal-500/20", accent: "#22d3ee" },
  meta: { icon: Cpu, color: "text-indigo-400", gradient: "from-indigo-500/20 to-blue-500/20", accent: "#818cf8" },
  mistral: { icon: Activity, color: "text-rose-400", gradient: "from-rose-500/20 to-orange-500/20", accent: "#fb7185" },
  mistralai: { icon: Activity, color: "text-rose-400", gradient: "from-rose-500/20 to-orange-500/20", accent: "#fb7185" },
  deepseek: { icon: Cpu, color: "text-teal-400", gradient: "from-teal-500/20 to-emerald-500/20", accent: "#2dd4bf" },
  "deepseek-ai": { icon: Cpu, color: "text-teal-400", gradient: "from-teal-500/20 to-emerald-500/20", accent: "#2dd4bf" },
  xai: { icon: Cpu, color: "text-red-400", gradient: "from-red-500/20 to-orange-500/20", accent: "#f87171" },
  alibaba: { icon: Cpu, color: "text-orange-400", gradient: "from-orange-500/20 to-red-500/20", accent: "#fb923c" },
  qwen: { icon: Cpu, color: "text-orange-400", gradient: "from-orange-500/20 to-red-500/20", accent: "#fb923c" },
  qw: { icon: Brain, color: "text-purple-400", gradient: "from-purple-500/20 to-pink-500/20", accent: "#c084fc" },
  gpt: { icon: Sparkles, color: "text-emerald-400", gradient: "from-emerald-500/20 to-green-500/20", accent: "#34d399" },
  claude: { icon: Zap, color: "text-orange-400", gradient: "from-orange-500/20 to-amber-500/20", accent: "#fb923c" },
  gemini: { icon: Star, color: "text-blue-400", gradient: "from-blue-500/20 to-cyan-500/20", accent: "#60a5fa" },
  llama: { icon: Cpu, color: "text-indigo-400", gradient: "from-indigo-500/20 to-blue-500/20", accent: "#818cf8" },
  minimax: { icon: Activity, color: "text-pink-400", gradient: "from-pink-500/20 to-rose-500/20", accent: "#f472b6" },
  minimaxai: { icon: Activity, color: "text-pink-400", gradient: "from-pink-500/20 to-rose-500/20", accent: "#f472b6" },
  glm: { icon: Activity, color: "text-cyan-400", gradient: "from-cyan-500/20 to-teal-500/20", accent: "#22d3ee" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Background — matches PricingHero / ModelsHero exactly
// ─────────────────────────────────────────────────────────────────────────────
function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]">
      <div className="absolute inset-0 mesh-gradient animate-mesh-shift" />
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-blue-600/8 rounded-full blur-[140px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "4s" }} />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_80%)]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }: { icon: typeof Cpu; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">{label}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

function GlassSurface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-[24px] p-1 relative overflow-hidden group ${className}`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-violet-500/[0.03]" />
      <div className="relative h-full bg-[#0A0A0A] rounded-[20px] p-6 border border-white/5 z-10">
        {children}
      </div>
    </div>
  );
}

function Tag({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "cyan" | "purple" | "emerald" | "amber" | "violet" }) {
  const map: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-bold backdrop-blur-sm ${map[color]}`}>
      {children}
    </span>
  );
}

function StatusPing({ color = "green" }: { color?: "green" | "blue" | "amber" }) {
  const cls = color === "green" ? "bg-emerald-400" : color === "blue" ? "bg-blue-400" : "bg-amber-400";
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${cls}`} />
    </span>
  );
}

function StatCard({ label, value, sub, color = "white" }: { label: string; value: string; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    white: "text-white",
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    blue: "text-blue-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
  };
  return (
    <div className="group relative">
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
      <div className="relative h-full p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 group-hover:border-white/10 transition-all">
        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">{label}</div>
        <div className={`text-2xl font-bold font-mono tracking-tight ${colorMap[color] || colorMap.white}`}>{value}</div>
        {sub && <div className="text-[10px] text-gray-600 font-mono mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = decodeURIComponent(params.id as string);
  const [copied, setCopied] = useState(false);

  const model = (openRouterModels as any[]).find((m) => m.id === modelId);

  const providerId = model ? model.id.split("/")[0].toLowerCase() : "";
  const config = providerConfig[providerId] || {
    icon: Cpu,
    color: "text-gray-400",
    gradient: "from-gray-500/20 to-gray-500/20",
    accent: "#9ca3af",
  };
  const Icon = config.icon;
  const logo = model ? getProviderLogo(model.id) : null;

  const copyModelId = () => {
    if (!model) return;
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!model) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center relative overflow-hidden">
        <AmbientBackground />
        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"
          >
            <Info className="w-10 h-10 text-gray-500" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">Model Not Found</h1>
          <p className="text-gray-400 mb-8 font-light">The model you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push("/models")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-mono transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Models
          </button>
        </div>
      </div>
    );
  }

  const inputPrice = model.pricing?.prompt ? (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) : "0.00";
  const outputPrice = model.pricing?.completion ? (parseFloat(model.pricing.completion) * 1000000).toFixed(2) : "0.00";
  const contextTokens = model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "N/A";
  const maxOut = model.top_provider?.max_completion_tokens ? `${(model.top_provider.max_completion_tokens / 1000).toFixed(0)}K` : "N/A";
  const modality = model.architecture?.modality || "Text";
  const providerName = model.id.split("/")[0];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
      <AmbientBackground />

      {/* HUD corners */}
      <div className="absolute top-24 left-10 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-2xl pointer-events-none z-10 hidden lg:block" />
      <div className="absolute top-24 right-10 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-2xl pointer-events-none z-10 hidden lg:block" />

      <div className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
            <button
              onClick={() => router.push("/models")}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-mono text-xs font-bold tracking-wider">Back to Models</span>
            </button>
          </motion.div>

          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-14"
          >
            <GlassSurface>
              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Logo */}
                <div className="relative w-24 h-24 rounded-2xl shrink-0">
                  <div className="absolute inset-0 rounded-2xl opacity-40 blur-xl" style={{ backgroundColor: config.accent }} />
                  {logo ? (
                    <div className="relative w-full h-full rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-4 shadow-xl backdrop-blur-sm">
                      <Image src={logo} alt={`${model.name} logo`} width={52} height={52} className="object-contain" unoptimized />
                    </div>
                  ) : (
                    <div className={`relative w-full h-full rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center ${config.color} shadow-xl`}>
                      <Icon className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Title & Meta */}
                <div className="flex-1 min-w-0">
                  {/* Eyebrow */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 text-[11px] font-mono font-bold tracking-wider uppercase mb-4">
                    <Hash className="w-3 h-3" />
                    {providerName}
                  </div>

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-5 leading-[0.95]">
                    {model.name.split(":")[0]}
                    {model.name.includes(":") && (
                      <span className="text-gray-500">
                        :{model.name.split(":").slice(1).join(":")}
                      </span>
                    )}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <button
                      onClick={copyModelId}
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 font-mono font-bold text-xs transition-all hover:scale-105"
                    >
                      <span className="truncate max-w-[220px]">{model.id}</span>
                      {copied ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </button>

                    {model.context_length && (
                      <Tag color="violet">
                        <Database className="w-3 h-3" />
                        {contextTokens}
                      </Tag>
                    )}

                    {model.created_date && (
                      <Tag color="amber">
                        <Sparkles className="w-3 h-3" />
                        {model.created_date}
                      </Tag>
                    )}

                    <Tag color="emerald">
                      <StatusPing color="green" />
                      <span>ACTIVE</span>
                    </Tag>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Input" value={`$${inputPrice}`} sub="per 1M tokens" color="emerald" />
                    <StatCard label="Output" value={`$${outputPrice}`} sub="per 1M tokens" color="cyan" />
                    <StatCard label="Max Out" value={maxOut} sub="tokens" color="purple" />
                    <StatCard label="Type" value={modality} color="blue" />
                  </div>
                </div>
              </div>
            </GlassSurface>
          </motion.div>

          {/* Main Grid */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-8">
              {/* About */}
              {model.description && (
                <motion.div variants={itemVariants}>
                  <GlassSurface>
                    <SectionHeader icon={Info} label="About" />
                    <p className="text-gray-300 leading-relaxed text-sm">{model.description}</p>
                  </GlassSurface>
                </motion.div>
              )}

              {/* Capabilities */}
              <motion.div variants={itemVariants}>
                <SectionHeader icon={Layers} label="Capabilities" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div whileHover={{ y: -4 }} className="cursor-default">
                    <GlassSurface className="h-full">
                      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-3">Context</div>
                      <div className="text-3xl font-bold text-white font-mono tracking-tight">{contextTokens}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">tokens</div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: model.context_length ? `${Math.min((model.context_length / 1000000) * 100, 100)}%` : "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                        />
                      </div>
                    </GlassSurface>
                  </motion.div>

                  <motion.div whileHover={{ y: -4 }} className="cursor-default">
                    <GlassSurface className="h-full">
                      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-3">Max Output</div>
                      <div className="text-3xl font-bold text-white font-mono tracking-tight">{maxOut}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">tokens</div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: model.top_provider?.max_completion_tokens ? `${Math.min((model.top_provider.max_completion_tokens / 100000) * 100, 100)}%` : "0%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                        />
                      </div>
                    </GlassSurface>
                  </motion.div>

                  <motion.div whileHover={{ y: -4 }} className="cursor-default">
                    <GlassSurface className="h-full">
                      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-3">Type</div>
                      <div className="text-2xl font-bold text-white font-mono tracking-tight">{modality}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">modality</div>
                    </GlassSurface>
                  </motion.div>
                </div>
              </motion.div>

              {/* Architecture */}
              {model.architecture && (
                <motion.div variants={itemVariants}>
                  <GlassSurface>
                    <SectionHeader icon={Cpu} label="Architecture" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {model.architecture.input_modalities && (
                        <div>
                          <div className="text-[10px] text-gray-400 font-mono mb-3 uppercase tracking-wider">Input Modalities</div>
                          <div className="flex flex-wrap gap-2">
                            {model.architecture.input_modalities.map((mod: string) => (
                              <span
                                key={mod}
                                className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 font-mono text-xs font-bold transition-all hover:scale-105"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {model.architecture.output_modalities && (
                        <div>
                          <div className="text-[10px] text-gray-400 font-mono mb-3 uppercase tracking-wider">Output Modalities</div>
                          <div className="flex flex-wrap gap-2">
                            {model.architecture.output_modalities.map((mod: string) => (
                              <span
                                key={mod}
                                className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 font-mono text-xs font-bold transition-all hover:scale-105"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {model.architecture.tokenizer && (
                        <div>
                          <div className="text-[10px] text-gray-400 font-mono mb-3 uppercase tracking-wider">Tokenizer</div>
                          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white font-mono text-xs font-bold inline-block transition-all hover:scale-105">
                            {model.architecture.tokenizer}
                          </span>
                        </div>
                      )}
                    </div>
                  </GlassSurface>
                </motion.div>
              )}

              {/* Parameters */}
              {model.supported_parameters && model.supported_parameters.length > 0 && (
                <motion.div variants={itemVariants}>
                  <GlassSurface>
                    <SectionHeader icon={Code} label="Parameters" />
                    <div className="flex flex-wrap gap-2">
                      {model.supported_parameters.map((param: string) => (
                        <motion.span
                          key={param}
                          whileHover={{ scale: 1.05 }}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 text-gray-300 hover:text-white font-mono text-xs transition-all cursor-default"
                        >
                          {param}
                        </motion.span>
                      ))}
                    </div>
                  </GlassSurface>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pricing */}
              <motion.div variants={itemVariants}>
                <GlassSurface>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">Pricing</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="space-y-3">
                    <StatCard label="Input" value={`$${inputPrice}`} sub="per 1M tokens" color="emerald" />
                    <StatCard label="Output" value={`$${outputPrice}`} sub="per 1M tokens" color="cyan" />
                    {model.pricing?.input_cache_read && (
                      <StatCard label="Cache Read" value={`$${(parseFloat(model.pricing.input_cache_read) * 1000000).toFixed(2)}`} sub="per 1M tokens" color="blue" />
                    )}
                    {model.pricing?.input_cache_write && (
                      <StatCard label="Cache Write" value={`$${(parseFloat(model.pricing.input_cache_write) * 1000000).toFixed(2)}`} sub="per 1M tokens" color="violet" />
                    )}
                  </div>
                </GlassSurface>
              </motion.div>

              {/* Knowledge Cutoff */}
              {model.knowledge_cutoff && (
                <motion.div variants={itemVariants}>
                  <GlassSurface>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em]">Knowledge Cutoff</h3>
                    </div>
                    <p className="text-white font-mono text-lg tracking-tight">{model.knowledge_cutoff}</p>
                  </GlassSurface>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div variants={itemVariants}>
                <div className="relative group">
                  <div className="absolute -inset-[1px] rounded-[24px] bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-blue-500/30 opacity-50 group-hover:opacity-80 transition-opacity blur-sm" />
                  <div className="relative p-6 rounded-[24px] bg-[#0A0A0A] border border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">Quick Start</span>
                    </div>
                    <p className="text-gray-400 text-xs mb-5 leading-relaxed">Get your API key and start building in minutes with OpenRouter.</p>
                    <button
                      onClick={() => window.open("https://openrouter.ai/keys", "_blank")}
                      className="relative w-full py-3.5 font-mono text-xs font-bold tracking-wider uppercase transition-all overflow-hidden group/btn text-black rounded-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-100 to-white group-hover/btn:from-blue-400 group-hover/btn:via-violet-400 group-hover/btn:to-blue-400 transition-all duration-500" />
                      <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-30 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Start Using {model.name.split(":")[0]}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
