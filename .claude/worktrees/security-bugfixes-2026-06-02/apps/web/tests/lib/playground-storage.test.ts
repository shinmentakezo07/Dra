import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  saveSession,
  loadSession,
  clearSession,
  hasSession,
  AutoSaver,
} from "@/lib/playground-storage";
import type { PlaygroundSession } from "@/lib/playground-storage";

const STORAGE_KEY = "playground_session";

describe("playground storage", () => {
  const mockSession: PlaygroundSession = {
    language: "python",
    code: "print('hello')",
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe("saveSession", () => {
    it("saves session to localStorage", () => {
      saveSession(mockSession);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe(JSON.stringify(mockSession));
    });

    it("handles localStorage errors gracefully", () => {
      const setItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Quota exceeded");
        });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => saveSession(mockSession)).not.toThrow();

      setItem.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("loadSession", () => {
    it("returns null when no session exists", () => {
      expect(loadSession()).toBeNull();
    });

    it("returns parsed session when one exists", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
      const result = loadSession();
      expect(result).toEqual(mockSession);
    });

    it("returns null on parse error", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json");
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(loadSession()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("clearSession", () => {
    it("removes session from localStorage", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
      clearSession();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("handles localStorage errors gracefully", () => {
      const removeItem = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("Error");
        });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => clearSession()).not.toThrow();

      removeItem.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("hasSession", () => {
    it("returns false when no session exists", () => {
      expect(hasSession()).toBe(false);
    });

    it("returns true when session exists", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
      expect(hasSession()).toBe(true);
    });
  });
});

describe("AutoSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback after 3 seconds", () => {
    const callback = vi.fn();
    const saver = new AutoSaver(callback);
    saver.schedule();

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("reschedules on subsequent calls (debounce)", () => {
    const callback = vi.fn();
    const saver = new AutoSaver(callback);

    saver.schedule();
    vi.advanceTimersByTime(2000);
    saver.schedule(); // reset timer
    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cancel prevents callback from firing", () => {
    const callback = vi.fn();
    const saver = new AutoSaver(callback);
    saver.schedule();
    saver.cancel();

    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("cancel is idempotent", () => {
    const callback = vi.fn();
    const saver = new AutoSaver(callback);
    saver.cancel(); // no timeout set yet
    expect(() => saver.cancel()).not.toThrow();
  });
});
