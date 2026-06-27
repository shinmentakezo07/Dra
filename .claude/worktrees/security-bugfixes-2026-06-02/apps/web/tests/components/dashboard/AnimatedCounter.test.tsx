import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders string target as-is", () => {
    render(<AnimatedCounter target="N/A" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("starts at 0 for numeric target", () => {
    render(<AnimatedCounter target={100} duration={1000} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("animates toward target over time", () => {
    render(<AnimatedCounter target={1000} duration={100} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    const el = screen.getByText(/[\d,]+/);
    const value = parseInt(el.textContent.replace(/,/g, ""), 10);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1000);
  });

  it("reaches target at end of animation", () => {
    render(<AnimatedCounter target={500} duration={100} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("formats numbers with locale separators", () => {
    render(<AnimatedCounter target={1000} duration={50} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });
});
