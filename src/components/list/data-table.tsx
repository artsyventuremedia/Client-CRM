"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DataTableRow {
  id: string;
  cells: ReactNode[];
}

export interface BulkStatusOption {
  value: string;
  label: string;
}

export function DataTable({
  headers,
  rows,
  emptyMessage,
  bulkResource,
  bulkStatusOptions,
  canBulkDelete,
}: {
  headers: string[];
  rows: DataTableRow[];
  emptyMessage: string;
  /** API path segment, e.g. "leads", used as POST /api/{bulkResource}/bulk. Omit to disable bulk actions entirely. */
  bulkResource?: string;
  bulkStatusOptions?: BulkStatusOption[];
  canBulkDelete?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const bulkEnabled = Boolean(bulkResource);

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: "updateStatus" | "delete", value?: string) {
    if (!bulkResource || selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/${bulkResource}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Bulk action failed");
        return;
      }
      toast.success(`Updated ${data.count ?? selected.size} record(s)`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {bulkEnabled && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <span className="font-medium text-slate-700">{selected.size} selected</span>
          {bulkStatusOptions && (
            <select
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
              disabled={loading}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) runBulk("updateStatus", e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Set status to...
              </option>
              {bulkStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {canBulkDelete && (
            <Button variant="destructive" size="sm" disabled={loading} onClick={() => runBulk("delete")}>
              Delete selected
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              {bulkEnabled && (
                <th className="w-8 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                {bulkEnabled && (
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} />
                  </td>
                )}
                {row.cells.map((cell, idx) => (
                  <td key={idx} className="px-4 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length + (bulkEnabled ? 1 : 0)} className="px-4 py-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
