"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export type RunStatusFilter = "all" | "completed" | "error" | "running";
export type RunRangeFilter = "24h" | "7d" | "30d" | "all";

const STATUS_OPTIONS: Array<{ value: RunStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Success" },
  { value: "error", label: "Error" },
  { value: "running", label: "Running" },
];

const RANGE_OPTIONS: Array<{ value: RunRangeFilter; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

export function RunListFilters({
  status,
  range,
  query,
}: {
  status: RunStatusFilter;
  range: RunRangeFilter;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setSearchValue(query);
  }

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all" || (key === "range" && value === "7d")) {
        if (key === "range" && value === "7d") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `/runs?${qs}` : `/runs`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => updateParam("status", v)}
        />
        <FilterGroup
          label="Range"
          options={RANGE_OPTIONS}
          value={range}
          onChange={(v) => updateParam("range", v)}
        />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("q", searchValue.trim());
        }}
        className="flex items-center gap-2"
      >
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search by run ID…"
          className="h-8 w-full rounded-md border bg-secondary/40 px-2.5 font-mono text-xs outline-none transition focus:border-[var(--ring)] sm:w-56"
        />
        <button
          type="submit"
          className="h-8 rounded-md border bg-secondary/60 px-3 text-xs font-medium transition hover:bg-secondary"
        >
          Search
        </button>
      </form>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-0.5 rounded-md border bg-secondary/30 p-0.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`h-7 rounded px-2.5 text-xs font-medium transition ${
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
