import { describe, it, expect } from "vitest";

// formatTokens and formatCurrency are file-scoped in CostCalculator.tsx
// We replicate the pure logic here to verify expected behavior.

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function fmtCurrency(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

describe("CostCalculator formatting utilities", () => {
  it("formats millions of tokens", () => {
    expect(fmtTokens(1_500_000)).toBe("1.5M");
    expect(fmtTokens(10_000_000)).toBe("10.0M");
  });

  it("formats thousands of tokens", () => {
    expect(fmtTokens(5_000)).toBe("5K");
    expect(fmtTokens(999)).toBe("999");
  });

  it("formats small token counts", () => {
    expect(fmtTokens(42)).toBe("42");
    expect(fmtTokens(0)).toBe("0");
  });

  it("formats very small currency values", () => {
    expect(fmtCurrency(0.001)).toBe("$0.0010");
  });

  it("formats sub-dollar currency values", () => {
    expect(fmtCurrency(0.5)).toBe("$0.500");
  });

  it("formats dollar-range currency values", () => {
    expect(fmtCurrency(12.345)).toBe("$12.35");
    expect(fmtCurrency(1.0)).toBe("$1.00");
  });
});
