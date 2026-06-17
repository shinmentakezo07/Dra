// Pure ranking helpers for the models catalog.
// Derived from the existing models array — no data-layer changes.

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  inputPrice: string;
  outputPrice: string;
  context: string;
  context_length: number | null;
  logo: string | null;
  popular: boolean;
  created: number;
}

/** Parse a price string like "$3.00" into a number. Unparseable → Infinity. */
function parsePrice(price: string): number {
  const n = parseFloat(price.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : Infinity;
}

/**
 * Top N models by lowest output price.
 * Ties broken by input price ascending.
 */
export function cheapestOutput(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => {
      const byOutput = parsePrice(a.outputPrice) - parsePrice(b.outputPrice);
      if (byOutput !== 0) return byOutput;
      return parsePrice(a.inputPrice) - parsePrice(b.inputPrice);
    })
    .slice(0, limit);
}

/**
 * Top N models by context_length descending.
 * Null context_length is treated as 0.
 */
export function largestContext(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
    .slice(0, limit);
}

/**
 * Top N most-popular models: popular first, then newest (created desc),
 * then name ascending. Matches the explorer's "popular" sort key.
 */
export function mostPopular(models: CatalogModel[], limit: number): CatalogModel[] {
  return [...models]
    .sort((a, b) => {
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      if (b.created !== a.created) return b.created - a.created;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
