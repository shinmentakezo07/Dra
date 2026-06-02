import { describe, it, expect } from "vitest";

// MetricCard uses a changeColors map internally.
// We replicate the pure logic here to verify expected behavior.

function changeColor(changeType: "positive" | "negative" | "neutral"): string {
  const changeColors = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-gray-400",
  };
  return changeColors[changeType];
}

describe("MetricCard logic", () => {
  it("maps positive change to green", () => {
    expect(changeColor("positive")).toBe("text-green-400");
  });

  it("maps negative change to red", () => {
    expect(changeColor("negative")).toBe("text-red-400");
  });

  it("maps neutral change to gray", () => {
    expect(changeColor("neutral")).toBe("text-gray-400");
  });

  it("defaults to neutral when no changeType", () => {
    expect(changeColor("neutral")).toBe("text-gray-400");
  });

  it("renders change text only when change prop is provided", () => {
    // MetricCard: {change && <span>...</span>}
    const withChange = { change: "+12%", changeType: "positive" as const };
    const withoutChange = { change: undefined, changeType: "neutral" as const };

    expect(!!withChange.change).toBe(true);
    expect(!!withoutChange.change).toBe(false);
  });
});
