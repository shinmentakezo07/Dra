import { describe, it, expect } from "vitest";
import {
  type CatalogModel,
  cheapestOutput,
  largestContext,
  mostPopular,
} from "@/components/models/model-rankings";

const base: CatalogModel = {
  id: "openai/gpt-4o",
  name: "GPT-4o",
  provider: "OpenAI",
  inputPrice: "$2.50",
  outputPrice: "$10.00",
  context: "128K",
  context_length: 128000,
  logo: null,
  popular: false,
  created: 1700000000,
};

function withOver(over: Partial<CatalogModel>): CatalogModel {
  return { ...base, ...over };
}

describe("cheapestOutput", () => {
  it("returns models sorted by output price ascending, top N", () => {
    const models = [
      withOver({ id: "a", outputPrice: "$15.00" }),
      withOver({ id: "b", outputPrice: "$0.50" }),
      withOver({ id: "c", outputPrice: "$3.00" }),
    ];
    const result = cheapestOutput(models, 3).map((m) => m.id);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("ties break by input price ascending", () => {
    const models = [
      withOver({ id: "a", outputPrice: "$1.00", inputPrice: "$5.00" }),
      withOver({ id: "b", outputPrice: "$1.00", inputPrice: "$2.00" }),
    ];
    const result = cheapestOutput(models, 2).map((m) => m.id);
    expect(result).toEqual(["b", "a"]);
  });
});

describe("largestContext", () => {
  it("returns models sorted by context_length descending, top N", () => {
    const models = [
      withOver({ id: "a", context_length: 128000 }),
      withOver({ id: "b", context_length: 2000000 }),
      withOver({ id: "c", context_length: 500000 }),
    ];
    const result = largestContext(models, 3).map((m) => m.id);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("treats null context_length as 0", () => {
    const models = [
      withOver({ id: "a", context_length: 128000 }),
      withOver({ id: "b", context_length: null }),
    ];
    const result = largestContext(models, 2).map((m) => m.id);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("mostPopular", () => {
  it("puts popular models first, then by created descending, then name", () => {
    const models = [
      withOver({ id: "a", popular: false, created: 1700000000, name: "A" }),
      withOver({ id: "b", popular: true, created: 1700000001, name: "B" }),
      withOver({ id: "c", popular: true, created: 1700000010, name: "C" }),
    ];
    const result = mostPopular(models, 3).map((m) => m.id);
    expect(result).toEqual(["c", "b", "a"]);
  });

  it("respects the limit", () => {
    const models = [
      withOver({ id: "a", popular: true, created: 1, name: "A" }),
      withOver({ id: "b", popular: true, created: 2, name: "B" }),
      withOver({ id: "c", popular: true, created: 3, name: "C" }),
    ];
    expect(mostPopular(models, 2).map((m) => m.id)).toEqual(["c", "b"]);
  });
});
