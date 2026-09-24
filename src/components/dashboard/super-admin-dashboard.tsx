import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function SuperAdminDashboard() {
  const [orgCount, userCount, activeOrgCount] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.organization.count({ where: { isActive: true } }),
  ]);

  const tiles = [
    { label: "Organizations", value: String(orgCount) },
    { label: "Active Organizations", value: String(activeOrgCount) },
    { label: "Total Users", value: String(userCount) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Platform Admin</h1>
        <p className="text-sm text-slate-500">Manage organizations, logins, and feature access across the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="border-b-0 pb-0">
              <CardTitle className="text-xs font-medium text-slate-500">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/admin/organizations">
          <Button>Manage Organizations</Button>
        </Link>
        <Link href="/admin/feature-toggles">
          <Button variant="outline">Feature Toggles</Button>
        </Link>
      </div>
    </div>
  );
}
