"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PendingCredential {
  id: string;
  email: string;
  tempPassword: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  createdBy: { name: string } | null;
}

export function PendingCredentialsList({ organizationId }: { organizationId?: string }) {
  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    const url = organizationId ? `/api/admin/pending-credentials?organizationId=${organizationId}` : "/api/admin/pending-credentials";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setCredentials(data.credentials ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [organizationId]);

  async function copy(cred: PendingCredential) {
    const text = `Email: ${cred.email}\nPassword: ${cred.tempPassword}\nSign in at: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  }

  async function dismiss(id: string) {
    const res = await fetch(`/api/admin/pending-credentials/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not dismiss");
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return null;
  if (credentials.length === 0) return null;

  return (
    <Card className="overflow-x-auto border-amber-200 bg-amber-50">
      <div className="border-b border-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
        Not yet shared ({credentials.length}) — these logins haven&apos;t been used yet. Share the credentials, then dismiss.
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-amber-100 text-xs uppercase text-amber-700">
          <tr>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Temp Password</th>
            <th className="px-4 py-2 font-medium">Created</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred) => (
            <tr key={cred.id} className="border-b border-amber-100">
              <td className="px-4 py-2 font-medium text-slate-900">{cred.email}</td>
              <td className="px-4 py-2 text-slate-600">{cred.role.replaceAll("_", " ")}</td>
              <td className="px-4 py-2 font-mono text-slate-700">{cred.tempPassword}</td>
              <td className="px-4 py-2 text-xs text-slate-500">{new Date(cred.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copy(cred)}>
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => dismiss(cred.id)}>
                    Dismiss
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
