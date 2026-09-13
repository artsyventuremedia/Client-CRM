import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  AT_RISK: "warning",
  RENEWAL_RISK: "warning",
  PAYMENT_RISK: "danger",
  CHURNED: "danger",
};

export default async function ClientsPage() {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;

  const clients = await prisma.client.findMany({
    where: { organizationId },
    include: {
      salesOwner: { select: { name: true } },
      accountManager: { select: { name: true } },
      _count: { select: { projects: true, invoices: true, tickets: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Your complete client roster with a 360-degree view.</p>
        </div>
        <CreateClientDialog />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Account Manager</th>
              <th className="px-4 py-2 font-medium">Projects</th>
              <th className="px-4 py-2 font-medium">Invoices</th>
              <th className="px-4 py-2 font-medium">Open Tickets</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:underline">
                    {client.companyName ?? client.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{client.category.replaceAll("_", " ")}</td>
                <td className="px-4 py-2">
                  <Badge tone={STATUS_TONE[client.status] ?? "neutral"}>{client.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-600">{client.accountManager?.name ?? "Unassigned"}</td>
                <td className="px-4 py-2 text-slate-600">{client._count.projects}</td>
                <td className="px-4 py-2 text-slate-600">{client._count.invoices}</td>
                <td className="px-4 py-2 text-slate-600">{client._count.tickets}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No clients yet. Convert a lead or create a client directly.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
