"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ organizationName: "", ownerName: "", email: "" });
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create organization");
        return;
      }
      toast.success("Organization created");
      setCredentials({ email: data.owner.email, tempPassword: data.tempPassword });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setCredentials(null);
    setForm({ organizationName: "", ownerName: "", email: "" });
  }

  async function copyCredentials() {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.tempPassword}\nSign in at: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Organization</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        {credentials ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Organization created</h2>
            <p className="text-sm text-slate-600">These credentials will not be shown again — copy or note them now.</p>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>
                Email: <span className="font-mono">{credentials.email}</span>
              </p>
              <p>
                Temporary password: <span className="font-mono">{credentials.tempPassword}</span>
              </p>
            </div>
            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-medium">What happens next</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Send this email and password to the new organization&apos;s owner (outside this app).</li>
                <li>
                  They sign in at <span className="font-mono">/login</span> with these credentials.
                </li>
                <li>Once signed in, they land on an empty dashboard and can start adding leads, clients, and team members from their own sidebar.</li>
              </ol>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={copyCredentials}>
                Copy Credentials
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-base font-semibold">New Organization</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  required
                  value={form.organizationName}
                  onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="owner-name">Owner name</Label>
                <Input id="owner-name" required value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="owner-email">Owner email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
