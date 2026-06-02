import { Sparkles, Zap, Star, Brain, Activity, Cpu } from "lucide-react";
import type { OpenRouterModelData, ProviderTheme } from "@/types/model";

export const providerConfig: Record<string, ProviderTheme> = {
  openai: {
    icon: Sparkles,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-green-500/20",
    accent: "#34d399",
  },
  anthropic: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
    accent: "#fb923c",
  },
  google: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    accent: "#60a5fa",
  },
  moonshotai: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
    accent: "#c084fc",
  },
  moonshot: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
    accent: "#c084fc",
  },
  zhipu: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
    accent: "#22d3ee",
  },
  zhipuai: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
    accent: "#22d3ee",
  },
  meta: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
    accent: "#818cf8",
  },
  mistral: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
    accent: "#fb7185",
  },
  mistralai: {
    icon: Activity,
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-orange-500/20",
    accent: "#fb7185",
  },
  deepseek: {
    icon: Cpu,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-500/20",
    accent: "#2dd4bf",
  },
  "deepseek-ai": {
    icon: Cpu,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-500/20",
    accent: "#2dd4bf",
  },
  xai: {
    icon: Cpu,
    color: "text-red-400",
    gradient: "from-red-500/20 to-orange-500/20",
    accent: "#f87171",
  },
  alibaba: {
    icon: Cpu,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
    accent: "#fb923c",
  },
  qwen: {
    icon: Cpu,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-red-500/20",
    accent: "#fb923c",
  },
  qw: {
    icon: Brain,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
    accent: "#c084fc",
  },
  gpt: {
    icon: Sparkles,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-green-500/20",
    accent: "#34d399",
  },
  claude: {
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
    accent: "#fb923c",
  },
  gemini: {
    icon: Star,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    accent: "#60a5fa",
  },
  llama: {
    icon: Cpu,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 to-blue-500/20",
    accent: "#818cf8",
  },
  minimax: {
    icon: Activity,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-500/20",
    accent: "#f472b6",
  },
  minimaxai: {
    icon: Activity,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-500/20",
    accent: "#f472b6",
  },
  glm: {
    icon: Activity,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-teal-500/20",
    accent: "#22d3ee",
  },
};

export function getProviderId(modelId: string): string {
  return modelId.split("/")[0].toLowerCase();
}

export function getProviderTheme(modelId: string): ProviderTheme {
  const pid = getProviderId(modelId);
  return (
    providerConfig[pid] || {
      icon: Cpu,
      color: "text-gray-400",
      gradient: "from-gray-500/20 to-gray-500/20",
      accent: "#9ca3af",
    }
  );
}

export function formatPricePerM(
  model: OpenRouterModelData,
  field: "prompt" | "completion",
): string {
  const val = model.pricing?.[field];
  if (!val) return "0.00";
  return (parseFloat(val) * 1000000).toFixed(2);
}

export function formatContextLabel(context: number | null): string {
  return context ? `${(context / 1000).toFixed(0)}K` : "N/A";
}

export function getContextPercentage(context: number | null): number {
  if (!context) return 0;
  return Math.min((context / 1000000) * 100, 100);
}

export function getMaxOutputTokens(model: OpenRouterModelData): string {
  const max = model.top_provider?.max_completion_tokens;
  return max ? `${(max / 1000).toFixed(0)}K` : "N/A";
}
