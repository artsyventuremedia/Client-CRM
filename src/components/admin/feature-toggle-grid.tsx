"use client";

import { useState } from "react";
import { toast } from "sonner";

type Cell = { resource: string; enabled: boolean };
type RoleRow = { systemRole: string; resources: Cell[] };

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  SALES_EXECUTIVE: "Sales Executive",
  ACCOUNT_MANAGER: "Account Manager",
  PROJECT_MANAGER: "Project Manager",
  EMPLOYEE: "Employee",
  FINANCE_MANAGER: "Finance Manager",
  SUPPORT_AGENT: "Support Agent",
  VENDOR: "Vendor",
  CLIENT: "Client",
};

export function FeatureToggleGrid({ initialGrid }: { initialGrid: RoleRow[] }) {
  const [grid, setGrid] = useState(initialGrid);
  const [pending, setPending] = useState<string | null>(null);
  const resources = grid[0]?.resources.map((r) => r.resource) ?? [];

  async function toggle(systemRole: string, resource: string, enabled: boolean) {
    const key = `${systemRole}:${resource}`;
    setPending(key);
    const prevGrid = grid;
    setGrid((g) =>
      g.map((row) =>
        row.systemRole === systemRole
          ? { ...row, resources: row.resources.map((r) => (r.resource === resource ? { ...r, enabled } : r)) }
          : row,
      ),
    );
    try {
      const res = await fetch("/api/admin/feature-toggles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemRole, resource, enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not update feature toggle");
        setGrid(prevGrid);
      }
    } catch {
      toast.error("Could not update feature toggle");
      setGrid(prevGrid);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-100 uppercase text-slate-400">
          <tr>
            <th className="sticky left-0 bg-white px-3 py-2 font-medium">Role</th>
            {resources.map((r) => (
              <th key={r} className="px-3 py-2 font-medium whitespace-nowrap">
                {r.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.systemRole} className="border-b border-slate-50">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                {ROLE_LABELS[row.systemRole] ?? row.systemRole}
              </td>
              {row.resources.map((cell) => {
                const key = `${row.systemRole}:${cell.resource}`;
                return (
                  <td key={cell.resource} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={cell.enabled}
                      disabled={pending === key}
                      onChange={(e) => toggle(row.systemRole, cell.resource, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
