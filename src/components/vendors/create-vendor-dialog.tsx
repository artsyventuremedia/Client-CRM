"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY_FORM = {
  companyName: "",
  skills: "",
  location: "",
  paymentTerms: "",
  gstNumber: "",
  panNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

export function CreateVendorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create vendor");
        return;
      }
      toast.success("Vendor created");
      setOpen(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Vendor</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Vendor</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="vendor-company-name">Company Name</Label>
            <Input
              id="vendor-company-name"
              required
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="vendor-skills">Skills (comma separated)</Label>
            <Input
              id="vendor-skills"
              value={form.skills}
              onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor-location">Location</Label>
              <Input
                id="vendor-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="vendor-payment-terms">Payment Terms</Label>
              <Input
                id="vendor-payment-terms"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor-gst-number">GST Number</Label>
              <Input
                id="vendor-gst-number"
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="vendor-pan-number">PAN Number</Label>
              <Input
                id="vendor-pan-number"
                value={form.panNumber}
                onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-2 border-t border-slate-100 pt-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Primary Contact</p>
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="vendor-contact-name">Name</Label>
                <Input
                  id="vendor-contact-name"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vendor-contact-email">Email</Label>
                  <Input
                    id="vendor-contact-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="vendor-contact-phone">Phone</Label>
                  <Input
                    id="vendor-contact-phone"
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Vendor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
