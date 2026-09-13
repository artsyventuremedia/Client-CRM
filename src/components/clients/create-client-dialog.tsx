"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", industry: "", gstNumber: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create client");
        return;
      }
      toast.success("Client created");
      setOpen(false);
      setForm({ name: "", companyName: "", industry: "", gstNumber: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Client</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Client</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="client-name">Contact name</Label>
            <Input id="client-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="client-company">Company name</Label>
            <Input
              id="client-company"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="client-industry">Industry</Label>
              <Input
                id="client-industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="client-gst">GST Number</Label>
              <Input
                id="client-gst"
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
