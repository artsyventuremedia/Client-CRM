"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateInvoiceDialog({
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
    dueDate: "",
    paymentTerms: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create invoice");
        return;
      }
      toast.success("Invoice created");
      setOpen(false);
      setForm({
        clientId: clients[0]?.id ?? "",
        description: "",
        quantity: "1",
        unitPrice: "",
        dueDate: "",
        paymentTerms: "",
        notes: "",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        New Invoice
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Invoice</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="invoice-client">Client</Label>
            <select
              id="invoice-client"
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
            <Label htmlFor="invoice-description">Description</Label>
            <Input
              id="invoice-description"
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invoice-quantity">Quantity</Label>
              <Input
                id="invoice-quantity"
                type="number"
                min={0}
                required
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="invoice-unit-price">Unit price (₹)</Label>
              <Input
                id="invoice-unit-price"
                type="number"
                min={0}
                required
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="invoice-due-date">Due date</Label>
            <Input
              id="invoice-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="invoice-payment-terms">Payment terms</Label>
            <Input
              id="invoice-payment-terms"
              value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="invoice-notes">Notes</Label>
            <textarea
              id="invoice-notes"
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
              {loading ? "Saving..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
