"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "SALES_EXECUTIVE", label: "Sales Executive" },
  { value: "ACCOUNT_MANAGER", label: "Account Manager" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "SUPPORT_AGENT", label: "Support Agent" },
  { value: "EMPLOYEE", label: "Employee (general access)" },
  { value: "CLIENT", label: "Client login" },
];

export function OrgApprovalPanel({
  organizationId,
  adminsCanManageUsers,
  adminAssignableRoles,
}: {
  organizationId: string;
  adminsCanManageUsers: boolean;
  adminAssignableRoles: string[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(adminsCanManageUsers);
  const [roles, setRoles] = useState<string[]>(adminAssignableRoles);
  const [saving, setSaving] = useState(false);

  async function persist(next: { adminsCanManageUsers?: boolean; adminAssignableRoles?: string[] }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update approval settings");
        return;
      }
      toast.success("Updated");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await persist({ adminsCanManageUsers: next });
  }

  async function toggleRole(role: string) {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    setRoles(next);
    await persist({ adminAssignableRoles: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Allow this org&apos;s Admins to create logins</p>
          <p className="text-xs text-slate-500">
            The Org Owner can always create Employee/Client logins. This approves the ADMIN role to do the same.
          </p>
        </div>
        <Button variant={enabled ? "default" : "outline"} size="sm" disabled={saving} onClick={toggleEnabled}>
          {enabled ? "Approved" : "Not Approved"}
        </Button>
      </div>

      {enabled && (
        <div className="rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Roles this org&apos;s Admins may assign</p>
          <p className="mb-2 text-xs text-slate-500">Leave all unchecked to allow every role (no restriction).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={saving} checked={roles.includes(opt.value)} onChange={() => toggleRole(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
