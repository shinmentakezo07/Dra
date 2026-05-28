import { describe, it, expect } from "vitest";
import {
  creditPackages,
  featuredModels,
  calculatorModels,
  calculatorPresets,
  pricingFAQ,
} from "@/lib/pricing-data";

describe("creditPackages", () => {
  it("has exactly 3 packages", () => {
    expect(creditPackages).toHaveLength(3);
  });

  it("each package has required fields", () => {
    for (const pkg of creditPackages) {
      expect(pkg.name).toBeDefined();
      expect(pkg.amount).toBeDefined();
      expect(pkg.credits).toBeDefined();
      expect(pkg.creditsDisplay).toBeDefined();
      expect(pkg.description).toBeDefined();
      expect(pkg.features).toBeDefined();
      expect(Array.isArray(pkg.features)).toBe(true);
      expect(pkg.icon).toBeDefined();
      expect(pkg.color).toBeDefined();
      expect(pkg.cta).toBeDefined();
      expect(typeof pkg.popular).toBe("boolean");
      expect(pkg.gradient).toBeDefined();
    }
  });

  it("has exactly one popular package", () => {
    const popular = creditPackages.filter((p) => p.popular);
    expect(popular).toHaveLength(1);
    expect(popular[0].name).toBe("Popular");
  });

  it("Starter has no bonus", () => {
    const starter = creditPackages.find((p) => p.name === "Starter");
    expect(starter).toBeDefined();
    expect(starter!.bonus).toBe("");
  });

  it("Popular has 10% bonus", () => {
    const popular = creditPackages.find((p) => p.name === "Popular");
    expect(popular!.bonus).toBe("+10% Bonus");
  });

  it("Pro has 20% bonus", () => {
    const pro = creditPackages.find((p) => p.name === "Pro");
    expect(pro!.bonus).toBe("+20% Bonus");
  });

  it("features include 'Credits never expire'", () => {
    for (const pkg of creditPackages) {
      expect(pkg.features).toContain("Credits never expire");
    }
  });
});

describe("featuredModels", () => {
  it("has 4 featured models", () => {
    expect(featuredModels).toHaveLength(4);
  });

  it("each model has required fields", () => {
    for (const model of featuredModels) {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.inputPrice).toBeDefined();
      expect(model.outputPrice).toBeDefined();
      expect(model.context).toBeDefined();
      expect(model.icon).toBeDefined();
      expect(model.color).toBeDefined();
    }
  });

  it("model IDs use provider/model format", () => {
    for (const model of featuredModels) {
      expect(model.id).toContain("/");
    }
  });
});

describe("calculatorModels", () => {
  it("has 4 calculator models", () => {
    expect(calculatorModels).toHaveLength(4);
  });

  it("each model has numeric pricing", () => {
    for (const model of calculatorModels) {
      expect(typeof model.inputPricePer1k).toBe("number");
      expect(typeof model.outputPricePer1k).toBe("number");
      expect(model.inputPricePer1k).toBeGreaterThanOrEqual(0);
      expect(model.outputPricePer1k).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calculatorPresets", () => {
  it("has 4 presets", () => {
    expect(calculatorPresets).toHaveLength(4);
  });

  it("each preset has positive token counts", () => {
    for (const preset of calculatorPresets) {
      expect(preset.label).toBeDefined();
      expect(preset.inputTokens).toBeGreaterThan(0);
      expect(preset.outputTokens).toBeGreaterThan(0);
    }
  });

  it("includes Chat preset", () => {
    const chat = calculatorPresets.find((p) => p.label === "Chat");
    expect(chat).toBeDefined();
    expect(chat!.inputTokens).toBe(4000);
    expect(chat!.outputTokens).toBe(1000);
  });
});

describe("pricingFAQ", () => {
  it("has 6 FAQ items", () => {
    expect(pricingFAQ).toHaveLength(6);
  });

  it("each item has question and answer", () => {
    for (const item of pricingFAQ) {
      expect(item.question).toBeDefined();
      expect(item.answer).toBeDefined();
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.answer.length).toBeGreaterThan(0);
    }
  });

  it("covers key topics", () => {
    const questions = pricingFAQ.map((i) => i.question.toLowerCase());
    expect(questions.some((q) => q.includes("expire"))).toBe(true);
    expect(questions.some((q) => q.includes("switch"))).toBe(true);
    expect(questions.some((q) => q.includes("free tier"))).toBe(true);
  });
});
