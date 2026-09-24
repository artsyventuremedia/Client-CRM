"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export interface ListToolbarOption {
  value: string;
  label: string;
}

export function ListToolbar({
  searchPlaceholder = "Search...",
  filterLabel,
  filterOptions,
  sortOptions,
  exportHref,
}: {
  searchPlaceholder?: string;
  filterLabel?: string;
  filterOptions?: ListToolbarOption[];
  sortOptions?: ListToolbarOption[];
  exportHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) updateParams({ q });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const exportUrl = exportHref ? `${exportHref}${exportHref.includes("?") ? "&" : "?"}${searchParams.toString()}` : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full sm:w-64"
      />
      {filterOptions && (
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          value={searchParams.get("filter") ?? ""}
          onChange={(e) => updateParams({ filter: e.target.value })}
        >
          <option value="">{filterLabel ?? "All"}</option>
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {sortOptions && (
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          value={searchParams.get("sort") ?? sortOptions[0]?.value ?? ""}
          onChange={(e) => updateParams({ sort: e.target.value })}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      )}
      {sortOptions && (
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          value={searchParams.get("dir") ?? "desc"}
          onChange={(e) => updateParams({ dir: e.target.value })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      )}
      {exportUrl && (
        <a
          href={exportUrl}
          className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Export CSV
        </a>
      )}
    </div>
  );
}
