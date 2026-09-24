"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "SALES_EXECUTIVE", label: "Sales Executive" },
  { value: "ACCOUNT_MANAGER", label: "Account Manager" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "SUPPORT_AGENT", label: "Support Agent" },
  { value: "EMPLOYEE", label: "Employee (general access)" },
];

export function CreateEmployeeDialog({ organizationId }: { organizationId?: string } = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", systemRole: "EMPLOYEE" });
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { ...form, organizationId } : form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create employee login");
        return;
      }
      toast.success("Employee login created");
      setCredentials({ email: data.user.email, tempPassword: data.tempPassword });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setCredentials(null);
    setForm({ name: "", email: "", systemRole: "EMPLOYEE" });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add Employee</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        {credentials ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Employee login created</h2>
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
              Send this email and password to your employee. They&apos;ll sign in at <span className="font-mono">/login</span> and see only what
              their role allows.
            </p>
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-base font-semibold">Add Employee</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="emp-name">Name</Label>
                <Input id="emp-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="emp-role">Role</Label>
                <select
                  id="emp-role"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.systemRole}
                  onChange={(e) => setForm((f) => ({ ...f, systemRole: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
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
