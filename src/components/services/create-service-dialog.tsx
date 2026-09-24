"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRICING_MODELS = ["ONE_TIME", "RECURRING", "SUBSCRIPTION", "RETAINER", "PROJECT_BASED"] as const;

export function CreateServiceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryName: "",
    pricingModel: "ONE_TIME" as (typeof PRICING_MODELS)[number],
    oneTimePrice: "",
    monthlyPrice: "",
    annualPrice: "",
    taxRatePercent: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          oneTimePrice: form.oneTimePrice ? Number(form.oneTimePrice) : undefined,
          monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : undefined,
          annualPrice: form.annualPrice ? Number(form.annualPrice) : undefined,
          taxRatePercent: form.taxRatePercent ? Number(form.taxRatePercent) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create service");
        return;
      }
      toast.success("Service created");
      setOpen(false);
      setForm({
        name: "",
        description: "",
        categoryName: "",
        pricingModel: "ONE_TIME",
        oneTimePrice: "",
        monthlyPrice: "",
        annualPrice: "",
        taxRatePercent: "",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Service</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Service</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="service-name">Name</Label>
            <Input
              id="service-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="service-category">Category</Label>
            <Input
              id="service-category"
              value={form.categoryName}
              onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="service-pricing-model">Pricing model</Label>
            <select
              id="service-pricing-model"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.pricingModel}
              onChange={(e) =>
                setForm((f) => ({ ...f, pricingModel: e.target.value as (typeof PRICING_MODELS)[number] }))
              }
            >
              {PRICING_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="service-one-time-price">One-time price (₹)</Label>
              <Input
                id="service-one-time-price"
                type="number"
                min={0}
                value={form.oneTimePrice}
                onChange={(e) => setForm((f) => ({ ...f, oneTimePrice: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="service-monthly-price">Monthly price (₹)</Label>
              <Input
                id="service-monthly-price"
                type="number"
                min={0}
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="service-annual-price">Annual price (₹)</Label>
              <Input
                id="service-annual-price"
                type="number"
                min={0}
                value={form.annualPrice}
                onChange={(e) => setForm((f) => ({ ...f, annualPrice: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="service-tax-rate">Tax rate (%)</Label>
              <Input
                id="service-tax-rate"
                type="number"
                min={0}
                value={form.taxRatePercent}
                onChange={(e) => setForm((f) => ({ ...f, taxRatePercent: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="service-description">Description</Label>
            <textarea
              id="service-description"
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
