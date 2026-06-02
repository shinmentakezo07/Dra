import { describe, it, expect } from "vitest";
import {
  codeSnippets,
  getSnippetsByLanguage,
  getSnippetsByCategory,
  getAllCategories,
} from "@/components/playground/CodeSnippets";

describe("CodeSnippets data", () => {
  it("has snippets for multiple languages", () => {
    expect(codeSnippets.length).toBeGreaterThan(10);
    const languages = new Set(codeSnippets.map((s) => s.language));
    expect(languages.size).toBeGreaterThan(3);
  });

  it("each snippet has required fields", () => {
    for (const snippet of codeSnippets) {
      expect(snippet.id).toBeDefined();
      expect(snippet.name).toBeDefined();
      expect(snippet.language).toBeDefined();
      expect(snippet.code).toBeDefined();
      expect(snippet.description).toBeDefined();
      expect(snippet.category).toBeDefined();
    }
  });

  it("all IDs are unique", () => {
    const ids = codeSnippets.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getSnippetsByLanguage", () => {
  it("filters by language", () => {
    const jsSnippets = getSnippetsByLanguage("javascript");
    expect(jsSnippets.length).toBeGreaterThan(0);
    jsSnippets.forEach((s) => expect(s.language).toBe("javascript"));
  });

  it("returns empty array for unknown language", () => {
    expect(getSnippetsByLanguage("cobol")).toEqual([]);
  });

  it("finds python snippets", () => {
    const pySnippets = getSnippetsByLanguage("python");
    expect(pySnippets.length).toBeGreaterThan(0);
  });
});

describe("getSnippetsByCategory", () => {
  it("filters by category", () => {
    const basics = getSnippetsByCategory("Basics");
    expect(basics.length).toBeGreaterThan(0);
    basics.forEach((s) => expect(s.category).toBe("Basics"));
  });

  it("returns empty array for unknown category", () => {
    expect(getSnippetsByCategory("Nonexistent")).toEqual([]);
  });
});

describe("getAllCategories", () => {
  it("returns unique categories", () => {
    const categories = getAllCategories();
    const unique = new Set(categories);
    expect(categories.length).toBe(unique.size);
  });

  it("includes Basics category", () => {
    expect(getAllCategories()).toContain("Basics");
  });
});
