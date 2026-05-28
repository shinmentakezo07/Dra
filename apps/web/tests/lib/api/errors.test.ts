import { describe, it, expect } from "vitest";
import {
  ApiError,
  UnauthorizedError,
  RateLimitError,
  PaymentRequiredError,
  getErrorMessage,
  getErrorStatus,
} from "@/lib/api/errors";

describe("ApiError", () => {
  it("has status and code", () => {
    const err = new ApiError("Something failed", 500, "INTERNAL");
    expect(err.message).toBe("Something failed");
    expect(err.status).toBe(500);
    expect(err.code).toBe("INTERNAL");
    expect(err.name).toBe("ApiError");
  });

  it("defaults status to 500", () => {
    const err = new ApiError("Oops");
    expect(err.status).toBe(500);
    expect(err.code).toBeUndefined();
  });
});

describe("UnauthorizedError", () => {
  it("has correct defaults", () => {
    const err = new UnauthorizedError();
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("accepts custom message", () => {
    const err = new UnauthorizedError("Custom auth error");
    expect(err.message).toBe("Custom auth error");
  });
});

describe("RateLimitError", () => {
  it("has correct defaults", () => {
    const err = new RateLimitError();
    expect(err.status).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
  });
});

describe("PaymentRequiredError", () => {
  it("has correct defaults", () => {
    const err = new PaymentRequiredError();
    expect(err.status).toBe(402);
    expect(err.code).toBe("PAYMENT_REQUIRED");
  });
});

describe("getErrorMessage", () => {
  it("extracts ApiError message", () => {
    const err = new ApiError("API failed");
    expect(getErrorMessage(err)).toBe("API failed");
  });

  it("extracts generic Error message", () => {
    const err = new Error("Generic error");
    expect(getErrorMessage(err)).toBe("Generic error");
  });

  it("returns fallback for unknown error", () => {
    expect(getErrorMessage("string error")).toBe(
      "An unexpected error occurred",
    );
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });
});

describe("getErrorStatus", () => {
  it("returns ApiError status", () => {
    const err = new ApiError("Fail", 404);
    expect(getErrorStatus(err)).toBe(404);
  });

  it("returns 500 for non-ApiError", () => {
    expect(getErrorStatus(new Error("oops"))).toBe(500);
    expect(getErrorStatus("oops")).toBe(500);
  });
});
