"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", requirement: "", estimatedValue: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create lead");
        return;
      }
      toast.success("Lead created");
      setOpen(false);
      setForm({ name: "", company: "", email: "", phone: "", requirement: "", estimatedValue: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Lead</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Lead</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="lead-company">Company</Label>
            <Input id="lead-company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="lead-value">Estimated value (₹)</Label>
            <Input
              id="lead-value"
              type="number"
              min={0}
              value={form.estimatedValue}
              onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="lead-requirement">Requirement</Label>
            <textarea
              id="lead-requirement"
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.requirement}
              onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
