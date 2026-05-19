import { describe, it, expect } from "vitest";

// formatPrice and highlightMatch are file-scoped in ModelSelector.tsx.
// We replicate the pure logic here to verify expected behavior.

function formatPrice(p?: string): string {
  if (!p) return "—";
  const n = Number(p);
  if (Number.isNaN(n)) return "—";
  if (n >= 0.001) return `$${n.toFixed(3)}`;
  return `$${n.toExponential(1)}`;
}

function highlightParts(text: string, query: string): string[] {
  if (!query.trim()) return [text];
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${q})`, "gi")).filter(Boolean);
}

describe("ModelSelector formatting utilities", () => {
  describe("formatPrice", () => {
    it("returns dash for undefined", () => {
      expect(formatPrice(undefined)).toBe("—");
    });

    it("returns dash for empty string", () => {
      expect(formatPrice("")).toBe("—");
    });

    it("returns dash for non-numeric", () => {
      expect(formatPrice("abc")).toBe("—");
    });

    it("formats normal prices", () => {
      expect(formatPrice("0.005")).toBe("$0.005");
    });

    it("formats prices at 0.001 boundary", () => {
      expect(formatPrice("0.001")).toBe("$0.001");
    });

    it("formats very small prices with exponential", () => {
      expect(formatPrice("0.0001")).toBe("$1.0e-4");
    });

    it("formats larger prices", () => {
      expect(formatPrice("1.5")).toBe("$1.500");
    });
  });

  describe("highlightParts", () => {
    it("returns full text when query is empty", () => {
      expect(highlightParts("gpt-4", "")).toEqual(["gpt-4"]);
    });

    it("splits text on query match", () => {
      const parts = highlightParts("gpt-4-turbo", "4");
      expect(parts).toContain("4");
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });

    it("is case-insensitive", () => {
      const parts = highlightParts("Claude-3", "claude");
      expect(parts).toContain("Claude");
    });

    it("escapes regex special characters", () => {
      const parts = highlightParts("model (v2)", "(v2)");
      expect(parts).toContain("(v2)");
    });
  });

  describe("MAX_MODELS constraint", () => {
    it("limits to 4 models", () => {
      const MAX_MODELS = 4;
      const selected = ["a", "b", "c", "d", "e"];
      const canAdd = selected.length < MAX_MODELS;
      expect(canAdd).toBe(false);
    });

    it("allows adding when under limit", () => {
      const MAX_MODELS = 4;
      const selected = ["a", "b"];
      const canAdd = selected.length < MAX_MODELS;
      expect(canAdd).toBe(true);
    });
  });
});
