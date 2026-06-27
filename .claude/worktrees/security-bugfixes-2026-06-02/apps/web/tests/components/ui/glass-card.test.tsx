import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  GlassCard,
  GlassHeader,
  GlassTitle,
  GlassContent,
} from "@/components/ui/glass-card";

describe("GlassCard", () => {
  it("renders children", () => {
    render(<GlassCard>Card content</GlassCard>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies base glass styles", () => {
    render(<GlassCard>Glass</GlassCard>);
    const el = screen.getByText("Glass");
    expect(el.className).toContain("rounded-xl");
    expect(el.className).toContain("backdrop-blur-md");
    expect(el.className).toContain("bg-black/40");
  });

  it("merges custom className", () => {
    render(<GlassCard className="custom">Custom</GlassCard>);
    expect(screen.getByText("Custom").className).toContain("custom");
  });

  it("forwards ref", () => {
    const ref = vi.fn();
    render(<GlassCard ref={ref}>Ref</GlassCard>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("GlassHeader", () => {
  it("renders with border bottom", () => {
    render(<GlassHeader>Header</GlassHeader>);
    const el = screen.getByText("Header");
    expect(el.className).toContain("border-b");
    expect(el.className).toContain("p-6");
  });
});

describe("GlassTitle", () => {
  it("renders as h3", () => {
    render(<GlassTitle>Title</GlassTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("applies text styles", () => {
    render(<GlassTitle>Styled</GlassTitle>);
    const el = screen.getByText("Styled");
    expect(el.className).toContain("font-semibold");
    expect(el.className).toContain("text-white");
  });
});

describe("GlassContent", () => {
  it("renders with padding", () => {
    render(<GlassContent>Content</GlassContent>);
    const el = screen.getByText("Content");
    expect(el.className).toContain("p-6");
  });
});
