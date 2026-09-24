"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientOption = {
  id: string;
  name: string;
  companyName: string | null;
};

export function CreateContractDialog({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    startDate: "",
    endDate: "",
    contractValue: "",
    paymentTerms: "",
    renewalTerms: "",
    slaTerms: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || undefined,
          contractValue: form.contractValue ? Number(form.contractValue) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create contract");
        return;
      }
      toast.success("Contract created");
      setOpen(false);
      setForm({
        clientId: clients[0]?.id ?? "",
        startDate: "",
        endDate: "",
        contractValue: "",
        paymentTerms: "",
        renewalTerms: "",
        slaTerms: "",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Contract</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Contract</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="contract-client">Client</Label>
            <select
              id="contract-client"
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.companyName ? ` (${client.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="contract-start">Start date</Label>
              <Input
                id="contract-start"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contract-end">End date</Label>
              <Input
                id="contract-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contract-value">Contract value (₹)</Label>
            <Input
              id="contract-value"
              type="number"
              min={0}
              required
              value={form.contractValue}
              onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contract-payment-terms">Payment terms</Label>
            <Input
              id="contract-payment-terms"
              value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contract-renewal-terms">Renewal terms</Label>
            <Input
              id="contract-renewal-terms"
              value={form.renewalTerms}
              onChange={(e) => setForm((f) => ({ ...f, renewalTerms: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contract-sla-terms">SLA terms</Label>
            <Input
              id="contract-sla-terms"
              value={form.slaTerms}
              onChange={(e) => setForm((f) => ({ ...f, slaTerms: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Contract"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
