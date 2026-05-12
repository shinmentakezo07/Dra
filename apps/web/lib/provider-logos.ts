// Provider logo URLs - using local SVG files from public/logos directory
export const providerLogos: Record<string, string> = {
    // OpenAI - Local SVG logo
    openai: "/logos/openai.svg",
    
    // Anthropic - Local SVG logo
    anthropic: "/logos/anthropic.svg",
    
    // Google - Local SVG logo
    google: "/logos/google.svg",
    
    // Moonshot AI - Local PNG logo
    moonshotai: "/logos/moonshot.png",
    
    // QW (custom provider for MoonshotAI models)
    qw: "/logos/moonshot.png",
    
    // GPT models (OpenAI)
    gpt: "/logos/openai.svg",
    
    // Claude models (Anthropic)
    claude: "/logos/anthropic.svg",
    
    // Gemini models (Google)
    gemini: "/logos/google.svg",
    
    // Meta / Llama
    meta: "/logos/meta.svg",
    llama: "/logos/meta.svg",
    
    // Mistral AI
    mistralai: "/logos/mistral.svg",
    mistral: "/logos/mistral.svg",
    
    // DeepSeek
    deepseek: "/logos/deepseek.png",
    "deepseek-ai": "/logos/deepseek.png",
    
    // xAI / Grok
    xai: "/logos/xai.svg",
    grok: "/logos/xai.svg",
    
    // Alibaba / Qwen
    alibaba: "/logos/alibaba.svg",
    qwen: "/logos/alibaba.svg",
    
    // Zhipu AI / GLM
    zhipuai: "/logos/zhipu.png",
    glm: "/logos/zhipu.png",
    
    // MiniMax
    minimaxai: "/logos/minimax.png",
    minimax: "/logos/minimax.png",
};

export function getProviderLogo(modelId: string): string | null {
    const provider = modelId.split('/')[0].toLowerCase();
    return providerLogos[provider] || null;
}

export function getProviderName(modelId: string): string {
    const provider = modelId.split('/')[0];
    const nameMap: Record<string, string> = {
        openai: "OpenAI",
        anthropic: "Anthropic",
        google: "Google",
        moonshotai: "Moonshot AI",
    };
    return nameMap[provider.toLowerCase()] || provider;
}
