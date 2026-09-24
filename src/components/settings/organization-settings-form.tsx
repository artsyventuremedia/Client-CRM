"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrganizationSettingsFormProps {
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    gstNumber: string | null;
    panNumber: string | null;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    quotationPrefix: string;
  };
}

export function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: organization.name ?? "",
    logoUrl: organization.logoUrl ?? "",
    brandColor: organization.brandColor ?? "",
    gstNumber: organization.gstNumber ?? "",
    panNumber: organization.panNumber ?? "",
    currency: organization.currency ?? "",
    timezone: organization.timezone ?? "",
    invoicePrefix: organization.invoicePrefix ?? "",
    quotationPrefix: organization.quotationPrefix ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update organization settings");
        return;
      }
      toast.success("Organization settings updated");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="org-logo">Logo URL</Label>
              <Input
                id="org-logo"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="org-brand-color">Brand Color</Label>
              <Input
                id="org-brand-color"
                value={form.brandColor}
                onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="org-gst">GST Number</Label>
              <Input
                id="org-gst"
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="org-pan">PAN Number</Label>
              <Input
                id="org-pan"
                value={form.panNumber}
                onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="org-currency">Currency</Label>
              <Input
                id="org-currency"
                required
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="org-timezone">Timezone</Label>
              <Input
                id="org-timezone"
                required
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="org-invoice-prefix">Invoice Prefix</Label>
              <Input
                id="org-invoice-prefix"
                required
                value={form.invoicePrefix}
                onChange={(e) => setForm((f) => ({ ...f, invoicePrefix: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="org-quotation-prefix">Quotation Prefix</Label>
              <Input
                id="org-quotation-prefix"
                required
                value={form.quotationPrefix}
                onChange={(e) => setForm((f) => ({ ...f, quotationPrefix: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
