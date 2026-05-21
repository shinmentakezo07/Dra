import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toast } from "@/components/ui/toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the message", () => {
    render(<Toast message="Success!" type="success" />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("renders with success type", () => {
    render(<Toast message="Done" type="success" />);
    const toast = screen.getByText("Done").closest("div");
    expect(toast?.className).toContain("bg-emerald-500/10");
  });

  it("renders with error type", () => {
    render(<Toast message="Error" type="error" />);
    const toast = screen.getByText("Error").closest("div");
    expect(toast?.className).toContain("bg-red-500/10");
  });

  it("renders with warning type", () => {
    render(<Toast message="Warning" type="warning" />);
    const toast = screen.getByText("Warning").closest("div");
    expect(toast?.className).toContain("bg-yellow-500/10");
  });

  it("defaults to info type", () => {
    render(<Toast message="Info" />);
    const toast = screen.getByText("Info").closest("div");
    expect(toast?.className).toContain("bg-blue-500/10");
  });

  it("calls onClose after duration expires", () => {
    const handleClose = vi.fn();
    render(<Toast message="Timed" duration={1000} onClose={handleClose} />);
    act(() => {
      vi.advanceTimersByTime(1000 + 300);
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<Toast message="Closable" onClose={handleClose} />);
    const closeBtn = screen.getByRole("button");
    closeBtn.click();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(handleClose).toHaveBeenCalled();
  });
});
