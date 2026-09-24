"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientLoginDialog({
  clients,
  organizationId,
}: {
  clients: Array<{ id: string; name: string; companyName: string | null }>;
  organizationId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ clientId: clients[0]?.id ?? "", name: "", email: "" });
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/client-logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { ...form, organizationId } : form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create client login");
        return;
      }
      toast.success("Client login created");
      setCredentials({ email: data.user.email, tempPassword: data.tempPassword });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setCredentials(null);
    setForm({ clientId: clients[0]?.id ?? "", name: "", email: "" });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        Add Client Login
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        {credentials ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Client login created</h2>
            <p className="text-sm text-slate-600">These credentials will not be shown again — copy or note them now.</p>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>
                Email: <span className="font-mono">{credentials.email}</span>
              </p>
              <p>
                Temporary password: <span className="font-mono">{credentials.tempPassword}</span>
              </p>
            </div>
            <p className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
              Send this email and password to your client. They&apos;ll sign in at <span className="font-mono">/login</span> and see only their
              own projects, invoices, tickets, and quotations.
            </p>
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-base font-semibold">Add Client Login</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="client-select">Client</Label>
                <select
                  id="client-select"
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
                <Label htmlFor="contact-name">Contact name</Label>
                <Input id="contact-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="contact-email">Login email</Label>
                <Input
                  id="contact-email"
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
                  {loading ? "Creating..." : "Create Login"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
