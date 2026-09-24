"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientOption = { id: string; name: string; companyName: string | null };
type InvoiceOption = { id: string; invoiceNumber: string; clientId: string };

const METHODS = ["ONLINE", "BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"] as const;
const STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"] as const;

export function CreatePaymentDialog({ clients, invoices }: { clients: ClientOption[]; invoices: InvoiceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    invoiceId: "",
    amount: "",
    method: "ONLINE" as (typeof METHODS)[number],
    status: "SUCCESS" as (typeof STATUSES)[number],
    transactionId: "",
    notes: "",
  });

  const invoiceOptions = useMemo(
    () => invoices.filter((invoice) => !form.clientId || invoice.clientId === form.clientId),
    [invoices, form.clientId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          invoiceId: form.invoiceId || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
          transactionId: form.transactionId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create payment");
        return;
      }
      toast.success("Payment recorded");
      setOpen(false);
      setForm({
        clientId: "",
        invoiceId: "",
        amount: "",
        method: "ONLINE",
        status: "SUCCESS",
        transactionId: "",
        notes: "",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Payment</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Payment</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="payment-client">Client</Label>
            <select
              id="payment-client"
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, invoiceId: "" }))}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.companyName ? ` (${client.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="payment-invoice">Invoice</Label>
            <select
              id="payment-invoice"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.invoiceId}
              onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
            >
              <option value="">No linked invoice</option>
              {invoiceOptions.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="payment-amount">Amount (₹)</Label>
              <Input
                id="payment-amount"
                type="number"
                min={0}
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Method</Label>
              <select
                id="payment-method"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as (typeof METHODS)[number] }))}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="payment-status">Status</Label>
            <select
              id="payment-status"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as (typeof STATUSES)[number] }))}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="payment-transaction">Transaction ID</Label>
            <Input
              id="payment-transaction"
              value={form.transactionId}
              onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="payment-notes">Notes</Label>
            <Input id="payment-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
