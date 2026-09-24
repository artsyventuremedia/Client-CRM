"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SavedView {
  id: string;
  name: string;
  params: Record<string, string>;
}

export function SavedViewsMenu({ resource }: { resource: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch(`/api/saved-views?resource=${resource}`)
      .then((res) => res.json())
      .then((data) => setViews(data.views ?? []))
      .catch(() => {});
  }, [resource]);

  async function saveCurrentView(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource, name, params }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save view");
        return;
      }
      toast.success("View saved");
      setViews((prev) => [data.view, ...prev]);
      setName("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function applyView(view: SavedView) {
    const params = new URLSearchParams(view.params);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function removeView(id: string) {
    const res = await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete saved view");
      return;
    }
    setViews((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((view) => (
        <span key={view.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
          <button type="button" onClick={() => applyView(view)} className="text-slate-700 hover:underline">
            {view.name}
          </button>
          <button type="button" onClick={() => removeView(view.id)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </span>
      ))}
      {open ? (
        <form onSubmit={saveCurrentView} className="flex items-center gap-1">
          <Input
            autoFocus
            placeholder="View name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <Button type="submit" size="sm" disabled={saving || !name.trim()}>
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Save current view
        </Button>
      )}
    </div>
  );
}
