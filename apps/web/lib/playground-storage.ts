// Local storage utilities for playground

export interface PlaygroundSession {
  language: string;
  code: string;
  timestamp: number;
}

const STORAGE_KEY = "playground_session";
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds

export function saveSession(session: PlaygroundSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

export function loadSession(): PlaygroundSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load session:", error);
  }
  return null;
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

export function hasSession(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// Auto-save hook implementation
export class AutoSaver {
  private timeout: NodeJS.Timeout | null = null;
  private callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  schedule() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      this.callback();
    }, AUTO_SAVE_INTERVAL);
  }

  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
