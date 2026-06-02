"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ColumnDef<T> {
  header: string;
  accessor: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

type SortDirection = "asc" | "desc" | null;

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: "easeOut" as const },
  }),
};

export function DataTable<T>({ columns, data, onRowClick }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (accessor: string) => {
    if (sortKey === accessor) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(accessor);
      setSortDir("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDir === "asc" ? -1 : 1;
    if (bVal == null) return sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDir === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto hero-scroll">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {columns.map((column) => {
                const isSorted = sortKey === column.accessor;
                return (
                  <th
                    key={column.accessor}
                    className={`px-6 py-4 text-left text-xs font-mono font-bold text-gray-500 uppercase tracking-wider ${
                      column.sortable !== false
                        ? "cursor-pointer select-none hover:text-gray-300 transition-colors"
                        : ""
                    }`}
                    style={{ width: column.width }}
                    onClick={() =>
                      column.sortable !== false && handleSort(column.accessor)
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      {column.header}
                      {column.sortable !== false && (
                        <span className="text-gray-600">
                          <AnimatePresence mode="wait">
                            {isSorted && sortDir === "asc" ? (
                              <motion.div
                                key="asc"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                              >
                                <ArrowUp className="w-3 h-3 text-blue-400" />
                              </motion.div>
                            ) : isSorted && sortDir === "desc" ? (
                              <motion.div
                                key="desc"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                              >
                                <ArrowDown className="w-3 h-3 text-blue-400" />
                              </motion.div>
                            ) : (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </AnimatePresence>
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedData.map((row, index) => {
              const rowId =
                (row as Record<string, unknown>)["id"] ??
                (row as Record<string, unknown>)["key"] ??
                index;
              const rowLabel = `Row ${index + 1}`;
              return (
                <motion.tr
                  key={String(rowId)}
                  custom={index}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? rowLabel : undefined}
                  className={`transition-colors ${onRowClick ? "cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50" : ""}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.accessor}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      {column.render
                        ? column.render(
                            (row as Record<string, unknown>)[column.accessor],
                            row,
                          )
                        : ((row as Record<string, unknown>)[
                            column.accessor
                          ] as React.ReactNode)}
                    </td>
                  ))}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedData.length === 0 && (
        <div className="text-center py-12 text-gray-500">No data available</div>
      )}
    </div>
  );
}
