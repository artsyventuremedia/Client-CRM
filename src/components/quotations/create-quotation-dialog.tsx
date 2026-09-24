"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateQuotationDialog({
  clients,
}: {
  clients: Array<{ id: string; name: string; companyName: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    description: "",
    quantity: "1",
    unitPrice: "",
    expiryDate: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
          expiryDate: form.expiryDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create quotation");
        return;
      }
      toast.success("Quotation created");
      setOpen(false);
      setForm({ clientId: clients[0]?.id ?? "", description: "", quantity: "1", unitPrice: "", expiryDate: "", notes: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        New Quotation
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Quotation</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="quotation-client">Client</Label>
            <select
              id="quotation-client"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName ?? c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="quotation-description">Description</Label>
            <Input
              id="quotation-description"
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quotation-quantity">Quantity</Label>
              <Input
                id="quotation-quantity"
                type="number"
                min={0}
                required
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="quotation-unit-price">Unit price (₹)</Label>
              <Input
                id="quotation-unit-price"
                type="number"
                min={0}
                required
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="quotation-expiry">Expiry date</Label>
            <Input
              id="quotation-expiry"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="quotation-notes">Notes</Label>
            <textarea
              id="quotation-notes"
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
