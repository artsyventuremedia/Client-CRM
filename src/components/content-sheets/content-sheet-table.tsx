"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditableField } from "@/components/detail/editable-field";

type Item = {
  id: string;
  date: string | null;
  platform: string | null;
  contentType: string | null;
  caption: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED";
  notes: string | null;
  createdByName: string | null;
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  POSTED: "success",
};

const STATUS_OPTIONS = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED"] as const;

export function ContentSheetTable({
  sheetId,
  items,
  canEdit,
  canDelete,
}: {
  sheetId: string;
  items: Item[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: "", platform: "", contentType: "", caption: "", notes: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  const platforms = Array.from(new Set(items.map((item) => item.platform).filter((p): p is string => Boolean(p)))).sort();

  const filteredItems = items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (platformFilter !== "ALL" && item.platform !== platformFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [item.caption, item.notes, item.platform, item.contentType].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/content-sheets/${sheetId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add item");
        return;
      }
      toast.success("Item added");
      setAdding(false);
      setForm({ date: "", platform: "", contentType: "", caption: "", notes: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(itemId: string, status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-sheets/${sheetId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update status");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(itemId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-sheets/${sheetId}/items/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not remove item");
        return;
      }
      toast.success("Item removed");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search caption, notes, platform..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {platforms.length > 0 && (
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="ALL">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-400">
          {filteredItems.length} of {items.length} items
        </span>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Platform</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Caption</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Added By</th>
              {canDelete && <th className="px-4 py-2 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="px-4 py-2 text-slate-600">
                  <EditableField
                    patchUrl={`/api/content-sheets/${sheetId}/items/${item.id}`}
                    field="date"
                    type="date"
                    value={item.date ? item.date.slice(0, 10) : ""}
                    displayValue={item.date ? new Date(item.date).toLocaleDateString() : undefined}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-4 py-2 text-slate-600">
                  <EditableField
                    patchUrl={`/api/content-sheets/${sheetId}/items/${item.id}`}
                    field="platform"
                    value={item.platform ?? ""}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-4 py-2 text-slate-600">
                  <EditableField
                    patchUrl={`/api/content-sheets/${sheetId}/items/${item.id}`}
                    field="contentType"
                    value={item.contentType ?? ""}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-4 py-2 text-slate-600 max-w-xs">
                  <EditableField
                    patchUrl={`/api/content-sheets/${sheetId}/items/${item.id}`}
                    field="caption"
                    type="textarea"
                    value={item.caption ?? ""}
                    canEdit={canEdit}
                    className="truncate"
                  />
                </td>
                <td className="px-4 py-2">
                  {canEdit ? (
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={item.status}
                      disabled={loading}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={STATUS_TONE[item.status]}>{item.status.replaceAll("_", " ")}</Badge>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{item.createdByName ?? "—"}</td>
                {canDelete && (
                  <td className="px-4 py-2">
                    <Button variant="outline" onClick={() => removeItem(item.id)} disabled={loading}>
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                  {items.length === 0 ? "No content added yet." : "No items match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {canEdit &&
        (adding ? (
          <Card>
            <CardContent className="py-4">
              <form onSubmit={addItem} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="item-date">Date</Label>
                    <Input id="item-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="item-platform">Platform</Label>
                    <Input
                      id="item-platform"
                      placeholder="Instagram, Facebook, ..."
                      value={form.platform}
                      onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-type">Content Type</Label>
                    <Input
                      id="item-type"
                      placeholder="Reel, Post, Story, ..."
                      value={form.contentType}
                      onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="item-caption">Caption</Label>
                  <textarea
                    id="item-caption"
                    className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.caption}
                    onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="item-notes">Notes</Label>
                  <Input id="item-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setAdding(true)}>Add Content</Button>
        ))}
    </div>
  );
}
