import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

describe("StatusBadge", () => {
  it("renders the label", () => {
    render(<StatusBadge status="success" label="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders with success style", () => {
    render(<StatusBadge status="success" label="OK" />);
    const badge = screen.getByText("OK");
    expect(badge.className).toContain("bg-green-500/10");
    expect(badge.className).toContain("text-green-400");
  });

  it("renders with error style", () => {
    render(<StatusBadge status="error" label="Failed" />);
    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("bg-red-500/10");
    expect(badge.className).toContain("text-red-400");
  });

  it("renders with warning style", () => {
    render(<StatusBadge status="warning" label="Warning" />);
    const badge = screen.getByText("Warning");
    expect(badge.className).toContain("bg-yellow-500/10");
    expect(badge.className).toContain("text-yellow-400");
  });

  it("renders with info style", () => {
    render(<StatusBadge status="info" label="Info" />);
    const badge = screen.getByText("Info");
    expect(badge.className).toContain("bg-blue-500/10");
    expect(badge.className).toContain("text-blue-400");
  });

  it("uses md size by default", () => {
    render(<StatusBadge status="success" label="Default" />);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("text-xs px-2.5 py-1");
  });

  it("uses sm size when specified", () => {
    render(<StatusBadge status="success" label="Small" size="sm" />);
    const badge = screen.getByText("Small");
    expect(badge.className).toContain("text-xs px-2 py-0.5");
  });

  it("uses lg size when specified", () => {
    render(<StatusBadge status="success" label="Large" size="lg" />);
    const badge = screen.getByText("Large");
    expect(badge.className).toContain("text-sm px-3 py-1.5");
  });
});
