import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { checkRateLimit, getRateLimitInfo } from "@/lib/api/rate-limit";
import { RateLimitError } from "@/lib/api/errors";

describe("rate-limit", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows first request for authenticated user", () => {
      expect(() => checkRateLimit("rl-user-1", true)).not.toThrow();
    });

    it("allows first request for anonymous user", () => {
      expect(() => checkRateLimit("rl-anon-1", false)).not.toThrow();
    });

    it("throws RateLimitError when authenticated user exceeds 60 req/min", () => {
      const id = "rl-auth-limited";
      for (let i = 0; i < 60; i++) {
        checkRateLimit(id, true);
      }
      expect(() => checkRateLimit(id, true)).toThrow(RateLimitError);
    });

    it("throws RateLimitError when anonymous user exceeds 10 req/min", () => {
      const id = "rl-anon-limited";
      for (let i = 0; i < 10; i++) {
        checkRateLimit(id, false);
      }
      expect(() => checkRateLimit(id, false)).toThrow(RateLimitError);
    });

    it("allows request after window expires", () => {
      const id = "rl-expire";
      for (let i = 0; i < 60; i++) {
        checkRateLimit(id, true);
      }
      vi.advanceTimersByTime(61 * 1000);
      expect(() => checkRateLimit(id, true)).not.toThrow();
    });

    it("tracks different identifiers independently", () => {
      checkRateLimit("rl-user-a", true);
      checkRateLimit("rl-user-b", true);
      expect(() => checkRateLimit("rl-user-a", true)).not.toThrow();
      expect(() => checkRateLimit("rl-user-b", true)).not.toThrow();
    });
  });

  describe("getRateLimitInfo", () => {
    it("returns null for unknown identifier", () => {
      expect(getRateLimitInfo("rl-unknown")).toBeNull();
    });

    it("returns remaining requests after usage", () => {
      const id = "rl-info-user";
      checkRateLimit(id, true);
      checkRateLimit(id, true);
      checkRateLimit(id, true);

      const result = getRateLimitInfo(id);
      expect(result).not.toBeNull();
      expect(result!.remaining).toBe(57);
      expect(result!.resetAt).toBeGreaterThan(Date.now());
    });

    it("returns 0 remaining when limit reached", () => {
      const id = "rl-zero-user";
      for (let i = 0; i < 60; i++) {
        checkRateLimit(id, true);
      }
      const result = getRateLimitInfo(id);
      expect(result!.remaining).toBe(0);
    });
  });
});
