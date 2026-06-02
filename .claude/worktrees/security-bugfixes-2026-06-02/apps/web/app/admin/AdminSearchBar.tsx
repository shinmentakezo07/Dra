"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { getAdminSDK } from "@/lib/api/admin-sdk";
import type { AdminUserDetail } from "@/types/admin";

const ROLE_STYLES: Record<string, string> = {
  superadmin: "text-purple-400",
  admin: "text-blue-400",
  support: "text-emerald-400",
  analyst: "text-amber-400",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function AdminSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearched(false);

    const controller = new AbortController();

    getAdminSDK()
      .listUsers({ query: debouncedQuery, limit: 5 })
      .then((res) => {
        if (!controller.signal.aborted) {
          setResults(res.data ?? []);
          setSearched(true);
          setLoading(false);
          setSelectedIndex(-1);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearched(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (userId: string) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      setSearched(false);
      router.push(`/admin/users/${userId}`);
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, results, selectedIndex, handleSelect],
  );

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--admin-text-dim)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search users..."
          className="admin-input w-full pl-10 pr-4 py-[9px] rounded-[12px] text-[13px]"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 animate-spin text-indigo-400/60" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 w-full overflow-hidden rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-surface-elevated)] shadow-2xl shadow-black/40">
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 px-4 py-6">
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                style={{ color: "rgba(59,130,246,0.5)" }}
              />
              <span className="text-[12px] text-[var(--admin-text-muted)]">
                Searching...
              </span>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[12px] text-[var(--admin-text-muted)]">
                No results found
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--admin-text-dim)]">
                Try a different search term
              </p>
            </div>
          ) : (
            <ul role="listbox" className="py-1">
              {results.map((user, index) => (
                <li
                  key={user.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelect(user.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-[13px] transition-colors ${
                    index === selectedIndex
                      ? "text-[var(--admin-text)]"
                      : "text-[var(--admin-text-muted)] hover:bg-white/[0.02] hover:text-[var(--admin-text)]"
                  }`}
                  style={
                    index === selectedIndex
                      ? { background: "rgba(59,130,246,0.06)" }
                      : undefined
                  }
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-white/[0.04] text-[11px] font-medium text-[var(--admin-text-muted)]">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-[13px]">
                        {user.name || "Unknown"}
                      </span>
                      <span
                        className={`flex-shrink-0 rounded-[5px] px-1.5 py-[2px] text-[9px] font-semibold uppercase leading-none ${
                          ROLE_STYLES[user.role] ??
                          "text-[var(--admin-text-dim)]"
                        }`}
                        style={
                          ROLE_STYLES[user.role]
                            ? undefined
                            : { background: "rgba(255,255,255,0.03)" }
                        }
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[var(--admin-text-dim)] font-mono">
                      {user.email}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
