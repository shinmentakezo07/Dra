import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes via arrays", () => {
    expect(cn("base", [true && "active", false && "disabled"])).toBe(
      "base active",
    );
  });

  it("handles conditional classes via objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "", "bar")).toBe("foo bar");
  });
});
