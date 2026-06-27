import { describe, it, expect } from "vitest";
import {
  getProviderId,
  getProviderTheme,
  formatPricePerM,
  formatContextLabel,
  getContextPercentage,
  getMaxOutputTokens,
  providerConfig,
} from "@/lib/model-utils";
import type { OpenRouterModelData } from "@/types/model";

describe("getProviderId", () => {
  it("extracts provider from model ID", () => {
    expect(getProviderId("openai/gpt-4o")).toBe("openai");
    expect(getProviderId("anthropic/claude-opus-4")).toBe("anthropic");
    expect(getProviderId("google/gemini-2.5-pro")).toBe("google");
  });

  it("lowercases the result", () => {
    expect(getProviderId("OpenAI/GPT-4o")).toBe("openai");
  });

  it("handles single-segment IDs", () => {
    expect(getProviderId("gpt-4")).toBe("gpt-4");
  });
});

describe("getProviderTheme", () => {
  it("returns configured theme for known providers", () => {
    const theme = getProviderTheme("openai/gpt-4o");
    expect(theme.color).toBe("text-emerald-400");
    expect(theme.accent).toBe("#34d399");
  });

  it("returns default theme for unknown providers", () => {
    const theme = getProviderTheme("unknown/model");
    expect(theme.color).toBe("text-gray-400");
    expect(theme.accent).toBe("#9ca3af");
  });

  it("handles provider aliases (moonshotai/moonshot)", () => {
    const theme1 = getProviderTheme("moonshotai/kimi-k2");
    const theme2 = getProviderTheme("moonshot/kimi-k2");
    expect(theme1.accent).toBe(theme2.accent);
  });
});

describe("formatPricePerM", () => {
  function makeModel(
    pricing: Record<string, string | null>,
  ): OpenRouterModelData {
    return { pricing } as unknown as OpenRouterModelData;
  }

  it("converts per-token price to per-million", () => {
    expect(formatPricePerM(makeModel({ prompt: "0.00001" }), "prompt")).toBe(
      "10.00",
    );
  });

  it("returns 0.00 for missing pricing", () => {
    expect(formatPricePerM(makeModel({}), "prompt")).toBe("0.00");
  });

  it("returns 0.00 for null pricing value", () => {
    expect(formatPricePerM(makeModel({ prompt: null }), "prompt")).toBe("0.00");
  });

  it("handles completion field", () => {
    expect(
      formatPricePerM(makeModel({ completion: "0.00003" }), "completion"),
    ).toBe("30.00");
  });
});

describe("formatContextLabel", () => {
  it("formats context window as K", () => {
    expect(formatContextLabel(128000)).toBe("128K");
    expect(formatContextLabel(8000)).toBe("8K");
  });

  it("returns N/A for null", () => {
    expect(formatContextLabel(null)).toBe("N/A");
  });

  it("returns N/A for 0", () => {
    expect(formatContextLabel(0)).toBe("N/A");
  });
});

describe("getContextPercentage", () => {
  it("calculates percentage of 1M", () => {
    expect(getContextPercentage(500000)).toBe(50);
    expect(getContextPercentage(1000000)).toBe(100);
    expect(getContextPercentage(250000)).toBe(25);
  });

  it("caps at 100", () => {
    expect(getContextPercentage(2000000)).toBe(100);
  });

  it("returns 0 for null/0", () => {
    expect(getContextPercentage(null)).toBe(0);
    expect(getContextPercentage(0)).toBe(0);
  });
});

describe("getMaxOutputTokens", () => {
  function makeModel(tokens: number | null): OpenRouterModelData {
    return {
      top_provider: { max_completion_tokens: tokens },
    } as unknown as OpenRouterModelData;
  }

  it("formats max tokens as K", () => {
    expect(getMaxOutputTokens(makeModel(8192))).toBe("8K");
    expect(getMaxOutputTokens(makeModel(32768))).toBe("33K");
  });

  it("returns N/A for missing tokens", () => {
    expect(getMaxOutputTokens(makeModel(null))).toBe("N/A");
  });

  it("returns N/A for missing top_provider", () => {
    expect(getMaxOutputTokens({} as OpenRouterModelData)).toBe("N/A");
  });
});

describe("providerConfig", () => {
  it("has entries for major providers", () => {
    expect(providerConfig.openai).toBeDefined();
    expect(providerConfig.anthropic).toBeDefined();
    expect(providerConfig.google).toBeDefined();
    expect(providerConfig.meta).toBeDefined();
  });

  it("each entry has required fields", () => {
    for (const [key, theme] of Object.entries(providerConfig)) {
      expect(theme.icon).toBeDefined();
      expect(theme.color).toBeDefined();
      expect(theme.gradient).toBeDefined();
      expect(theme.accent).toBeDefined();
    }
  });
});
