export const providerColorMap: Record<string, string> = {
  openai: "#10A37F",
  gpt: "#10A37F",
  anthropic: "#D97757",
  claude: "#D97757",
  google: "#4285F4",
  gemini: "#4285F4",
  meta: "#0668E1",
  llama: "#0668E1",
  mistralai: "#F94E4E",
  mistral: "#F94E4E",
  deepseek: "#4D6BFA",
  "deepseek-ai": "#4D6BFA",
  xai: "#1DA1F2",
  grok: "#1DA1F2",
  alibaba: "#FF6A00",
  qwen: "#FF6A00",
  moonshotai: "#6366F1",
  qw: "#6366F1",
  zhipuai: "#10B981",
  glm: "#10B981",
  minimax: "#8B5CF6",
  minimaxai: "#8B5CF6",
};

export function getProviderColor(modelId: string): string {
  const provider = modelId.split("/")[0].toLowerCase();
  return providerColorMap[provider] || "#7C3AED";
}

export function getProviderColorClass(modelId: string): string {
  const provider = modelId.split("/")[0].toLowerCase();
  const map: Record<string, string> = {
    openai: "text-emerald-400",
    gpt: "text-emerald-400",
    anthropic: "text-orange-400",
    claude: "text-orange-400",
    google: "text-blue-400",
    gemini: "text-blue-400",
    meta: "text-blue-500",
    llama: "text-blue-500",
    mistralai: "text-red-400",
    mistral: "text-red-400",
    deepseek: "text-indigo-400",
    "deepseek-ai": "text-indigo-400",
    xai: "text-sky-400",
    grok: "text-sky-400",
    alibaba: "text-orange-500",
    qwen: "text-orange-500",
    moonshotai: "text-indigo-400",
    qw: "text-indigo-400",
  };
  return map[provider] || "text-violet-400";
}

export function getAllProviders(
  models: { id: string; provider: string }[],
): string[] {
  const set = new Set<string>();
  models.forEach((m) => {
    const p = m.provider.toLowerCase();
    if (p) set.add(p);
  });
  return Array.from(set).sort();
}
