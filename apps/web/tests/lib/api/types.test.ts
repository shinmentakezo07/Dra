import { describe, it, expect } from "vitest";
import {
  createResponse,
  createErrorResponse,
  parsePagination,
} from "@/lib/api/types";
import type { ApiResponse } from "@/lib/api/types";

describe("createResponse", () => {
  it("creates a success response with data", () => {
    const result = createResponse({ id: 1, name: "test" });
    expect(result).toEqual({
      success: true,
      data: { id: 1, name: "test" },
      meta: undefined,
    });
  });

  it("creates a success response with meta", () => {
    const meta = { total: 100, page: 1, limit: 20, totalPages: 5 };
    const result = createResponse(["item1", "item2"], meta);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(["item1", "item2"]);
    expect(result.meta).toEqual(meta);
  });

  it("handles null data", () => {
    const result = createResponse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("handles empty array data", () => {
    const result = createResponse([]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe("createErrorResponse", () => {
  it("creates an error response with message", () => {
    const result = createErrorResponse("Something went wrong");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong",
    });
  });

  it("handles empty error message", () => {
    const result = createErrorResponse("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("");
  });

  it("does not include data field", () => {
    const result = createErrorResponse("error");
    expect("data" in result).toBe(false);
  });
});

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("parses page from query string", () => {
    const params = new URLSearchParams("page=3");
    expect(parsePagination(params).page).toBe(3);
  });

  it("parses limit from query string", () => {
    const params = new URLSearchParams("limit=50");
    expect(parsePagination(params).limit).toBe(50);
  });

  it("parses both page and limit", () => {
    const params = new URLSearchParams("page=2&limit=10");
    expect(parsePagination(params)).toEqual({ page: 2, limit: 10 });
  });

  it("caps limit at 100", () => {
    const params = new URLSearchParams("limit=200");
    expect(parsePagination(params).limit).toBe(100);
  });

  it("enforces minimum limit of 1", () => {
    const params = new URLSearchParams("limit=0");
    expect(parsePagination(params).limit).toBe(1);
  });

  it("enforces minimum limit of 1 for negative values", () => {
    const params = new URLSearchParams("limit=-5");
    expect(parsePagination(params).limit).toBe(1);
  });

  it("enforces minimum page of 1", () => {
    const params = new URLSearchParams("page=0");
    expect(parsePagination(params).page).toBe(1);
  });

  it("enforces minimum page of 1 for negative values", () => {
    const params = new URLSearchParams("page=-3");
    expect(parsePagination(params).page).toBe(1);
  });

  it("returns NaN for non-numeric values (parseInt behavior)", () => {
    const params = new URLSearchParams("page=abc&limit=xyz");
    const result = parsePagination(params);
    // parseInt("abc") returns NaN, Math.max(1, NaN) is NaN
    expect(Number.isNaN(result.page)).toBe(true);
    expect(Number.isNaN(result.limit)).toBe(true);
  });
});
