"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConvertLeadDialog({
  leadId,
  defaultName,
  defaultCompanyName,
  defaultIndustry,
}: {
  leadId: string;
  defaultName: string;
  defaultCompanyName: string;
  defaultIndustry: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: defaultName,
    companyName: defaultCompanyName,
    industry: defaultIndustry,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, leadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not convert lead");
        return;
      }
      toast.success("Lead converted to client");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Convert to Client</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">Convert Lead to Client</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="convert-name">Contact name</Label>
            <Input
              id="convert-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="convert-company">Company name</Label>
            <Input
              id="convert-company"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="convert-industry">Industry</Label>
            <Input
              id="convert-industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Converting..." : "Convert to Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
