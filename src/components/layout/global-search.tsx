"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface SearchResult {
  type: string;
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => {});
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(result: SearchResult) {
    setOpen(false);
    setQ("");
    router.push(result.href);
  }

  return (
    <div className="relative w-64" ref={containerRef}>
      <Input
        placeholder="Search everything..."
        value={q}
        onChange={(e) => {
          const next = e.target.value;
          setQ(next);
          if (next.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
      />
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-96 rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && <p className="p-3 text-sm text-slate-400">No matches.</p>}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => goTo(r)}
              className="block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">{r.type}</span>
              <span className="font-medium text-slate-800">{r.label}</span>
              {r.sublabel && <span className="ml-1 text-xs text-slate-400">{r.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
