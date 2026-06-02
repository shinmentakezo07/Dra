import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("generates default variant classes", () => {
    const classes = buttonVariants();
    expect(classes).toContain("inline-flex");
    expect(classes).toContain("rounded-lg");
  });

  it("generates primary variant classes", () => {
    const classes = buttonVariants({ variant: "primary" });
    expect(classes).toContain("bg-[#3b82f6]");
    expect(classes).toContain("text-white");
  });

  it("generates destructive variant classes", () => {
    const classes = buttonVariants({ variant: "destructive" });
    expect(classes).toContain("bg-red-500/10");
    expect(classes).toContain("text-red-400");
  });

  it("generates sm size classes", () => {
    const classes = buttonVariants({ size: "sm" });
    expect(classes).toContain("h-9");
    expect(classes).toContain("text-xs");
  });

  it("generates lg size classes", () => {
    const classes = buttonVariants({ size: "lg" });
    expect(classes).toContain("h-12");
    expect(classes).toContain("px-6");
  });

  it("merges custom className", () => {
    const classes = buttonVariants({ className: "custom-class" });
    expect(classes).toContain("custom-class");
  });
});

describe("Button component", () => {
  it("renders as button element", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button", { name: "Primary" });
    expect(btn.className).toContain("bg-[#3b82f6]");
  });

  it("applies size classes", () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole("button", { name: "Large" });
    expect(btn.className).toContain("h-12");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("calls onClick handler", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole("button", { name: "Click" }).click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
