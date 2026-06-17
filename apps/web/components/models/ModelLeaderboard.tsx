"use client";

import { motion } from "framer-motion";
import type { CatalogModel } from "./model-rankings";

interface RankedList {
  title: string;
  /** Value to show on the right of each row. Empty string hides it. */
  accessor: (m: CatalogModel) => string;
  models: CatalogModel[];
}

interface ModelLeaderboardProps {
  cheapest: CatalogModel[];
  largest: CatalogModel[];
  popular: CatalogModel[];
  onSelect: (modelId: string) => void;
}

const RANK_STYLES = ["text-amber", "text-bone", "text-ash"];

export function ModelLeaderboard({
  cheapest,
  largest,
  popular,
  onSelect,
}: ModelLeaderboardProps) {
  const lists: RankedList[] = [
    {
      title: "Cheapest output",
      accessor: (m) => m.outputPrice,
      models: cheapest,
    },
    {
      title: "Largest context",
      accessor: (m) => m.context,
      models: largest,
    },
    {
      title: "Most popular",
      accessor: () => "",
      models: popular,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {lists.map((list) => (
        <div
          key={list.title}
          className="rounded-2xl bg-ink-900 border border-hair p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-ash">
              {list.title}
            </h4>
            <span className="h-px flex-1 ml-4 bg-hair" />
          </div>
          <ul className="flex flex-col gap-1">
            {list.models.map((model, i) => (
              <li key={model.id}>
                <motion.button
                  type="button"
                  onClick={() => onSelect(model.id)}
                  whileHover={{ x: 2 }}
                  className="group w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-ink-800 transition-colors"
                >
                  <span
                    className={`font-mono text-xs tabular-nums w-6 ${
                      RANK_STYLES[i] ?? "text-ash"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm text-bone truncate group-hover:text-amber transition-colors">
                      {model.name}
                    </span>
                    <span className="block font-mono text-[10px] text-ash truncate">
                      {model.provider}
                    </span>
                  </span>
                  {list.accessor(model) && (
                    <span className="font-mono text-xs tabular-nums text-bone shrink-0">
                      {list.accessor(model)}
                    </span>
                  )}
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
